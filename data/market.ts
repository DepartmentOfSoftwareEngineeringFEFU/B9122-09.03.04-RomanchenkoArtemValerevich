import type { TradingPair, OhlcvDataPoint, OrderBook, OrderBookEntry, Forecast } from "@/types"
import { restorePredictedClose } from "./strategies"

const ENABLE_DEV_MOCKS = process.env.NEXT_PUBLIC_ENABLE_MOCKS === "true"

// Торговые пары (основная: BTC-USDT)
const devTradingPairs: TradingPair[] = [
  { id: 1, ticker: "BTC-USDT", name: "Bitcoin", instrument_type: "demo" },
  // Дополнительные пары (справочно, без прогноза LSTM в прототипе)
  { id: 2, ticker: "ETH-USDT", name: "Ethereum", instrument_type: "spot" },
  { id: 3, ticker: "SOL-USDT", name: "Solana", instrument_type: "spot" },
]

export const tradingPairs: TradingPair[] = ENABLE_DEV_MOCKS ? devTradingPairs : []

// @deprecated Использовать tradingPairs
export const cryptocurrencies = tradingPairs.map((p) => ({
  ...p,
  asset_type: p.instrument_type === "demo" ? "spot" : p.instrument_type,
}))

export function findCryptoBySlug(slug: string): TradingPair | undefined {
  const normalized = slug.toUpperCase().replace("/", "-")
  return tradingPairs.find(
    (p) =>
      p.ticker === normalized ||
      p.ticker === normalized + "-USDT" ||
      p.ticker.split("-")[0] === normalized ||
      p.id === Number(slug),
  )
}

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

export function generateOhlcv(cryptoId: number, days: number = 30): OhlcvDataPoint[] {
  if (!ENABLE_DEV_MOCKS) return []

  const rand = seededRandom(cryptoId * 1000 + 42)
  const basePrices: Record<number, number> = { 1: 67500, 2: 3420, 3: 145 }
  const basePrice = basePrices[cryptoId] || 100
  const data: OhlcvDataPoint[] = []
  let price = basePrice

  for (let i = days; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const change = (rand() - 0.48) * basePrice * 0.02
    price = Math.max(price + change, basePrice * 0.8)
    const high = price * (1 + rand() * 0.015)
    const low = price * (1 - rand() * 0.015)
    const open = price - change * 0.3
    data.push({
      ts: date.toISOString(),
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(price.toFixed(2)),
      volume: Number((rand() * 5000 + 500).toFixed(2)),
    })
  }
  return data
}

export function generateOrderBook(cryptoId: number): OrderBook {
  if (!ENABLE_DEV_MOCKS) {
    return {
      snapshot_ts: new Date(0).toISOString(),
      is_live: false,
      is_stale: true,
      asks: [],
      bids: [],
    }
  }

  const rand = seededRandom(cryptoId * 777)
  const basePrices: Record<number, number> = { 1: 67500, 2: 3420, 3: 145 }
  const basePrice = basePrices[cryptoId] || 100
  const asks: OrderBookEntry[] = []
  const bids: OrderBookEntry[] = []

  for (let i = 0; i < 10; i++) {
    const askPrice = basePrice * (1 + 0.001 * (i + 1) + rand() * 0.0005)
    const bidPrice = basePrice * (1 - 0.001 * (i + 1) - rand() * 0.0005)
    asks.push({
      price: Number(askPrice.toFixed(2)),
      size: Number((rand() * 5 + 0.1).toFixed(4)),
      order_count: Math.floor(rand() * 10 + 1),
    })
    bids.push({
      price: Number(bidPrice.toFixed(2)),
      size: Number((rand() * 5 + 0.1).toFixed(4)),
      order_count: Math.floor(rand() * 10 + 1),
    })
  }

  return { snapshot_ts: new Date().toISOString(), asks, bids }
}

// Генерация прогнозов LSTM с predicted_log_return (согласно ВКР)
export function generateForecasts(cryptoId: number, days: number = 7): Forecast[] {
  if (!ENABLE_DEV_MOCKS) return []

  const ohlcv = generateOhlcv(cryptoId, 30)
  if (ohlcv.length === 0) return []

  const lastPrice = ohlcv[ohlcv.length - 1].close
  const rand = seededRandom(cryptoId * 999)
  const forecasts: Forecast[] = []

  let price = lastPrice
  for (let i = 1; i <= days; i++) {
    const date = new Date()
    date.setDate(date.getDate() + i)
    
    // Генерируем predicted_log_return
    const predictedLogReturn = (rand() - 0.45) * 0.015
    const predictedClose = restorePredictedClose(price, predictedLogReturn)
    
    forecasts.push({
      model_id: 1,
      crypto_id: cryptoId,
      ts: date.toISOString(),
      predicted_log_return: Number(predictedLogReturn.toFixed(6)),
      predicted_close: Number(predictedClose.toFixed(2)),
      last_close: Number(price.toFixed(2)),
    })
    
    price = predictedClose
  }
  return forecasts
}

// Технические индикаторы
export function generateIndicators(cryptoId: number): { name: string; value: number }[] {
  if (!ENABLE_DEV_MOCKS) return []

  const ohlcv = generateOhlcv(cryptoId, 30)
  const closes = ohlcv.map((d) => d.close)
  const last = closes[closes.length - 1]

  const ema12 = closes.slice(-12).reduce((a, b) => a + b, 0) / 12
  const ema26 = closes.slice(-26).reduce((a, b) => a + b, 0) / 26
  const macd = ema12 - ema26
  const macdSignal = macd * 0.9 // упрощённый расчёт

  const gains: number[] = []
  const losses: number[] = []
  for (let i = closes.length - 14; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1]
    if (diff > 0) { gains.push(diff); losses.push(0) }
    else { gains.push(0); losses.push(Math.abs(diff)) }
  }
  const avgGain = gains.reduce((a, b) => a + b, 0) / 14
  const avgLoss = losses.reduce((a, b) => a + b, 0) / 14
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
  const rsi = 100 - 100 / (1 + rs)

  const sma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20
  const variance = closes.slice(-20).reduce((sum, c) => sum + Math.pow(c - sma20, 2), 0) / 20
  const stdDev = Math.sqrt(variance)

  // Расчёт returns и volatility
  const returns: number[] = []
  for (let i = 1; i < closes.length; i++) {
    returns.push(Math.log(closes[i] / closes[i - 1]))
  }
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length
  const volatility = Math.sqrt(
    returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
  )

  return [
    { name: "EMA12", value: Number(ema12.toFixed(2)) },
    { name: "EMA26", value: Number(ema26.toFixed(2)) },
    { name: "MACD", value: Number(macd.toFixed(4)) },
    { name: "Сигнальная линия MACD", value: Number(macdSignal.toFixed(4)) },
    { name: "RSI", value: Number(rsi.toFixed(2)) },
    { name: "Боллинджер (верх)", value: Number((sma20 + 2 * stdDev).toFixed(2)) },
    { name: "Боллинджер (низ)", value: Number((sma20 - 2 * stdDev).toFixed(2)) },
    { name: "Цена закрытия", value: last },
    { name: "Логарифмическая доходность", value: Number(avgReturn.toFixed(6)) },
    { name: "Волатильность", value: Number(volatility.toFixed(6)) },
  ]
}

// Dev-only fallback metrics. Production UI imports metrics from lib/lstm-contract.
export const modelMetrics = {
  id: 1,
  name: "LSTM BTC-USDT",
  window_size: 30,
  horizon: 1,
  rmse: 2080.08,
  mae: 1535.60,
  mape: 1.55,
}
