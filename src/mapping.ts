import { Address, BigInt, Bytes } from '@graphprotocol/graph-ts'
import { UserCreated, UserUpdated,
  CommunityCreated, CommunityUpdated, CommunityFrozen, CommunityUnfrozen,
  TagCreated,
  PostCreated, PostEdited, PostDeleted,
  ReplyCreated, ReplyEdited, ReplyDeleted,
  CommentCreated, CommentEdited, CommentDeleted,
  ForumItemVoted,
  StatusOfficialReplyChanged, StatusBestReplyChanged
} from '../generated/Peeranha/Peeranha'
import { User, Community, Tag, Post, Reply, Comment } from '../generated/schema'

import { getPeeranha } from './utils'
import { newPost, addDataToPost,
  newReply, addDataToReply, 
  newComment, addDataToComment } from './post'
import { newCommunity, addDataToCommunity, newTag } from './community-tag'
import { newUser, addDataToUser, updateUserRating } from './user'
  


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
  let communityiD = event.params.id; 
  let community = new Community(communityiD.toString());

  let peeranhaCommunity = getPeeranha().getCommunity(communityiD);
  if (peeranhaCommunity == null) return;

  newCommunity(community, communityiD);
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
  let id = event.params.communityId.toString()
  let community = Community.load(id)
  if (community != null) {
    community.isFrozen = true;
    community.save();
  }
}

export function handleUnfrozenCommunity(event: CommunityUnfrozen): void {
  let id = event.params.communityId.toString()
  let community = Community.load(id)
  if (community != null) {
    community.isFrozen = false;
    community.save();
  } else {
    community = new Community(id);
    newCommunity(community, event.params.communityId);
  }
}

export function handleNewTag(event: TagCreated): void {
  let community = Community.load(event.params.communityId.toString())
  if (community == null) {
    newCommunity(community, event.params.communityId);
    community.save();
  }

  let tag = new Tag(event.params.communityId.toString() + "-" + BigInt.fromI32(event.params.tagId).toString());
  tag.communityId = event.params.communityId;
  
  newTag(tag, event.params.communityId, BigInt.fromI32(event.params.tagId));
  tag.save(); 
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
  updateUserRating(Address.fromString(post.author));

  for (let i = 1; i <= post.replyCount; i++) {
    let reply = Reply.load(event.params.postId.toString() + "-" + i.toString());
    if (
    (reply != null && !reply.isDeleted) && 
    (reply.isFirstReply || reply.isQuickReply || reply.rating > 0)) {
      updateUserRating(Address.fromString(reply.author));
    }
  }
}

export function handleNewReply(event: ReplyCreated): void {
  let replyId = BigInt.fromI32(event.params.replyId);
  let reply = new Reply(event.params.postId.toString() + "-" + replyId.toString());

  newReply(reply, event.params.postId, replyId);
  reply.save(); 
}

export function handleEditedReply(event: ReplyEdited): void { 
  let replyId = BigInt.fromI32(event.params.replyId);
  let reply = Reply.load(event.params.postId.toString() + "-" + replyId.toString());

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

  updateUserRating(Address.fromString(reply.author));
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

export function handlerChangedStatusOfficialReply(event: StatusOfficialReplyChanged): void {
  let post = Post.load(event.params.postId.toString())
  let previousOfficialReply = 0;
  if (post == null) {
    post = new Post(event.params.postId.toString())
    newPost(post, event.params.postId);
  } else {
    previousOfficialReply = post.officialReply;
    post.officialReply = event.params.replyId;
  }
  post.save();
  
  if (previousOfficialReply) {
    let replyId = BigInt.fromI32(previousOfficialReply);
    let reply = Reply.load(event.params.postId.toString() + "-" + replyId.toString())

    if (reply == null) {
      newReply(reply, event.params.postId, replyId);
    } else {
      reply.isOfficialReply = false;
    }

    reply.save(); 
  }

  let replyId = BigInt.fromI32(event.params.replyId);
  let reply = Reply.load(event.params.postId.toString() + "-" + replyId.toString())

  if (reply == null) {
    newReply(reply, event.params.postId, replyId);
  } 
  reply.isOfficialReply = true;
  reply.save(); 
}

export function handlerChangedStatusBestReply(event: StatusBestReplyChanged): void {
  let post = Post.load(event.params.postId.toString())
  let previousBestReply = 0;
  if (post == null) {
    post = new Post(event.params.postId.toString())
    newPost(post, event.params.postId);
  } else {
    previousBestReply = post.bestReply;
    post.bestReply = event.params.replyId;
  }
  post.save();
  
  if (previousBestReply) {
    let replyId = BigInt.fromI32(previousBestReply);
    let reply = Reply.load(event.params.postId.toString() + "-" + replyId.toString())

    if (reply == null) {
      newReply(reply, event.params.postId, replyId);
    } else {
      reply.isBestReply = false;
    }

    updateUserRating(Address.fromString(reply.author));
    reply.save(); 
  }

  let replyId = BigInt.fromI32(event.params.replyId);
  let reply = Reply.load(event.params.postId.toString() + "-" + replyId.toString())

  if (reply == null) {
    newReply(reply, event.params.postId, replyId);
  } 
  reply.isBestReply = true;
  updateUserRating(Address.fromString(reply.author));
  reply.save();
}

export function handlerForumItemVoted(event: ForumItemVoted): void {    //  move this in another function with edit
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
    updateUserRating(Address.fromString(reply.author));
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
    updateUserRating(Address.fromString(post.author));
  }
}