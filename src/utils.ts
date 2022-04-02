import { Address } from '@graphprotocol/graph-ts'
import { Peeranha } from '../generated/Peeranha/Peeranha'
import { PeeranhaNFT } from '../generated/PeeranhaNFT/PeeranhaNFT'
import { PeeranhaToken } from '../generated/PeeranhaToken/PeeranhaToken'


export const peeranhaAddress = "0x821Ff5d4Cf5DB9F82b7eAF41C9709f26bd7FBa06";
const peeranhaToken = "0xba261Bd4a63773E7f60D25F6fe5A9c0919EB5a66";
const peeranhaNFTAddress = "0xF839dEc765237232Ad1d0A3eADBBBe24e28AbbEe";


export function getPeeranha(): Peeranha {
  return Peeranha.bind(Address.fromString(peeranhaAddress));
}

export function getPeeranhaToken(): PeeranhaToken {
  return PeeranhaToken.bind(Address.fromString(peeranhaToken));
}

export function getPeeranhaNFT(): PeeranhaNFT {
  return PeeranhaNFT.bind(Address.fromString(peeranhaNFTAddress));
}