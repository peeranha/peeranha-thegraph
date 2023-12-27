import { Address, BigInt, Bytes, log, store, ethereum } from '@graphprotocol/graph-ts'
import { UserCreated, UserUpdated, FollowedCommunity, UnfollowedCommunity, RoleGranted, RoleRevoked } from '../generated/PeeranhaUser/PeeranhaUser'
import { 
  CommunityCreated, CommunityUpdated, CommunityFrozen, CommunityUnfrozen,
  TagCreated, TagUpdated
} from '../generated/PeeranhaCommunity/PeeranhaCommunity'
import { PostCreated, PostEdited, PostDeleted,
  ReplyCreated, ReplyEdited, ReplyDeleted,
  CommentCreated, CommentEdited, CommentDeleted,
  ForumItemVoted, SetDocumentationTree,
  ChangePostType, StatusBestReplyChanged,
  TranslationCreated, TranslationEdited, TranslationDeleted
} from '../generated/PeeranhaContent/PeeranhaContent'

import { GetReward } from '../generated/PeeranhaToken/PeeranhaToken'
import { 
  User, Community, Tag, Post, Reply, Comment, Achievement, ContractInfo, UserReward, Period, History, UserPermission, CommunityDocumentation,
  PostTranslation, ReplyTranslation, CommentTranslation, Statistic
} from '../generated/schema'
import { USER_ADDRESS } from './config'
import { getPeeranhaUser, getPeeranhaToken, getPeeranhaContent, PostType, idToIndexId, Network } from './utils';

import { newPost, addDataToPost, deletePost, newReply, addDataToReply, deleteReply,
  newPostTranslation, newReplyTranslation, newCommentTranslation,
  addDataToPostTranslation, addDataToReplyTranslation, addDataToCommentTranslation,
  newComment, addDataToComment, deleteComment, updatePostContent, updatePostUsersRatings, generateDocumentationPosts } from './post'
import { newCommunity, addDataToCommunity, newTag, addDataToTag, getCommunity } from './community-tag'
import { newUser, addDataToUser, updateUserRating} from './user'
import { addDataToAchievement, giveAchievement, newAchievement } from './achievement'
import { ConfigureNewAchievementNFT, Transfer } from '../generated/PeeranhaNFT/PeeranhaNFT'

const POOL_NFT = 1000000;

const FORUM_ITEM_VOTED_EVENT = 'ForumItemVoted';
  
export function handleConfigureNewAchievement(event: ConfigureNewAchievementNFT): void {
  let achievement = new Achievement(idToIndexId(Network.Polygon, event.params.achievementId.toString()));
  newAchievement(achievement, event.params.achievementId);

  achievement.save();

  logTransaction(Network.Polygon, event, Address.zero(), 'ConfigureAchievement', 0, 0, true);
}

///
// TODO remove NFT
// indexing all users?   if (!user) return;
// can be error when remove
///
export function handleTransferNFT(event: Transfer): void {    // error
  // let id : BigInt = (event.params.tokenId.div(BigInt.fromI32(POOL_NFT))).plus(BigInt.fromI32(1)); // (a / b) + c
  // log.debug('User: {}, ID txx: {}, Achievement Id txx: {}', [event.params.to.toHex(), event.params.tokenId.toString(), id.toString()])
  // let achievement = Achievement.load(idToIndexId(Network.Polygon, id.toString()));
  // if (!achievement){
  //   logTransaction(Network.Polygon, event, event.params.to, 'Transfer', 0, 0, false);
  //   return;
  // }

  // addDataToAchievement(achievement, id);
  // giveAchievement(achievement.id, event.params.to, event.block.timestamp);

  // achievement.save();  
  // logTransaction(Network.Polygon, event, event.params.to, 'Transfer', 0, 0, true);
}

export function handleNewUser(event: UserCreated): void {
  let user = new User(event.params.userAddress.toHex());
  newUser(user, event.params.userAddress, event.block.timestamp);
  user.save();

  indexingPeriods();
  logTransaction(Network.Polygon, event, event.params.userAddress, 'UserCreated', 0, 0, true);
}

export function handleUpdatedUser(event: UserUpdated): void {
  let id = event.params.userAddress.toHex()
  let user = User.load(id)
  if (!user) {
    user = new User(id)
    newUser(user, event.params.userAddress, event.block.timestamp);
  } else {
    addDataToUser(user, event.params.userAddress);
  }
  user.save();
  
  indexingPeriods();
  logTransaction(Network.Polygon, event, event.params.userAddress, 'UserUpdated', 0, 0, true);
}

export function handlerGrantedRole(event: RoleGranted): void {
  let userPermissionId = event.params.account.toHex() + '-' + idToIndexId(Network.Polygon, event.params.role.toHex());
  let userPermission = new UserPermission(userPermissionId);
  userPermission.user = event.params.account.toHex();
  userPermission.permission = event.params.role;
  userPermission.save();
  
  logTransaction(Network.Polygon, event, event.params.sender, 'RoleGranted', 0, 0, true);
}

export function handlerRevokedRole(event: RoleRevoked): void {
  let userPermissionId = event.params.account.toHex() + '-' + idToIndexId(Network.Polygon, event.params.role.toHex());
  store.remove('UserPermission', userPermissionId);
  logTransaction(Network.Polygon, event, event.params.sender, 'RoleRevoked', 0, 0, true);
}

export function handlerFollowCommunity(event: FollowedCommunity): void {
  const userid = event.params.userAddress.toHex();
  let user = User.load(userid);
  if (!user) {
    user = new User(userid);
    newUser(user, event.params.userAddress, event.block.timestamp);
  }
  let communityId = idToIndexId(Network.Polygon, event.params.communityId.toString());
  let followedCommunities = user.followedCommunities
  followedCommunities.push(communityId);

  user.followedCommunities = followedCommunities
  user.save();

  let community = getCommunity(communityId);
  community.followingUsers++;
  community.save();

  indexingPeriods();
  logTransaction(Network.Polygon, event, event.params.userAddress, 'FollowedCommunity', 0, 0, true, community.id);
}

export function handlerUnfollowCommunity(event: UnfollowedCommunity): void {
  const userid = event.params.userAddress.toHex();
  let user = User.load(userid);
  if (!user) {
    user = new User(userid);
    newUser(user, event.params.userAddress, event.block.timestamp);
  }
  let communityId = idToIndexId(Network.Polygon, event.params.communityId.toString());
  
  let followedCommunities: string[] = [];
  let followedCommunitiesBuf = user.followedCommunities

  for (let i = 0; i < user.followedCommunities.length; i++) {
    let community = followedCommunitiesBuf.pop()
    if (community && community != communityId) {
      followedCommunities.push(community)   
    }
  }

  user.followedCommunities = followedCommunities;
  user.save();

  let community = getCommunity(communityId);
  community.followingUsers--;
  community.save();

  indexingPeriods();
  logTransaction(Network.Polygon, event, event.params.userAddress, 'UnfollowedCommunity', 0, 0, true, community.id);
}

export function handleNewCommunity(event: CommunityCreated): void {
  let communityId = event.params.id; 
  let community = new Community(idToIndexId(Network.Polygon, communityId.toString()));

  newCommunity(community, communityId);
  community.save();

  indexingPeriods();
  logTransaction(Network.Polygon, event, event.params.user, 'CommunityCreated', 0, 0, true, community.id);
}

export function handleUpdatedCommunity(event: CommunityUpdated): void {
  let communityId = event.params.id;
  let community = getCommunity(idToIndexId(Network.Polygon, communityId.toString()));
  addDataToCommunity(community, communityId);
  community.save();

  indexingPeriods();
  logTransaction(Network.Polygon, event, event.params.user, 'CommunityUpdated', 0, 0, true, community.id);
}

export function handleFrozenCommunity(event: CommunityFrozen): void {
  let communityId = event.params.communityId;
  let community = getCommunity(idToIndexId(Network.Polygon, communityId.toString()));
  community.isFrozen = true;
  community.save();

  logTransaction(Network.Polygon, event, event.params.user, 'CommunityFrozen', 0, 0, true, community.id);
}

export function handleUnfrozenCommunity(event: CommunityUnfrozen): void {
  let communityId = event.params.communityId;
  let community = getCommunity(idToIndexId(Network.Polygon, communityId.toString()));
  community.isFrozen = false;
  community.save();

  logTransaction(Network.Polygon, event, event.params.user, 'CommunityUnfrozen', 0, 0, true, community.id);
}

export function handleNewTag(event: TagCreated): void {
  let community = getCommunity(idToIndexId(Network.Polygon, event.params.communityId.toString()));
  let communityId = event.params.communityId;
  let tagId = event.params.tagId;
  community.tagsCount++;
  community.save();
  let tag = new Tag(idToIndexId(Network.Polygon, communityId.toString()) + '-' + tagId.toString());
  newTag(tag, communityId, BigInt.fromI32(tagId));
  tag.save(); 

  logTransaction(Network.Polygon, event, event.params.user, 'TagCreated', 0, 0, true, tag.communityId);
}

export function handleEditedTag(event: TagUpdated): void {
  let communityId = event.params.communityId;
  let tagId = event.params.tagId;
  let tag = Tag.load(idToIndexId(Network.Polygon, communityId.toString()) + '-' + tagId.toString());
  if (!tag) {
    logTransaction(Network.Polygon, event, event.params.user, 'TagUpdated', 0, 0, false, communityId.toString());
    return;
  }

  addDataToTag(tag, communityId, BigInt.fromI32(tagId));
  tag.save();

  logTransaction(Network.Polygon, event, event.params.user, 'TagUpdated', 0, 0, true, tag.communityId);
}

// TODO: Get rid of generics in this method. eventEntity and eventName values move to constants or enums.
export function createHistory<T1, T2>(item: T1,  event: T2,  eventEntity: string, eventName: string): void {
  let history = new History(event.transaction.hash.toHex());
  history.post = idToIndexId(Network.Polygon, event.params.postId.toString());
  if (item instanceof Reply) {
    history.reply = idToIndexId(Network.Polygon, event.params.postId.toString()) + '-' + item.id;
  }
  if (item instanceof Comment) {
    history.comment = idToIndexId(Network.Polygon, event.params.postId.toString()) + '-0-' + item.id;
  }

  history.transactionHash = event.transaction.hash;
  history.eventEntity = eventEntity;
  history.eventName = eventName;
  history.actionUser = event.params.user.toHex();
  history.timeStamp = event.block.timestamp;
  history.save();
}

export function handleNewPost(event: PostCreated): void {
  let postId = event.params.postId;
  let post = new Post(idToIndexId(Network.Polygon, postId.toString()));

  newPost(post, postId, event.block.timestamp);
  post.save();
  createHistory(post, event, 'Post', 'Create');
  
  indexingPeriods();

  logTransaction(Network.Polygon, event, event.params.user, 'PostCreated', 0, 0, true, post.communityId, postId);
}

export function handleEditedPost(event: PostEdited): void {
  let postId = event.params.postId;
  let post = Post.load(idToIndexId(Network.Polygon, postId.toString()));

  if (!post) {
    post = new Post(postId.toString());
    newPost(post, postId, event.block.timestamp);
  } else {
    post.lastmod = event.block.timestamp;
    addDataToPost(post, postId);
  }
  post.save();

  updatePostContent(postId);
  createHistory(post, event, 'Post', 'Edit');

  indexingPeriods();

  logTransaction(Network.Polygon, event, event.params.user, 'PostEdited', 0, 0, true, post.communityId, postId);
}

export function handleChangedTypePost(event: ChangePostType): void {
  let postId = event.params.postId;
  let post = Post.load(idToIndexId(Network.Polygon, postId.toString()));

  if (!post) {
    logTransaction(Network.Polygon, event, event.params.user, 'ChangePostType', 0, 0, false);
    return;
  }

  post.lastmod = event.block.timestamp;
  post.postType = event.params.newPostType;
  updatePostUsersRatings(post);
  post.save();
  logTransaction(Network.Polygon, event, event.params.user, 'ChangePostType', 0, 0, true, post.communityId, postId);
}

export function handleDeletedPost(event: PostDeleted): void {
  let postId = event.params.postId;
  let post = Post.load(idToIndexId(Network.Polygon, postId.toString()));
  if (!post) {
    logTransaction(Network.Polygon, event, event.params.user, 'PostDeleted', 0, 0, false);
    return;
  };

  deletePost(post, event.params.postId, event.block.timestamp);
  post.save();
  createHistory(post, event, 'Post', 'Delete');

  indexingPeriods();
  logTransaction(Network.Polygon, event, event.params.user, 'PostDeleted', 0, 0, true, post.communityId, postId);
}

export function handleNewReply(event: ReplyCreated): void {
  let postId = event.params.postId;
  let replyId = event.params.replyId;
  let reply = new Reply(idToIndexId(Network.Polygon, postId.toString()) + '-' + replyId.toString());

  newReply(reply, postId, replyId, event.block.timestamp);
  reply.save();
  createHistory(reply, event, 'Reply', 'Create');

  let post = Post.load(idToIndexId(Network.Polygon, postId.toString()));
  if (!post) {
    logTransaction(Network.Polygon, event, event.params.user, 'ReplyCreated', replyId, 0, false);
    return;
  }

  post.lastmod = event.block.timestamp;
  post.save();

  indexingPeriods();
  logTransaction(Network.Polygon, event, event.params.user, 'ReplyCreated', replyId, 0, true, post.communityId, postId);
}

export function handleEditedReply(event: ReplyEdited): void { 
  let postId = event.params.postId;
  let replyId = event.params.replyId;
  let reply = Reply.load(idToIndexId(Network.Polygon, postId.toString()) + '-' + replyId.toString());

  if (!reply) {
    reply = new Reply(idToIndexId(Network.Polygon, postId.toString()) + '-' + replyId.toString());
    newReply(reply, postId, replyId, event.block.timestamp);
  } else {
    addDataToReply(reply, postId, replyId);
  }
  reply.save();

  updatePostContent(postId);
  createHistory(reply, event, 'Reply', 'Edit');

  let post = Post.load(idToIndexId(Network.Polygon, postId.toString()));
  if (!post) {
    logTransaction(Network.Polygon, event, event.params.user, 'ReplyEdited', replyId, 0, false);
    return;
  }

  post.lastmod = event.block.timestamp;
  post.save();

  indexingPeriods();
  logTransaction(Network.Polygon, event, event.params.user, 'ReplyEdited', replyId, 0, true, post.communityId, postId);
}

export function handleDeletedReply(event: ReplyDeleted): void {
  let postId = event.params.postId;
  let replyId = event.params.replyId;
  let reply = Reply.load(idToIndexId(Network.Polygon, postId.toString()) + '-' + replyId.toString());
  if (reply == null) return;

  let post = Post.load(idToIndexId(Network.Polygon, postId.toString()));
  if (!post) {
    logTransaction(Network.Polygon, event, event.params.user, 'ReplyDeleted', replyId, 0, false);
    return;
  }

  deleteReply(reply, post, event.block.timestamp);
  reply.save();

  updatePostContent(postId);
  createHistory(reply, event, 'Reply', 'Delete');

  indexingPeriods();
  logTransaction(Network.Polygon, event, event.params.user, 'ReplyDeleted', replyId, 0, true, post.communityId, postId);
}

export function handleNewComment(event: CommentCreated): void {
  let postId = event.params.postId;
  let commentId = event.params.commentId;
  let parentReplyId = event.params.parentReplyId;
  let comment = new Comment(idToIndexId(Network.Polygon, postId.toString()) + '-' + parentReplyId.toString() + '-' + commentId.toString());

  let post = Post.load(idToIndexId(Network.Polygon, postId.toString()));
  if (!post) {
    logTransaction(Network.Polygon, event, event.params.user, 'CommentCreated', parentReplyId, commentId, false);
    return;
  }

  newComment(comment, post, parentReplyId, commentId);
  comment.save();
  createHistory(comment, event, 'Comment', 'Create');
  
  post.lastmod = event.block.timestamp;
  post.save();

  indexingPeriods();
  logTransaction(
    Network.Polygon,
    event,
    event.params.user,
    'CommentCreated',
    parentReplyId,
    commentId,
    true,
    post.communityId,
    postId
  );
}

export function handleEditedComment(event: CommentEdited): void {
  let postId = event.params.postId;
  let parentReplyId = event.params.parentReplyId;  
  let commentId = event.params.commentId;
  let comment = Comment.load(idToIndexId(Network.Polygon, postId.toString()) + '-' + parentReplyId.toString() + '-' + commentId.toString());

  let post = Post.load(idToIndexId(Network.Polygon, postId.toString()));
  if (!post) {
    logTransaction(Network.Polygon, event, event.params.user, 'CommentEdited', parentReplyId, commentId, false);
    return;
  }
  
  if (!comment) {
    comment = new Comment(post.id + '-' + parentReplyId.toString() + '-' + commentId.toString());
    newComment(comment, post, parentReplyId, commentId);
  } else {
    addDataToComment(comment, postId, parentReplyId, commentId);
  }

  createHistory(comment, event, 'Comment', 'Edit');
  comment.save();

  updatePostContent(postId);

  post.lastmod = event.block.timestamp;
  post.save();
  indexingPeriods();
  logTransaction(
    Network.Polygon, 
    event,
    event.params.user,
    'CommentEdited',
    parentReplyId,
    commentId,
    true,
    post.communityId,
    postId
  );
}

export function handleDeletedComment(event: CommentDeleted): void {
  let postId = event.params.postId;
  let commentId = event.params.commentId;
  let parentReplyId = event.params.parentReplyId;
  let comment = Comment.load(idToIndexId(Network.Polygon, postId.toString()) + '-' + parentReplyId.toString() + '-' + commentId.toString());
  if (comment == null) return;

  let post = Post.load(idToIndexId(Network.Polygon, postId.toString()));
  if (!post) {
    logTransaction(Network.Polygon, event, event.params.user, 'CommentEdited', parentReplyId, commentId, false);
    return;
  }
  post.lastmod = event.block.timestamp;
  post.save();
  
  deleteComment(comment, post);
  comment.save();

  updatePostContent(postId);
  createHistory(comment, event, 'Comment', 'Delete');

  indexingPeriods();
  logTransaction(
    Network.Polygon,
    event,
    event.params.user,
    'CommentDeleted',
    parentReplyId,
    commentId,
    true,
    post.communityId,
    postId
  );
}

export function indexingPeriods(): void {
  let contractInfo = ContractInfo.load(USER_ADDRESS)
  if (!contractInfo) {
    contractInfo = new ContractInfo(USER_ADDRESS)
    const periodInfo = getPeeranhaUser().getContractInformation();
    const deployTime = periodInfo.value0
    const periodLength = periodInfo.value1
    contractInfo.deployTime = deployTime;
    contractInfo.periodLength = periodLength;
    contractInfo.lastUpdatePeriod = 0;
    contractInfo.save()
  }

  const period = getPeeranhaUser().getPeriod();
  for (; contractInfo.lastUpdatePeriod <= period; contractInfo.lastUpdatePeriod++) {
    contractInfo.save()
    const lastUpdatePeriod = contractInfo.lastUpdatePeriod;
    let periodStruct = new Period(lastUpdatePeriod.toString());
    periodStruct.startPeriodTime = contractInfo.deployTime.plus(contractInfo.periodLength.times(BigInt.fromI32(lastUpdatePeriod)));
    periodStruct.endPeriodTime = contractInfo.deployTime.plus(contractInfo.periodLength.times(BigInt.fromI32(lastUpdatePeriod + 1)));
    periodStruct.isFinished = false;
    periodStruct.save();  

    const previousPeriod = lastUpdatePeriod - 2;
    if (previousPeriod >= 0) {
      indexingUserReward(previousPeriod);

      let previousPeriodStruct = Period.load(previousPeriod.toString());
      if (previousPeriodStruct != null) {
        previousPeriodStruct.isFinished = true;
        previousPeriodStruct.save();
      }
    }
  }
}

export function indexingUserReward(period: i32): void {
  const activeUsersInPeriod = getPeeranhaUser().getActiveUsersInPeriod(period);
  for (let i = 0; i < activeUsersInPeriod.length; i++) {
    const tokenRewards = getPeeranhaToken().getUserRewardGraph(activeUsersInPeriod[i], period);
    let userReward = new UserReward(period.toString() + '-' + activeUsersInPeriod[i].toHex())
    userReward.tokenToReward = tokenRewards;
    userReward.period = period.toString();
    userReward.user = activeUsersInPeriod[i].toHex();
    userReward.isPaid = false;
    userReward.save();
  }
}

export function handleGetReward(event: GetReward): void {
  const userReward = UserReward.load(BigInt.fromI32(event.params.period).toString() + '-' + event.params.user.toHex());
  if (!userReward) {
    logTransaction(Network.Polygon, event, event.params.user, 'GetReward', 0, 0, false);
    return;
  }

  userReward.isPaid = true;
  userReward.save();
}

export function handlerChangedStatusBestReply(event: StatusBestReplyChanged): void {
  // let postId = event.params.postId;
  // let post = Post.load(idToIndexId(Network.Polygon, postId.toString()));
  // let previousBestReply = 0;
  // if (post == null) {
  //   post = new Post(idToIndexId(Network.Polygon, postId.toString()));
  //   newPost(post, postId, event.block.timestamp);
  // } else {
  //   previousBestReply = post.bestReply;
  //   post.bestReply = event.params.replyId;
  // }
  // post.save();
  
  // if (previousBestReply) {
  //   let previousReplyId = previousBestReply;
  //   let previousReply = Reply.load(idToIndexId(Network.Polygon, postId.toString()) + '-' + previousReplyId.toString());

  //   if (previousReply == null) {
  //     newReply(previousReply, postId, previousReplyId, event.block.timestamp);
  //   } else {
  //     previousReply.isBestReply = false;
  //   }
  //   updateUserRating(Address.fromString(previousReply.author), post.communityId);
  //   previousReply.save();
  // }

  // let reply: Reply | null;
  // if (event.params.replyId != 0) {    // fix  (if reply does not exist -> getReply() call erray)
  //   let replyId = event.params.replyId;
  //   reply = Reply.load(idToIndexId(Network.Polygon, postId.toString()) + '-' + replyId.toString());

  //   if (reply == null) {
  //     newReply(reply, postId, replyId, event.block.timestamp);
  //   }

  //   reply.isBestReply = true;
  //   if (reply.author != post.author) {
  //     updateUserRating(Address.fromString(reply.author), post.communityId);
  //   }
  //   reply.save();
  // }
  // if (reply.author != post.author) {
  //   updateUserRating(Address.fromString(post.author), post.communityId);
  // }

  // indexingPeriods();
  // logTransaction(
  //   event,
  //   event.params.user,
  //   'StatusBestReplyChanged',
  //   event.params.replyId,
  //   0,
  //   post.communityId,
  //   postId
  // );
}

export function handlerForumItemVoted(event: ForumItemVoted): void {    //  move this in another function with edit
  let postId = event.params.postId;
  let replyId = event.params.replyId;
  let commentId = event.params.commentId;
  let post = Post.load(idToIndexId(Network.Polygon, postId.toString()));
  if (!post) {
    logTransaction(Network.Polygon, event, event.params.user, FORUM_ITEM_VOTED_EVENT, replyId, commentId, false);
    return;
  }

  if (commentId != 0) {
    let comment = Comment.load(idToIndexId(Network.Polygon, postId.toString()) + '-' + replyId.toString() + '-' + commentId.toString());
    let peeranhaComment = getPeeranhaContent().getComment(postId, replyId, commentId);
    if (!comment || !peeranhaComment) {
      logTransaction(Network.Polygon, event, event.params.user, FORUM_ITEM_VOTED_EVENT, replyId, commentId, false);
      return;
    }

    comment.rating = peeranhaComment.rating;
    comment.save();
    
  } else if (replyId != 0) {
    let reply = Reply.load(idToIndexId(Network.Polygon, postId.toString()) + '-' + replyId.toString())
    let peeranhaReply = getPeeranhaContent().getReply(postId, replyId);
    if (!reply || !peeranhaReply) {
      logTransaction(Network.Polygon, event, event.params.user, FORUM_ITEM_VOTED_EVENT, replyId, commentId, false);
      return;
    }

    reply.rating = peeranhaReply.rating;
    reply.save();

    updateUserRating(Address.fromString(reply.author), post.communityId);
    updateUserRating(event.params.user, post.communityId);
  } else {
    let peeranhaPost = getPeeranhaContent().getPost(postId);
    if (!peeranhaPost) {
      logTransaction(Network.Polygon, event, event.params.user, FORUM_ITEM_VOTED_EVENT, replyId, commentId, false);
      return;
    }

    post.rating = peeranhaPost.rating;
    post.save();

    updateUserRating(Address.fromString(post.author), post.communityId);
    updateUserRating(event.params.user, post.communityId);
  }

  indexingPeriods();
  logTransaction(
    Network.Polygon,
    event,
    event.params.user,
    FORUM_ITEM_VOTED_EVENT, 
    replyId,
    0,
    true,
    post.communityId,
    postId
  );
}

export function handlerSetDocumentationTree(event: SetDocumentationTree): void {
  let communityId = event.params.communityId;
  const oldDocumentation = CommunityDocumentation.load(idToIndexId(Network.Polygon, communityId.toString()));
  let communityDocumentation = getPeeranhaContent().getDocumentationTree(communityId);

  if (communityDocumentation.hash == new Address(0))
    return;

  let oldDocumentationIpfsHash: Bytes | null = null;
  if (oldDocumentation){
    if (oldDocumentation.ipfsHash === communityDocumentation.hash) {
      return;
    }
    oldDocumentationIpfsHash = oldDocumentation.ipfsHash;
  }

  const documentation = new CommunityDocumentation(idToIndexId(Network.Polygon, communityId.toString()));
  documentation.ipfsHash = communityDocumentation.hash;
  documentation.save();

  generateDocumentationPosts(
    communityId,
    event.params.userAddr,
    event.block.timestamp,
    oldDocumentationIpfsHash,
    communityDocumentation.hash
  );
  
  logTransaction(Network.Polygon, event, event.params.userAddr, 'SetDocumentationTree', 0, 0, true, idToIndexId(Network.Polygon, communityId.toString()));
}

function logTransaction(
  network: Network,
  event: ethereum.Event,
  actionUser: Address,
  eventName: string,
  replyId: i32,
  commentId: i32,
  status: boolean,
  communityId: string | null = null,
  postId: BigInt | null = null,
): void {
  let stat = new Statistic(event.transaction.hash.toHex());

  stat.transactionHash = event.transaction.hash;
  stat.eventName = eventName;
  stat.timeStamp = event.block.timestamp;
  stat.actionUser = actionUser.toHex();

  stat.communityId = communityId;
  stat.postId = postId;
  stat.replyId = replyId;
  stat.commentId = commentId;
  stat.voteDirection =
    eventName === FORUM_ITEM_VOTED_EVENT
      ? event.parameters[4].value.toI32()
      : 0;
  stat.status = status;
  stat.network = network.toString();

  stat.save();
}

export function handlerCreatedTranslation(event: TranslationCreated): void {
  const itemLanguage = event.params.language;
  const postId = event.params.postId;
  const replyId = event.params.replyId;
  const commentId = event.params.commentId;

  if (commentId != 0) {
    let commentTranslation = new CommentTranslation(idToIndexId(Network.Polygon, postId.toString()) + "-" + replyId.toString() + "-" + commentId.toString() + "-" + itemLanguage.toString());
    newCommentTranslation(commentTranslation, postId, replyId, commentId, itemLanguage)
    commentTranslation.save();
    
  } else if (replyId != 0) {
    let replyTranslation = new ReplyTranslation(idToIndexId(Network.Polygon, postId.toString()) + "-" + replyId.toString() + "-" + itemLanguage.toString());
    newReplyTranslation(replyTranslation, postId, replyId, itemLanguage)
    replyTranslation.save();

  } else { 
    let postTranslation = new PostTranslation(idToIndexId(Network.Polygon, postId.toString()) + "-" + itemLanguage.toString());
    newPostTranslation(postTranslation, postId, itemLanguage)
    postTranslation.save();
  }

  indexingPeriods();
  logTransaction(Network.Polygon, event, event.params.user, 'TranslationCreated', replyId, commentId, true, null, postId);
}

export function handlerEditTranslation(event: TranslationEdited): void {
  const itemLanguage = event.params.language;
  const postId = event.params.postId;
  const replyId = event.params.replyId;
  const commentId = event.params.commentId;

  if (commentId != 0) {
    let commentTranslation = CommentTranslation.load(idToIndexId(Network.Polygon, postId.toString()) + "-" + replyId.toString() + "-" + commentId.toString() + "-" + itemLanguage.toString());
    if (commentTranslation != null) {
      addDataToCommentTranslation(commentTranslation, postId, replyId, commentId, itemLanguage)
      commentTranslation.save();
    }

  } else if (replyId != 0) {
    let replyTranslation = ReplyTranslation.load(idToIndexId(Network.Polygon, postId.toString()) + "-" + replyId.toString() + "-" + itemLanguage.toString());
    if (replyTranslation != null) {
      addDataToReplyTranslation(replyTranslation, postId, replyId, itemLanguage)
      replyTranslation.save();
    }

  } else {  
    let postTranslation = PostTranslation.load(idToIndexId(Network.Polygon, postId.toString()) + "-" + itemLanguage.toString());
    if (postTranslation != null) {
      addDataToPostTranslation(postTranslation, postId, itemLanguage)
      postTranslation.save();
    }
  }

  updatePostContent(postId);
  indexingPeriods();
  logTransaction(Network.Polygon, event, event.params.user, 'TranslationEdited', replyId, commentId, true, null, postId);
}

export function handlerDeleteTranslation(event: TranslationDeleted): void {
  const itemLanguage = event.params.language;
  const postId = event.params.postId;
  const replyId = event.params.replyId;
  const commentId = event.params.commentId;

  if (commentId != 0) {
    let id = postId.toString() + "-" + replyId.toString() + "-" + commentId.toString() + "-" + itemLanguage.toString();
    store.remove('CommentTranslation', id);

  } else if (replyId != 0) {
    let id = postId.toString() + "-" + replyId.toString() + "-0-" + itemLanguage.toString();
    store.remove('ReplyTranslation', id);

  } else {  
    let id = postId.toString() + "-0-0-" + itemLanguage.toString();
    store.remove('PostTranslation', id);
  }

  updatePostContent(postId);
  indexingPeriods();
  logTransaction(Network.Polygon, event, event.params.user, 'TranslationDeleted', replyId, commentId, true, null, postId);
}
