import { Address } from '@graphprotocol/graph-ts'
import { Peeranha } from '../generated/Peeranha/Peeranha'


export function getPeeranha(): Peeranha {
  return Peeranha.bind(Address.fromString("0x30Ee2Ef530f3a052167928D9239528010900b4e6"));
}