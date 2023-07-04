import { json, Bytes, ipfs, BigInt, Address, ByteArray, log, store, JSONValue, JSONValueKind } from '@graphprotocol/graph-ts'
import { Post, Reply, Comment, Tag, CommunityDocumentation, PostTranslation, ReplyTranslation, CommentTranslation, TagTranslation } from '../generated/schema'
import { getPeeranhaContent, ERROR_IPFS, isValidIPFS, PostType, ItemProperties, Language } from './utils'
import { updateUserRating, getUser, newUser } from './user'
import { getCommunity } from './community-tag'

export function newPost(post: Post | null, postId: BigInt, blockTimestamp: BigInt): void {
  let peeranhaPost = getPeeranhaContent().getPost(postId);
  if (peeranhaPost == null) return;

  post.communityId = peeranhaPost.communityId;
  post.postType = peeranhaPost.postType;
  post.author = peeranhaPost.author.toHex();
  post.rating = peeranhaPost.rating;
  post.postTime = peeranhaPost.postTime;
  post.lastmod = peeranhaPost.postTime;
  post.commentCount = 0;
  post.replyCount = 0;
  post.deletedReplyCount = 0;
  post.officialReply = 0;
  post.bestReply = peeranhaPost.bestReply;
  post.isDeleted = false;
  post.replies = [];
  post.comments = [];
  post.translations = [];
  post.tags = [];
  post.postContent = '';

  const messengerUserDataResult = getPeeranhaContent().try_getItemProperty(ItemProperties.MessengerSender, postId, 0, 0);
  if (!messengerUserDataResult.reverted) {
    const messengerUserData = messengerUserDataResult.value;
    post.handle = messengerUserData.toString().slice(0, messengerUserData.length - 1);
    post.messengerType = messengerUserData[messengerUserData.length - 1];
  }

  let community = getCommunity(post.communityId);
  community.postCount++;
  community.save();

  let user = getUser(peeranhaPost.author);
  if (user == null) {
    newUser(user, peeranhaPost.author, blockTimestamp);
  }
  user.postCount++;
  user.save();

  addDataToPost(post, postId);
}

export function addDataToPost(post: Post | null, postId: BigInt): void {
  let peeranhaPost = getPeeranhaContent().getPost(postId);
  if (peeranhaPost == null) return;

  let postTagsBuf = peeranhaPost.tags;
  let oldPostTags = post.tags;
  let postTags = post.tags;
  postTags = [];
  for (let i = 0; i < peeranhaPost.tags.length; i++) {
    let newTag = postTagsBuf.pop();
    let tagId = peeranhaPost.communityId.toString() + '-' + newTag.toString();
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

    if(!post.tags.includes(oldTag)) {
      let tag = Tag.load(oldTag);
      if (tag != null) {
        tag.postCount--;
        tag.save();
      }
    }
  }
  
  post.ipfsHash = peeranhaPost.ipfsDoc.hash;
  post.ipfsHash2 = peeranhaPost.ipfsDoc.hash2;
  let postLanguageResult = getPeeranhaContent().try_getItemLanguage(postId, 0, 0);
  if(!postLanguageResult.reverted) {
    post.language = postLanguageResult.value;
  } else {
    post.language = new BigInt(Language.English);
  }

  if (post.communityId != peeranhaPost.communityId) {
    const oldCommunity = getCommunity(post.communityId);

    // let replyCount = 0;
    // for (let i = 1; i <= post.replyCount; i++) {
    //   const reply = Reply.load(post.id.toString() + '-' + i.toString());
    //   if (reply != null && !reply.isDeleted) {
    //     replyCount++;
    //   }
    // }

    oldCommunity.postCount--;
    oldCommunity.replyCount -= post.replyCount - post.deletedReplyCount;
    oldCommunity.save();

    const newCommunity = getCommunity(peeranhaPost.communityId);
    newCommunity.postCount++;
    newCommunity.replyCount += post.replyCount - post.deletedReplyCount;
    newCommunity.save();

    updatePostUsersRatings(post);
    post.communityId = peeranhaPost.communityId;
    updatePostUsersRatings(post);
  }
  if (post.postType != peeranhaPost.postType) {
    updatePostUsersRatings(post);
    post.postType = peeranhaPost.postType;
  }

  getIpfsPostData(post);
  updateUserRating(Address.fromString(post.author), post.communityId);
}

function getIpfsPostData(post: Post | null): void {
  let hashstr = post.ipfsHash.toHexString();
  let hashHex = '1220' + hashstr.slice(2);
  let ipfsBytes = ByteArray.fromHexString(hashHex);
  let ipfsHashBase58 = ipfsBytes.toBase58();
  let result = ipfs.cat(ipfsHashBase58) as Bytes;
  
  if (result != null) {
    let ipfsData = json.fromBytes(result);
  
    if (isValidIPFS(ipfsData)) {
      let ipfsObj = ipfsData.toObject()
      let title = ipfsObj.get('title');
      if (!title.isNull()) {
        post.title = title.toString();
        post.postContent += ' ' + title.toString();
      }
  
      let content = ipfsObj.get('content');
      if (!content.isNull()) {
        post.content = content.toString();
        post.postContent += ' ' + content.toString();
      }
    } else {
      post.title = ERROR_IPFS;
      post.content = ERROR_IPFS;
    }
  }
}

export function deletePost(post: Post | null, postId: BigInt): void {
  post.isDeleted = true;

  updateUserRating(Address.fromString(post.author), post.communityId);
  let community = getCommunity(post.communityId);

  let tagsLength = post.tags.length;
  let postTagsBuf = post.tags;
  for (let i = 0; i < tagsLength; i++) {
    let tagBuf = postTagsBuf.pop();
    let tag = Tag.load(tagBuf);
    if (tag != null) {
      tag.postCount--;
      tag.deletedPostCount++;
      tag.save();
    }
  }

  for (let replyId = 1; replyId <= post.replyCount; replyId++) {
    let reply = Reply.load(postId.toString() + '-' + replyId.toString());
    if (reply != null && !reply.isDeleted) {
      updateUserRating(Address.fromString(reply.author), post.communityId);
      
      let userReply = getUser(Address.fromString(reply.author));
      userReply.replyCount--;
      userReply.save();
      
      community.replyCount--;

      for (let j = 1; j <= reply.commentCount; j++) {
        let comment = Comment.load(postId.toString() + '-' + i.toString() + '-' + j.toString());
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

  let userPost = getUser(Address.fromString(post.author));
  userPost.postCount--;
  userPost.save();

  for (let i = 1; i <= post.commentCount; i++) {
    let comment = Comment.load(postId.toString() + '-0-' + i.toString());
    if (comment != null && !comment.isDeleted) {
      comment.isDeleted = true;
      comment.save();
    }
  }
}

export function updatePostUsersRatings(post: Post | null): void {
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

export function newReply(reply: Reply | null, postId: BigInt, replyId: i32, blockTimestamp: BigInt): void {
  let peeranhaReply = getPeeranhaContent().getReply(postId, replyId);
  if (peeranhaReply == null || reply == null) return;

  reply.author = peeranhaReply.author.toHex();
  reply.postTime = peeranhaReply.postTime;
  reply.rating = peeranhaReply.rating;
  reply.postId = postId;
  reply.parentReplyId = peeranhaReply.parentReplyId;
  reply.commentCount = 0;
  reply.isFirstReply = peeranhaReply.isFirstReply;
  reply.isQuickReply = peeranhaReply.isQuickReply;
  reply.isOfficialReply = false;
  reply.isDeleted = false;
  reply.comments = [];
  reply.translations = [];
  reply.isBestReply = false;

  const messengerUserDataResult = getPeeranhaContent().try_getItemProperty(ItemProperties.MessengerSender, postId, replyId, 0);
  if (!messengerUserDataResult.reverted) {
    const messengerUserData = messengerUserDataResult.value;
    reply.handle = messengerUserData.toString().slice(0, messengerUserData.length - 1);
    reply.messengerType = messengerUserData[messengerUserData.length - 1];
  }

  let post = Post.load(postId.toString())
  if (peeranhaReply.parentReplyId == 0) {
    if (post != null) {
      post.replyCount++;

      let replies = post.replies;
      replies.push(postId.toString() + '-' + replyId.toString())
      post.replies = replies;

      let community = getCommunity(post.communityId);
      community.replyCount++;
      community.save();
    }
  }

  let user = getUser(Address.fromString(reply.author));
  if (user == null) {
    newUser(user, Address.fromString(reply.author), blockTimestamp);
  }
  user.replyCount++;
  user.save();

  if (peeranhaReply.isFirstReply || peeranhaReply.isQuickReply) {
    updateUserRating(peeranhaReply.author, post.communityId);
  }
  updateUserRating(Address.fromString(reply.author), post.communityId);
  addDataToReply(reply, postId, replyId);
  post.postContent += ' ' + reply.content;
  post.save();
}

export function addDataToReply(reply: Reply | null, postId: BigInt, replyId: i32): void {
  const peeranhaReply = getPeeranhaContent().getReply(postId, replyId);
  if (peeranhaReply == null) return;

  changedStatusOfficialReply(reply, postId, replyId);
  reply.ipfsHash = peeranhaReply.ipfsDoc.hash;
  reply.ipfsHash2 = peeranhaReply.ipfsDoc.hash2;
  let replyLanguageResult = getPeeranhaContent().try_getItemLanguage(postId, replyId, 0);
  if(!replyLanguageResult.reverted) {
    reply.language = replyLanguageResult.value;
  } else {
    reply.language = new BigInt(Language.English);
  }
  
  getIpfsReplyData(reply);
}

function getIpfsReplyData(reply: Reply | null): void {
  let hashstr = reply.ipfsHash.toHexString();
  let hashHex = '1220' + hashstr.slice(2);
  let ipfsBytes = ByteArray.fromHexString(hashHex);
  let ipfsHashBase58 = ipfsBytes.toBase58();
  let result = ipfs.cat(ipfsHashBase58) as Bytes;
  
  if (result != null) {
    let ipfsData = json.fromBytes(result);
  
    if (isValidIPFS(ipfsData)) {
      let ipfsObj = ipfsData.toObject()
  
      let content = ipfsObj.get('content');
      if (!content.isNull()) {
        reply.content = content.toString();
      }
    } else {
      reply.content = ERROR_IPFS;
    }
  }
}

export function deleteReply(reply: Reply | null, postId: BigInt): void {
  if (reply == null) return;
  reply.isDeleted = true;
  let post = Post.load(postId.toString());
  if (post == null) return;

  updateUserRating(Address.fromString(reply.author), post.communityId);

  if (reply.parentReplyId == 0) {
    let post = Post.load(postId.toString())
    if (post != null) {
      let community = getCommunity(post.communityId);
      community.replyCount--;
      community.save();
    }
  }

  if (reply.isBestReply) {
    post.bestReply = 0;
  }
  if (reply.isOfficialReply) {
    post.officialReply = 0;
  }
  post.deletedReplyCount++;
  post.save();

  let user = getUser(Address.fromString(reply.author));
  user.replyCount--;
  user.save();

  for (let i = 1; i <= reply.commentCount; i++) {
    let comment = Comment.load(reply.id + '-' + i.toString());
    if (comment != null && !comment.isDeleted) {
      comment.isDeleted = true;
      comment.save();
    }
  }
}

export function newComment(comment: Comment | null, postId: BigInt, parentReplyId: BigInt, commentId: BigInt): void {
  let peeranhaComment = getPeeranhaContent().getComment(postId, parentReplyId.toI32(), commentId.toI32());
  if (peeranhaComment == null) return;

  comment.author = peeranhaComment.author.toHex();
  comment.postTime = peeranhaComment.postTime;
  comment.postId = postId;
  comment.rating = peeranhaComment.rating;
  comment.parentReplyId = parentReplyId.toI32();  
  comment.isDeleted = false;
  comment.translations = [];
  let post = Post.load(postId.toString());
  let commentFullId = postId.toString() + '-' + parentReplyId.toString() +  '-' + commentId.toString();
  if (parentReplyId == BigInt.fromI32(0)) {
    
    if (post != null ) {    // init post
      post.commentCount++;
      let comments = post.comments
      comments.push(commentFullId)
      post.comments = comments

      
    }
  } else {
    let reply = Reply.load(postId.toString() + '-' + parentReplyId.toString());
    if (reply != null ) {     // init post
      reply.commentCount++;
      let comments = reply.comments
      comments.push(commentFullId)
      reply.comments = comments

      reply.save();
    }
  }

  addDataToComment(comment, postId, parentReplyId, commentId);
  updateUserRating(Address.fromString(post.author), post.communityId);
  post.postContent += ' ' + comment.content;
  post.save();
}

export function addDataToComment(comment: Comment | null, postId: BigInt, parentReplyId: BigInt, commentId: BigInt): void {
  let peeranhaComment = getPeeranhaContent().getComment(postId, parentReplyId.toI32(), commentId.toI32());
  if (peeranhaComment == null) return;

  comment.ipfsHash = peeranhaComment.ipfsDoc.hash;
  comment.ipfsHash2 = peeranhaComment.ipfsDoc.hash2;
  let commentLanguageResult = getPeeranhaContent().try_getItemLanguage(postId, parentReplyId.toI32(), commentId.toI32());
  if(!commentLanguageResult.reverted) {
    comment.language = commentLanguageResult.value;
  } else {
    comment.language = new BigInt(Language.English);
  }
  
  getIpfsCommentData(comment);
}

function getIpfsCommentData(comment: Comment | null): void {
  let hashstr = comment.ipfsHash.toHexString();
  let hashHex = '1220' + hashstr.slice(2);
  let ipfsBytes = ByteArray.fromHexString(hashHex);
  let ipfsHashBase58 = ipfsBytes.toBase58();
  let result = ipfs.cat(ipfsHashBase58) as Bytes;
  
  if (result != null) {
    let ipfsData = json.fromBytes(result);
  
    if (isValidIPFS(ipfsData)) {
      let ipfsObj = ipfsData.toObject()
  
      let content = ipfsObj.get('content');
      if (!content.isNull()) {
        comment.content = content.toString();
      }
    } else {
      comment.content = ERROR_IPFS;
    }
  }
}

export function deleteComment(comment: Comment | null, postId: BigInt): void {
  comment.isDeleted = true;
  const post = Post.load(postId.toString());
  if (comment.author !== post.author) {
    updateUserRating(Address.fromString(comment.author), post.communityId);
  }
}

export function newPostTranslation(postTranslation: PostTranslation | null, postId: BigInt, language: BigInt): void {
  let peeranhaTranslation = getPeeranhaContent().getTranslation(postId, 0, 0, language.toI32());
  if (peeranhaTranslation == null) return;
  postTranslation.postId = postId.toString() + "-0-0";
  postTranslation.language = language;

  addDataToPostTranslation(postTranslation, postId, language);

  let post = Post.load(postId.toString())
  if (post != null) {
    let postTranslations = post.translations;
    postTranslations.push(postTranslation.id);
    post.translations = postTranslations;
    post.postContent += ' ' + postTranslation.title + ' ' + postTranslation.content
    post.save();
  }
}

export function addDataToPostTranslation(postTranslation: PostTranslation | null, postId: BigInt, language: BigInt): void {
  let peeranhaTranslation = getPeeranhaContent().getTranslation(postId, 0, 0, language.toI32());
  if (peeranhaTranslation == null) return;

  postTranslation.author = peeranhaTranslation.author.toHex();
  postTranslation.ipfsHash = peeranhaTranslation.ipfsDoc.hash;
  getIpfsPostTranslationData(postTranslation);
}

function getIpfsPostTranslationData(postTranslation: PostTranslation | null): void {
  let hashstr = postTranslation.ipfsHash.toHexString();
  let hashHex = '1220' + hashstr.slice(2);
  let ipfsBytes = ByteArray.fromHexString(hashHex);
  let ipfsHashBase58 = ipfsBytes.toBase58();
  let result = ipfs.cat(ipfsHashBase58) as Bytes;
  
  if (result != null) {
    let ipfsData = json.fromBytes(result);
  
    if (isValidIPFS(ipfsData)) {
      let ipfsObj = ipfsData.toObject()
      let title = ipfsObj.get('title');
      if (!title.isNull()) {
        postTranslation.title = title.toString();
      }
  
      let content = ipfsObj.get('content');
      if (!content.isNull()) {
        postTranslation.content = content.toString();
      }
    } else {
      postTranslation.title = ERROR_IPFS;
      postTranslation.content = ERROR_IPFS;
    }
  }
}

export function newReplyTranslation(replyTranslation: ReplyTranslation | null, postId: BigInt, replyId: BigInt, language: BigInt): void {
  let peeranhaTranslation = getPeeranhaContent().getTranslation(postId, replyId.toI32(), 0, language.toI32());
  if (peeranhaTranslation == null) return;
  replyTranslation.replyId = replyId.toString() + "-" + replyId.toString() + "-0";
  replyTranslation.language = language;

  addDataToReplyTranslation(replyTranslation, postId, replyId, language);

  let reply = Reply.load(postId.toString() + "-" + replyId.toString());
  if (reply != null) {
    let replyTranslations = reply.translations;
    replyTranslations.push(replyTranslation.id);
    reply.translations = replyTranslations;
    reply.save();

    let post = Post.load(postId.toString())
    if (post != null) {
      post.postContent += ' ' + replyTranslation.content;
      post.save();
    }
  }
}

export function addDataToReplyTranslation(replyTranslation: ReplyTranslation | null, postId: BigInt, replyId: BigInt, language: BigInt): void {
  let peeranhaTranslation = getPeeranhaContent().getTranslation(postId, replyId.toI32(), 0, language.toI32());
  if (peeranhaTranslation == null) return;

  replyTranslation.author = peeranhaTranslation.author.toHex();
  replyTranslation.ipfsHash = peeranhaTranslation.ipfsDoc.hash;

  getIpfsReplyTranslationData(replyTranslation);
}

function getIpfsReplyTranslationData(replyTranslation: ReplyTranslation | null): void {
  let hashstr = replyTranslation.ipfsHash.toHexString();
  let hashHex = '1220' + hashstr.slice(2);
  let ipfsBytes = ByteArray.fromHexString(hashHex);
  let ipfsHashBase58 = ipfsBytes.toBase58();
  let result = ipfs.cat(ipfsHashBase58) as Bytes;
  
  if (result != null) {
    let ipfsData = json.fromBytes(result);
  
    if (isValidIPFS(ipfsData)) {
      let ipfsObj = ipfsData.toObject();
  
      let content = ipfsObj.get('content');
      if (!content.isNull()) {
        replyTranslation.content = content.toString();
      }
    } else {
      replyTranslation.content = ERROR_IPFS;
    }
  }
}

export function newCommentTranslation(commentTranslation: CommentTranslation | null, postId: BigInt, parentReplyId: BigInt, commentId: BigInt, language: BigInt): void {
  let peeranhaTranslation = getPeeranhaContent().getTranslation(postId, parentReplyId.toI32(), commentId.toI32(), language.toI32());
  if (peeranhaTranslation == null) return;
  commentTranslation.commentId = parentReplyId.toString() + "-" + parentReplyId.toString() + "-" + commentId.toString();
  commentTranslation.language = language;

  addDataToCommentTranslation(commentTranslation, postId, parentReplyId, commentId, language);

  let comment = Comment.load(postId.toString() + "-" + parentReplyId.toString() + "-" +  commentId.toString());
  if (comment != null) {
    let commentTranslations = comment.translations;
    commentTranslations.push(commentTranslation.id);
    comment.translations = commentTranslations;
    comment.save();

    let post = Post.load(postId.toString())
    if (post != null) {
      post.postContent += ' ' + commentTranslation.content;
      post.save();
    }
  }
}

export function addDataToCommentTranslation(commentTranslation: CommentTranslation | null, postId: BigInt, parentReplyId: BigInt, commentId: BigInt, language: BigInt): void {
  let peeranhaTranslation = getPeeranhaContent().getTranslation(postId, parentReplyId.toI32(), commentId.toI32(), language.toI32());
  if (peeranhaTranslation == null) return;

  commentTranslation.author = peeranhaTranslation.author.toHex();
  commentTranslation.ipfsHash = peeranhaTranslation.ipfsDoc.hash;
  getIpfsCommentTranslationData(commentTranslation);
}

function getIpfsCommentTranslationData(commentTranslation: CommentTranslation | null): void {
  let hashstr = commentTranslation.ipfsHash.toHexString();
  let hashHex = '1220' + hashstr.slice(2);
  let ipfsBytes = ByteArray.fromHexString(hashHex);
  let ipfsHashBase58 = ipfsBytes.toBase58();
  let result = ipfs.cat(ipfsHashBase58) as Bytes;
  
  if (result != null) {
    let ipfsData = json.fromBytes(result);
  
    if (isValidIPFS(ipfsData)) {
      let ipfsObj = ipfsData.toObject();
  
      let content = ipfsObj.get('content');
      if (!content.isNull()) {
        commentTranslation.content = content.toString();
      }
    } else {
      commentTranslation.content = ERROR_IPFS;
    }
  }
}

export function updatePostContent(postId: BigInt): void {
  let post = Post.load(postId.toString());
  if (post == null) return;
  post.postContent = '';
  
  let peeranhaPost = getPeeranhaContent().getPost(postId);
  if (peeranhaPost == null) return;
  let postTagsBuf = post.tags;
  for (let i = 0; i < post.tags.length; i++) {
    let tagId = postTagsBuf.pop();
    let tag = Tag.load(tagId);
    if (tag != null) {
      post.postContent += ' ' + tag.name;

      let tagTranslationsBuf = tag.translations;
      for (let i = 0; i < tag.translations.length; i++) {
        let translationsId = tagTranslationsBuf.pop();
        let translation = TagTranslation.load(translationsId);
        if (translation != null) {
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
    let translation = PostTranslation.load(translationsId);
    if (translation != null) {
      post.postContent += ' ' + translation.title + ' ' + translation.content;
    }
  }

  for (let replyId = 1; replyId <= post.replyCount; replyId++) {
    let reply = Reply.load(postId.toString() + '-' + replyId.toString());
    if (reply != null && !reply.isDeleted) {
      post.postContent += ' ' + reply.content;
      let replyTranslationsBuf = reply.translations;
      for (let i = 0; i < reply.translations.length; i++) {
        let translationsId = replyTranslationsBuf.pop();
        let translation = ReplyTranslation.load(translationsId);
        if (translation != null) {
          post.postContent += ' ' + translation.content;
        }
      }
    
      for (let commentId = 1; commentId <= reply.commentCount; commentId++) {
        let comment = Comment.load(postId.toString() + '-' + replyId.toString() + '-' +  commentId.toString());
        if (comment != null && !comment.isDeleted) {
          post.postContent += ' ' + comment.content;
          let commentTranslationsBuf = comment.translations;
          for (let i = 0; i < comment.translations.length; i++) {
            let translationsId = commentTranslationsBuf.pop();
            let translation = CommentTranslation.load(translationsId);
            if (translation != null) {
              post.postContent += ' ' + translation.content;
            }
          }
        }
      }
    }
  }
  for (let commentId = 1; commentId <= post.commentCount; commentId++) {
    let comment = Comment.load(postId.toString() + '-' + '0' + '-' +  commentId.toString());
    if (comment != null && !comment.isDeleted) {
      post.postContent += ' ' + comment.content;
      let commentTranslationsBuf = comment.translations;
      for (let i = 0; i < comment.translations.length; i++) {
        let translationsId = commentTranslationsBuf.pop();
        let translation = CommentTranslation.load(translationsId);
        if (translation != null) {
          post.postContent += ' ' + translation.content;
        }
      }
    }
  }
  post.save();
}

function changedStatusOfficialReply(reply: Reply | null, postId: BigInt, replyId: i32): void {
  let post = Post.load(postId.toString())
  const peeranhaPost = getPeeranhaContent().getPost(postId);
  if (post == null || peeranhaPost == null) return;

  let previousOfficialReplyId = 0;
  if (peeranhaPost.officialReply == replyId && post.officialReply != replyId) {
    previousOfficialReplyId = post.officialReply;
    post.officialReply = replyId;
    reply.isOfficialReply = true;

  } else if (peeranhaPost.officialReply == 0 && post.officialReply == replyId) {
    reply.isOfficialReply = false;
    post.officialReply = 0;
  }
  post.save();

  if (previousOfficialReplyId != 0) {
    let previousOfficialReply = Reply.load(postId.toString() + "-" + previousOfficialReplyId.toString())

    if (previousOfficialReply != null) {
      previousOfficialReply.isOfficialReply = false;
    }
    previousOfficialReply.save();
  }
}

const convertIpfsHash = (ipfsHash: Bytes | null): Bytes => { //to utils
  let hashstr = ipfsHash.toHexString();
  let hashHex = '1220' + hashstr.slice(2);
  let ipfsBytes = ByteArray.fromHexString(hashHex);
  let ipfsHashBase58 = ipfsBytes.toBase58();
  let result = ipfs.cat(ipfsHashBase58) as Bytes;
  return result;
};

let posts: string[] = [];
let uniqueOldPosts: string[] = [];
let uniqueNewPosts: string[] = [];

export function generateDocumentationPosts(
  comunityId: BigInt,
  userAddr: Address,
  lastmodTimestamp: BigInt,
  oldDocumentationIpfsHash: Bytes | null, 
  newDocumentationIpfsHash: Bytes
): void {
  if (newDocumentationIpfsHash === null)
    return;

  let newPosts: string[] = []
  let oldPosts: string[] = []
  if (oldDocumentationIpfsHash !== null) {
    const oldDocumentation = indexingDocumentation(comunityId, oldDocumentationIpfsHash);
    for (let index = 0; index < posts.length; index++) {
      oldPosts.push(posts[index]);
    }
  }
  const newDoc = indexingDocumentation(comunityId, newDocumentationIpfsHash);
  if(newDoc){
    newDoc.save();
  }
  uniqueOldPosts.splice(0,uniqueOldPosts.length);
  oldPosts.forEach((element) => {
      if (!uniqueOldPosts.includes(element)) {
          uniqueOldPosts.push(element);
      }
  });
  oldPosts = uniqueOldPosts;
  let community = getCommunity(comunityId);
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
    if(newPosts[index] != "" && listCreatePosts.indexOf(newPosts[index]) === -1){ 
      let post = new Post(newPosts[index]);
      post.author = userAddr.toHex();
      post.communityId = comunityId;
      post.lastmod = lastmodTimestamp;
      post.isDeleted = false;
      post.postType = PostType.Documentation;
      post.ipfsHash = ByteArray.fromHexString(newPosts[index]) as Bytes;
  
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
  comunityId: BigInt,
  ipfsHash: Bytes | null,
): CommunityDocumentation | null {
  posts.splice(0,posts.length);
  const documentation = CommunityDocumentation.load(comunityId.toString());
  documentation.ipfsHash = ipfsHash;
  if (documentation == null || documentation.ipfsHash == null)
    return null;
  let result = convertIpfsHash(documentation.ipfsHash)
  documentation.documentationJSON = result.toString();

  if (result != null) {
    let ipfsData = json.fromBytes(result);
    if (isValidIPFS(ipfsData)) {
      let ipfsObj = ipfsData.toObject()

      const pinnedPost = ipfsObj.get('pinnedPost');
      if (!pinnedPost.isNull() && pinnedPost.kind == JSONValueKind.OBJECT){
        const pinnedId = pinnedPost.toObject().get('id');
        const pinnedTitle = pinnedPost.toObject().get('title');
        if(
          !pinnedId.isNull() && 
          !pinnedTitle.isNull() && 
          pinnedId.kind == JSONValueKind.STRING && 
          pinnedTitle.kind == JSONValueKind.STRING
        ){
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

      if (!documentations.isNull() && documentations.kind == JSONValueKind.ARRAY) {
        const documentationsArray = documentations.toArray();

        for (let i = 0; i < documentationsArray.length; i++) {
          const documentationObject = documentationsArray[i];
          const id = documentationObject.toObject().get('id');
          const title = documentationObject.toObject().get('title');
          if(
            !id.isNull() && 
            !title.isNull() && 
            id.kind == JSONValueKind.STRING && 
            title.kind == JSONValueKind.STRING
          ){
            if(id.toString() !== "" && title.toString() !== ""){
              let children = documentationObject.toObject().get('children');
              posts.push(id.toString())
              if (!children.isNull() && children.kind == JSONValueKind.ARRAY) {
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
    if(
      !id.isNull() && 
      !title.isNull() && 
      id.kind == JSONValueKind.STRING && 
      title.kind == JSONValueKind.STRING
    ) {
      if(id.toString() !== "" && title.toString() !== ""){
        posts.push(id.toString());
        if(children[i].kind == JSONValueKind.OBJECT){
          if(
            !children[i].toObject().get("children").isNull() && 
            children[i].toObject().get("children").kind == JSONValueKind.ARRAY
          ) {

              if (children[i].toObject().get("children").toArray().length > 0)
                documentation = indexingJson(documentation, children[i].toObject().get("children").toArray());
          
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