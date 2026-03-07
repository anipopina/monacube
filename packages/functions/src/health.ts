import { apiHandler, responseJson } from './lib/util'

export const handler = apiHandler(async () => {
  return responseJson(200, { ok: true })
})
