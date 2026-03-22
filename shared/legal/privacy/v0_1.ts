import type { LegalDocument } from '../types'

export const privacyV0_1: LegalDocument = {
  key: 'privacy',
  version: 'v0.1',
  title: 'MonaCube Privacy Policy',
  effectiveAt: '2026-03-21',
  sections: [
    {
      title: '1. 取得する情報',
      blocks: [
        {
          type: 'paragraph',
          text: 'MonaCube は、サービス提供に必要な範囲で以下の情報を取得します。',
        },
        {
          type: 'list',
          items: [
            'ウォレットアドレス（ユーザー識別のため）',
            'アクセスログ（IPアドレス、リクエスト情報等）',
            '利用状況に関する情報（投稿・チップ履歴など）',
          ],
        },
      ],
    },
    {
      title: '2. 利用目的',
      blocks: [
        {
          type: 'paragraph',
          text: '取得した情報は、以下の目的のために利用されます。',
        },
        {
          type: 'list',
          items: ['サービスの提供および認証のため', '不正利用の防止・検知のため', 'サービス改善および品質向上のため'],
        },
      ],
    },
    {
      title: '3. 第三者提供',
      blocks: [
        {
          type: 'paragraph',
          text: 'MonaCube は、法令に基づく場合を除き、取得した情報を第三者に提供することはありません。',
        },
      ],
    },
    {
      title: '4. 外部サービスの利用',
      blocks: [
        {
          type: 'paragraph',
          text: '本サービスでは、サービスの提供および改善のために外部サービスを利用する場合があります。',
        },
        {
          type: 'list',
          items: [
            'AWS（インフラおよびストレージ）',
            // 将来: 'Google Analytics', 'Sentry' など追加
          ],
        },
      ],
    },
    {
      title: '5. データの保存と管理',
      blocks: [
        {
          type: 'paragraph',
          text: '取得した情報は、適切な安全管理措置を講じた上で管理されます。',
        },
      ],
    },
    {
      title: '6. 本ポリシーの変更',
      blocks: [
        {
          type: 'paragraph',
          text: '本ポリシーは、必要に応じて変更されることがあります。変更後の内容は本サービス上に掲載された時点で効力を生じます。',
        },
      ],
    },
  ],
}
