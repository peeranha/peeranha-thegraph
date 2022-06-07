import { Achievement } from "../generated/schema";
import { Address, BigInt, ByteArray, Bytes, ipfs, json, JSONValueKind } from '@graphprotocol/graph-ts'
import { getPeeranhaNFT } from "./utils";
import { getUser } from "./user";
import { ERROR_IPFS, isValidIPFS } from "./utils";



export function newAchievement(achievement: Achievement | null, achievementId: BigInt): void {
 let peeranhaAchievement = getPeeranhaNFT().getAchievementsNFTConfig(achievementId);
 if (!peeranhaAchievement) return;

 achievement.factCount = peeranhaAchievement.factCount;
 achievement.maxCount = peeranhaAchievement.maxCount;
 achievement.achievementURI = peeranhaAchievement.achievementURI;
 achievement.achievementsType = peeranhaAchievement.achievementsType;

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
        if (!name.isNull()) {
          achievement.name = name.toString();
        }

        let description = ipfsObj.get('description');
        if (!description.isNull()) {
          achievement.description = description.toString();
        }

        let attributes = ipfsObj.get('attributes');
        if (!attributes.isNull()) {
          achievement.attributes = attributes.toString();
        }

        let image = ipfsObj.get('image');
        if (!image.isNull()) {
          achievement.image = image.toString();
        }
      } else {
        achievement.name = ERROR_IPFS;
        achievement.description = ERROR_IPFS;
        achievement.attributes = ERROR_IPFS;
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