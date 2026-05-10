import { fetchOkxCandles } from "./okx"
import { prisma } from "./prisma"
import { findCryptoBySymbol } from "./symbols"
import { lstmMarketDataSource } from "./market-data-source"

type OkxCandle = [string, string, string, string, string, string, ...string[]]
type OkxCandlesEnvelope = {
  code?: string
  msg?: string
  data?: unknown[]
}

export type MarketSyncResult = {
  symbol: string
  timeframe: string
  source: string
  okx_bar: string
  timezone: string
  requested: number
  received: number
  inserted: number
  updated: number
  latest_ts: string | null
}

export async function syncOkxMarketData(input: {
  symbol?: string | null
  timeframe?: string | null
  limit?: number | null
}): Promise<MarketSyncResult> {
  const crypto = await findCryptoBySymbol(input.symbol || "BTC-USDT")
  if (!crypto) {
    throw new Error("Торговая пара не найдена")
  }

  const timeframe = String(input.timeframe || "1D")
  const dataSource = lstmMarketDataSource(timeframe)
  const requested = Math.min(Math.max(Number(input.limit || 200), 1), 300)
  const result = await fetchOkxCandles({ instId: crypto.ticker, bar: dataSource.sourceBar, limit: requested })

  if (!result.success) {
    throw new Error(result.message)
  }

  const envelope = result.data as OkxCandlesEnvelope
  if (envelope.code !== "0" || !Array.isArray(envelope.data)) {
    throw new Error("OKX не вернул свечи")
  }

  const rows = (envelope.data as OkxCandle[])
    .map((row) => ({
      cryptoId: crypto.id,
      ts: new Date(Number(row[0])),
      open: row[1],
      high: row[2],
      low: row[3],
      close: row[4],
      volume: row[5],
      source: dataSource.source,
      timeframe: dataSource.timeframe,
      sourceBar: dataSource.sourceBar,
      timezone: dataSource.timezone,
    }))
    .filter((row) => Number.isFinite(row.ts.getTime()))

  const existing = await prisma.marketData.findMany({
    where: {
      cryptoId: crypto.id,
      timeframe: dataSource.timeframe,
      source: dataSource.source,
      sourceBar: dataSource.sourceBar,
      ts: { in: rows.map((row) => row.ts) },
    },
    select: { ts: true },
  })
  const existingTimestamps = new Set(existing.map((row) => row.ts.getTime()))

  await prisma.$transaction(
    rows.map((row) =>
      prisma.marketData.upsert({
        where: {
          cryptoId_timeframe_source_sourceBar_ts: {
            cryptoId: row.cryptoId,
            timeframe: row.timeframe,
            source: row.source,
            sourceBar: row.sourceBar,
            ts: row.ts,
          },
        },
        create: row,
        update: {
          open: row.open,
          high: row.high,
          low: row.low,
          close: row.close,
          volume: row.volume,
          source: row.source,
          timeframe: row.timeframe,
          sourceBar: row.sourceBar,
          timezone: row.timezone,
        },
      }),
    ),
  )

  const latestTs =
    rows.length > 0
      ? new Date(Math.max(...rows.map((row) => row.ts.getTime()))).toISOString()
      : null

  return {
    symbol: crypto.ticker,
    timeframe,
    source: dataSource.source,
    okx_bar: dataSource.sourceBar,
    timezone: dataSource.timezone,
    requested,
    received: rows.length,
    inserted: rows.filter((row) => !existingTimestamps.has(row.ts.getTime())).length,
    updated: rows.filter((row) => existingTimestamps.has(row.ts.getTime())).length,
    latest_ts: latestTs,
  }
}
