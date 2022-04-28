import { ByteArray, Address, log } from '@graphprotocol/graph-ts'
import { json, Bytes, ipfs, BigInt } from '@graphprotocol/graph-ts'
import { User, UserCommunityRating } from '../generated/schema'
import { getPeeranha } from './utils'

export function newUser(user: User | null, userAddress: Address): void {
  let peeranhaUser = getPeeranha().getUserByAddress(userAddress);
  if (peeranhaUser == null) return;

  user.creationTime = peeranhaUser.creationTime;
  user.postCount = 0;
  user.replyCount = 0;
  user.followedCommunities = [];
  user.achievements = [];
  user.ratings = [];

  addDataToUser(user, userAddress);
}

export function addDataToUser(user: User | null, userAddress: Address): void {
  let peeranhaUser = getPeeranha().getUserByAddress(userAddress);
  if (peeranhaUser == null) return;
  
  user.ipfsHash = peeranhaUser.ipfsDoc.hash;
  user.ipfsHash2 = peeranhaUser.ipfsDoc.hash2;

  getIpfsUserData(user);
}

export function getIpfsUserData(user: User | null): void {
  let hashstr = user.ipfsHash.toHexString();
  let hashHex = "1220" + hashstr.slice(2);
  let ipfsBytes = ByteArray.fromHexString(hashHex);
  let ipfsHashBase58 = ipfsBytes.toBase58();
  let result = ipfs.cat(ipfsHashBase58) as Bytes;
  
  if (result != null) {
    let ipfsData = json.fromBytes(result);
  
    if(!ipfsData.isNull()) {
      let ipfsObj = ipfsData.toObject()
      
      let displayName = ipfsObj.get('displayName');
      if (!displayName.isNull()) {
        user.displayName = displayName.toString();
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
    }
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

    let rating = getPeeranha().getUserRating(userAddress, communityId);
    userComunityRating.rating = rating;
    userComunityRating.save();

    let ratings = user.ratings;
    ratings.push(communityId.toString() + ' ' + userAddress.toHex());
    user.ratings = ratings;
    user.save();
  } else {
    let rating = getPeeranha().getUserRating(userAddress, communityId);
    userComunityRating.rating = rating;
    userComunityRating.save();
  }
}

export function updateStartUserRating(userAddress: Address, communityId: BigInt): void { 
  let user = User.load(userAddress.toHex());
  if (user == null) return;
  let parametersUserCommunityRating = communityId.toString() + ' ' + userAddress.toHex();
  let userComunityRating = UserCommunityRating.load(parametersUserCommunityRating);

  if (userComunityRating == null) {
    let valueStartUserRating = 10;
    userComunityRating = new UserCommunityRating(parametersUserCommunityRating);
    userComunityRating.user = userAddress.toHex()
    userComunityRating.communityId = communityId.toI32();
    userComunityRating.rating = valueStartUserRating;
    userComunityRating.save();

    let ratings = user.ratings;
    ratings.push(parametersUserCommunityRating);
    user.ratings = ratings;
    user.save();
  } 
}

export function getUser(userAddress: Address): User | null {
  let user = User.load(userAddress.toHex());
  if (user == null) {
    // let communityIdI32 = communityId.toI32();                     ///
    // let newCommunityId: BigInt = new BigInt(communityIdI32);      /// -_-
    
    newUser(user, userAddress);
  }

  return user
}