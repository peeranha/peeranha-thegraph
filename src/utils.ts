import { Address } from '@graphprotocol/graph-ts'
import { Peeranha } from '../generated/Peeranha/Peeranha'
import { PeeranhaNFT } from '../generated/PeeranhaNFT/PeeranhaNFT'


export function getPeeranha(): Peeranha {
  return Peeranha.bind(Address.fromString("0x30Ee2Ef530f3a052167928D9239528010900b4e6"));
}

export function getPeeranhaNFT(): PeeranhaNFT {
  return PeeranhaNFT.bind(Address.fromString("0x924F27e9f4A908F179298449A0b07aB5E3042d87"));
}