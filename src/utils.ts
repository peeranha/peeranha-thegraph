import { Address } from '@graphprotocol/graph-ts'
import { Peeranha } from '../generated/Peeranha/Peeranha'


export function getPeeranha(): Peeranha {
  return Peeranha.bind(Address.fromString("0x8156DDef53905b3c837a97D51D30750293021e50"));
}