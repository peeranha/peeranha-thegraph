import { Bytes, BigInt, Address, ByteArray, log, store, JSONValue, JSONValueKind } from '@graphprotocol/graph-ts'
import { Post, Reply, Comment, Tag, CommunityDocumentation, PostTranslation, ReplyTranslation, CommentTranslation, TagTranslation } from '../generated/schema'
import { getPeeranhaContent, ERROR_IPFS, isValidIPFS, PostType, ItemProperties, Language, convertIpfsHash, bytesToJson, idToIndexId, indexIdToId, Network, isUserBanned } from './utils'
import { updateUserRating, getUser, newUser } from './user'
import { getCommunity } from './community-tag'

export function newPost(post: Post, postId: BigInt, blockTimeStamp: BigInt): void {
  let peeranhaPost = getPeeranhaContent().getPost(postId);
  if (!peeranhaPost) return;

  post.communityId = idToIndexId(Network.Polygon,  peeranhaPost.communityId.toString());
  post.postType = peeranhaPost.postType;
  post.author = peeranhaPost.author.toHex();
  post.rating = peeranhaPost.rating;
  post.postTime = peeranhaPost.postTime;
  post.lastmod = peeranhaPost.postTime;
  post.commentCount = 0;
  post.replyCount = 0;
  post.officialReply = 0;
  post.bestReply = peeranhaPost.bestReply;
  post.isDeleted = false;
  post.replies = [];
  post.comments = [];
  post.translations = [];
  post.tags = [];
  post.postContent = '';
  post.title = '';
  post.content = '';
  post.networkId = Network.Polygon;

  const messengerUserDataResult = getPeeranhaContent().try_getItemProperty(ItemProperties.MessengerSender, postId, 0, 0);
  if (!messengerUserDataResult.reverted) {
    const messengerUserData = messengerUserDataResult.value;
    post.handle = messengerUserData.toString().slice(0, messengerUserData.length - 1);
    post.messengerType = messengerUserData[messengerUserData.length - 1];
  }

  let community = getCommunity(idToIndexId(Network.Polygon, peeranhaPost.communityId.toString()));
  community.postCount++;
  community.save();

  let user = getUser(peeranhaPost.author, blockTimeStamp);
  user.postCount++;
  let userPosts = user.posts
  userPosts.push(post.id);
  user.posts = userPosts;
  user.save();

  addDataToPost(post, postId);
}

export function addDataToPost(post: Post, postId: BigInt): void {
  let peeranhaPost = getPeeranhaContent().getPost(postId);
  if (peeranhaPost == null) return;

  let postTagsBuf = peeranhaPost.tags;
  let oldPostTags = post.tags;
  let postTags = post.tags;
  postTags = [];
  for (let i = 0; i < peeranhaPost.tags.length; i++) {
    let newTag = postTagsBuf.pop();

    let tagId = idToIndexId(Network.Polygon, peeranhaPost.communityId.toString()) + '-' + newTag.toString();
    postTags.push(tagId);

    if(!oldPostTags.includes(tagId)) {
      let tag = Tag.load(tagId);
      if (tag != null) {
        post.postContent += ' ' + tag.name;
        tag.postCount++;
        tag.save();
      }
    }
  }
  post.tags = postTags;

  let oldPostTagsLength = oldPostTags.length;
  for (let i = 0; i < oldPostTagsLength; i++) {
    let oldTag = oldPostTags.pop();

    if(oldTag && !post.tags.includes(oldTag)) {
      let tag = Tag.load(oldTag);
      if (tag) {
        tag.postCount--;
        tag.save();
      }
    }
  }
  
  post.ipfsHash = peeranhaPost.ipfsDoc.hash;
  post.ipfsHash2 = peeranhaPost.ipfsDoc.hash2;
  let postLanguageResult = getPeeranhaContent().try_getItemLanguage(postId, 0, 0);
  if(!postLanguageResult.reverted) {
    post.language = postLanguageResult.value.toI32();
  } else {
    post.language = Language.English;
  }

  if (BigInt.fromString(indexIdToId(post.communityId)) != peeranhaPost.communityId) {
    const oldCommunity = getCommunity(post.communityId);

    let replyCount = 0;
    for (let i = 1; i <= post.replyCount; i++) {
      const reply = Reply.load(idToIndexId(Network.Polygon, postId.toString()) + '-' + i.toString());
      if (reply != null && !reply.isDeleted) {
        replyCount++;
      }
    }

    oldCommunity.postCount--;
    oldCommunity.replyCount -= replyCount;
    oldCommunity.save();

    const newCommunity = getCommunity(idToIndexId(Network.Polygon, peeranhaPost.communityId.toString()));
    newCommunity.postCount++;
    newCommunity.replyCount += replyCount;
    newCommunity.save();

    updatePostUsersRatings(post);
    post.communityId = idToIndexId(Network.Polygon,  peeranhaPost.communityId.toString());
    updatePostUsersRatings(post);
  }
  if (post.postType != peeranhaPost.postType) {
    updatePostUsersRatings(post);
    post.postType = peeranhaPost.postType;
  }

  getIpfsPostData(post);
  updateUserRating(Address.fromString(post.author), post.communityId);
}

function getIpfsPostData(post: Post): void {
  let result = convertIpfsHash(post.ipfsHash as Bytes);
  if (!result) return;

  let ipfsData = bytesToJson(result);

  if (ipfsData && isValidIPFS(ipfsData)) {
    let ipfsObj = ipfsData.toObject()
    let title = ipfsObj.get('title');
    if (title && !title.isNull()) {
      post.title = title.toString();
      post.postContent += ' ' + title.toString();
    }

    let content = ipfsObj.get('content');
    if (content && !content.isNull()) {
      post.content = content.toString();
      post.postContent += ' ' + content.toString();
    }
  } else {
    post.title = ERROR_IPFS;
    post.content = ERROR_IPFS;
  }
}

export function deletePost(post: Post, postId: BigInt, blockTimeStamp: BigInt): void {
  post.isDeleted = true;

  updateUserRating(Address.fromString(post.author), post.communityId);
  let community = getCommunity(post.communityId);

  let tagsLength = post.tags.length;
  let postTagsBuf = post.tags;
  for (let i = 0; i < tagsLength; i++) {
    let tagBuf = postTagsBuf.pop();
    if (!tagBuf) return;
    let tag = Tag.load(tagBuf);
    if (tag != null) {
      tag.postCount--;
      tag.deletedPostCount++;
      tag.save();
    }
  }

  for (let replyId = 1; replyId <= post.replyCount; replyId++) {
    let reply = Reply.load(idToIndexId(Network.Polygon, postId.toString()) + '-' + replyId.toString());
    let peeranhaReply = getPeeranhaContent().getReply(postId, replyId);
    if (peeranhaReply == null) continue;
    if (reply != null && !peeranhaReply.isDeleted) {
      updateUserRating(Address.fromString(reply.author), post.communityId);
      
      let isReplyUserBanned = isUserBanned(reply.author, post.communityId);
      if (!isReplyUserBanned) {
        let userReply = getUser(Address.fromString(reply.author), blockTimeStamp);
        userReply.replyCount--;
        userReply.save();  
      }
      
      community.replyCount--;

      for (let j = 1; j <= reply.commentCount; j++) {
        let comment = Comment.load(idToIndexId(Network.Polygon, postId.toString()) + '-' + replyId.toString() + '-' + j.toString());
        if (comment != null && !comment.isDeleted) {
          comment.isDeleted = true;
          comment.save();
        }
      }

      reply.isDeleted = true;
      reply.save();
    }
  }
  community.deletedPostCount++;
  community.postCount--;
  community.save();

  let userPost = getUser(Address.fromString(post.author), blockTimeStamp);
  let isReplyUserBanned = isUserBanned(post.author, post.communityId);
  if (!isReplyUserBanned) {
    userPost.postCount--;
  }
  userPost.save();

  for (let i = 1; i <= post.commentCount; i++) {
    let comment = Comment.load(idToIndexId(Network.Polygon, postId.toString()) + '-0-' + i.toString());
    if (comment != null && !comment.isDeleted) {
      comment.isDeleted = true;
      comment.save();
    }
  }
}

export function updatePostUsersRatings(post: Post): void {
  updateUserRating(Address.fromString(post.author), post.communityId);

  for (let i = 1; i <= post.replyCount; i++) {
    let reply = Reply.load(post.id + "-" + i.toString());
    if (
    (reply != null && !reply.isDeleted) && 
    (reply.isFirstReply || reply.isQuickReply || reply.rating != 0 || reply.isBestReply)) {

      updateUserRating(Address.fromString(reply.author), post.communityId);
    }
  }
}

export function newReply(reply: Reply | null, postId: BigInt, replyId: i32, blockTimeStamp: BigInt): void {
  let peeranhaReply = getPeeranhaContent().getReply(postId, replyId);
  if (peeranhaReply == null || reply == null) return;

  reply.author = peeranhaReply.author.toHex();
  reply.postTime = peeranhaReply.postTime;
  reply.rating = peeranhaReply.rating;
  reply.postId = idToIndexId(Network.Polygon, postId.toString());
  reply.parentReplyId = peeranhaReply.parentReplyId;
  reply.commentCount = 0;
  reply.isFirstReply = peeranhaReply.isFirstReply;
  reply.isQuickReply = peeranhaReply.isQuickReply;
  reply.isOfficialReply = false;
  reply.isDeleted = false;
  reply.comments = [];
  reply.translations = [];
  reply.isBestReply = false;
  reply.content = '';

  const messengerUserDataResult = getPeeranhaContent().try_getItemProperty(ItemProperties.MessengerSender, postId, replyId, 0);
  if (!messengerUserDataResult.reverted) {
    const messengerUserData = messengerUserDataResult.value;
    reply.handle = messengerUserData.toString().slice(0, messengerUserData.length - 1);
    reply.messengerType = messengerUserData[messengerUserData.length - 1];
  }

  let post = Post.load(idToIndexId(Network.Polygon, postId.toString()));
  if (!post) return;
  if (peeranhaReply.parentReplyId == 0) {
    post.replyCount++;

    let replies = post.replies;
    replies.push(idToIndexId(Network.Polygon, postId.toString()) + '-' + replyId.toString())
    post.replies = replies;

    let community = getCommunity(post.communityId);
    community.replyCount++;
    community.save();
  }

  let user = getUser(Address.fromString(reply.author), blockTimeStamp);
  user.replyCount++;
  let userReplies = user.replies
  userReplies.push(reply.id);
  user.replies = userReplies;
  user.save();

  if (peeranhaReply.isFirstReply || peeranhaReply.isQuickReply) {
    updateUserRating(peeranhaReply.author, post.communityId);
  }
  updateUserRating(Address.fromString(reply.author), post.communityId);
  addDataToReply(post, reply, replyId);
  post.postContent += ' ' + reply.content;
  post.save();
}

export function addDataToReply(post: Post, reply: Reply, replyId: i32): void {
  const postId = BigInt.fromString(indexIdToId(post.id))
  const peeranhaReply = getPeeranhaContent().getReply(postId, replyId);
  if (!peeranhaReply) return;

  changedStatusOfficialReply(post, reply, replyId);
  reply.ipfsHash = peeranhaReply.ipfsDoc.hash;
  reply.ipfsHash2 = peeranhaReply.ipfsDoc.hash2;
  let replyLanguageResult = getPeeranhaContent().try_getItemLanguage(postId, replyId, 0);
  if(!replyLanguageResult.reverted) {
    reply.language = replyLanguageResult.value.toI32();
  } else {
    reply.language = Language.English;
  }
  
  getIpfsReplyData(reply);
}

function getIpfsReplyData(reply: Reply): void {
  let result = convertIpfsHash(reply.ipfsHash as Bytes);
  if (!result) return;

  let ipfsData = bytesToJson(result);
  if (ipfsData && isValidIPFS(ipfsData)) {
    let ipfsObj = ipfsData.toObject()

    let content = ipfsObj.get('content');
    if (content && !content.isNull()) {
      reply.content = content.toString();
    }
  } else {
    reply.content = ERROR_IPFS;
  }
}

export function deleteReply(reply: Reply, post: Post, blockTimeStamp: BigInt): void {
  reply.isDeleted = true;

  updateUserRating(Address.fromString(reply.author), post.communityId);

  if (reply.parentReplyId == 0) {
    let community = getCommunity(post.communityId);
    community.replyCount--;
    community.save();
  }

  if (reply.isBestReply) {
    post.bestReply = 0;
  }
  if (reply.isOfficialReply) {
    post.officialReply = 0;
  }
  post.lastmod = blockTimeStamp;
  post.save();

  let isReplyUserBanned = isUserBanned(reply.author, post.communityId);
  if (!isReplyUserBanned) {
    let user = getUser(Address.fromString(reply.author), blockTimeStamp);
    user.replyCount--;
    user.save();
  }

  for (let i = 1; i <= reply.commentCount; i++) {
    let comment = Comment.load(reply.id + '-' + i.toString());
    if (comment != null && !comment.isDeleted) {
      comment.isDeleted = true;
      comment.save();
    }
  }
}

export function newComment(comment: Comment, post: Post, parentReplyId: i32, commentId: i32, blockTimeStamp: BigInt): void {
  const postId = BigInt.fromString(indexIdToId(post.id));
  let peeranhaComment = getPeeranhaContent().getComment(postId, parentReplyId, commentId);
  if (peeranhaComment == null) return;

  comment.author = peeranhaComment.author.toHex();
  comment.postTime = peeranhaComment.postTime;
  comment.postId = post.id;
  comment.rating = peeranhaComment.rating;
  comment.parentReplyId = parentReplyId;  
  comment.isDeleted = false;
  comment.translations = [];
  comment.content = '';

  let commentFullId = post.id + '-' + parentReplyId.toString() + '-' + commentId.toString();
  if (parentReplyId == 0) {
    post.commentCount++;
    let comments = post.comments;
    comments.push(commentFullId);
    post.comments = comments;

  } else {
    let reply = Reply.load(post.id + '-' + parentReplyId.toString());
    if (reply) {
      reply.commentCount++;
      let comments = reply.comments
      comments.push(commentFullId)
      reply.comments = comments

      reply.save();
    }
  }

  let user = getUser(Address.fromString(comment.author), blockTimeStamp);
  user.replyCount++;
  let userComments = user.comments
  userComments.push(comment.id);
  user.comments = userComments;
  user.save();

  addDataToComment(comment, postId, parentReplyId, commentId);
  updateUserRating(Address.fromString(post.author), post.communityId);
  post.postContent += ' ' + comment.content;
  post.lastmod = peeranhaComment.postTime;
  post.save();
}

export function addDataToComment(comment: Comment, postId: BigInt, parentReplyId: i32, commentId: i32): void {
  let peeranhaComment = getPeeranhaContent().getComment(postId, parentReplyId, commentId);
  if (peeranhaComment == null) return;

  comment.ipfsHash = peeranhaComment.ipfsDoc.hash;
  comment.ipfsHash2 = peeranhaComment.ipfsDoc.hash2;
  let commentLanguageResult = getPeeranhaContent().try_getItemLanguage(postId, parentReplyId, commentId);
  if(!commentLanguageResult.reverted) {
    comment.language = commentLanguageResult.value.toI32();
  } else {
    comment.language = Language.English;
  }
  
  getIpfsCommentData(comment);
}

function getIpfsCommentData(comment: Comment): void {
  let result = convertIpfsHash(comment.ipfsHash as Bytes);
  if (!result) return;

  let ipfsData = bytesToJson(result);
  if (ipfsData && isValidIPFS(ipfsData)) {
    let ipfsObj = ipfsData.toObject()

    let content = ipfsObj.get('content');
    if (content && !content.isNull()) {
      comment.content = content.toString();
    }
  } else {
    comment.content = ERROR_IPFS;
  }
}

export function deleteComment(comment: Comment, post: Post): void {
  comment.isDeleted = true;
  if (comment.author !== post.author) {
    updateUserRating(Address.fromString(comment.author), post.communityId);
  }
}

export function newPostTranslation(postTranslation: PostTranslation, postId: BigInt, language: i32): void {
  let peeranhaTranslation = getPeeranhaContent().getTranslation(postId, 0, 0, language);
  if (!peeranhaTranslation) return;
  postTranslation.language = language;

  addDataToPostTranslation(postTranslation, postId, language);

  let post = Post.load(idToIndexId(Network.Polygon, postId.toString()));
  if (post) {
    postTranslation.postId = post.id;
    let postTranslations = post.translations;
    postTranslations.push(postTranslation.id);
    post.translations = postTranslations;
    post.postContent += ' ' + postTranslation.title + ' ' + postTranslation.content
    post.save();
  }
}

export function addDataToPostTranslation(postTranslation: PostTranslation, postId: BigInt, language: i32): void {
  let peeranhaTranslation = getPeeranhaContent().getTranslation(postId, 0, 0, language);
  if (!peeranhaTranslation) return;

  postTranslation.author = peeranhaTranslation.author.toHex();
  postTranslation.ipfsHash = peeranhaTranslation.ipfsDoc.hash;
  getIpfsPostTranslationData(postTranslation);
}

function getIpfsPostTranslationData(postTranslation: PostTranslation): void {
  let result = convertIpfsHash(postTranslation.ipfsHash as Bytes);
  if (!result) return;

  let ipfsData = bytesToJson(result);
  if (ipfsData && isValidIPFS(ipfsData)) {
    let ipfsObj = ipfsData.toObject()

    let title = ipfsObj.get('title');
    if (title && !title.isNull()) {
      postTranslation.title = title.toString();
    } else {
      postTranslation.title = '';
    }

    let content = ipfsObj.get('content');
    if (content && !content.isNull()) {
      postTranslation.content = content.toString();
    } else {
      postTranslation.content = '';
    }
  } else {
    postTranslation.title = ERROR_IPFS;
    postTranslation.content = ERROR_IPFS;
  }
}

export function newReplyTranslation(replyTranslation: ReplyTranslation, postId: BigInt, replyId: i32, language: i32): void {
  let peeranhaTranslation = getPeeranhaContent().getTranslation(postId, replyId, 0, language);
  if (!peeranhaTranslation) return;
  replyTranslation.language = language;
  replyTranslation.content = '';

  addDataToReplyTranslation(replyTranslation, postId, replyId, language);

  let reply = Reply.load(idToIndexId(Network.Polygon, postId.toString()) + '-' + replyId.toString());
  if (reply) {
    replyTranslation.replyId = reply.id;
    let replyTranslations = reply.translations;
    replyTranslations.push(replyTranslation.id);
    reply.translations = replyTranslations;
    reply.save();

    let post = Post.load(idToIndexId(Network.Polygon, postId.toString()));
    if (post) {
      post.postContent += ' ' + replyTranslation.content;
      post.save();
    }
  }
}

export function addDataToReplyTranslation(replyTranslation: ReplyTranslation, postId: BigInt, replyId: i32, language: i32): void {
  let peeranhaTranslation = getPeeranhaContent().getTranslation(postId, replyId, 0, language);
  if (peeranhaTranslation == null) return;

  replyTranslation.author = peeranhaTranslation.author.toHex();
  replyTranslation.ipfsHash = peeranhaTranslation.ipfsDoc.hash;

  getIpfsReplyTranslationData(replyTranslation);
}

function getIpfsReplyTranslationData(replyTranslation: ReplyTranslation): void {
  let result = convertIpfsHash(replyTranslation.ipfsHash as Bytes);
  if (!result) return;

  let ipfsData = bytesToJson(result);
  if (ipfsData && isValidIPFS(ipfsData)) {
    let ipfsObj = ipfsData.toObject();

    let content = ipfsObj.get('content');
    if (content && !content.isNull()) {
      replyTranslation.content = content.toString();
    }
  } else {
    replyTranslation.content = ERROR_IPFS;
  }
}

export function newCommentTranslation(commentTranslation: CommentTranslation, postId: BigInt, parentReplyId: i32, commentId: i32, language: i32): void {
  let peeranhaTranslation = getPeeranhaContent().getTranslation(postId, parentReplyId, commentId, language);
  if (!peeranhaTranslation) return;
  commentTranslation.language = language;
  commentTranslation.content = '';

  addDataToCommentTranslation(commentTranslation, postId, parentReplyId, commentId, language);

  let comment = Comment.load(idToIndexId(Network.Polygon, postId.toString()) + '-' + parentReplyId.toString() + '-' + commentId.toString());
  if (comment != null) {
    commentTranslation.commentId = comment.id;
    let commentTranslations = comment.translations;
    commentTranslations.push(commentTranslation.id);
    comment.translations = commentTranslations;
    comment.save();

    let post = Post.load(idToIndexId(Network.Polygon, postId.toString()));
    if (post) {
      post.postContent += ' ' + commentTranslation.content;
      post.save();
    }
  }
}

export function addDataToCommentTranslation(commentTranslation: CommentTranslation, postId: BigInt, parentReplyId: i32, commentId: i32, language: i32): void {
  let peeranhaTranslation = getPeeranhaContent().getTranslation(postId, parentReplyId, commentId, language);
  if (peeranhaTranslation == null) return;

  commentTranslation.author = peeranhaTranslation.author.toHex();
  commentTranslation.ipfsHash = peeranhaTranslation.ipfsDoc.hash;
  getIpfsCommentTranslationData(commentTranslation);
}

function getIpfsCommentTranslationData(commentTranslation: CommentTranslation): void {
  let result = convertIpfsHash(commentTranslation.ipfsHash as Bytes);
  if (!result) return;

  let ipfsData = bytesToJson(result);
  if (ipfsData && isValidIPFS(ipfsData)) {
    let ipfsObj = ipfsData.toObject();

    let content = ipfsObj.get('content');
    if (content && !content.isNull()) {
      commentTranslation.content = content.toString();
    }
  } else {
    commentTranslation.content = ERROR_IPFS;
  }
}

export function updatePostContent(postId: BigInt): void {
  let post = Post.load(idToIndexId(Network.Polygon, postId.toString()));
  if (!post) return;
  post.postContent = '';
  
  let peeranhaPost = getPeeranhaContent().getPost(postId);
  if (!peeranhaPost) return;
  let postTagsBuf = post.tags;
  for (let i = 0; i < post.tags.length; i++) {
    let tagId = postTagsBuf.pop();
    if (!tagId) continue;
    let tag = Tag.load(tagId);
    if (tag) {
      post.postContent += ' ' + tag.name;

      let tagTranslationsBuf = tag.translations;
      for (let i = 0; i < tag.translations.length; i++) {
        let translationsId = tagTranslationsBuf.pop();
        if (!translationsId) continue;
        let translation = TagTranslation.load(translationsId);
        if (translation) {
          post.postContent += ' ' + translation.name;
        }
      }
    }
  }
  post.postContent += ' ' + post.title;
  post.postContent += ' ' + post.content;

  let postTranslationsBuf = post.translations;
  for (let i = 0; i < post.translations.length; i++) {
    let translationsId = postTranslationsBuf.pop();
    if (!translationsId) continue;
    let translation = PostTranslation.load(translationsId);
    if (translation) {
      post.postContent += ' ' + translation.title + ' ' + translation.content;
    }
  }

  for (let replyId = 1; replyId <= post.replyCount; replyId++) {
    let reply = Reply.load(idToIndexId(Network.Polygon, postId.toString()) + '-' + replyId.toString());
    if (reply && !reply.isDeleted) {
      post.postContent += ' ' + reply.content;
      let replyTranslationsBuf = reply.translations;
      for (let i = 0; i < reply.translations.length; i++) {
        let translationsId = replyTranslationsBuf.pop();
        if (!translationsId) continue;
        let translation = ReplyTranslation.load(translationsId);
        if (translation) {
          post.postContent += ' ' + translation.content;
        }
      }

      for (let commentId = 1; commentId <= reply.commentCount; commentId++) {
        let comment = Comment.load(idToIndexId(Network.Polygon, postId.toString()) + '-' + replyId.toString() + '-' + commentId.toString());
        if (comment && !comment.isDeleted) {
          post.postContent += ' ' + comment.content;
          let commentTranslationsBuf = comment.translations;
          for (let i = 0; i < comment.translations.length; i++) {
            let translationsId = commentTranslationsBuf.pop();
            if (!translationsId) continue;
            let translation = CommentTranslation.load(translationsId);
            if (translation) {
              post.postContent += ' ' + translation.content;
            }
          }
        }
      }
    }
  }

  for (let commentId = 1; commentId <= post.commentCount; commentId++) {
    let comment = Comment.load(idToIndexId(Network.Polygon, postId.toString()) + '-0-' + commentId.toString());
    if (comment && !comment.isDeleted) {
      post.postContent += ' ' + comment.content;
      let commentTranslationsBuf = comment.translations;
      for (let i = 0; i < comment.translations.length; i++) {
        let translationsId = commentTranslationsBuf.pop();
        if (!translationsId) continue;
        let translation = CommentTranslation.load(translationsId);
        if (translation != null) {
          post.postContent += ' ' + translation.content;
        }
      }
    }
  }
  post.save();
}

function changedStatusOfficialReply(post: Post, reply: Reply, replyId: i32): void {
  const postId = BigInt.fromString(indexIdToId(post.id))
  const peeranhaPost = getPeeranhaContent().getPost(postId);
  if (!post || !peeranhaPost) return;

  let previousOfficialReplyId = 0;
  if (peeranhaPost.officialReply == replyId && post.officialReply != replyId) {
    previousOfficialReplyId = post.officialReply;
    post.officialReply = replyId;
    reply.isOfficialReply = true;

  } else if (peeranhaPost.officialReply == 0 && post.officialReply == replyId) {
    reply.isOfficialReply = false;
    post.officialReply = 0;
  }

  if (previousOfficialReplyId != 0) {   // rewrite move to if (peeranhaPost.officialReply == replyId ...
    let previousOfficialReply = Reply.load(post.id + '-' + previousOfficialReplyId.toString());

    if (previousOfficialReply) {
      previousOfficialReply.isOfficialReply = false;
      previousOfficialReply.save();
    }
  }
}

let posts: string[] = [];
let uniqueOldPosts: string[] = [];
let uniqueNewPosts: string[] = [];

export function generateDocumentationPosts(
  communityId: BigInt,
  userAddr: Address,
  lastmodTimestamp: BigInt,
  oldDocumentationIpfsHash: Bytes | null, 
  newDocumentationIpfsHash: Bytes
): void {
  let newPosts: string[] = [];
  let oldPosts: string[] = [];

  if (oldDocumentationIpfsHash) {
    const oldDocumentation = indexingDocumentation(communityId, oldDocumentationIpfsHash as Bytes);
    for (let index = 0; index < posts.length; index++) {
      oldPosts.push(posts[index]);
    }
  }
  const newDoc = indexingDocumentation(communityId, newDocumentationIpfsHash);
  if (newDoc) {
    newDoc.save();
  }
  uniqueOldPosts.splice(0,uniqueOldPosts.length);
  oldPosts.forEach((element) => {
      if (!uniqueOldPosts.includes(element)) {
          uniqueOldPosts.push(element);
      }
  });

  oldPosts = uniqueOldPosts;
  let community = getCommunity(idToIndexId(Network.Polygon, communityId.toString()));
  community.documentationCount = posts.length ? posts.length-1 : posts.length;
  community.save();
  for (let index = 0; index < posts.length; index++) {
    newPosts.push(posts[index]);
  }
  uniqueNewPosts.splice(0,uniqueNewPosts.length);;
  newPosts.forEach((element) => {
      if (!uniqueNewPosts.includes(element)) {
          uniqueNewPosts.push(element);
      }
  });

  newPosts = uniqueNewPosts;
  let listCreatePosts: string[] = []
  let listDeletePosts: string[] = []
  for (let index = 0; index < newPosts.length; index++) {
    if (oldPosts.indexOf(newPosts[index]) !== -1){
      listCreatePosts.push(newPosts[index]);
    }
  }
  for (let index = 0; index < oldPosts.length; index++) {
    if (newPosts.indexOf(oldPosts[index]) === -1){
      listDeletePosts.push(oldPosts[index]);
    }
  }

  // creating Posts
  for (let index = 0; index < newPosts.length; index++) {
    if(newPosts[index] !== "" && listCreatePosts.indexOf(newPosts[index]) === -1){ 
      let post = new Post(idToIndexId(Network.Polygon, newPosts[index]));
      post.author = userAddr.toHex();
      post.communityId = community.id;
      post.lastmod = lastmodTimestamp;
      post.isDeleted = false;
      post.postType = PostType.Documentation;
      post.ipfsHash = ByteArray.fromHexString(newPosts[index]) as Bytes;
      post.replies = [];
      post.comments = [];
      post.translations = [];
      post.tags = [];
      post.postContent = '';
      post.title = '';
      post.content = '';
      post.networkId = Network.Polygon;

      getIpfsPostData(post);
      post.save();
    }
  }

  // deleting Posts
  for (let index = 0; index < listDeletePosts.length; index++) {
    store.remove("Post", listDeletePosts[index]);
  }
}

export function indexingDocumentation(
  communityId: BigInt,
  ipfsHash: Bytes,
): CommunityDocumentation | null {
  posts.splice(0, posts.length);
  let documentation = CommunityDocumentation.load(idToIndexId(Network.Polygon, communityId.toString()));
  let result = convertIpfsHash(ipfsHash);
  if (!documentation || !result) {
    return null;
  }
  documentation.ipfsHash = ipfsHash;
  documentation.documentationJson = result.toString();

  let ipfsData = bytesToJson(result);
  if (ipfsData && isValidIPFS(ipfsData)) {
    let ipfsObj = ipfsData.toObject()

    const pinnedPost = ipfsObj.get('pinnedPost');
    if (pinnedPost != null && pinnedPost.kind == JSONValueKind.OBJECT){
      const pinnedId = pinnedPost.toObject().get('id');
      const pinnedTitle = pinnedPost.toObject().get('title');
      if (pinnedId &&
        pinnedTitle &&
        !pinnedId.isNull() && 
        !pinnedTitle.isNull() && 
        pinnedId.kind == JSONValueKind.STRING && 
        pinnedTitle.kind == JSONValueKind.STRING
      ) {
        if(pinnedId.toString() !== "" && pinnedTitle.toString() !== ""){
          posts.push(pinnedId.toString());
        } else {
          log.error("id or/and title of pinned post is empty", []);
        }
      } else {
        log.error("id or/and title of pinned post not found or not a string", []);
      }
    }

    const documentations = ipfsObj.get('documentations');
    if (documentations && documentations.kind == JSONValueKind.ARRAY) {
      const documentationsArray = documentations.toArray();

      for (let i = 0; i < documentationsArray.length; i++) {
        const documentationObject = documentationsArray[i];
        const id = documentationObject.toObject().get('id');
        const title = documentationObject.toObject().get('title');
        if (
          id &&
          title &&
          !id.isNull() && 
          !title.isNull() && 
          id.kind == JSONValueKind.STRING && 
          title.kind == JSONValueKind.STRING
        ) {
          if(id.toString() !== "" && title.toString() !== "") {
            let children = documentationObject.toObject().get('children');
            posts.push(id.toString())
            if (children && !children.isNull() && children.kind == JSONValueKind.ARRAY) {
              if (children.toArray().length > 0) {
                documentation = indexingJson(documentation, children.toArray());
              }
            }
          } else {
            log.error("id or/and title of post is empty", []);
          }
        } else {
          log.error("id or/and title of post not found or not a string", []);
        }
      }
    } else {
      log.error("'documentations' not found or not a array", []);
    }
  }

  return documentation;
}

function indexingJson(
  documentation: CommunityDocumentation | null, 
  children: JSONValue[]
): CommunityDocumentation | null {
  const childrenLength = children.length;
  for (let i = 0; i < childrenLength; i++) {
    const id = children[i].toObject().get("id");
    const title = children[i].toObject().get("title");
    if (
      id &&
      title &&
      !id.isNull() && 
      !title.isNull() && 
      id.kind == JSONValueKind.STRING && 
      title.kind == JSONValueKind.STRING
    ) {
      if (id.toString() !== "" && title.toString() !== "") {
        posts.push(id.toString());
        if (children[i].kind == JSONValueKind.OBJECT) {
          if (
            !children[i].toObject().get("children")!.isNull() && 
            children[i].toObject().get("children")!.kind == JSONValueKind.ARRAY
          ) {

              if (children[i].toObject().get("children")!.toArray().length > 0)
                documentation = indexingJson(documentation, children[i].toObject().get("children")!.toArray());
          
            } else {
            log.error("field 'children' in children post is empty or not an array", []);
          }
        } else {
          log.error("children post is not an object", []);
        }
      } else {
        log.error("id or/and title of children post is empty", []);
      }
    } else {
      log.error("id or/and title of children post not found or not a string", []);
    }
  }

  return documentation;
}