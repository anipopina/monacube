import * as bitcoinMessage from 'bitcoinjs-message'

const MONA_NETWORK = {
  bech32: 'mona',
  pubKeyHash: 0x32, // 50
  scriptHash: 0x37, // 55
  wif: 0xb0, // 176
  messagePrefix: '\x19Monacoin Signed Message:\n',
} as const

export function verifySignature(address: string, message: string, signature: string): boolean {
  return bitcoinMessage.verify(message, address, signature, MONA_NETWORK.messagePrefix)
}
