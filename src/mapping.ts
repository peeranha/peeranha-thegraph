import { ByteArray } from '@graphprotocol/graph-ts'
import { json, Bytes, ipfs } from '@graphprotocol/graph-ts'
import { UserCreated, UserUpdated,
  PostCreated } from '../generated/Peeranha/Peeranha'
import { User, Post } from '../generated/schema'


export function handleNewUser(event: UserCreated): void {
  let user = new User(event.params.userAddress.toHex());
  user.rating = 0;
  getUserData(event.params.ipfsHash, event.params.ipfsHash2, user);

  user.save(); 
}

export function handleUpdatedUser(event: UserUpdated): void {
  let id = event.params.userAddress.toHex()
  let user = User.load(id)
  if (user == null) {
    user = new User(id)
  }
  getUserData(event.params.ipfsHash, event.params.ipfsHash2, user);

  user.save();
}

function getUserData(ipfsHash: Bytes, ipfsHash2: Bytes, user: User | null): void {
  if (user == null) return;
  if (ipfsHash == null) return;

  user.ipfsHash = ipfsHash;
  user.ipfsHash2 = ipfsHash2;

  let hashstr = ipfsHash.toHexString();
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