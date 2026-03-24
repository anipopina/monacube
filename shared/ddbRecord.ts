// shared/ddbRecord.ts
// DynamoDB single-table record type definitions

/**

Key Conventions

- Prefix format: <ENTITY>#<id>
  examples: USER#<userId>, WORK#<workId>
- Sort key for item kinds: <KIND>#<...>
  examples: PROFILE, META, CONTENT, STATS, INDEX#<...>
- All keys are UPPER_SNAKE prefixes; ids are case-sensitive as-is.
- TTL以外の時刻はISO8601文字列 (2026-03-04T00:00:00.000Z)

*/

export type DdbPk = string
export type DdbSk = string

export type Iso8601String = string
export type ContentType = string
export type Ulid = string
export type Hex = string
export type MonaAddress = string
export type UnixTimestamp = number

export type UserPk = `USER#${MonaAddress}`
export type WorkPk = `WORK#${Ulid}`
export type NoncePk = `NONCE#${Hex}`
export type UploadPk = `UPLOAD#${Ulid}`

export type DdbEntityType = 'USER' | 'USER_STATS' | 'WORK' | 'TIP' | 'NONCE' | 'UPLOAD' | 'LEGAL_ACCEPTANCE'

export type DdbBaseRecord<TType extends DdbEntityType, TPk extends DdbPk = DdbPk, TSk extends DdbSk = DdbSk> = {
  pk: TPk
  sk: TSk
  type: TType
  ttl?: UnixTimestamp // epoch seconds; set only for records that should expire automatically
}

export type UserRecord = DdbBaseRecord<'USER', UserPk, 'PROFILE'> & {
  userId: MonaAddress // monacoin address
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
  totalBytes: number // total bytes of all works owned by the user
  workCount: number
  termsVer: string // version of terms accepted by the user; empty string if never accepted
  privacyVer: string // version of privacy policy accepted by the user; empty string if never accepted
  monaCheckedAt: Iso8601String // last time the user's balance was checked on the blockchain
  monaNextChkAt: Iso8601String // when the next balance check should be performed; used to stagger balance checks for many users and avoid spikes in blockchain queries

  GSI1PK: 'MONA_CHECK' // GSI for querying users by monaNextChkAt
  GSI1SK: `USER_STATS#${Iso8601String}` // format: USER_STATS#<monaNextChkAt>
}

export type WorkStatus = 'SAVING' | 'OK' | 'DELETING'
export type WorkRecord = DdbBaseRecord<'WORK', WorkPk, 'META'> & {
  workId: Ulid
  ownerId: MonaAddress
  status: WorkStatus
  title: string
  description: string
  createdAt: Iso8601String
  updatedAt: Iso8601String // also used as cache-busting key for image
  width: number
  height: number
  bytes: number
  uploadCType: ContentType // contentType of uploaded image
  normalized: boolean // whether the original image has been normalized (EXIF removed, color profile converted)
  blurHash: string
  thumbBHash: string

  GSI1PK: UserPk // GSI for querying works by user
  GSI1SK: `WORK#${Iso8601String}#${Ulid}` // format: WORK#<createdAt>#<workId>

  GSI2PK: 'FEED' // GSI for querying works for feed
  GSI2SK: `WORK#${Iso8601String}#${Ulid}` // format: WORK#<createdAt>#<workId>

  GSI3PK?: `WORK_STATUS#${WorkStatus}` // GSI for querying works by status; optional since it's only needed for non-OK statuses
  GSI3SK?: `WORK#${Iso8601String}#${Ulid}` // format: WORK#<statusUpdatedAt>#<workId>
}

// tip record for each user to display history
// since the exact history can be checked on the block explorer, the integrity of this record can be relaxed.
// denormalized for both sender and receiver to simplify querying; one tip tx corresponds to two records with isIn differentiating direction
// sk format: TIP#<time>#<txIdFirst16> (time is used for sorting; txId is used for deduplication in case of retries)
export type TipRecord = DdbBaseRecord<'TIP', UserPk, `TIP#${Iso8601String}#${Hex}`> & {
  txId: Hex
  time: Iso8601String
  isIn: boolean // true for receiver's record, false for sender's record
  fromAddr: MonaAddress // sender userId
  toAddr: MonaAddress // receiver userId
  amountSat: number
  feeSat: number
  workId?: Ulid // present when tipping a work
  message?: string
  external?: boolean // set to true if the tip was made to/from an external address (not a user in the system)
}

// nonce record for auth challenge session
export type NonceRecord = DdbBaseRecord<'NONCE', NoncePk, 'CHALLENGE'> & {
  ttl: UnixTimestamp
  address: MonaAddress
  message: string
  createdAt: Iso8601String
  usedAt?: Iso8601String
}

// upload record for content upload session
export type UploadKind = 'WORK_IMAGE' | 'USER_ICON'
export type UploadRecord = DdbBaseRecord<'UPLOAD', UploadPk, 'META'> & {
  ttl: UnixTimestamp
  userId: MonaAddress
  kind: UploadKind
  s3Key: string
  contentType: ContentType
  declaredBytes: number
}

// legal document acceptance record
// sk format: LEGAL#<termsVersion>#<privacyVersion>
export type LegalAcceptanceRecord = DdbBaseRecord<'LEGAL_ACCEPTANCE', UserPk, `LEGAL#${string}#${string}`> & {
  userId: MonaAddress
  termsVersion: string
  privacyVersion: string
  acceptedAt: Iso8601String
  signedMessage: string
  signature: string
}

export type AppTableRecord = UserRecord | UserStatsRecord | WorkRecord | TipRecord | NonceRecord | UploadRecord | LegalAcceptanceRecord
