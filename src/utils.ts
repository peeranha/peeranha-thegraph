import { Address } from '@graphprotocol/graph-ts'
import { Peeranha } from '../generated/Peeranha/Peeranha'


export function getPeeranha(): Peeranha {
  return Peeranha.bind(Address.fromString("0x279787A2A5E83DD23f9E5D2cEf1F4846308Ffc1E"));
}