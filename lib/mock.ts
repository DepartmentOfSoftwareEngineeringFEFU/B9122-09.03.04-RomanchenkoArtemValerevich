/**
 * Deterministic mock data utilities
 * Uses seeded PRNG to generate consistent data across page loads
 */

export function seedFromString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

export function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
}

export function generatePriceSeries(
  symbol: string,
  points: number,
  startPrice?: number,
): { time: string; price: number; predicted: number }[] {
  const seed = seedFromString(symbol)
  const random = seededRandom(seed)

  const basePrice =
    startPrice ||
    (symbol.toUpperCase().includes("BTC")
      ? 43000
      : symbol.toUpperCase().includes("ETH")
        ? 2200
        : symbol.toUpperCase().includes("SOL")
          ? 98
          : symbol.toUpperCase().includes("XRP")
            ? 0.52
            : 100)

  const data: { time: string; price: number; predicted: number }[] = []
  let price = basePrice

  for (let i = 0; i < points; i++) {
    const hour = Math.floor((i * 24) / points)
    price = price * (1 + (random() * 0.04 - 0.02))
    const predicted = price * (1 + (random() * 0.025 - 0.005))

    data.push({
      time: `${String(hour).padStart(2, "0")}:00`,
      price: Math.round(price * 100) / 100,
      predicted: Math.round(predicted * 100) / 100,
    })
  }
  return data
}

export function generateForecastSeries(
  symbol: string,
  points: number,
  startPrice?: number,
): { time: string; actual: number; forecast: number; lower: number; upper: number }[] {
  const seed = seedFromString(symbol + "-forecast")
  const random = seededRandom(seed)

  const basePrice =
    startPrice ||
    (symbol.toUpperCase().includes("BTC")
      ? 43000
      : symbol.toUpperCase().includes("ETH")
        ? 2200
        : symbol.toUpperCase().includes("SOL")
          ? 98
          : 100)

  const data: { time: string; actual: number; forecast: number; lower: number; upper: number }[] = []
  let price = basePrice

  for (let i = 0; i < points; i++) {
    const day = i + 1
    price = price * (1 + (random() * 0.06 - 0.025))
    const forecast = price * (1 + (random() * 0.03 - 0.01))
    const margin = price * 0.05

    data.push({
      time: `День ${day}`,
      actual: i < points / 2 ? Math.round(price * 100) / 100 : 0,
      forecast: Math.round(forecast * 100) / 100,
      lower: Math.round((forecast - margin) * 100) / 100,
      upper: Math.round((forecast + margin) * 100) / 100,
    })
  }
  return data
}

export function generatePortfolioSeries(points: number): { date: string; value: number; pnl: number }[] {
  const seed = seedFromString("portfolio-2024")
  const random = seededRandom(seed)

  const data: { date: string; value: number; pnl: number }[] = []
  let value = 10000
  let totalPnl = 0

  const months = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"]

  for (let i = 0; i < points; i++) {
    const change = value * (random() * 0.08 - 0.03)
    value += change
    totalPnl += change

    data.push({
      date: months[i % 12],
      value: Math.round(value * 100) / 100,
      pnl: Math.round(totalPnl * 100) / 100,
    })
  }
  return data
}
