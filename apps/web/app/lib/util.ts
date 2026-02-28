// utilities for frontend

export const CSS_TOKENS = {
  // 検索で影響範囲に気付きやすいようにCSSトークン名をそのままキーにする
  '--duration-fast': 120,
  '--duration-normal': 200,
  '--duration-slow': 300,
  '--duration-veryslow': 1000,
  '--duration-tooltip': 3000,
  '--duration-toast': 5000,
}

export const formatBalance = (balance: number, accurate: boolean = false): string => {
  // show 4 decimal places
  // if balance is less than 0.01, show 8 decimal places
  const digits = accurate || balance < 0.01 ? 8 : 4
  const formatted = balance.toFixed(digits)
  // add ',' as thousand separator
  // remove trailing zeros after decimal point
  let [beforeDot = '', afterDot = ''] = formatted.split('.')
  beforeDot = beforeDot.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  afterDot = afterDot.replace(/0+$/, '')
  return afterDot ? `${beforeDot}.${afterDot}` : beforeDot
}
