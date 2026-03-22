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
          text: 'ユーザーは、ウォレットを用いてログインします。',
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
      ],
    },
  ],
}
