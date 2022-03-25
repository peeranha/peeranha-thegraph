import { Address } from '@graphprotocol/graph-ts'
import { Peeranha } from '../generated/Peeranha/Peeranha'
import { PeeranhaNFT } from '../generated/PeeranhaNFT/PeeranhaNFT'


export function getPeeranha(): Peeranha {
  return Peeranha.bind(Address.fromString("0x70474A16BcD20c5A204974A2CaF875d4169F40F9"));
}

export function getPeeranhaNFT(): PeeranhaNFT {
  return PeeranhaNFT.bind(Address.fromString("0xcd73A3f09B3FB4e7C27C9379ce5737269bbEb8D9"));
}