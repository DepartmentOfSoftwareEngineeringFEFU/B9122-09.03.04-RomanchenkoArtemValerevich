import { NextResponse } from "next/server"
import { ensureCoreData } from "@/lib/server/core-data"
import { apiFail } from "@/lib/server/api"
import { findCryptoBySymbol } from "@/lib/server/symbols"
import { prisma } from "@/lib/server/prisma"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  await ensureCoreData()
  const { symbol } = await params
  const crypto = await findCryptoBySymbol(symbol)
  if (!crypto) return apiFail("Криптовалюта не найдена", 404)

  const { searchParams } = new URL(request.url)
  const limit = Math.min(Number(searchParams.get("limit") || 200), 1000)
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const timeframe = searchParams.get("timeframe") || "1D"
  const source = searchParams.get("source") || "OKX"
  const sourceBar = searchParams.get("source_bar") || (timeframe === "1D" ? "1Dutc" : timeframe)

  const candles = await prisma.marketData.findMany({
    where: {
      cryptoId: crypto.id,
      timeframe,
      source,
      sourceBar,
      ...(from || to
        ? {
            ts: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    orderBy: { ts: "desc" },
    take: Number.isFinite(limit) && limit > 0 ? limit : 200,
  })

  const data = candles
    .reverse()
    .map((candle) => ({
      ts: candle.ts.toISOString(),
      open: Number(candle.open),
      high: Number(candle.high),
      low: Number(candle.low),
      close: Number(candle.close),
      volume: Number(candle.volume),
    }))

  return NextResponse.json({ success: true, data })
}
