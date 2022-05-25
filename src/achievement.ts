import { Achievement } from "../generated/schema";
import { Address, BigInt, ByteArray, Bytes, ipfs, json, JSONValueKind } from '@graphprotocol/graph-ts'
import { getPeeranhaNFT } from "./utils";
import { getUser } from "./user";
import { errorIPFS } from "./utils";



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
    let hashstr = achievement.achievementURI;  
    let hashHex = "1220" + hashstr.slice(2);
    let ipfsBytes = ByteArray.fromHexString(hashHex);
    let ipfsHashBase58 = ipfsBytes.toBase58();
    let result = ipfs.cat(ipfsHashBase58) as Bytes;
    
    if (result != null) {
      let ipfsData = json.fromBytes(result);
    
      if(!ipfsData.isNull() && ipfsData.kind == JSONValueKind.OBJECT) {
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
        achievement.name = errorIPFS;
        achievement.description = errorIPFS;
        achievement.attributes = errorIPFS;
        achievement.image = errorIPFS;
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