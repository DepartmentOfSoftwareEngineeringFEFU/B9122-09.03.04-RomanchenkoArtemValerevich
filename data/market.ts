import type { Cryptocurrency, OhlcvDataPoint, OrderBook, OrderBookEntry } from "@/types"

export const cryptocurrencies: Cryptocurrency[] = [
  { id: 1, ticker: "BTC/USDT", name: "Bitcoin", asset_type: "spot" },
  { id: 2, ticker: "ETH/USDT", name: "Ethereum", asset_type: "spot" },
  { id: 3, ticker: "SOL/USDT", name: "Solana", asset_type: "spot" },
  { id: 4, ticker: "BNB/USDT", name: "Binance Coin", asset_type: "spot" },
  { id: 5, ticker: "XRP/USDT", name: "Ripple", asset_type: "spot" },
  { id: 6, ticker: "BTC/USDT-SWAP", name: "Bitcoin (Futures)", asset_type: "futures" },
  { id: 7, ticker: "ETH/USDT-SWAP", name: "Ethereum (Futures)", asset_type: "futures" },
]

export function findCryptoBySlug(slug: string): Cryptocurrency | undefined {
  const upper = slug.toUpperCase().replace("-", "/")
  return cryptocurrencies.find(
    (c) =>
      c.ticker === upper ||
      c.ticker === upper + "/USDT" ||
      c.ticker.split("/")[0] === upper ||
      c.id === Number(slug),
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
  const rand = seededRandom(cryptoId * 1000 + 42)
  const basePrices: Record<number, number> = {
    1: 67500, 2: 3420, 3: 145, 4: 610, 5: 0.52, 6: 67500, 7: 3420,
  }
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
  const rand = seededRandom(cryptoId * 777)
  const basePrices: Record<number, number> = {
    1: 67500, 2: 3420, 3: 145, 4: 610, 5: 0.52, 6: 67500, 7: 3420,
  }
  const basePrice = basePrices[cryptoId] || 100
  const asks: OrderBookEntry[] = []
  const bids: OrderBookEntry[] = []

  for (let i = 0; i < 10; i++) {
    const askPrice = basePrice * (1 + 0.001 * (i + 1) + rand() * 0.0005)
    const bidPrice = basePrice * (1 - 0.001 * (i + 1) - rand() * 0.0005)
    asks.push([askPrice.toFixed(2), (rand() * 5 + 0.1).toFixed(4), "0", String(Math.floor(rand() * 10 + 1))])
    bids.push([bidPrice.toFixed(2), (rand() * 5 + 0.1).toFixed(4), "0", String(Math.floor(rand() * 10 + 1))])
  }

  return { ts: new Date().toISOString(), asks, bids }
}

export function generateForecasts(cryptoId: number, days: number = 7): { ts: string; predicted_close: number }[] {
  const ohlcv = generateOhlcv(cryptoId, 30)
  const lastPrice = ohlcv[ohlcv.length - 1].close
  const rand = seededRandom(cryptoId * 999)
  const forecasts: { ts: string; predicted_close: number }[] = []

  let price = lastPrice
  for (let i = 1; i <= days; i++) {
    const date = new Date()
    date.setDate(date.getDate() + i)
    price = price * (1 + (rand() - 0.45) * 0.015)
    forecasts.push({
      ts: date.toISOString(),
      predicted_close: Number(price.toFixed(2)),
    })
  }
  return forecasts
}

export function generateIndicators(cryptoId: number): { name: string; value: number }[] {
  const ohlcv = generateOhlcv(cryptoId, 30)
  const closes = ohlcv.map((d) => d.close)
  const last = closes[closes.length - 1]

  const ema12 = closes.slice(-12).reduce((a, b) => a + b, 0) / 12
  const ema26 = closes.slice(-26).reduce((a, b) => a + b, 0) / 26
  const macd = ema12 - ema26

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

  return [
    { name: "EMA12", value: Number(ema12.toFixed(2)) },
    { name: "EMA26", value: Number(ema26.toFixed(2)) },
    { name: "MACD", value: Number(macd.toFixed(4)) },
    { name: "RSI", value: Number(rsi.toFixed(2)) },
    { name: "SMA20", value: Number(sma20.toFixed(2)) },
    { name: "Боллинджер (верх)", value: Number((sma20 + 2 * stdDev).toFixed(2)) },
    { name: "Боллинджер (низ)", value: Number((sma20 - 2 * stdDev).toFixed(2)) },
    { name: "Цена закрытия", value: last },
  ]
}
