// shared/ddbRecord.ts
// DynamoDB single-table record type definitions

/**

Key Conventions

- Prefix format: <ENTITY>#<id>
  examples: USER#<userId>, WORK#<workId>, TAG#<tag>
- Sort key for item kinds: <KIND>#<...>
  examples: PROFILE, META, CONTENT, STATS, INDEX#<...>
- All keys are UPPER_SNAKE prefixes; ids are case-sensitive as-is.
- TTL以外の時刻はISO8601文字列 (2026-03-04T00:00:00.000Z)

*/

export type DdbPk = string
export type DdbSk = string

export type Iso8601String = string

export type UserPk = `USER#${string}`
export type WorkPk = `WORK#${string}`
export type NoncePk = `NONCE#${string}`
export type UploadPk = `UPLOAD#${string}`

export type DdbEntityType = 'USER' | 'USER_STATS' | 'WORK' | 'TIP' | 'NONCE' | 'UPLOAD'

export type DdbBaseRecord<TType extends DdbEntityType, TPk extends DdbPk = DdbPk, TSk extends DdbSk = DdbSk> = {
  pk: TPk
  sk: TSk
  type: TType
  ttl?: number // epoch seconds; set only for records that should expire automatically
}

export type UserRecord = DdbBaseRecord<'USER', UserPk, 'PROFILE'> & {
  userId: string // monacoin address
  name: string
  bio: string
  iconKey?: string // s3 key (usually "users/<userId>/icon")
  createdAt: Iso8601String
  updatedAt: Iso8601String // also used as cache-busting key for icon
}

// frequently updated user status
export type UserStatsRecord = DdbBaseRecord<'USER_STATS', UserPk, 'STATS'> & {
  balanceSat: number
  lastLoginAt: Iso8601String
}

export type WorkRecord = DdbBaseRecord<'WORK', WorkPk, 'META'> & {
  workId: string // ULID
  ownerId: string
  title: string
  description: string
  createdAt: Iso8601String
  updatedAt: Iso8601String // also used as cache-busting key for image
  imageKey: string // s3 key (usually "works/<workId>/original")
  width: number
  height: number
  bytes: number
  tags: ReadonlyArray<string> | ReadonlySet<string>
  blurHash: string
  palette: unknown
  GSI1PK: UserPk // GS1 for querying works by user
  GSI1SK: `WORK#${string}#${string}` // format: WORK#<createdAt>#<workId> (also reused as GSI2 sort key)
  GSI2PK: 'FEED' // GS2 for querying works for feed; sort key is the same as GSI1SK to allow sorting by createdAt
}

// tip record for each user to display history
// since the exact history can be checked on the block explorer, the integrity of this record can be relaxed.
// denormalized for both sender and receiver to simplify querying; one tip tx corresponds to two records with isIn differentiating direction
export type TipRecord = DdbBaseRecord<'TIP', UserPk, `TIP#${string}#${string}`> & {
  txId: string
  time: Iso8601String
  isIn: boolean // true for receiver's record, false for sender's record
  fromAddr: string // sender userId
  toAddr: string // receiver userId
  amountSat: number
  workId?: string // present when tipping a work
  message?: string
}

// nonce record for auth challenge session
export type NonceRecord = DdbBaseRecord<'NONCE', NoncePk, 'CHALLENGE'> & {
  ttl: number
  address: string
  message: string
  createdAt: Iso8601String
  usedAt?: Iso8601String
}

// upload record for content upload session
export type UploadKind = 'WORK_IMAGE' | 'USER_ICON'
export type UploadRecord = DdbBaseRecord<'UPLOAD', UploadPk, 'META'> & {
  ttl: number
  userId: string
  kind: UploadKind
  s3Key: string
  contentType: string
  declaredBytes: number
}

export type AppTableRecord = UserRecord | UserStatsRecord | WorkRecord | TipRecord | NonceRecord | UploadRecord
