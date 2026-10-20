import type { LegalDocument } from '../types'

export const termsV0_1: LegalDocument = {
  key: 'terms',
  version: 'v0.1',
  title: 'MonaCube Terms of Service',
  effectiveAt: '2026-03-21',
  sections: [
    {
      title: '1. 適用',
      blocks: [
        {
          type: 'paragraph',
          text: 'この利用規約は、MonaCube の利用条件を定めるものです。',
        },
      ],
    },
    {
      title: '2. アカウント',
      blocks: [
        {
          type: 'paragraph',
          text: 'ユーザーは、パスキーから生成されたウォレットを用いてログインします。',
        },
      ],
    },
    {
      title: '3. 投稿コンテンツ',
      blocks: [
        {
          type: 'paragraph',
          text: 'ユーザーは、自らが必要な権利を有するコンテンツのみを投稿するものとします。',
        },
      ],
    },
    {
      title: '4. 禁止事項',
      blocks: [
        {
          type: 'list',
          items: ['法令または公序良俗に違反する行為', '他人の権利を侵害する行為', 'サービス運営を妨害する行為'],
        },
      ],
    },
    {
      title: '5. 免責',
      blocks: [
        {
          type: 'paragraph',
          text: '本サービスは、予告なく変更または停止されることがあります。',
        },
        {
          type: 'paragraph',
          text: '本サービスで利用されるモナコインは、ユーザー自身が管理するセルフカストディ型ウォレットにより保持されます。ウォレットの利用に関する技術的理解の不足、操作ミス、その他いかなる理由によってユーザーが資産を失った場合であっても、当サービスは一切の責任を負いません。',
        },
        {
          type: 'paragraph',
          text: '本サービスのアカウントおよびウォレットへのアクセスは、パスキーにより管理されます。パスキーを紛失した場合、アカウントおよびウォレットへのアクセスを回復できない可能性があります。ユーザーは、パスキーの管理について十分に理解し、自らの責任において適切に保管するものとします。',
        },
      ],
    },
  ],
}
