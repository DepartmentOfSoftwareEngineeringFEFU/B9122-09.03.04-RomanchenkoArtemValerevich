import { NextResponse } from "next/server"
import { apiFail } from "@/lib/server/api"
import { ensureCoreData } from "@/lib/server/core-data"
import { fetchOkxOrderBook, fetchOkxTicker } from "@/lib/server/okx"
import { prisma } from "@/lib/server/prisma"
import { findCryptoBySymbol } from "@/lib/server/symbols"

const STALE_AFTER_SECONDS = 15 * 60
const WARN_DIFF_PCT = 0.05
const REJECT_LIVE_DIFF_PCT = 0.10

type OkxBook = {
  ts?: string
  asks?: string[][]
  bids?: string[][]
}

type OkxTicker = {
  last?: string
  ts?: string
}

type BookRow = {
  price: number
  size: number
  order_count: number
}

type BookPayload = {
  symbol: string
  source: "OKX" | "DB_SNAPSHOT"
  snapshot_ts: string
  is_live: boolean
  is_stale: boolean
  stale_seconds: number
  last_price: number | null
  mid_price: number | null
  sanity_diff_pct: number | null
  asks: BookRow[]
  bids: BookRow[]
}

function finiteNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeRows(rows: string[][] | undefined): BookRow[] {
  return (rows || [])
    .map((row) => ({
      price: finiteNumber(row[0]),
      size: finiteNumber(row[1]),
      order_count: Math.max(0, Math.trunc(finiteNumber(row[3]) ?? 0)),
    }))
    .filter((row): row is BookRow => row.price != null && row.size != null)
}

function staleSeconds(snapshotTs: Date) {
  return Math.max(0, Math.floor((Date.now() - snapshotTs.getTime()) / 1000))
}

function midPrice(asks: BookRow[], bids: BookRow[]) {
  const bestAsk = asks[0]?.price
  const bestBid = bids[0]?.price
  return bestAsk != null && bestBid != null ? (bestAsk + bestBid) / 2 : null
}

function sanityDiffPct(mid: number | null, last: number | null) {
  return mid != null && last != null && last > 0 ? Math.abs(mid - last) / last : null
}

function warningFor(data: BookPayload, liveError?: string) {
  const warnings: string[] = []
  if (!data.is_live) warnings.push("Showing last saved order book snapshot. Data may be stale.")
  if (data.is_stale) warnings.push("Order book snapshot is older than 15 minutes.")
  if (data.sanity_diff_pct != null && data.sanity_diff_pct > WARN_DIFF_PCT) {
    warnings.push("Order book does not match the current market price. Data may be stale.")
  }
  if (liveError) warnings.push(`Live OKX order book unavailable: ${liveError}`)
  return warnings.length > 0 ? warnings.join(" ") : undefined
}

function rowsFromJson(value: unknown): BookRow[] {
  if (!Array.isArray(value)) return []
  return value
    .map((row) => {
      if (!row || typeof row !== "object") return null
      const candidate = row as Record<string, unknown>
      const price = finiteNumber(candidate.price)
      const size = finiteNumber(candidate.size)
      const orderCount = finiteNumber(candidate.order_count)
      if (price == null || size == null) return null
      return {
        price,
        size,
        order_count: Math.max(0, Math.trunc(orderCount ?? 0)),
      }
    })
    .filter((row): row is BookRow => row != null)
}

async function latestDbClose(cryptoId: number) {
  const candle = await prisma.marketData.findFirst({
    where: {
      cryptoId,
      timeframe: "1D",
      source: "OKX",
      sourceBar: "1Dutc",
    },
    orderBy: { ts: "desc" },
  })

  return candle ? Number(candle.close) : null
}

function dbSnapshotPayload(snapshot: {
  symbol: string
  snapshotTs: Date
  lastPrice: unknown
  midPrice: unknown
  sanityDiffPct: unknown
  asksJson: unknown
  bidsJson: unknown
}): BookPayload {
  const seconds = staleSeconds(snapshot.snapshotTs)

  return {
    symbol: snapshot.symbol,
    source: "DB_SNAPSHOT",
    snapshot_ts: snapshot.snapshotTs.toISOString(),
    is_live: false,
    is_stale: seconds > STALE_AFTER_SECONDS,
    stale_seconds: seconds,
    last_price: finiteNumber(snapshot.lastPrice),
    mid_price: finiteNumber(snapshot.midPrice),
    sanity_diff_pct: finiteNumber(snapshot.sanityDiffPct),
    asks: rowsFromJson(snapshot.asksJson),
    bids: rowsFromJson(snapshot.bidsJson),
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  await ensureCoreData()
  const { symbol } = await params
  const crypto = await findCryptoBySymbol(symbol)
  if (!crypto) return apiFail("Trading pair not found", 404)

  let liveError: string | undefined

  try {
    const [bookResult, tickerResult] = await Promise.all([
      fetchOkxOrderBook(crypto.ticker, 20),
      fetchOkxTicker(crypto.ticker),
    ])

    if (!bookResult.success) {
      throw new Error(bookResult.message)
    }

    const book = Array.isArray(bookResult.data.data)
      ? (bookResult.data.data[0] as OkxBook | undefined)
      : undefined
    if (bookResult.data.code !== "0" || !book) {
      throw new Error("OKX did not return an order book")
    }

    const asks = normalizeRows(book.asks)
    const bids = normalizeRows(book.bids)
    if (asks.length === 0 || bids.length === 0) {
      throw new Error("OKX order book is empty")
    }

    const ticker = tickerResult.success && Array.isArray(tickerResult.data.data)
      ? (tickerResult.data.data[0] as OkxTicker | undefined)
      : undefined
    const tickerLast = finiteNumber(ticker?.last)
    const lastPrice = tickerLast ?? await latestDbClose(crypto.id)
    const snapshotTs = book.ts ? new Date(Number(book.ts)) : new Date()
    const normalizedSnapshotTs = Number.isFinite(snapshotTs.getTime()) ? snapshotTs : new Date()
    const seconds = staleSeconds(normalizedSnapshotTs)
    const mid = midPrice(asks, bids)
    const diffPct = sanityDiffPct(mid, lastPrice)
    const isOld = seconds > STALE_AFTER_SECONDS
    const majorMismatch = diffPct != null && diffPct > REJECT_LIVE_DIFF_PCT

    const data: BookPayload = {
      symbol: crypto.ticker,
      source: "OKX",
      snapshot_ts: normalizedSnapshotTs.toISOString(),
      is_live: !isOld && !majorMismatch,
      is_stale: isOld || majorMismatch,
      stale_seconds: seconds,
      last_price: lastPrice,
      mid_price: mid,
      sanity_diff_pct: diffPct,
      asks,
      bids,
    }

    await prisma.orderBookSnapshot.create({
      data: {
        cryptoId: crypto.id,
        symbol: crypto.ticker,
        source: "OKX",
        snapshotTs: normalizedSnapshotTs,
        lastPrice: lastPrice,
        midPrice: mid,
        sanityDiffPct: diffPct,
        asksJson: asks,
        bidsJson: bids,
      },
    })

    const warning = warningFor(data)
    return NextResponse.json({
      success: true,
      ...(warning ? { warning } : {}),
      data,
    })
  } catch (error) {
    liveError = error instanceof Error ? error.message : "unknown error"
  }

  const snapshot = await prisma.orderBookSnapshot.findFirst({
    where: { cryptoId: crypto.id },
    orderBy: [{ snapshotTs: "desc" }, { id: "desc" }],
  })

  if (snapshot) {
    const data = dbSnapshotPayload(snapshot)
    return NextResponse.json({
      success: true,
      warning: warningFor(data, liveError),
      data,
    })
  }

  return NextResponse.json(
    {
      success: false,
      error: "Order book data is unavailable",
      details: liveError,
    },
    { status: 503 },
  )
}
