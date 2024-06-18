import { Bytes, BigInt, Address, log } from '@graphprotocol/graph-ts'
import { User, UserCommunityRating, UserCommunityBan, Post, Reply, Comment } from '../generated/schema'
import { getPeeranhaUser, getPeeranhaContent, ERROR_IPFS, isValidIPFS, convertIpfsHash, bytesToJson, idToIndexId, indexIdToId, isUserBanned, Network } from './utils'
const VALUE_STERT_USER_RATING = 10;

export function newUser(user: User, userAddress: Address, blockTimeStamp: BigInt): void {
  let peeranhaUser = getPeeranhaUser().getUserByAddress(userAddress);
  if (peeranhaUser == null) return;

  user.creationTime = blockTimeStamp;
  user.postCount = 0;
  user.replyCount = 0;
  user.followedCommunities = [];
  user.achievements = [];
  user.ratings = [];
  user.posts = [];
  user.replies = [];
  user.comments = [];

  addDataToUser(user, userAddress);
}

export function addDataToUser(user: User, userAddress: Address): void {
  let peeranhaUser = getPeeranhaUser().getUserByAddress(userAddress);
  if (!peeranhaUser) return;
  
  user.ipfsHash = peeranhaUser.ipfsDoc.hash;
  user.ipfsHash2 = peeranhaUser.ipfsDoc.hash2;

  getIpfsUserData(user);
}

export function banCommunityUser(userCommunityBan: UserCommunityBan, user: User, communityId: string): void {
  banUserPosts(user, communityId);
  banUserReplies(user, communityId);
  banUserComments(user, communityId);

  userCommunityBan.user = user.id;
  userCommunityBan.communityId = communityId;
}

export function banUserPosts(user: User, communityId: string): void {
  const userPostsLength = user.posts.length;
  for (let i = 0; i < userPostsLength; i++) {
    const post = Post.load(user.posts[i]);
    if (post) {
      if (!post.isDeleted && post.communityId == communityId) {
        post.isDeleted = true;
        post.save();
        user.postCount--;

        const repliesCount = post.replyCount
        for (let i = 1; i <= repliesCount; i++) {

          let reply = Reply.load(post.id + '-' + i.toString());
          if (reply && !reply.isDeleted) {
            const replyAuthor = reply.author;
            let userReply = getUser(Address.fromString(replyAuthor), BigInt.fromI32(1));
            userReply.replyCount--;
            userReply.save();
          }
        }
      }
    } else {
      /// to do logTransaction()
    }
  }
}

export function banUserReplies(user: User, communityId: string): void {
  const userRepliesLength = user.replies.length;
  for (let i = 0; i < userRepliesLength; i++) {
    const reply = Reply.load(user.replies[i]);
    if (reply) {
      const post = Post.load(reply.postId);
      if (post) {
        if (!reply.isDeleted && post.communityId == communityId) {
          reply.isDeleted = true;
          reply.save();
          if (!post.isDeleted) {
            user.replyCount--;
          }
        }
      } else {
        /// to do logTransaction()
      }
    } else {
      // todo logTransaction()
    }
  }
}

export function banUserComments(user: User, communityId: string): void {
  const userCommentsLength = user.comments.length;
  for (let i = 0; i < userCommentsLength; i++) {
    const comment = Comment.load(user.comments[i]);
    if (comment && !comment.isDeleted) { 
      const post = Post.load(comment.postId);
      if (post) {
        if (post.communityId == communityId) {
          comment.isDeleted = true;
          comment.save();
        }
      } else {
        /// to do logTransaction()
      }
    } else {
      // todo logTransaction()
    }
  }
}

export function unBanCommunityUser(user: User, communityId: string): void {
  unbanUserPosts(user, communityId);
  unbanUserReplies(user, communityId);
  unbanUserComments(user, communityId);
}

export function unbanUserPosts(user: User, communityId: string): void {
  const userPostsLength = user.posts.length;
  for (let i = 0; i < userPostsLength; i++) {
    const post = Post.load(user.posts[i]);
    if (post) {
      if(post.isDeleted && post.communityId == communityId) {
        const peeranhaPost = getPeeranhaContent().getPost(BigInt.fromString(indexIdToId(post.id)));
        if (peeranhaPost == null || peeranhaPost.isDeleted) // to do logTransaction() ?
          continue;

        post.isDeleted = false;
        post.save();
        user.postCount++;

        const repliesCount = post.replyCount
        for (let i = 1; i <= repliesCount; i++) {
          // Increment reply count for another user in post
          let reply = Reply.load(post.id + '-' + i.toString());
          if (reply && !reply.isDeleted) {
            let isReplyUserBanned = isUserBanned(reply.author, post.communityId);
            if (isReplyUserBanned) continue; // reply count already incremented

            const replyAuthor = reply.author;
            let userReply = getUser(Address.fromString(replyAuthor), BigInt.fromI32(1));
            userReply.replyCount++;
            userReply.save();
          }
        }
      }
    } else {
      /// to do logTransaction()
    }
  }
}

export function unbanUserReplies(user: User, communityId: string): void {
  const userRepliesLength = user.replies.length;
  for (let i = 0; i < userRepliesLength; i++) {
    const reply = Reply.load(user.replies[i]);
    if (reply && reply.isDeleted) {
      const post = Post.load(reply.postId);
      if (post) {
        if (post.communityId == communityId) {
          const peeranhaPost = getPeeranhaContent().getPost(BigInt.fromString(indexIdToId(post.id)));
          const peeranhaReply = getPeeranhaContent().getReply(BigInt.fromString(indexIdToId(post.id)), BigInt.fromString(indexIdToId(reply.id)).toI32());
          
          if (peeranhaPost == null || peeranhaPost.isDeleted || peeranhaReply == null || peeranhaReply.isDeleted) // to do logTransaction() ?
            continue;

          reply.isDeleted = false;
          reply.save();
          if (!post.isDeleted)
            user.replyCount++;
        }
      } else {
        /// to do logTransaction()
      }
    } else {
      // todo logTransaction()
    }
  }
}

export function unbanUserComments(user: User, communityId: string): void {
  // check comment contract
  const userCommentsLength = user.comments.length;
  for (let i = 0; i < userCommentsLength; i++) {
    const comment = Comment.load(user.comments[i]);
    if (comment && comment.isDeleted) {
      const post = Post.load(comment.postId);
      if (post) {
        if (post.communityId == communityId) {
          const peeranhaComment = getPeeranhaContent().getComment(BigInt.fromString(indexIdToId(post.id)), comment.parentReplyId, BigInt.fromString(indexIdToId(comment.id)).toI32());
          if (peeranhaComment.isDeleted) 
            continue;

          comment.isDeleted = false;
          comment.save();
        }
      } else {
        /// to do logTransaction()
      }
    } else {
      // todo logTransaction()
    }
  }
}

export function getIpfsUserData(user: User): void {
  let result = convertIpfsHash(user.ipfsHash as Bytes);
  if(!result) return;

  let ipfsData = bytesToJson(result);
  if (ipfsData && isValidIPFS(ipfsData)) {
    let ipfsObj = ipfsData.toObject()
    
    let displayName = ipfsObj.get('displayName');
    if (displayName && !displayName.isNull()) {
      user.displayName = displayName.toString();
    } else {
      user.displayName = user.id.slice(0,6) + '...' + user.id.slice(-4);
    }
    
    let company = ipfsObj.get('company');
    if (company && !company.isNull()) {
      user.company = company.toString();
    }

    let position = ipfsObj.get('position');
    if (position && !position.isNull()) {
      user.position = position.toString()
    }

    let location = ipfsObj.get('location');
    if (location && !location.isNull()) {
      user.location = location.toString();
    }

    let about = ipfsObj.get('about');
    if (about && !about.isNull()) {
      user.about = about.toString();
    }

    let avatar = ipfsObj.get('avatar');
    if (avatar && !avatar.isNull()) {
      user.avatar = avatar.toString();
    }
  } else {
    user.displayName = ERROR_IPFS;
    user.company = ERROR_IPFS;
    user.position = ERROR_IPFS;
    user.location = ERROR_IPFS;
    user.about = ERROR_IPFS;
    user.avatar = ERROR_IPFS;
  }
}

export function updateUserRating(userAddress: Address, communityId: string): void { 
  let user = User.load(userAddress.toHex());
  if (user == null) return;
  let userComunityRating = UserCommunityRating.load(communityId + '-' + userAddress.toHex());

  if (userComunityRating == null) {
    userComunityRating = new UserCommunityRating(communityId + '-' + userAddress.toHex());
    userComunityRating.user = userAddress.toHex()
    userComunityRating.communityId = communityId;

    let ratings = user.ratings;
    ratings.push(communityId + '-' + userAddress.toHex());
    user.ratings = ratings;
    user.save();
  }

  let userRatingStatusResult = getPeeranhaUser().try_getUserRatingCollection(userAddress, BigInt.fromString(indexIdToId(communityId)));
  if (!userRatingStatusResult.reverted) { 
    if (userRatingStatusResult.value.isActive) {
      userComunityRating.rating = userRatingStatusResult.value.rating;
    } else {
      userComunityRating.rating = VALUE_STERT_USER_RATING;
    }
  } else {
    userComunityRating.rating = getPeeranhaUser().getUserRating(userAddress, BigInt.fromString(indexIdToId(communityId)));
  }

  userComunityRating.save();
}

export function getUser(userAddress: Address, blockTimeStamp: BigInt): User {
  let user = User.load(userAddress.toHex());
  if (!user) {
    user = new User(userAddress.toHex())
    newUser(user, userAddress, blockTimeStamp);
  }
  return user
}
