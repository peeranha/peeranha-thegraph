import { Achievement } from "../generated/schema";
import { Address, BigInt, ByteArray, Bytes, ipfs, json, JSONValueKind } from '@graphprotocol/graph-ts'
import { getPeeranhaNFT } from "./utils";
import { getPeeranhaUser } from "./utils";
import { getUser } from "./user";
import { ERROR_IPFS, isValidIPFS } from "./utils";



export function newAchievement(achievement: Achievement | null, achievementId: BigInt): void {
  let peeranhaAchievement = getPeeranhaNFT().getAchievementsNFTConfig(achievementId);
  if (!peeranhaAchievement) return;

  achievement.factCount = peeranhaAchievement.factCount;
  achievement.maxCount = peeranhaAchievement.maxCount;
  achievement.achievementURI = peeranhaAchievement.achievementURI;
  achievement.achievementsType = peeranhaAchievement.achievementsType;
  achievement.communityId = getPeeranhaUser().try_getAchievementCommunity(achievementId);
  getIpfsAchievementData(achievement)
}

export function addDataToAchievement(achievement: Achievement | null, achievementId: BigInt): void {
  let peeranhaAchievement = getPeeranhaNFT().getAchievementsNFTConfig(achievementId);
  if (!peeranhaAchievement) return;
 
  achievement.factCount = peeranhaAchievement.factCount;
 }

function getIpfsAchievementData(achievement: Achievement | null): void {
  if (achievement.achievementURI.substr(0, 7) == "ipfs://") {
    let ipfsData = achievement.achievementURI.slice(7);
    let result = ipfs.cat(ipfsData) as Bytes;

    if (result != null) {
      let ipfsData = json.fromBytes(result);

      if(isValidIPFS(ipfsData)) {
        let ipfsObj = ipfsData.toObject()
        let name = ipfsObj.get('name');
        if (!name.isNull() && name.kind == JSONValueKind.STRING) {
          achievement.name = name.toString();
        }

        let description = ipfsObj.get('description');
        if (!description.isNull() && description.kind == JSONValueKind.STRING) {
          achievement.description = description.toString();
        }

        let attributes = ipfsObj.get('attributes');
        if (!attributes.isNull() && attributes.kind == JSONValueKind.ARRAY) {
          const translationsArray = translations.toArray();
          const translationsLength = translationsArray.length;

          for (let i = 0; i < translationsLength; i++) {
            const translationsObject = translationsArray[i].toObject();
            const trait_type = translationsObject.get("trait_type");
            const value = translationsObject.get("value");
            if (!trait_type.isNull() && trait_type.kind == JSONValueKind.STRING) {
              if(trait_type == "Community Id") {
                if (!value.isNull() && value.kind == JSONValueKind.STRING)
                  achievement.atrCommunityId = value;
              } else if (trait_type == "Event") {
                if (!value.isNull() && value.kind == JSONValueKind.STRING)
                  achievement.atrEvent = value;

              } else if (trait_type == "Type") {
                if (!value.isNull() && value.kind == JSONValueKind.STRING)
                  achievement.atrType = value;
              }
            }
          }
        }

        let image = ipfsObj.get('image');
        if (!image.isNull() && image.kind == JSONValueKind.STRING) {
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

export function giveAchievement(achievementId: BigInt, userAddress: Address): void {
    let user = getUser(userAddress);
    if (!user) return;
    let achievements = user.achievements
    achievements.push(achievementId.toString());
    user.achievements = achievements;

    user.save();
}