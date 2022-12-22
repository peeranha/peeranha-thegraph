import { json, Bytes, ipfs, BigInt, JSONValueKind, ByteArray, Address, log } from '@graphprotocol/graph-ts'
import { CommunityToken, UserCommunityRating } from '../generated/schema'
import { getPeeranhaCommunityTokenFactory, ERROR_IPFS, isValidIPFS } from './utils'


export function newCommunityToken(communityToken: CommunityToken | null, communityId: BigInt): void {
  let communityTokenData = getPeeranhaCommunityTokenFactory().getCommunityToken(Address.fromString(communityToken.id), communityId);
  if (communityTokenData == null) {
    log.debug('Community token have not found. CommunityToken.id: {}, communityId: {}. (New)', [communityToken.id, communityId.toString()]);
    return;
  }

  communityToken.name = communityTokenData.name;
  communityToken.symbol = communityTokenData.symbol;
  communityToken.createTime = communityTokenData.createTime;
  communityToken.tokenContractAddress = communityTokenData.contractAddress.toHex();
  communityToken.communityId = communityId;

  addDataToCommunityToken(communityToken);
}

export function addDataToCommunityToken(communityToken: CommunityToken | null): void {
  let communityTokenData = getPeeranhaCommunityTokenFactory().getCommunityToken(Address.fromString(communityToken.id), communityToken.communityId.abs());
  if (communityTokenData == null) {
    log.debug('Community token have not found. CommunityToken.id: {}, communityId: {}. (Edit)', [communityToken.id, communityToken.communityId.toString()]);
    return;
  }
  
  communityToken.maxRewardPerPeriod = communityTokenData.maxRewardPerPeriod;
  communityToken.activeUsersInPeriod = communityTokenData.activeUsersInPeriod;
  communityToken.maxRewardPerUser = communityTokenData.maxRewardPerUser;
}
