import { ByteArray } from '@graphprotocol/graph-ts'
import { json, Bytes, ipfs, BigInt } from '@graphprotocol/graph-ts'
import { Post, Reply, Comment, Community, Tag, User } from '../generated/schema'
import { getPeeranha } from './utils'
import { updateUserRating } from './user'

export function newPost(post: Post, postId: BigInt): void {
  let peeranhaPost = getPeeranha().getPost(postId);
  if (!peeranhaPost) return;

  post.communityId = peeranhaPost.communityId;
  post.author = peeranhaPost.author.toHex();
  post.rating = peeranhaPost.rating;
  post.postTime = peeranhaPost.postTime
  post.commentCount = peeranhaPost.commentCount;
  post.replyCount = peeranhaPost.replyCount;
  post.officialReply = peeranhaPost.officialReply;
  post.bestReply = peeranhaPost.bestReply;
  post.isDeleted = peeranhaPost.isDeleted;
  post.replies = [];
  post.comments = [];

  let community = Community.load(peeranhaPost.communityId.toString()) as Community;
  if (community != null) {
    community.postCount++;
    community.save();
  }

  addDataToPost(post, postId);
}

export function addDataToPost(post: Post, postId: BigInt): void {
  let peeranhaPost = getPeeranha().getPost(postId);
  if (!peeranhaPost) return;

  let postTagsBuf = peeranhaPost.tags;
  for (let i = 0; i < peeranhaPost.tags.length; i++) {
    let newTag = postTagsBuf.pop();
    let postTags = post.tags as Array<i32>;

    if(!postTags.includes(newTag)) {
      let tag = Tag.load(peeranhaPost.communityId.toString() + "-" + newTag.toString());
      if (tag) {
        tag.postCount++;
        tag.save();
      }
    }
  }

  if(peeranhaPost.tags.length != 0) {
    let postTags = post.tags as Array<i32>;
    let postTagsBuf = post.tags as Array<i32>;
    for (let i = 0; i < postTags.length; i++) {
      let oldTag = postTagsBuf.pop();

      if(!peeranhaPost.tags.includes(oldTag)) {
        let tag = Tag.load(peeranhaPost.communityId.toString() + "-" + oldTag.toString());
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

function getIpfsPostData(post: Post): void {
  let postipfs = post.ipfsHash as ByteArray;
  let hashstr = postipfs.toHexString();
  let hashHex = "1220" + hashstr.slice(2);
  let ipfsBytes = ByteArray.fromHexString(hashHex);
  let ipfsHashBase58 = ipfsBytes.toBase58();
  let result = ipfs.cat(ipfsHashBase58) as Bytes;
  
  if (result) {
    let ipfsData = json.fromBytes(result);
  
    if(ipfsData) {
      let ipfsObj = ipfsData.toObject()
      let title = ipfsObj.get('title');
      if (title) {
        post.title = title.toString();
      }
  
      let content = ipfsObj.get('content');
      if (content) {
        post.content = content.toString();
      }
    }
  }
}

export function newReply(reply: Reply, postId: BigInt, replyId: BigInt): void {
  let peeranhaReply = getPeeranha().getReply(postId, replyId.toI32());
  if (!peeranhaReply) return;

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

  if (peeranhaReply.parentReplyId == 0) {
    let post = Post.load(postId.toString()) as Post;
    if (post) {
      post.replyCount++;

      let replies = post.replies as string[];
      replies.push(postId.toString() + "-" + replyId.toString())
      post.replies = replies

      post.save();
    }
  }

  if (peeranhaReply.isFirstReply || peeranhaReply.isQuickReply) {
    updateUserRating(peeranhaReply.author);
  }

  addDataToReply(reply, postId, replyId);
}

export function addDataToReply(reply: Reply, postId: BigInt, replyId: BigInt): void {
  let peeranhaReply = getPeeranha().getReply(postId, replyId.toI32());
  if (!peeranhaReply) return;

  reply.ipfsHash = peeranhaReply.ipfsDoc.hash;
  reply.ipfsHash2 = peeranhaReply.ipfsDoc.hash2;
  
  getIpfsReplyData(reply);
}

function getIpfsReplyData(reply: Reply): void {
  let replyipfs = reply.ipfsHash as ByteArray;
  let hashstr = replyipfs.toHexString();
  let hashHex = "1220" + hashstr.slice(2);
  let ipfsBytes = ByteArray.fromHexString(hashHex);
  let ipfsHashBase58 = ipfsBytes.toBase58();
  let result = ipfs.cat(ipfsHashBase58) as Bytes;
  
  if (result) {
    let ipfsData = json.fromBytes(result);
  
    if(ipfsData) {
      let ipfsObj = ipfsData.toObject()
  
      let content = ipfsObj.get('content');
      if (content) {
        reply.content = content.toString();
      }
    }
  }
}

export function newComment(comment: Comment, postId: BigInt, parentReplyId: BigInt, commentId: BigInt): void {
  let peeranhaComment = getPeeranha().getComment(postId, parentReplyId.toI32(), commentId.toI32());
  if (!peeranhaComment) return;

  comment.author = peeranhaComment.author.toHex();
  comment.postTime = peeranhaComment.postTime;
  comment.postId = postId;
  comment.rating = peeranhaComment.rating;
  comment.parentReplyId = parentReplyId.toI32();  
  comment.isDeleted = false;

  const commentFullId = postId.toString() + "-" + parentReplyId.toString() +  "-" + commentId.toString();
  if (parentReplyId == BigInt.fromI32(0)) {
    let post = Post.load(postId.toString());
    if (post != null ) {    // init post
      post.commentCount++;
      let comments = post.comments as string[];
      comments.push(commentFullId)
      post.comments = comments

      post.save();
    }
  } else {
    let reply = Reply.load(postId.toString() + "-" + parentReplyId.toString());
    if (reply) {     // init post
      reply.commentCount++;
      let comments = reply.comments as string[];
      comments.push(commentFullId)
      reply.comments = comments

      reply.save();
    }
  }

  addDataToComment(comment, postId, parentReplyId, commentId);
}

export function addDataToComment(comment: Comment, postId: BigInt, parentReplyId: BigInt, commentId: BigInt): void {
  let peeranhaComment = getPeeranha().getComment(postId, parentReplyId.toI32(), commentId.toI32());
  if (!peeranhaComment) return;

  comment.ipfsHash = peeranhaComment.ipfsDoc.hash;
  comment.ipfsHash2 = peeranhaComment.ipfsDoc.hash2;
  
  getIpfsCommentData(comment);
}

function getIpfsCommentData(comment: Comment): void {
  let commentipfs = comment.ipfsHash as ByteArray;
  let hashstr = commentipfs.toHexString();
  let hashHex = "1220" + hashstr.slice(2);
  let ipfsBytes = ByteArray.fromHexString(hashHex);
  let ipfsHashBase58 = ipfsBytes.toBase58();
  let result = ipfs.cat(ipfsHashBase58) as Bytes;
  
  if (result) {
    let ipfsData = json.fromBytes(result);
  
    if(ipfsData) {
      let ipfsObj = ipfsData.toObject()
  
      let content = ipfsObj.get('content');
      if (content) {
        comment.content = content.toString();
      }
    }
  }
}


export function voteComment(comment: Comment, postId: BigInt, parentReplyId: BigInt, commentId: BigInt): void {
  let peeranhaComment = getPeeranha().getComment(postId, parentReplyId.toI32(), commentId.toI32());
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