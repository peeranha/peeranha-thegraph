import { Address, ByteArray, Bytes, JSONValue, JSONValueKind, ipfs, json, log } from '@graphprotocol/graph-ts'
import { PeeranhaUser } from '../generated/PeeranhaUser/PeeranhaUser'
import { PeeranhaCommunity } from '../generated/PeeranhaCommunity/PeeranhaCommunity'
import { PeeranhaContent } from '../generated/PeeranhaContent/PeeranhaContent'
import { PeeranhaNFT } from '../generated/PeeranhaNFT/PeeranhaNFT'
import { PeeranhaToken } from '../generated/PeeranhaToken/PeeranhaToken'
import { USER_ADDRESS, COMMUNITY_ADDRESS, CONTENT_ADDRESS, TOKEN_ADDRESS, NFT_ADDRESS } from './config'

export const ERROR_IPFS = "error IPFS";

export function isValidIPFS(ipfsData: JSONValue|null): boolean {
  return ipfsData != null && !ipfsData.isNull() && ipfsData.kind == JSONValueKind.OBJECT
}

export function getPeeranhaUser(): PeeranhaUser {
  return PeeranhaUser.bind(Address.fromString(USER_ADDRESS));
}

export function getPeeranhaCommunity(): PeeranhaCommunity {
  return PeeranhaCommunity.bind(Address.fromString(COMMUNITY_ADDRESS));
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

export enum ItemProperties { MessengerSender, Language }

export enum MessengerTypes {
  Unknown = 0,
  Telegram = 1,
  Discord = 2,
  Slack = 3,
}

export enum Language { English = 0, Chinese = 1, Spanish = 2, Vietnamese = 3 }

export function hexToUtf8(str: string): string
{
  return decodeURIComponent(
     str.replace(/[0-9a-f]{2}/g, '%$&')
  );
}

export function convertIpfsHash(ipfsHash: Bytes): Bytes|null {
  let hashstr = ipfsHash.toHexString();
  let hashHex = '1220' + hashstr.slice(2);
  let ipfsBytes = ByteArray.fromHexString(hashHex);
  let ipfsHashBase58 = ipfsBytes.toBase58();
  let result: Bytes | null = null;
  let attempt = 0;
  while (result == null) {
    result = ipfs.cat(ipfsHashBase58);
    if (result == null) {
      log.error('Could not get IPFS data for hash {}. Attempt {}.', [ipfsHashBase58, attempt.toString()]);

      if (attempt == 30) {
        return null;
      } 
      attempt++;
    }
  }
  return result as Bytes;
};

export function bytesToJson(ipfsHash: Bytes|null): JSONValue|null {
  if(ipfsHash == null){
    return null;
  }
  return bytesToJson(ipfsHash);
}
