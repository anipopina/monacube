import * as bitcoinMessage from 'bitcoinjs-message'

export const MONA_NETWORK = {
  bech32: 'mona',
  pubKeyHash: 0x32, // 50
  scriptHash: 0x37, // 55
  wif: 0xb0, // 176
  messagePrefix: '\x19Monacoin Signed Message:\n',
} as const

// Esplora API Documentation: https://github.com/Blockstream/esplora/blob/master/API.md
const ESPLORA_ENDPOINT = 'https://esplora.electrum-mona.org/api/'

export function verifySignature(address: string, message: string, signature: string): boolean {
  return bitcoinMessage.verify(message, address, signature, MONA_NETWORK.messagePrefix)
}

export async function broadcastTx(txHex: string): Promise<string> {
  const res = await fetch(`${ESPLORA_ENDPOINT}tx`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: txHex,
  })
  if (!res.ok) throw new Error('esplora_api_error')
  const txId = (await res.text()).trim()
  if (!txId) throw new Error('esplora_api_error')
  return txId
}

export async function getBalanceSat(address: string): Promise<number> {
  const res = await fetch(`${ESPLORA_ENDPOINT}address/${address}`)
  if (!res.ok) throw new Error('esplora_api_error')
  const data = await res.json()
  return data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum
}
