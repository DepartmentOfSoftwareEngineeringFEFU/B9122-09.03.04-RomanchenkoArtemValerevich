import { prisma } from "./prisma"

export const BTC_TICKER = "BTC-USDT"
export const BTC_SLUG = "btc-usdt"

export function normalizeSymbol(input: string | null | undefined): { ticker: string; slug: string } | null {
  if (!input) return null

  const normalized = input.trim().replace("/", "-").toLowerCase()
  if (normalized === "btc" || normalized === "btc-usdt") {
    return { ticker: BTC_TICKER, slug: BTC_SLUG }
  }

  if (normalized === "btcusdt") {
    return { ticker: BTC_TICKER, slug: BTC_SLUG }
  }

  return null
}

export async function findCryptoBySymbol(input: string | null | undefined) {
  const symbol = normalizeSymbol(input)
  if (!symbol) return null

  return prisma.cryptocurrency.findUnique({
    where: { slug: symbol.slug },
  })
}
