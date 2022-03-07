import { Achivement } from "../generated/schema";
import { Address, BigInt } from '@graphprotocol/graph-ts'
import { getPeeranhaNFT } from "./utils";
import { getUser } from "./user";

export function newAchievement(achievement: Achivement, achievementId: BigInt): void {
 let peeranhaAchievement = getPeeranhaNFT().getAchievementsNFTConfig(achievementId);
 if (!peeranhaAchievement) return;

 achievement.factCount = peeranhaAchievement.factCount;
 achievement.maxCount = peeranhaAchievement.maxCount;
 achievement.achievementURI = peeranhaAchievement.achievementURI;
 achievement.achievementsType = peeranhaAchievement.achievementsType;
 achievement.achievementURI = peeranhaAchievement.achievementURI;
}

export function giveAchievement(achievementId: string, userAddress: Address): void {
    let user = getUser(userAddress);
    if (!user) return;

    let achivements = user.achivements
    achivements.push(achievementId);
    user.achivements = achivements;

    user.save();
}