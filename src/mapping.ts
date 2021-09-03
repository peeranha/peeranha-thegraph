import { BigInt } from '@graphprotocol/graph-ts'
import { UserCreated, UserUpdated,
  CommunityCreated, CommunityUpdated, CommunityFrozen, CommunityUnfrozen,
  TagCreated,
  PostCreated, PostEdited, PostDeleted,
  ReplyCreated, ReplyEdited, ReplyDeleted,
  CommentCreated, CommentEdited, CommentDeleted,
  ForumItemVoted
} from '../generated/Peeranha/Peeranha'
import { User, Community, Tag, Post, Reply, Comment } from '../generated/schema'

import { getPeeranha } from './utils'
import { newPost, addDataToPost,
  newReply, addDataToReply, 
  newComment, addDataToComment } from './post'
import { newCommunity, addDataToCommunity, newTag } from './community-tag'
import { newUser, addDataToUser } from './user'
  


export function handleNewUser(event: UserCreated): void {
  let user = new User(event.params.userAddress.toHex());
  newUser(user, event.params.userAddress);

  user.save();
}

export function handleUpdatedUser(event: UserUpdated): void {
  let id = event.params.userAddress.toHex()
  let user = User.load(id)
  if (user == null) {
    user = new User(id)
    newUser(user, event.params.userAddress);
  } else {
    addDataToUser(user, event.params.userAddress);
  }

  user.save();
}

export function handleNewCommunity(event: CommunityCreated): void {
  let community = new Community(event.params.id.toString());

  const peeranhaCommunity = getPeeranha().getCommunity(event.params.id);
  if (peeranhaCommunity == null) return;

  newCommunity(community, event.params.id);
  community.save(); 
}

export function handleUpdatedCommunity(event: CommunityUpdated): void {
  let id = event.params.id.toString()
  let community = Community.load(id)
  if (community == null) {
    community = new Community(id);
    newCommunity(community, event.params.id);
  } else {
    addDataToCommunity(community, event.params.id);
  }

  community.save();
}

export function handleFrozenCommunity(event: CommunityFrozen): void {
  let id = event.params.commintyId.toString()
  let community = Community.load(id)
  if (community != null) {
    community.isFrozen = true;
    community.save();
  }
}

export function handleUnfrozenCommunity(event: CommunityUnfrozen): void {
  let id = event.params.commintyId.toString()
  let community = Community.load(id)
  if (community != null) {
    community.isFrozen = false;
    community.save();
  } else {
    community = new Community(id);
    newCommunity(community, event.params.commintyId);
  }
}

export function handleNewTag(event: TagCreated): void {
  let community = Community.load(event.params.tagId.toString()) //communityId -> tagId
  if (community != null) {
    let tag = new Tag(event.params.tagId.toString() + "-" + event.params.communityId.toString());
    tag.communityId = event.params.tagId;
  
    newTag(tag, event.params.communityId, event.params.tagId);
    tag.save(); 
  } else {
    newCommunity(community, event.params.communityId);
  }
}

export function handleNewPost(event: PostCreated): void {
  let post = new Post(event.params.postId.toString());

  newPost(post, event.params.postId);
  post.save(); 
}

export function handleEditedPost(event: PostEdited): void {
  let post = Post.load(event.params.postId.toString())
  if (post == null) {
    post = new Post(event.params.postId.toString())
    newPost(post, event.params.postId);
  } else {
    addDataToPost(post, event.params.postId);
  }

  post.save();
}

export function handleDeletedPost(event: PostDeleted): void {
  let post = Post.load(event.params.postId.toString());
  if (post == null) return;

  post.isDeleted = true;
  post.save(); 
}

export function handleNewReply(event: ReplyCreated): void {
  let replyId = BigInt.fromI32(event.params.replyId);
  let reply = new Reply(event.params.postId.toString() + "-" + replyId.toString());

  newReply(reply, event.params.postId, replyId);
  reply.save(); 
}

export function handleEditedReply(event: ReplyEdited): void { 
  let replyId = BigInt.fromI32(event.params.replyId);
  let reply = Reply.load(event.params.postId.toString() + "-" + replyId.toString())

  if (reply == null) {
    reply = new Reply(event.params.postId.toString() + "-" + replyId.toString());
    newReply(reply, event.params.postId, replyId);
  } else {
    addDataToReply(reply, event.params.postId, replyId);
  }

  reply.save(); 
}

export function handleDeletedReply(event: ReplyDeleted): void {
  let replyId = BigInt.fromI32(event.params.replyId);
  let reply = Reply.load(event.params.postId.toString() + "-" + replyId.toString());
  if (reply == null) return;

  reply.isDeleted = true;
  reply.save(); 
}

export function handleNewComment(event: CommentCreated): void {
  let commentId = BigInt.fromI32(event.params.commentId);
  let parentReplyId = BigInt.fromI32(event.params.parentReplyId);
  let comment = new Comment(event.params.postId.toString() + "-" + parentReplyId.toString() + "-" +  commentId.toString());

  newComment(comment, event.params.postId, BigInt.fromI32(event.params.parentReplyId), commentId);  //без конвертации
  comment.save(); 
}

export function handleEditedComment(event: CommentEdited): void { 
  let commentId = BigInt.fromI32(event.params.commentId);
  let parentReplyId = BigInt.fromI32(event.params.parentReplyId);
  let comment = Comment.load(event.params.postId.toString() + "-" + parentReplyId.toString() + "-" +  commentId.toString());

  if (comment == null) {
    comment = new Comment(event.params.postId.toString() + "-" + parentReplyId.toString() + "-" +  commentId.toString());
    newComment(comment, event.params.postId, parentReplyId, commentId);
  } else {
    addDataToComment(comment, event.params.postId, parentReplyId, commentId);
  }

  comment.save(); 
}

export function handleDeletedComment(event: CommentDeleted): void {
  let commentId = BigInt.fromI32(event.params.commentId);
  let parentReplyId = BigInt.fromI32(event.params.parentReplyId);
  let comment = Comment.load(event.params.postId.toString() + "-" + parentReplyId.toString() + "-" +  commentId.toString());
  if (comment == null) return;

  comment.isDeleted = true;
  comment.save(); 
}

export function handlerForumItemVoted(event: ForumItemVoted): void {    // вынести в этдельную function with edit
  if (event.params.commentId != 0) {
    let commentId = BigInt.fromI32(event.params.commentId);
    let replyId = BigInt.fromI32(event.params.replyId);
    let comment = Comment.load(event.params.postId.toString() + "-" + replyId.toString() + "-" +  commentId.toString());

    if (comment == null) {
      comment = new Comment(event.params.postId.toString() + "-" + replyId.toString() + "-" +  commentId.toString());
      newComment(comment, event.params.postId, replyId, commentId);
    } else {
      let peeranhaComment = getPeeranha().getComment(event.params.postId, replyId.toI32(), commentId.toI32());
      if (peeranhaComment == null) return;
      comment.rating = peeranhaComment.rating;
    }
    
    comment.save();
  } else if (event.params.replyId != 0) {
    let replyId = BigInt.fromI32(event.params.replyId);
    let reply = Reply.load(event.params.postId.toString() + "-" + replyId.toString())

    if (reply == null) {
      reply = new Reply(event.params.postId.toString() + "-" + replyId.toString());
      newReply(reply, event.params.postId, replyId);
    } else {
      let peeranhaReply = getPeeranha().getReply(event.params.postId, replyId.toI32());
      if (peeranhaReply == null) return;
      reply.rating = peeranhaReply.rating;
    }
    reply.save();
  } else {
    let post = Post.load(event.params.postId.toString())
    if (post == null) {
      post = new Post(event.params.postId.toString())
      newPost(post, event.params.postId);
    } else {
      let peeranhaPost = getPeeranha().getPost(event.params.postId);
      if (peeranhaPost == null) return;
      post.rating = peeranhaPost.rating;
    }

    post.save();
  }
}