import { ByteArray, Address, BigInt } from '@graphprotocol/graph-ts'
import { json, Bytes, ipfs } from '@graphprotocol/graph-ts'
import { User } from '../generated/schema'
import { getPeeranha } from './utils'

export function newUser(user: User, userAddress: Address): void {
  let peeranhaUser = getPeeranha().getUserByAddress(userAddress);
  if (!peeranhaUser) return;

  user.creationTime = peeranhaUser.creationTime;
  addDataToUser(user, userAddress);
}

export function addDataToUser(user: User, userAddress: Address): void {
  let peeranhaUser = getPeeranha().getUserByAddress(userAddress);
  if (!peeranhaUser) return;

  user.rating = peeranhaUser.rating;
  user.ipfsHash = peeranhaUser.ipfsDoc.hash;
  user.ipfsHash2 = peeranhaUser.ipfsDoc.hash2;

  getIpfsUserData(user);
}

export function getIpfsUserData(user: User): void {
  let useripfs = user.ipfsHash as ByteArray
  let hashstr = useripfs.toHexString();
  let hashHex = "1220" + hashstr.slice(2);
  let ipfsBytes = ByteArray.fromHexString(hashHex);
  let ipfsHashBase58 = ipfsBytes.toBase58();
  let result = ipfs.cat(ipfsHashBase58) as Bytes;
  
  if (result) {
    let ipfsData = json.fromBytes(result);
  
    if(ipfsData) {
      let ipfsObj = ipfsData.toObject()
      
      let displayName = ipfsObj.get('displayName');
      if (displayName) {
        user.displayName = displayName.toString();
      }
      
      let company = ipfsObj.get('company');
      if (company) {
        user.company = company.toString();
      }
  
      let position = ipfsObj.get('position');
      if (position) {
        user.position = position.toString()
      }
  
      let location = ipfsObj.get('location');
      if (location) {
        user.location = location.toString();
      }
  
      let about = ipfsObj.get('about');
      if (about) {
        user.about = about.toString();
      }
  
      let avatar = ipfsObj.get('avatar');
      if (avatar) {
        user.avatar = avatar.toString();
      }
    }
  }
}

export function updateUserRating(userAddress: Address): void {
  let peeranhaUser = getPeeranha().getUserByAddress(userAddress);
  if (peeranhaUser == null) return;

  let user = User.load(userAddress.toHex());
  if (user != null) {
    user.rating = peeranhaUser.rating;
    user.save();
  }
}