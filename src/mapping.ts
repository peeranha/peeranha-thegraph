import { Address, BigInt, log } from '@graphprotocol/graph-ts'
import { ethereum } from '@graphprotocol/graph-ts'
import { UserCreated, UserUpdated, FollowedCommunity, UnfollowedCommunity } from '../generated/PeeranhaUser/PeeranhaUser'
import { 
  CommunityCreated, CommunityUpdated, CommunityFrozen, CommunityUnfrozen,
  TagCreated, TagUpdated
} from '../generated/PeeranhaCommunity/PeeranhaCommunity'
import { PostCreated, PostEdited, PostDeleted,
  ReplyCreated, ReplyEdited, ReplyDeleted,
  CommentCreated, CommentEdited, CommentDeleted,
  ForumItemVoted, ChangePostType,
  StatusOfficialReplyChanged, StatusBestReplyChanged,
} from '../generated/PeeranhaContent/PeeranhaContent'

import { GetReward } from '../generated/PeeranhaToken/PeeranhaToken'
import { User, Community, Tag, Post, Reply, Comment, Achievement, ContractInfo, UserReward, Period, History } from '../generated/schema'
import { USER_ADDRESS } from './config'
import { getPeeranhaUser, getPeeranhaToken, getPeeranhaContent } from './utils'

import { newPost, addDataToPost, deletePost, newReply, addDataToReply, deleteReply,
  newComment, addDataToComment, updatePostContent, updatePostUsersRatings } from './post'
import { newCommunity, addDataToCommunity, newTag, addDataToTag, getCommunity } from './community-tag'
import { createUserIfDoesNotExist, newUser, addDataToUser, updateUserRating} from './user'
import { addDataToAchievement, giveAchievement, newAchievement } from './achievement'
import { ConfigureNewAchievementNFT, Transfer } from '../generated/PeeranhaNFT/PeeranhaNFT'

const POOL_NFT = 1000000;
  
export function handleConfigureNewAchievement(event: ConfigureNewAchievementNFT): void {
  let achievement = new Achievement(event.params.achievementId.toString());
  newAchievement(achievement, event.params.achievementId);

  achievement.save();  
}

export function handleTransferAchievement(event: Transfer): void {
  let id : BigInt = (event.params.tokenId.div(BigInt.fromI32(POOL_NFT))).plus(BigInt.fromI32(1)); // (a / b) + c
  log.error('User: {}, ID txx: {}, Achievement Id txx: {}', [event.params.to.toHex(), event.params.tokenId.toString(), id.toString()])
  let achievement = Achievement.load(id.toString());

  if (achievement != null) {
    addDataToAchievement(achievement, id);

    giveAchievement(id, event.params.to);

    achievement.save();  
  }
}


export function handleNewUser(event: UserCreated): void {
  let user = new User(event.params.userAddress.toHex());
  newUser(user, event.params.userAddress, event.block.timestamp);
  user.save();
}

export function handleUpdatedUser(event: UserUpdated): void {
  let id = event.params.userAddress.toHex()
  let user = User.load(id)
  if (user == null) {
    user = new User(id)
    newUser(user, event.params.userAddress, event.block.timestamp);
  } else {
    addDataToUser(user, event.params.userAddress);
  }

  user.save();
}

export function handlerFollowCommunity(event: FollowedCommunity): void {
  let user = User.load(event.params.userAddress.toHex());
  let followedCommunities = user.followedCommunities
  followedCommunities.push(event.params.communityId.toString())

  user.followedCommunities = followedCommunities
  user.save();

  let community = Community.load(event.params.communityId.toString())
  community.followingUsers++;
  community.save()
}

export function handlerUnfollowCommunity(event: UnfollowedCommunity): void {
  let user = User.load(event.params.userAddress.toHex());
  
  let followedCommunities: string[] = [];
  let followedCommunitiesBuf = user.followedCommunities

  for (let i = 0; i < user.followedCommunities.length; i++) {
    let community = followedCommunitiesBuf.pop()
    if (community != event.params.communityId.toString()) {
      followedCommunities.push(community)   
    }
  }

  user.followedCommunities = followedCommunities;
  user.save();

  let community = Community.load(event.params.communityId.toString())
  community.followingUsers--;
  community.save()
}

export function handleNewCommunity(event: CommunityCreated): void {
  let communityiD = event.params.id; 
  let community = new Community(communityiD.toString());

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
  let community = getCommunity(event.params.communityId);
  community.tagsCount++;
  community.save();
  let tag = new Tag(event.params.communityId.toString() + "-" + BigInt.fromI32(event.params.tagId).toString());
  
  newTag(tag, event.params.communityId, BigInt.fromI32(event.params.tagId));
  tag.save(); 
}

export function handleEditedTag(event: TagUpdated): void {
  let tag = Tag.load(event.params.communityId.toString() + "-" + BigInt.fromI32(event.params.tagId).toString());
  addDataToTag(tag, event.params.communityId, BigInt.fromI32(event.params.tagId));
  tag.save();
}

// TODO: Get rid of generics in this method. eventEntity and eventName values move to constants or enums.
export function createHistory<T1, T2>(item: T1,  event: T2,  eventEntity: string, eventName: string): void {
  let history = new History(event.transaction.hash.toHex());
  history.post = event.params.postId.toString();
  if (item instanceof Reply) {
    history.reply = item.id;
  }
  if (item instanceof Comment) {
    history.comment = item.id;
  }

  history.transactionHash = event.transaction.hash;
  history.eventEntity = eventEntity;
  history.eventName = eventName;
  history.actionUser = event.params.user.toHex();
  history.timeStamp = event.block.timestamp;
  history.save();
}

export function handleNewPost(event: PostCreated): void {
  let post = new Post(event.params.postId.toString());
  createUserIfDoesNotExist(Address.fromString(post.author), event.block.timestamp);

  newPost(post, event.params.postId);
  post.save();

  createHistory(post, event, 'Post', 'Create');
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

  let postId = event.params.postId;
  updatePostContent(postId);

  createHistory(post, event, 'Post', 'Edit');
}

export function handleChangedTypePost(event: ChangePostType): void {
  let post = Post.load(event.params.postId.toString())
  if (post != null) {
    post.postType = event.params.newPostType;
    updatePostUsersRatings(post);
    post.save();
  }
}

export function handleDeletedPost(event: PostDeleted): void {
  let post = Post.load(event.params.postId.toString());
  if (post == null) return;

  deletePost(post, event.params.postId);
  post.save();

  createHistory(post, event, 'Post', 'Delete');
}

export function handleNewReply(event: ReplyCreated): void {
  let replyId = BigInt.fromI32(event.params.replyId);
  let reply = new Reply(event.params.postId.toString() + "-" + replyId.toString());
  
  createUserIfDoesNotExist(Address.fromString(reply.author), event.block.timestamp);
  
  newReply(reply, event.params.postId, replyId);
  reply.save();

  createHistory(reply, event, 'Reply', 'Create');
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

  let postId = event.params.postId;
  updatePostContent(postId);

  createHistory(reply, event, 'Reply', 'Edit');
}

export function handleDeletedReply(event: ReplyDeleted): void {
  let replyId = BigInt.fromI32(event.params.replyId);
  let reply = Reply.load(event.params.postId.toString() + "-" + replyId.toString());
  if (reply == null) return;

  deleteReply(reply, event.params.postId);
  reply.save();

  let postId = event.params.postId;
  updatePostContent(postId);

  createHistory(reply, event, 'Reply', 'Delete');
}

export function handleNewComment(event: CommentCreated): void {
  let commentId = BigInt.fromI32(event.params.commentId);
  let parentReplyId = BigInt.fromI32(event.params.parentReplyId);
  let comment = new Comment(event.params.postId.toString() + "-" + parentReplyId.toString() + "-" +  commentId.toString());

  newComment(comment, event.params.postId, BigInt.fromI32(event.params.parentReplyId), commentId);  //без конвертации
  comment.save();

  createHistory(comment, event, 'Comment', 'Create');
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

  createHistory(comment, event, 'Comment', 'Edit');
  comment.save();

  let postId = event.params.postId;
  updatePostContent(postId);
}

export function handleDeletedComment(event: CommentDeleted): void {
  let commentId = BigInt.fromI32(event.params.commentId);
  let parentReplyId = BigInt.fromI32(event.params.parentReplyId);
  let comment = Comment.load(event.params.postId.toString() + "-" + parentReplyId.toString() + "-" +  commentId.toString());
  if (comment == null) return;

  comment.isDeleted = true;
  comment.save();

  let postId = event.params.postId;
  updatePostContent(postId);

  createHistory(comment, event, 'Comment', 'Delete');
}

export function handleReward(block: ethereum.Block): void {
  let contractInfo = ContractInfo.load(USER_ADDRESS)
  if (contractInfo == null) {
    contractInfo = new ContractInfo(USER_ADDRESS)
    const periodInfo = getPeeranhaUser().getContractInformation();
    const deployTime = periodInfo.value0
    const periodLength = periodInfo.value1
    contractInfo.deployTime = deployTime;
    contractInfo.periodLength = periodLength;
    contractInfo.lastUpdatePeriod = -1;
    contractInfo.lastBlock = block.number;
    contractInfo.save()
  }

  if ((contractInfo.lastBlock.plus(BigInt.fromI32(15))).lt(block.number)) {
    const period = getPeeranhaUser().getPeriod();
    if (period >= 50000) return;                  // delete in prod

    if (contractInfo.lastUpdatePeriod < period) {   // for() from lastUpdatePeriod to period ?
      contractInfo.lastUpdatePeriod = period;
      contractInfo.lastBlock = block.number;
      contractInfo.save()
      let periodStruct = new Period(period.toString());
      periodStruct.startPeriodTime = contractInfo.deployTime.plus(contractInfo.periodLength.times(BigInt.fromI32(period)))
      periodStruct.endPeriodTime = contractInfo.deployTime.plus(contractInfo.periodLength.times(BigInt.fromI32(period + 1)))
      periodStruct.isFinished = false;
      periodStruct.save();  

      const previousPeriod = period - 2;
      if (previousPeriod >= 1) {
        const activeUsersInPeriod = getPeeranhaUser().getActiveUsersInPeriod(previousPeriod);
        for (let i = 0; i < activeUsersInPeriod.length; i++) {
          const tokenRewards = getPeeranhaToken().getUserRewardGraph(activeUsersInPeriod[i], previousPeriod);
          let userReward = new UserReward(previousPeriod.toString() + '-' + activeUsersInPeriod[i].toHex())
          userReward.tokenToReward = tokenRewards;
          userReward.period = previousPeriod.toString();
          userReward.user = activeUsersInPeriod[i].toHex();
          userReward.isPaid = false;
          userReward.save();
        }

        let previousPeriodStruct = Period.load(previousPeriod.toString());
        previousPeriodStruct.isFinished = true;
        previousPeriodStruct.save()
      }
    }
  }
}

export function handleGetReward(event: GetReward): void {
  const userReward = UserReward.load(BigInt.fromI32(event.params.period).toString() + '-' + event.params.user.toHex())
  userReward.isPaid = true;
  userReward.save();
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
    let previousReplyId = BigInt.fromI32(previousBestReply);
    let previousReply = Reply.load(event.params.postId.toString() + "-" + previousReplyId.toString())

    if (previousReply == null) {
      newReply(previousReply, event.params.postId, previousReplyId);
    } else {
      previousReply.isBestReply = false;
    }
    updateUserRating(Address.fromString(previousReply.author), post.communityId);
    previousReply.save();
  }

  if (event.params.replyId != 0) {    // fix  (if reply does not exist -> getReply() call erray)
    let replyId = BigInt.fromI32(event.params.replyId);
    let reply = Reply.load(event.params.postId.toString() + "-" + replyId.toString())

    if (reply == null) {
      newReply(reply, event.params.postId, replyId);
    }

    reply.isBestReply = true;
    updateUserRating(Address.fromString(reply.author), post.communityId);
    reply.save();
  }
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
      let peeranhaComment = getPeeranhaContent().getComment(event.params.postId, replyId.toI32(), commentId.toI32());
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
      let peeranhaReply = getPeeranhaContent().getReply(event.params.postId, replyId.toI32());
      if (peeranhaReply == null) return;
      reply.rating = peeranhaReply.rating;
    }

    reply.save();
    let post = Post.load(reply.postId.toString())
    updateUserRating(Address.fromString(reply.author), post.communityId);
    updateUserRating(event.params.user, post.communityId);
  } else {
    let post = Post.load(event.params.postId.toString())
    if (post == null) {
      post = new Post(event.params.postId.toString())
      newPost(post, event.params.postId);
    } else {
      let peeranhaPost = getPeeranhaContent().getPost(event.params.postId);
      if (peeranhaPost == null) return;
      post.rating = peeranhaPost.rating;
    }

    post.save();
    updateUserRating(Address.fromString(post.author), post.communityId);
    updateUserRating(event.params.user, post.communityId);
  }
}
