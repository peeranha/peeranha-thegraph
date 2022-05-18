import { ByteArray } from '@graphprotocol/graph-ts'
import { json, Bytes, ipfs, BigInt, Address } from '@graphprotocol/graph-ts'
import { Post, Reply, Comment, Tag } from '../generated/schema'
import { getPeeranhaContent } from './utils'
import { updateUserRating, updateStartUserRating, getUser, newUser } from './user'
import { getCommunity } from './community-tag'


export function newPost(post: Post | null, postId: BigInt, blockTimestamp: BigInt): void {
  let peeranhaPost = getPeeranhaContent().getPost(postId);
  if (peeranhaPost == null) return;

  post.communityId = peeranhaPost.communityId;
  post.author = peeranhaPost.author.toHex();
  post.rating = peeranhaPost.rating;
  post.postTime = peeranhaPost.postTime
  post.commentCount = peeranhaPost.commentCount;
  post.replyCount = peeranhaPost.replyCount;
  post.officialReply = peeranhaPost.officialReply;
  post.bestReply = peeranhaPost.bestReply;
  post.isDeleted = false;
  post.replies = [];
  post.comments = [];
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

  let postTagsBuf = peeranhaPost.tags;
  for (let i = 0; i < peeranhaPost.tags.length; i++) {
    let newTag = postTagsBuf.pop();

    if(!post.tags.includes(newTag)) {
      let tag = Tag.load(peeranhaPost.communityId.toString() + '-' + newTag.toString());
      if (tag != null) {
        post.postContent += ' ' + tag.name;
        tag.postCount++;
        tag.save();
      }
    }
  }

  if(peeranhaPost.tags.length != 0) {
    let postTagsBuf = post.tags;
    for (let i = 0; i < post.tags.length; i++) {
      let oldTag = postTagsBuf.pop();

      if(!peeranhaPost.tags.includes(oldTag)) {
        let tag = Tag.load(peeranhaPost.communityId.toString() + '-' + oldTag.toString());
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
  post.postType = peeranhaPost.postType;

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
  
    if(!ipfsData.isNull()) {
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
    }
  }
}

export function deletePost(post: Post | null, postId: BigInt): void {
  post.isDeleted = true;

  updateUserRating(Address.fromString(post.author), post.communityId);

  let community = getCommunity(post.communityId);

  for (let i = 1; i <= post.replyCount; i++) {
    let reply = Reply.load(postId.toString() + '-' + i.toString());
    if (
    (reply != null && !reply.isDeleted) && 
    (reply.isFirstReply || reply.isQuickReply || reply.rating > 0)) {

      updateUserRating(Address.fromString(reply.author), post.communityId);
      
      let userReply = getUser(Address.fromString(reply.author));
      userReply.postCount--;
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
    (reply.isFirstReply || reply.isQuickReply || reply.rating != 0)) {

      updateUserRating(Address.fromString(reply.author), post.communityId);

    }
  }
}

export function newReply(reply: Reply | null, postId: BigInt, replyId: BigInt, blockTimestamp: BigInt): void {
  let peeranhaReply = getPeeranhaContent().getReply(postId, replyId.toI32());
  if (peeranhaReply == null) return;

  reply.author = peeranhaReply.author.toHex();
  reply.postTime = peeranhaReply.postTime;
  reply.rating = peeranhaReply.rating;
  reply.postId = postId;
  reply.parentReplyId = peeranhaReply.parentReplyId;
  reply.commentCount = peeranhaReply.commentCount;
  reply.isFirstReply = peeranhaReply.isFirstReply;
  reply.isQuickReply = peeranhaReply.isQuickReply;
  reply.isDeleted = false;
  reply.comments = [];

  let post = Post.load(postId.toString())
  if (peeranhaReply.parentReplyId == 0) {
    if (post != null) {
      post.replyCount++;

      let replies = post.replies
      replies.push(postId.toString() + '-' + replyId.toString())
      post.replies = replies

      

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
  addDataToReply(reply, postId, replyId);
  updateStartUserRating(Address.fromString(reply.author), post.communityId);
  post.postContent += ' ' + reply.content;
  post.save();
}

export function addDataToReply(reply: Reply | null, postId: BigInt, replyId: BigInt): void {
  let peeranhaReply = getPeeranhaContent().getReply(postId, replyId.toI32());
  if (peeranhaReply == null) return;

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
  
    if(!ipfsData.isNull()) {
      let ipfsObj = ipfsData.toObject()
  
      let content = ipfsObj.get('content');
      if (!content.isNull()) {
        reply.content = content.toString();
      }
    }
  }
}

export function deleteReply(reply: Reply | null, postId: BigInt): void {
  reply.isDeleted = true;
  let post = Post.load(postId.toString());
  updateUserRating(Address.fromString(reply.author), post.communityId);

  if (reply.parentReplyId == 0) {
    let post = Post.load(postId.toString())
    if (post != null) {
      let community = getCommunity(post.communityId);
      community.replyCount--;
      community.save();
    }
  }

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
  
    if(!ipfsData.isNull()) {
      let ipfsObj = ipfsData.toObject()
  
      let content = ipfsObj.get('content');
      if (!content.isNull()) {
        comment.content = content.toString();
      }
    }
  }
}


export function voteComment(comment: Comment | null, postId: BigInt, parentReplyId: BigInt, commentId: BigInt): void {
  let peeranhaComment = getPeeranhaContent().getComment(postId, parentReplyId.toI32(), commentId.toI32());
  if (peeranhaComment == null) return;

  comment.author = peeranhaComment.author.toHex();
  comment.postTime = peeranhaComment.postTime;
  comment.postId = postId;
  comment.rating = peeranhaComment.rating;
  comment.parentReplyId = parentReplyId.toI32();  
  comment.isDeleted = false;

  let post = Post.load(postId.toString())
  if (post == null && parentReplyId == BigInt.fromI32(0)) {
    post.commentCount++;
  }

  addDataToComment(comment, postId, parentReplyId, commentId);
}


export function updatePostContent(postId: BigInt): void {
  let post = Post.load(postId.toString());
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
    if (!reply.isDeleted){
      post.postContent += ' ' + reply.content;
    
    }
    for (let commentId = 1; commentId <= reply.commentCount; commentId++) {
      let comment = Comment.load(postId.toString() + '-' + replyId.toString() + '-' +  commentId.toString());
      if (!comment.isDeleted) {
        post.postContent += ' ' + comment.content;
      }
    }
  }
  for (let commentId = 1; commentId <= post.commentCount; commentId++) {
    let comment = Comment.load(postId.toString() + '-' + '0' + '-' +  commentId.toString());
    if (!comment.isDeleted) {
      post.postContent += ' ' + comment.content;
    }
  }
  post.save();
}