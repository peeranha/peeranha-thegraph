import { Address, ByteArray } from '@graphprotocol/graph-ts'
import { json, Bytes, ipfs } from '@graphprotocol/graph-ts'
import { UserCreated, UserUpdated,
  CommunityCreated, CommunityUpdated, CommunityFrozen, CommunityUnfrozen,
  TagCreated,
  PostCreated, Peeranha } from '../generated/Peeranha/Peeranha'
import { User, Community, Tag, Post } from '../generated/schema'


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

  // const aa = Peeranha.bind(Address.fromHexString("0xd635C2e0F2953032B92C451D433c8ab70Fab5CDc"))
  // aa.getPost(5);
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

export function handleNewCommunity(event: CommunityCreated): void {
  let community = new Community(event.params.id.toString());
  community.isFrozen = false;

  let tagg = event.params.tags;
  for (let i = 0; i < tagg.length; i++) {
    let tag = new Tag(event.params.id.toString() + "-" + i.toString());
    tag.communityId = event.params.id;
    getTagData(tagg[i].ipfsDoc.hash, tagg[i].ipfsDoc.hash, tag);
    tag.save();
  }

  getCommunityData(event.params.ipfsHash, event.params.ipfsHash2, community);
  community.save(); 
}

export function handleUpdatedCommunity(event: CommunityUpdated): void {
  let id = event.params.id.toString() // to string
  let community = Community.load(id)
  if (community == null) {
    community = new Community(id)
  }
  community.ipfsHash = event.params.ipfsHash;

  getCommunityData(event.params.ipfsHash, community.ipfsHash2, community);    //community.ipfsHash2 = community.ipfsHash2?

  community.save();
}

function getCommunityData(ipfsHash: Bytes, ipfsHash2: Bytes, community: Community | null): void {
  if (community == null) return;
  if (ipfsHash == null) return;

  community.ipfsHash = ipfsHash;
  community.ipfsHash2 = ipfsHash2;

  let hashstr = ipfsHash.toHexString();
  let hashHex = "1220" + hashstr.slice(2);
  let ipfsBytes = ByteArray.fromHexString(hashHex);
  let ipfsHashBase58 = ipfsBytes.toBase58();
  let result = ipfs.cat(ipfsHashBase58) as Bytes;

  if (result != null) {
    let ipfsData = json.fromBytes(result);

    if(!ipfsData.isNull()) {
      let ipfsObj = ipfsData.toObject()
      let title = ipfsObj.get('title');
      if (!title.isNull()) {
        community.title = title.toString();
      }

      let description = ipfsObj.get('description');
      if (!description.isNull()) {
        community.description = description.toString();
      }

      let website = ipfsObj.get('website');
      if (!website.isNull()) {
        community.website = website.toString();
      }

      let language = ipfsObj.get('language');
      if (!language.isNull()) {
        community.language = language.toString();
      }
    }
  }
}

export function handleFrozenCommunity(event: CommunityFrozen): void {
  let id = event.params.commintyId.toString()
  let community = Community.load(id)
  if (community != null) {
    community.isFrozen = true;
    community.save();
  } else {
    // get community data
  }
}

export function handleUnfrozenCommunity(event: CommunityUnfrozen): void {
  let id = event.params.commintyId.toString()
  let community = Community.load(id)
  if (community != null) {
    community.isFrozen = false;
    community.save();
  } else {
    // get community data?
  }
}

export function handleNewTag(event: TagCreated): void {
  let community = Community.load(event.params.tagId.toString()) //communityId -> tagId
  if (community != null) {
    let tag = new Tag(event.params.tagId.toString() + "-" +event.params.communityId.toString());
    tag.communityId = event.params.tagId;
  
    getTagData(event.params.ipfsHash, event.params.ipfsHash, tag);
    tag.save(); 
  } else {
    // get community data?
  }
}

// export function handleNewPost(event: PostCreated): void {
//   let post = new Post(event.params.postId.toHex()); // to string
//   post.isDeleted = false;

//   // let aa = Peeranha.

//   // post.ipfsHash = event.params.ipfsHash;
//   // post.ipfsHash2 = event.params.ipfsHash2;

//   let hashstr = post.ipfsHash.toHexString();
//   let hashHex = "1220" + hashstr.slice(2);
//   let ipfsBytes = ByteArray.fromHexString(hashHex);
//   let ipfsHashBase58 = ipfsBytes.toBase58();
//   let result = ipfs.cat(ipfsHashBase58) as Bytes;

//   if (result != null) {
//     let ipfsData = json.fromBytes(result);

//     if(!ipfsData.isNull()) {
//       let ipfsObj = ipfsData.toObject()
  
//       let title = ipfsObj.get('title');
//       if (!title.isNull()) {
//         post.title = title.toString();
//       }
//     }
//   }
//   post.save(); 
// }

function getTagData(ipfsHash: Bytes, ipfsHash2: Bytes, tag: Tag | null): void {
  if (tag == null) return;
  if (ipfsHash == null) return;

  tag.ipfsHash = ipfsHash;
  tag.ipfsHash2 = ipfsHash2;

  let hashstr = ipfsHash.toHexString();
  let hashHex = "1220" + hashstr.slice(2);
  let ipfsBytes = ByteArray.fromHexString(hashHex);
  let ipfsHashBase58 = ipfsBytes.toBase58();
  let result = ipfs.cat(ipfsHashBase58) as Bytes;

  if (result != null) {
    let ipfsData = json.fromBytes(result);

    if(!ipfsData.isNull()) {
      let ipfsObj = ipfsData.toObject()
    
      let title = ipfsObj.get('title');
      if (!title.isNull()) {
        tag.title = title.toString();
      }

      let description = ipfsObj.get('description');
      if (!description.isNull()) {
        tag.description = description.toString();
      }
    }
  }
}