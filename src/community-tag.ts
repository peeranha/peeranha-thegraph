import { json, Bytes, ipfs, BigInt, JSONValueKind, ByteArray } from '@graphprotocol/graph-ts'
import { Community, Tag } from '../generated/schema'
import { getPeeranhaCommunity } from './utils'
import { ERROR_IPFS, isValidIPFS } from "./utils";

export function newCommunity(community: Community | null, communityId: BigInt): void {
  let peeranhaCommunity = getPeeranhaCommunity().getCommunity(communityId);
  if (peeranhaCommunity == null) return;

  community.creationTime = peeranhaCommunity.timeCreate;
  community.isFrozen = peeranhaCommunity.isFrozen;
  community.postCount = 0;
  community.deletedPostCount = 0;
  community.replyCount = 0;
  community.followingUsers = 0;
  addDataToCommunity(community, communityId);
  
  let peeranhaTags = getPeeranhaCommunity().getTags(communityId);
  if (peeranhaTags.length == 0) return;

  community.tagsCount = peeranhaTags.length;
  for (let i = 1; i <= peeranhaTags.length; i++) {
    let tag = new Tag(communityId.toString() + "-" + i.toString());
    tag.communityId = communityId;
    newTag(tag, communityId, BigInt.fromI32(i))
    tag.save();
  }
}

export function addDataToCommunity(community: Community | null, communityId: BigInt): void {
  let peeranhaCommunity = getPeeranhaCommunity().getCommunity(communityId);
  if (peeranhaCommunity == null) return;
  
  community.ipfsHash = peeranhaCommunity.ipfsDoc.hash;
  community.ipfsHash2 = peeranhaCommunity.ipfsDoc.hash2;

  getIpfsCommunityData(community);
}

function getIpfsCommunityData(community: Community | null): void {  
  let hashstr = community.ipfsHash.toHexString();
  let hashHex = "1220" + hashstr.slice(2);
  let ipfsBytes = ByteArray.fromHexString(hashHex);
  let ipfsHashBase58 = ipfsBytes.toBase58();
  let result = ipfs.cat(ipfsHashBase58) as Bytes;
  
  if (result != null) {
    let ipfsData = json.fromBytes(result);
  
    if (isValidIPFS(ipfsData)) {
      let ipfsObj = ipfsData.toObject()
      let name = ipfsObj.get('name');
      if (!name.isNull()) {
        community.name = name.toString();
      }
  
      let description = ipfsObj.get('description');
      if (!description.isNull()) {
        community.description = description.toString();
      }
  
      let website = ipfsObj.get('website');
      if (!website.isNull()) {
        community.website = website.toString();
      }

      let communitySite = ipfsObj.get('communitySite');
      if (!communitySite.isNull()) {
        community.communitySite = communitySite.toString();
      }
  
      let language = ipfsObj.get('language');
      if (!language.isNull()) {
        community.language = language.toString();
      }

      let avatar = ipfsObj.get('avatar');
      if (!avatar.isNull()) {
        community.avatar = avatar.toString();
      }
    } else {
      community.name = ERROR_IPFS;
      community.description = ERROR_IPFS;
      community.website = ERROR_IPFS;
      community.language = ERROR_IPFS;
      community.avatar = ERROR_IPFS;
    }
  }
}

export function newTag(tag: Tag | null, communityId: BigInt, tagId: BigInt): void {
  tag.communityId = communityId;
  tag.postCount = 0;
  tag.deletedPostCount = 0;
  
  addDataToTag(tag, communityId, tagId);
}

export function addDataToTag(tag: Tag | null, communityId: BigInt, tagId: BigInt): void {
  let peeranhaTag = getPeeranhaCommunity().getTag(communityId, tagId.toI32());
  if (peeranhaTag == null) return;
  
  tag.ipfsHash = peeranhaTag.ipfsDoc.hash;
  tag.ipfsHash2 = peeranhaTag.ipfsDoc.hash2;

  getIpfsTagData(tag);
}

function getIpfsTagData(tag: Tag | null): void { 
  let hashstr = tag.ipfsHash.toHexString();
  let hashHex = "1220" + hashstr.slice(2);
  let ipfsBytes = ByteArray.fromHexString(hashHex);
  let ipfsHashBase58 = ipfsBytes.toBase58();
  let result = ipfs.cat(ipfsHashBase58) as Bytes;
  
  if (result != null) {
    let ipfsData = json.fromBytes(result);
  
    if (isValidIPFS(ipfsData)) {
      let ipfsObj = ipfsData.toObject()
    
      let name = ipfsObj.get('name');
      if (!name.isNull()) {
        tag.name = name.toString();
      }
  
      let description = ipfsObj.get('description');
      if (!description.isNull()) {
        tag.description = description.toString();
      }
    } else {
      tag.name = ERROR_IPFS;
      tag.description = ERROR_IPFS;
    }
  }
}

export function getCommunity(communityId: BigInt | null): Community | null {
  let community = Community.load(communityId.toString())
  if (community == null) {
    let communityIdI32 = communityId.toI32();                     ///
    let newCommunityId: BigInt = new BigInt(communityIdI32);      /// -_-
    
    newCommunity(community, newCommunityId);
  }
  return community
}
