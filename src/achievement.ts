import { Achievement } from "../generated/schema";
import { Address, BigInt, Bytes, ipfs, JSONValueKind } from '@graphprotocol/graph-ts'
import { bytesToJson, getPeeranhaNFT, getPeeranhaUser, idToIndexId, Network  } from "./utils";
import { getUser } from "./user";
import { ERROR_IPFS, isValidIPFS } from "./utils";



export function newAchievement(achievement: Achievement | null, achievementId: BigInt): void {
  let peeranhaNftAchievement = getPeeranhaNFT().getAchievementsNFTConfig(achievementId);
  if (!peeranhaNftAchievement || !achievement) return;

  achievement.factCount = peeranhaNftAchievement.factCount;
  achievement.maxCount = peeranhaNftAchievement.maxCount;
  achievement.achievementURI = peeranhaNftAchievement.achievementURI;
  achievement.achievementsType = peeranhaNftAchievement.achievementsType;
  let achievementCommunityResult = getPeeranhaUser().try_getAchievementCommunity(achievementId);
  if(!achievementCommunityResult.reverted) {
    achievement.communityId = idToIndexId(Network.Polygon, achievementCommunityResult.value.toString());
  } else {
    achievement.communityId = '';
  }

  let peeranhaAchievementConfig = getPeeranhaUser().getAchievementConfig(achievementId);
  if (peeranhaAchievementConfig) {
    achievement.lowerValue = peeranhaAchievementConfig.lowerBound;
  }
  getIpfsAchievementData(achievement)
}

export function addDataToAchievement(achievement: Achievement, achievementId: BigInt): void {
  let peeranhaAchievement = getPeeranhaNFT().getAchievementsNFTConfig(achievementId);
  if (!peeranhaAchievement) return;
 
  achievement.factCount = peeranhaAchievement.factCount;
 }

function getIpfsAchievementData(achievement: Achievement): void {
  if (achievement.achievementURI.substr(0, 7) == "ipfs://") {
    let ipfsData = achievement.achievementURI.slice(7);
    let result = ipfs.cat(ipfsData) as Bytes;

    if (result) {
      let ipfsData = bytesToJson(result);

      if(ipfsData && isValidIPFS(ipfsData)) {
        let ipfsObj = ipfsData.toObject()
        if(!ipfsObj) return;

        let name = ipfsObj.get('name');
        if (name && !name.isNull() && name.kind == JSONValueKind.STRING) {
          achievement.name = name.toString();
        }

        let description = ipfsObj.get('description');
        if (description && !description.isNull() && description.kind == JSONValueKind.STRING) {
          achievement.description = description.toString();
        }

        let attributes = ipfsObj.get('attributes');
        if (attributes && !attributes.isNull() && attributes.kind == JSONValueKind.ARRAY) {
          const attributesArray = attributes.toArray();
          const attributesLength = attributesArray.length;

          for (let i = 0; i < attributesLength; i++) {
            const attributesObject = attributesArray[i].toObject();
            const traitType = attributesObject.get("trait_type");
            const value = attributesObject.get("value");
            if (traitType && value &&!traitType.isNull() && traitType.kind == JSONValueKind.STRING) {
              if(traitType.toString() == "Community Id") {
                if (!value.isNull() && value.kind == JSONValueKind.STRING)
                  achievement.attrCommunityId = value.toString();
              } else if (traitType.toString() == "Event") {
                if (!value.isNull() && value.kind == JSONValueKind.STRING)
                  achievement.attrEvent = value.toString();

              } else if (traitType.toString() == "Type") {
                if (!value.isNull() && value.kind == JSONValueKind.STRING)
                  achievement.attrType = value.toString();
              }
            }
          }
        }

        let image = ipfsObj.get('image');
        if (image && !image.isNull() && image.kind == JSONValueKind.STRING) {
          achievement.image = image.toString();
        }
      } else {
        achievement.name = ERROR_IPFS;
        achievement.description = ERROR_IPFS;
        achievement.image = ERROR_IPFS;
      }
    }
  }
}

export function giveAchievement(achievementId: string, userAddress: Address, blockTimeStamp: BigInt): void {
    let user = getUser(userAddress, blockTimeStamp);
    let achievements = user.achievements
    achievements.push(achievementId.toString());
    user.achievements = achievements;

    user.save();
}