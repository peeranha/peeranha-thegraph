import { Address } from '@graphprotocol/graph-ts'
import { Peeranha } from '../generated/Peeranha/Peeranha'
import { PeeranhaNFT } from '../generated/PeeranhaNFT/PeeranhaNFT'
import { PeeranhaToken } from '../generated/PeeranhaToken/PeeranhaToken'


export const peeranhaAddress = "0x56fB95C7d03E24DB7f03B246506f80145e2Ca0f8";
const peeranhaToken = "0xdB4af34Fb249C8C8be3D3d8548e046d26C964a79";
const peeranhaNFTAddress = "0x1328033BDD948e63dA196218b1Db9B25eD6B732e";


export function getPeeranha(): Peeranha {
  return Peeranha.bind(Address.fromString(peeranhaAddress));
}

export function getPeeranhaToken(): PeeranhaToken {
  return PeeranhaToken.bind(Address.fromString(peeranhaToken));
}

export function getPeeranhaNFT(): PeeranhaNFT {
  return PeeranhaNFT.bind(Address.fromString(peeranhaNFTAddress));
}