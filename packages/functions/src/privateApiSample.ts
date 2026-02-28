import { privateApiHandler, responseJson } from './lib/util'

import type { PrivateApiSampleOk } from '@shared/api'

export const handler = privateApiHandler(async (event, auth) => {
  // auth.subject にユーザのアドレスが入ってるよ
  const response: PrivateApiSampleOk = {
    ok: true,
  }
  return responseJson(200, response)
})
