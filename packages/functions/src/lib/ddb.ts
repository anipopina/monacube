import { DynamoDBClient } from '@aws-sdk/client-dynamodb'

// クライアントの設定が入る可能性があるためファイル分割
export const ddb = new DynamoDBClient({})
