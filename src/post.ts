import { json, Bytes, ipfs, BigInt, Address, ByteArray, log, store, JSONValue, JSONValueKind } from '@graphprotocol/graph-ts'
import { Post, Reply, Comment, Tag, CommunityDocumentation } from '../generated/schema'
import { getPeeranhaContent, ERROR_IPFS, isValidIPFS, PostType } from './utils'
import { updateUserRating, updateStartUserRating, getUser, newUser } from './user'
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
  post.officialReply = 0;
  post.bestReply = peeranhaPost.bestReply;
  post.isDeleted = false;
  post.replies = [];
  post.comments = [];
  post.tagsName = [];
  post.postContent = '';

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
  updateStartUserRating(Address.fromString(post.author), post.communityId);
}

export function addDataToPost(post: Post | null, postId: BigInt): void {
  let peeranhaPost = getPeeranhaContent().getPost(postId);
  if (peeranhaPost == null) return;

  post.tagsName = [];
  let tagsName = post.tagsName;
  let postTagsBuf = peeranhaPost.tags;
  for (let i = 0; i < peeranhaPost.tags.length; i++) {
    let newTag = postTagsBuf.pop();
    let tag = Tag.load(peeranhaPost.communityId.toString() + '-' + newTag.toString());
    tagsName.push(tag.name)
    ///
    // tagName reverse to tagId
    ///

    if(!post.tags.includes(newTag)) {
      if (tag != null) {
        post.postContent += ' ' + tag.name;
        tag.postCount++;
        tag.save();
      }
    }
  }
  post.tagsName = tagsName;

  if(peeranhaPost.tags.length != 0) {
    let postTagsBuf = post.tags;
    for (let i = 0; i < post.tags.length; i++) {
      let oldTag = postTagsBuf.pop();

      if(!peeranhaPost.tags.includes(oldTag)) {
        let tag = Tag.load(post.communityId.toString() + '-' + oldTag.toString());
        if (tag != null) {
          tag.postCount--;
          tag.save();
        }
      }
    }
  }
  
  post.tags = peeranhaPost.tags;
  post.ipfsHash = peeranhaPost.ipfsDoc.hash;
  post.ipfsHash2 = peeranhaPost.ipfsDoc.hash2;
  if (post.communityId != peeranhaPost.communityId) {
    const oldCommunity = getCommunity(post.communityId);
    oldCommunity.postCount--;
    oldCommunity.save();

    const newCommunity = getCommunity(peeranhaPost.communityId);
    newCommunity.postCount++;
    newCommunity.save();
    post.communityId = peeranhaPost.communityId;
  }
  let oldPostType = post.postType;
  if (oldPostType != null && oldPostType != peeranhaPost.postType) {
    updatePostUsersRatings(post);
    post.postType = peeranhaPost.postType;
  }

  getIpfsPostData(post);
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

  for (let i = 1; i <= post.replyCount; i++) {
    let reply = Reply.load(postId.toString() + '-' + i.toString());
    if (reply != null && !reply.isDeleted) {
      updateUserRating(Address.fromString(reply.author), post.communityId);
      
      let userReply = getUser(Address.fromString(reply.author));
      userReply.replyCount--;
      userReply.save();
      
      community.replyCount--;
    }
  }
  community.deletedPostCount++;
  community.postCount--;
  community.save();

  let userPost = getUser(Address.fromString(post.author));
  userPost.postCount--;
  userPost.save();
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
  reply.isBestReply = false;

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
  updateStartUserRating(Address.fromString(reply.author), post.communityId);
  post.postContent += ' ' + reply.content;
  post.save();
  addDataToReply(reply, postId, replyId);
}

export function addDataToReply(reply: Reply | null, postId: BigInt, replyId: i32): void {
  const peeranhaReply = getPeeranhaContent().getReply(postId, replyId);
  if (peeranhaReply == null) return;

  changedStatusOfficialReply(reply, postId, replyId);
  reply.ipfsHash = peeranhaReply.ipfsDoc.hash;
  reply.ipfsHash2 = peeranhaReply.ipfsDoc.hash2;
  
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
  post.save();

  let user = getUser(Address.fromString(reply.author));
  user.replyCount--;
  user.save();
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
  updateStartUserRating(Address.fromString(post.author), post.communityId);

  post.postContent += ' ' + comment.content;
  post.save();
}

export function addDataToComment(comment: Comment | null, postId: BigInt, parentReplyId: BigInt, commentId: BigInt): void {
  let peeranhaComment = getPeeranhaContent().getComment(postId, parentReplyId.toI32(), commentId.toI32());
  if (peeranhaComment == null) return;

  comment.ipfsHash = peeranhaComment.ipfsDoc.hash;
  comment.ipfsHash2 = peeranhaComment.ipfsDoc.hash2;
  
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

export function updatePostContent(postId: BigInt): void {
  let post = Post.load(postId.toString());
  if (post == null) return;
  post.postContent = '';
  
  let peeranhaPost = getPeeranhaContent().getPost(postId);
  if (peeranhaPost == null) return;
  let postTagsBuf = post.tags;
  for (let i = 0; i < peeranhaPost.tags.length; i++) {
    let tagId = postTagsBuf.pop();
    let tag = Tag.load(post.communityId.toString() + '-' + tagId.toString());
    if (tag != null) {
      post.postContent += ' ' + tag.name;
    }
  }
  post.postContent += ' ' + post.title;
  post.postContent += ' ' + post.content;
  for (let replyId = 1; replyId <= post.replyCount; replyId++) {
    let reply = Reply.load(postId.toString() + '-' + replyId.toString());
    if (reply != null && !reply.isDeleted) {
      post.postContent += ' ' + reply.content;
    
      for (let commentId = 1; commentId <= reply.commentCount; commentId++) {
        let comment = Comment.load(postId.toString() + '-' + replyId.toString() + '-' +  commentId.toString());
        if (comment != null && !comment.isDeleted) {
          post.postContent += ' ' + comment.content;
        }
      }
    }
  }
  for (let commentId = 1; commentId <= post.commentCount; commentId++) {
    let comment = Comment.load(postId.toString() + '-' + '0' + '-' +  commentId.toString());
    if (comment != null && !comment.isDeleted) {
      post.postContent += ' ' + comment.content;
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