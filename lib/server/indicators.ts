export type Candle = {
  ts: string | Date
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type FeatureRow = Candle & {
  EMA12: number
  EMA26: number
  RSI: number
}

export function calculateEma(values: number[], period: number) {
  if (values.length === 0) return []
  const multiplier = 2 / (period + 1)
  const output = [values[0]]

  for (let i = 1; i < values.length; i += 1) {
    output.push(values[i] * multiplier + output[i - 1] * (1 - multiplier))
  }

  return output
}

export function calculateRsi(values: number[], period = 14) {
  return values.map((_, index) => {
    if (index < period) return 50

    let gains = 0
    let losses = 0
    for (let i = index - period + 1; i <= index; i += 1) {
      const diff = values[i] - values[i - 1]
      if (diff >= 0) gains += diff
      else losses += Math.abs(diff)
    }

    const avgGain = gains / period
    const avgLoss = losses / period
    if (avgLoss === 0) return 100
    const rs = avgGain / avgLoss
    return 100 - 100 / (1 + rs)
  })
}

export function buildFeatureRows(candles: Candle[]): FeatureRow[] {
  const closes = candles.map((candle) => candle.close)
  const ema12 = calculateEma(closes, 12)
  const ema26 = calculateEma(closes, 26)
  const rsi = calculateRsi(closes)

  return candles.map((candle, index) => ({
    ...candle,
    EMA12: ema12[index],
    EMA26: ema26[index],
    RSI: rsi[index],
  }))
}

export function calculateLatestIndicators(candles: Candle[]) {
  if (candles.length < 2) {
    throw new Error("Недостаточно данных OHLCV для расчета индикаторов")
  }

  const rows = buildFeatureRows(candles)
  const latest = rows[rows.length - 1]
  const macd = latest.EMA12 - latest.EMA26
  const closes = candles.map((candle) => candle.close)
  const recentReturns = closes.slice(-21).slice(1).map((close, index, arr) => {
    const previous = index === 0 ? closes[Math.max(0, closes.length - arr.length - 1)] : arr[index - 1]
    return previous > 0 ? Math.log(close / previous) : 0
  })
  const avgReturn =
    recentReturns.reduce((sum, value) => sum + value, 0) / Math.max(1, recentReturns.length)
  const volatility = Math.sqrt(
    recentReturns.reduce((sum, value) => sum + (value - avgReturn) ** 2, 0) /
      Math.max(1, recentReturns.length),
  )

  return [
    { name: "EMA12", value: Number(latest.EMA12.toFixed(2)) },
    { name: "EMA26", value: Number(latest.EMA26.toFixed(2)) },
    { name: "MACD", value: Number(macd.toFixed(6)) },
    { name: "RSI", value: Number(latest.RSI.toFixed(2)) },
    { name: "Volatility", value: Number(volatility.toFixed(6)) },
  ]
}
