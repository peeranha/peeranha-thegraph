import { Address } from '@graphprotocol/graph-ts'
import { Peeranha } from '../generated/Peeranha/Peeranha'


export function getPeeranha(): Peeranha {
  return Peeranha.bind(Address.fromString("0x5B23C5D40dD7Ff404cDf8E920ED4080367e3876C"));
}