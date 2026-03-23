import * as bitcoinMessage from 'bitcoinjs-message'

export const MONA_NETWORK = {
  bech32: 'mona',
  pubKeyHash: 0x32, // 50
  scriptHash: 0x37, // 55
  wif: 0xb0, // 176
  messagePrefix: '\x19Monacoin Signed Message:\n',
} as const

export function verifySignature(address: string, message: string, signature: string): boolean {
  return bitcoinMessage.verify(message, address, signature, MONA_NETWORK.messagePrefix)
}

export async function broadcastTx(txHex: string): Promise<string> {
  const res = await fetch('https://esplora.electrum-mona.org/api/tx', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: txHex,
  })
  if (!res.ok) throw new Error('tx_broadcast_failed')
  const txId = (await res.text()).trim()
  if (!txId) throw new Error('tx_broadcast_failed')
  return txId
}
