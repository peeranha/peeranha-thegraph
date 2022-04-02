import { Address, BigInt, log } from '@graphprotocol/graph-ts'
import { ethereum } from '@graphprotocol/graph-ts'
import { UserCreated, UserUpdated, FollowedCommunity, UnfollowedCommunity,
  CommunityCreated, CommunityUpdated, CommunityFrozen, CommunityUnfrozen,
  TagCreated,
  PostCreated, PostEdited, PostDeleted,
  ReplyCreated, ReplyEdited, ReplyDeleted,
  CommentCreated, CommentEdited, CommentDeleted,
  ForumItemVoted,
  StatusOfficialReplyChanged, StatusBestReplyChanged,
} from '../generated/Peeranha/Peeranha'

import { GetReward } from '../generated/PeeranhaToken/PeeranhaToken'
import { User, Community, Tag, Post, Reply, Comment, Achievement, ContractInfo, UserReward, Period } from '../generated/schema'
import { getPeeranha, getPeeranhaToken, peeranhaAddress } from './utils'

import { newPost, addDataToPost, deletePost,
  newReply, addDataToReply, deleteReply,
  newComment, addDataToComment } from './post'
import { newCommunity, addDataToCommunity, newTag, getCommunity } from './community-tag'
import { newUser, addDataToUser, updateUserRating } from './user'
import { addDataToAchievement, giveAchievement, newAchievement } from './achievement'
import { ConfigureNewAchievementNFT, Transfer } from '../generated/PeeranhaNFT/PeeranhaNFT'

const POOL_NFT = 1000000;
  
export function handleConfigureNewAchievement(event: ConfigureNewAchievementNFT): void {
  if (event.params.achievementId < BigInt.fromI32(13)) {
    return;
  }
  let achievement = new Achievement(event.params.achievementId.toString());
  newAchievement(achievement, event.params.achievementId);

  achievement.save();  
}

export function handleTransferAchievement(event: Transfer): void {
  let id : BigInt = (event.params.tokenId / BigInt.fromI32(POOL_NFT)) + BigInt.fromI32(1);
  log.error('User: {}, ID txx: {}, Achievement Id txx: {}', [event.params.to.toHex(), event.params.tokenId.toString(), id.toString()])
  let achievement = Achievement.load(id.toString());

  if (achievement != null) {
    addDataToAchievement(achievement, id);

    giveAchievement(id, event.params.to);

    achievement.save();  
  }
}


export function handleNewUser(event: UserCreated): void {
  if (event.params.userAddress.toHex() == "0xeed58801f34f32695fc43f1b61c74cb7cea70ee0") {
    return;
  }
  // if (event.params.userAddress.toHex() == "0xed4626046dd913ae11fb4b04b4bd1caec5867645") {
  //   return;
  // }
  // if (event.params.userAddress.toHex() == "0xf1fef67cdeb0d2af32f125ab8ffc85ab2cec0881") {
  //   return;
  // }
  // if (event.params.userAddress.toHex() == "0x094a767eec1aa031953a6f5946ee07c9afe469c8") {
  //   return;
  // }
  if (event.params.userAddress.toHex() == "0x47c7f69e98451a27e6515b5b85d7ea1562a8e903") {
    return;
  }
  if (event.params.userAddress.toHex() == "0xdb3dec65f2dfd5bd93f60738f6b0876125c43c2e") {
    return;
  }
  let user = new User(event.params.userAddress.toHex());
  newUser(user, event.params.userAddress);

  user.save();
}

export function handleUpdatedUser(event: UserUpdated): void {
  if (event.params.userAddress.toHex() == "0xeed58801f34f32695fc43f1b61c74cb7cea70ee0") {
    return;
  }
  // if (event.params.userAddress.toHex() == "0xed4626046dd913ae11fb4b04b4bd1caec5867645") {
  //   return;
  // }
  // if (event.params.userAddress.toHex() == "0xf1fef67cdeb0d2af32f125ab8ffc85ab2cec0881") {
  //   return;
  // }
  // if (event.params.userAddress.toHex() == "0x094a767eec1aa031953a6f5946ee07c9afe469c8") {
  //   return;
  // }
  if (event.params.userAddress.toHex() == "0x47c7f69e98451a27e6515b5b85d7ea1562a8e903") {
    return;
  }
  if (event.params.userAddress.toHex() == "0xdb3dec65f2dfd5bd93f60738f6b0876125c43c2e") {
    return;
  }
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

export function handlerFollowCommunity(event: FollowedCommunity): void {
  // let user = new User(event.params.userAddress.toHex());
  
  // let followedCommunities = user.followedCommunities
  // followedCommunities.push("1")
  // followedCommunities.push("2")
  // user.followedCommunities = followedCommunities

  // user.save();
}

export function handlerUnfollowCommunity(event: UnfollowedCommunity): void {
  // let user = new User(event.params.userAddress.toHex());
  
  // let followedCommunities = user.followedCommunities
  // followedCommunities.push("1")
  // followedCommunities.push("2")
  // user.followedCommunities = followedCommunities

  // user.save();
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

  deletePost(post, event.params.postId);
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

  deleteReply(reply, event.params.postId);
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

export function handleReward(block: ethereum.Block): void {
  let contractInfo = ContractInfo.load(peeranhaAddress)
  if (contractInfo == null) {
    contractInfo = new ContractInfo(peeranhaAddress)
    const periodInfo = getPeeranha().getPeriodInfo();
    const startPeriodTime = periodInfo.value0
    const periodLength = periodInfo.value1
    contractInfo.startPeriodTime = startPeriodTime;
    contractInfo.periodLength = periodLength;
    contractInfo.lastUpdatePeriod = 0;
    contractInfo.lastBlock = block.number;
    contractInfo.save()
  }

  if ((contractInfo.lastBlock.plus(BigInt.fromI32(3))).lt(block.number)) {
    const period = getPeeranha().getPeriod() + 1;
    if (contractInfo.lastUpdatePeriod < period) {   // for() from lastUpdatePeriod to period
      contractInfo.lastUpdatePeriod = period;
      contractInfo.lastBlock = block.number;
      contractInfo.save()
      let periodStruct = new Period(period.toString());
      periodStruct.startPeriodTime = contractInfo.startPeriodTime.plus(contractInfo.periodLength.times(BigInt.fromI32(period)))
      periodStruct.endPeriodTime = contractInfo.startPeriodTime.plus(contractInfo.periodLength.times(BigInt.fromI32(period + 1)))
      periodStruct.save();

      const activeUsersInPeriod = getPeeranha().getActiveUsersInPeriod(period);
      for (let i = 0; i < activeUsersInPeriod.length; i++) {
        const tokenRewards = getPeeranhaToken().getUserRewardGraph(activeUsersInPeriod[i], period);

        let userReward = new UserReward(period.toString() + '-' + activeUsersInPeriod[i].toHex())
        userReward.tokenToReward = tokenRewards;
        userReward.period = period.toString();
        userReward.user = activeUsersInPeriod[i].toHex();
        userReward.status = false;
        userReward.save();
      }
    }
  }
}

export function handleGetReward(event: GetReward): void {
  const userReward = UserReward.load(BigInt.fromI32(event.params.period).toString() + '-' + event.params.user.toHex())
  userReward.status = true;
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
    let post = Post.load(reply.postId.toString())
    updateUserRating(Address.fromString(reply.author), post.communityId);
    updateUserRating(event.params.user, post.communityId);
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
    updateUserRating(Address.fromString(post.author), post.communityId);
    updateUserRating(event.params.user, post.communityId);
  }
}