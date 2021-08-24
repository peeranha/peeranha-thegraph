import { ByteArray } from '@graphprotocol/graph-ts'
import { json, Bytes, ipfs } from '@graphprotocol/graph-ts'
import { UserCreated, UserUpdated,
  CommunityCreated, CommunityUpdated, CommunityFrozen, CommunityUnfrozen,
  TagCreated,
  PostCreated } from '../generated/Peeranha/Peeranha'
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
  let community = new Community(event.params.id.toHex()); // to string
  community.isFrozen = false;

  getCommunityData(event.params.ipfsHash, event.params.ipfsHash2, community);

  community.save(); 
}

export function handleUpdatedCommunity(event: CommunityUpdated): void {
  let id = event.params.id.toHex() // to string
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
  let id = event.params.commintyId.toHex() // to string
  let community = Community.load(id)
  if (community == null) {
    community = new Community(id)
  }

  community.isFrozen = true;
  community.save();
}

export function handleUnfrozenCommunity(event: CommunityUnfrozen): void {
  let id = event.params.commintyId.toHex() // to string
  let community = Community.load(id)
  if (community == null) {
    community = new Community(id)
  }
  
  community.isFrozen = false;
  community.save();
}

export function handleNewTag(event: TagCreated): void {
  let tag = new Tag(event.params.tagId.toHex()); // to string
  tag.communityId = event.params.communityId;

  getTagData(event.params.ipfsHash, event.params.ipfsHash, tag);

  tag.save(); 
}

// export function handleUpdatedTag(event: TagUpdated): void {
//   let id = event.params.id.toHex() // to string
//   let tag = Tag.load(id)
//   if (tag == null) {
//     tag = new Tag(id)
//   }

//   getTagData(event.params.ipfsHash, event.params.ipfsHash, tag);

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