import { Bytes, BigInt, Address } from '@graphprotocol/graph-ts'
import { User, UserCommunityRating } from '../generated/schema'
import { getPeeranhaUser, ERROR_IPFS, isValidIPFS, convertIpfsHash, bytesToJson } from './utils'
const VALUE_STERT_USER_RATING = 10;

export function newUser(user: User | null, userAddress: Address, blockTimeStamp: BigInt): void {
  let peeranhaUser = getPeeranhaUser().getUserByAddress(userAddress);
  if (peeranhaUser == null) return;

  user.creationTime = blockTimeStamp;
  user.postCount = 0;
  user.replyCount = 0;
  user.followedCommunities = [];
  user.achievements = [];
  user.ratings = [];

  addDataToUser(user, userAddress);
}

export function addDataToUser(user: User | null, userAddress: Address): void {
  let peeranhaUser = getPeeranhaUser().getUserByAddress(userAddress);
  if (peeranhaUser == null) return;
  
  user.ipfsHash = peeranhaUser.ipfsDoc.hash;
  user.ipfsHash2 = peeranhaUser.ipfsDoc.hash2;

  getIpfsUserData(user);
}

export function getIpfsUserData(user: User | null): void {
  let result = convertIpfsHash(user.ipfsHash as Bytes);

  let ipfsData = bytesToJson(result);

  if (isValidIPFS(ipfsData)) {
    let ipfsObj = ipfsData.toObject()
    
    let displayName = ipfsObj.get('displayName');
    if (!displayName.isNull()) {
      user.displayName = displayName.toString();
    } else {
      user.displayName = user.id.slice(0,6) + '...' + user.id.slice(-4);
    }
    
    let company = ipfsObj.get('company');
    if (!company.isNull()) {
      user.company = company.toString();
    }

    let position = ipfsObj.get('position');
    if (!position.isNull()) {
      user.position = position.toString()
    }

    let location = ipfsObj.get('location');
    if (!location.isNull()) {
      user.location = location.toString();
    }

    let about = ipfsObj.get('about');
    if (!about.isNull()) {
      user.about = about.toString();
    }

    let avatar = ipfsObj.get('avatar');
    if (!avatar.isNull()) {
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

export function updateUserRating(userAddress: Address, communityId: BigInt): void { 
  let user = User.load(userAddress.toHex());
  if (user == null) return;
  let userComunityRating = UserCommunityRating.load(communityId.toString() + ' ' + userAddress.toHex());

  if (userComunityRating == null) {
    userComunityRating = new UserCommunityRating(communityId.toString() + ' ' + userAddress.toHex());
    userComunityRating.user = userAddress.toHex()
    userComunityRating.communityId = communityId.toI32();
    // userComunityRating.save();   // DEL?

    let ratings = user.ratings;
    ratings.push(communityId.toString() + ' ' + userAddress.toHex());
    user.ratings = ratings;
    user.save();
  }

  let userRatingStatusResult = getPeeranhaUser().try_getUserRatingCollection(userAddress, communityId)
  if(!userRatingStatusResult.reverted) { 
    if (userRatingStatusResult.value.isActive) {
      userComunityRating.rating = userRatingStatusResult.value.rating;
    } else {
      userComunityRating.rating = VALUE_STERT_USER_RATING;
    }
  } else {
    userComunityRating.rating = getPeeranhaUser().getUserRating(userAddress, communityId);
  }

  userComunityRating.save();
}

export function getUser(userAddress: Address): User | null {
  let user = User.load(userAddress.toHex());
  return user
}
