import { Address, JSONValue, JSONValueKind } from '@graphprotocol/graph-ts'
import { PeeranhaUser } from '../generated/PeeranhaUser/PeeranhaUser'
import { PeeranhaCommunity } from '../generated/PeeranhaCommunity/PeeranhaCommunity'
import { PeeranhaCommunityTokenFactory } from '../generated/PeeranhaCommunityTokenFactory/PeeranhaCommunityTokenFactory'
import { PeeranhaCommunityToken } from '../generated/templates/PeeranhaCommunityToken/PeeranhaCommunityToken'
import { PeeranhaContent } from '../generated/PeeranhaContent/PeeranhaContent'
import { PeeranhaNFT } from '../generated/PeeranhaNFT/PeeranhaNFT'
import { PeeranhaToken } from '../generated/PeeranhaToken/PeeranhaToken'
import { USER_ADDRESS, COMMUNITY_ADDRESS, COMMUNITY_FACTORY_ADDRESS, CONTENT_ADDRESS, TOKEN_ADDRESS, NFT_ADDRESS } from './config'

export const ERROR_IPFS = "error IPFS";

export function isValidIPFS(ipfsData: JSONValue): boolean {
  return !ipfsData.isNull() && ipfsData.kind == JSONValueKind.OBJECT
}

export function getPeeranhaUser(): PeeranhaUser {
  return PeeranhaUser.bind(Address.fromString(USER_ADDRESS));
}

export function getPeeranhaCommunity(): PeeranhaCommunity {
  return PeeranhaCommunity.bind(Address.fromString(COMMUNITY_ADDRESS));
}

export function getPeeranhaCommunityTokenFactory(): PeeranhaCommunityTokenFactory {
  return PeeranhaCommunityTokenFactory.bind(Address.fromString(COMMUNITY_FACTORY_ADDRESS));
}

export function getPeeranhaCommunityToken(COMMUNITY_TOKEN_ADDRESS: Address): PeeranhaCommunityToken {
  return PeeranhaCommunityToken.bind(COMMUNITY_TOKEN_ADDRESS);
}

export function getPeeranhaContent(): PeeranhaContent {
  return PeeranhaContent.bind(Address.fromString(CONTENT_ADDRESS));
}

export function getPeeranhaToken(): PeeranhaToken {
  return PeeranhaToken.bind(Address.fromString(TOKEN_ADDRESS));
}

export function getPeeranhaNFT(): PeeranhaNFT {
  return PeeranhaNFT.bind(Address.fromString(NFT_ADDRESS));
}

export enum PostType {
  ExpertPost,
  CommonPost,
  Tutorial,
  Documentation = 1000
}