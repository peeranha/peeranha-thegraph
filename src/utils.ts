import { Address } from '@graphprotocol/graph-ts'
import { Peeranha } from '../generated/Peeranha/Peeranha'
import { PeeranhaNFT } from '../generated/PeeranhaNFT/PeeranhaNFT'
import { PeeranhaToken } from '../generated/PeeranhaToken/PeeranhaToken'
import { MAIN_ADDRESS, TOKEN_ADDRESS, NFT_ADDRESS } from './config'


export function getPeeranha(): Peeranha {
  return Peeranha.bind(Address.fromString(MAIN_ADDRESS));
}

export function getPeeranhaToken(): PeeranhaToken {
  return PeeranhaToken.bind(Address.fromString(TOKEN_ADDRESS));
}

export function getPeeranhaNFT(): PeeranhaNFT {
  return PeeranhaNFT.bind(Address.fromString(NFT_ADDRESS));
}