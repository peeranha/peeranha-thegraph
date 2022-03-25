import { ByteArray, Address, log } from '@graphprotocol/graph-ts'
import { json, Bytes, ipfs } from '@graphprotocol/graph-ts'
import { User } from '../generated/schema'
import { getPeeranha } from './utils'

export function newUser(user: User | null, userAddress: Address): void {
  let peeranhaUser = getPeeranha().getUserByAddress(userAddress);
  if (peeranhaUser == null) return;

  user.creationTime = peeranhaUser.creationTime;
  user.postCount = 0;
  user.replyCount = 0;
  user.followedCommunities = [];
  user.achievements = [];
  addDataToUser(user, userAddress);
}

export function addDataToUser(user: User | null, userAddress: Address): void {
  let peeranhaUser = getPeeranha().getUserByAddress(userAddress);
  if (peeranhaUser == null) return;

  // user.rating = peeranhaUser.rating;
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

export function updateUserRating(userAddress: Address): void {
  // let peeranhaUser = getPeeranha().getUserByAddress(userAddress);
  // if (peeranhaUser == null) return;

  // let user = User.load(userAddress.toHex());
  // if (user != null) {
  //   // user.rating = peeranhaUser.rating;
  //   user.save();
  // }
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