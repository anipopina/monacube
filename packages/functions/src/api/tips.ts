import { GetItemCommand, TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb'
import { hex } from '@scure/base'
import * as btcSigner from '@scure/btc-signer'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'

import type { TipsOk, TipsReqBody } from '@shared/apiInterface'
import type { TipRecord, UserRecord, WorkRecord } from '@shared/ddbRecord'

import { ddb } from '../lib/ddb'
import { HttpError, mustGetEnv, privateApiHandler, responseJson, parseEventBody } from '../lib/util'
import { MONA_NETWORK, broadcastTx } from 'src/lib/monacoin'

type ParsedTipTx = {
  amountSat: number
  toAddr: string
}

export const handler = privateApiHandler(async (event, auth) => {
  const table = mustGetEnv('APP_TABLE')
  const userId = auth.subject

  const request = parseEventBody<TipsReqBody>(event)
  const signedTxHex = (request.signedTxHex || '').trim()
  const feeSat = request.feeSat
  const workId = (request.workId || '').trim()
  const message = (request.message || '').trim()
  if (!signedTxHex) throw new HttpError(400, { error: 'missing_signed_tx_hex' })
  if (!Number.isInteger(feeSat) || feeSat < 0) throw new HttpError(400, { error: 'invalid_fee_sat' })

  const { amountSat, toAddr } = parseSignedTipTx(signedTxHex, userId)

  let external = false
  if (workId) {
    // workIdが指定されている場合、toAddrがその作品の所有者であることを確認する
    const ddbResWork = await ddb.send(
      new GetItemCommand({
        TableName: table,
        Key: marshall({ pk: `WORK#${workId}`, sk: 'META' }),
        ConsistentRead: true,
      }),
    )
    if (!ddbResWork.Item) throw new HttpError(404, { error: 'work_not_found' })

    const work = unmarshall(ddbResWork.Item) as WorkRecord
    if (work.type !== 'WORK' || work.sk !== 'META') throw new HttpError(404, { error: 'work_not_found' })
    if (work.ownerId !== toAddr) throw new HttpError(400, { error: 'work_owner_mismatch' })
  } else {
    // workIdが指定されていない場合、toAddrがユーザーかどうか確認してexternalフラグを設定する
    const ddbResUser = await ddb.send(
      new GetItemCommand({
        TableName: table,
        Key: marshall({ pk: `USER#${toAddr}`, sk: 'PROFILE' }),
        ConsistentRead: true,
      }),
    )
    if (!ddbResUser.Item) {
      external = true
    } else {
      const user = unmarshall(ddbResUser.Item) as UserRecord
      if (user.type !== 'USER' || user.sk !== 'PROFILE' || user.userId !== toAddr) external = true
    }
  }

  // broadcast the transaction and record the tip in the database
  let txId: string
  try {
    txId = await broadcastTx(signedTxHex)
  } catch (err) {
    console.error('Tx broadcast failed:', err)
    throw new HttpError(500, { error: 'tx_broadcast_failed' })
  }

  const nowIso = new Date().toISOString()
  const txIdPrefix = txId.slice(0, 16)

  const senderTip: TipRecord = {
    pk: `USER#${userId}`,
    sk: `TIP#${nowIso}#${txIdPrefix}`,
    type: 'TIP',
    txId,
    time: nowIso,
    isIn: false,
    fromAddr: userId,
    toAddr,
    amountSat,
    feeSat,
    ...(workId ? { workId } : {}),
    ...(message ? { message } : {}),
    ...(external ? { external: true } : {}),
  }
  const transactItems = [
    {
      Put: {
        TableName: table,
        Item: marshall(senderTip),
        ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)',
      },
    },
  ]

  if (!external) {
    const receiverTip: TipRecord = {
      pk: `USER#${toAddr}`,
      sk: `TIP#${nowIso}#${txIdPrefix}`,
      type: 'TIP',
      txId,
      time: nowIso,
      isIn: true,
      fromAddr: userId,
      toAddr,
      amountSat,
      feeSat,
      ...(workId ? { workId } : {}),
      ...(message ? { message } : {}),
    }
    transactItems.push({
      Put: {
        TableName: table,
        Item: marshall(receiverTip),
        ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)',
      },
    })
  }

  await ddb.send(
    new TransactWriteItemsCommand({
      TransactItems: transactItems,
    }),
  )

  const response: TipsOk = { tip: senderTip }
  return responseJson(200, response)
})

function parseSignedTipTx(signedTxHex: string, userId: string): ParsedTipTx {
  let tx: btcSigner.Transaction
  try {
    tx = btcSigner.Transaction.fromRaw(hex.decode(signedTxHex), {
      allowUnknownInputs: true,
      allowUnknownOutputs: true,
      disableScriptCheck: true,
    })
  } catch {
    throw new HttpError(400, { error: 'invalid_signed_tx_hex' })
  }

  // basic validation to ensure the tx is a simple single-destination payment from the user
  if (tx.outputsLength < 1 || tx.outputsLength > 2) throw new HttpError(400, { error: 'invalid_tx_outputs_count' })

  const payOutputs: Array<{ toAddr: string; amountSat: number }> = []
  let changeOutputCount = 0

  for (let i = 0; i < tx.outputsLength; i++) {
    const output = tx.getOutput(i)
    const outAddr = tx.getOutputAddress(i, MONA_NETWORK)
    if (!outAddr || output.amount === undefined) throw new HttpError(400, { error: 'unsupported_output_script' })

    const outAmountSat = Number(output.amount)
    if (outAmountSat <= 0) throw new HttpError(400, { error: 'invalid_output_amount' })

    if (outAddr === userId) {
      changeOutputCount += 1
    } else {
      payOutputs.push({ toAddr: outAddr, amountSat: outAmountSat })
    }
  }

  if (payOutputs.length !== 1) throw new HttpError(400, { error: 'invalid_destination_count' })
  if (changeOutputCount > 1) throw new HttpError(400, { error: 'invalid_change_outputs' })

  return {
    amountSat: payOutputs[0].amountSat,
    toAddr: payOutputs[0].toAddr,
  }
}
