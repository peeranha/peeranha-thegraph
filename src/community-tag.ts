import { json, Bytes, ipfs, BigInt, JSONValueKind, ByteArray } from '@graphprotocol/graph-ts'
import { Community, Tag, CommunityTranslation, TagTranslation } from '../generated/schema'
import { getPeeranhaCommunity } from './utils'
import { ERROR_IPFS, isValidIPFS } from "./utils";
import { store } from '@graphprotocol/graph-ts'

export function newCommunity(community: Community | null, communityId: BigInt): void {
  let peeranhaCommunity = getPeeranhaCommunity().getCommunity(communityId);
  if (peeranhaCommunity == null) return;

  community.creationTime = peeranhaCommunity.timeCreate;
  community.isFrozen = peeranhaCommunity.isFrozen;
  community.postCount = 0;
  community.deletedPostCount = 0;
  community.replyCount = 0;
  community.followingUsers = 0;
  community.translations = [];
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
      if (!name.isNull() && name.kind == JSONValueKind.STRING) {
        community.name = name.toString();
      }
  
      let description = ipfsObj.get('description');
      if (!description.isNull() && description.kind == JSONValueKind.STRING) {
        community.description = description.toString();
      }
  
      let website = ipfsObj.get('website');
      if (!website.isNull() && website.kind == JSONValueKind.STRING) {
        community.website = website.toString();
      }
  
      let language = ipfsObj.get('language');
      if (!language.isNull() && language.kind == JSONValueKind.NUMBER) {
        community.language = language.toBigInt();
      }

      let avatar = ipfsObj.get('avatar');
      if (!avatar.isNull() && avatar.kind == JSONValueKind.STRING) {
        community.avatar = avatar.toString();
      }

      let oldCommunityTranslations = community.translations;
      let translations = ipfsObj.get('translations');
      if (!translations.isNull() && translations.kind == JSONValueKind.ARRAY) {
        const translationsArray = translations.toArray();
        const translationsLength = translationsArray.length;

        for (let i = 0; i < translationsLength; i++) {
          const translationsObject = translationsArray[i].toObject();
          const name = translationsObject.get("name");
          const description = translationsObject.get("description");
          const translationLanguage = translationsObject.get("language");
          if (translationLanguage.isNull() || translationLanguage.kind != JSONValueKind.NUMBER) { continue; }

          let communityTranslation = CommunityTranslation.load(community.id + "-" + translationLanguage.toBigInt().toString());
          if (communityTranslation == null) {
            communityTranslation = new CommunityTranslation(community.id + "-" + translationLanguage.toBigInt().toString());
            let communityTranslations = community.translations;
            communityTranslations.push(communityTranslation.id);
            community.translations = communityTranslations;
          }
            
          if (!name.isNull() && name.kind == JSONValueKind.STRING) {
            communityTranslation.name = name.toString();
          }
          if (!description.isNull() && description.kind == JSONValueKind.STRING) {
            communityTranslation.description = description.toString();
          }

          communityTranslation.language = translationLanguage.toBigInt();
          communityTranslation.communityId = community.id;
          communityTranslation.save();
        }
      } else {
        community.translations = [];
      }

      // remove old community translations
      let oldCommunityTranslationsLength = oldCommunityTranslations.length;
      for (let i = 0; i < oldCommunityTranslationsLength; i++) {
        let oldCommunityTranslation = oldCommunityTranslations.pop();
        if(!community.translations.includes(oldCommunityTranslation)) {
          store.remove('CommunityTranslation', oldCommunityTranslation);
        }
      }
    } else {
      community.name = ERROR_IPFS;
      community.description = ERROR_IPFS;
      community.website = ERROR_IPFS;
      community.avatar = ERROR_IPFS;
    }
  }
}

export function newTag(tag: Tag | null, communityId: BigInt, tagId: BigInt): void {
  tag.communityId = communityId;
  tag.postCount = 0;
  tag.translations = [];
  
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
      if (!name.isNull() && name.kind == JSONValueKind.STRING) {
        tag.name = name.toString();
      }
  
      let description = ipfsObj.get('description');
      if (!description.isNull() && description.kind == JSONValueKind.STRING) {
        tag.description = description.toString();
      }

      let language = ipfsObj.get('language');
      if (!language.isNull() && language.kind == JSONValueKind.NUMBER) {
        tag.language = language.toBigInt();
      }

      let oldTagTranslations = tag.translations;
      let translations = ipfsObj.get('translations');
      if (!translations.isNull() && translations.kind == JSONValueKind.ARRAY) {
        const translationsArray = translations.toArray();
        const translationsLength = translationsArray.length;
    
        for (let i = 0; i < translationsLength; i++) {
          const translationsObject = translationsArray[i].toObject();
          const name = translationsObject.get("name");
          const description = translationsObject.get("description");
          const translationLanguage = translationsObject.get("language");
          if (translationLanguage.isNull() || translationLanguage.kind != JSONValueKind.NUMBER) { continue; }

          let tagTranslation = TagTranslation.load(tag.id + "-" + translationLanguage.toBigInt().toString());
          if (tagTranslation == null) {
            tagTranslation = new TagTranslation(tag.id + "-" + translationLanguage.toBigInt().toString());
            let tagTranslations = tag.translations;
            tagTranslations.push(tagTranslation.id);
            tag.translations = tagTranslations;
          }

          if (!name.isNull() && name.kind == JSONValueKind.STRING) {
            tagTranslation.name = name.toString();
          }
          if (!description.isNull() && description.kind == JSONValueKind.STRING) {
            tagTranslation.description = description.toString();
          }

          tagTranslation.tagId = tag.id;
          tagTranslation.language = translationLanguage.toBigInt();
          tagTranslation.save();
        }
      } else {
        tag.translations = [];
      }

      // remove old tag translations
      let oldTagTranslationsLength = oldTagTranslations.length;
      for (let i = 0; i < oldTagTranslationsLength; i++) {
        let oldTagTranslation = oldTagTranslations.pop();
        if(!tag.translations.includes(oldTagTranslation)) {
          store.remove('TagTranslation', oldTagTranslation);
        }
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
