import { NextResponse } from "next/server"
import { apiFail } from "@/lib/server/api"
import { ensureCoreData } from "@/lib/server/core-data"
import { findCryptoBySymbol } from "@/lib/server/symbols"
import { prisma } from "@/lib/server/prisma"
import { calculateLatestIndicators } from "@/lib/server/indicators"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  await ensureCoreData()
  const { symbol } = await params
  const crypto = await findCryptoBySymbol(symbol)
  if (!crypto) return apiFail("Торговая пара не найдена", 404)

  const candles = await prisma.marketData.findMany({
    where: {
      cryptoId: crypto.id,
      timeframe: "1D",
      source: "OKX",
      sourceBar: "1Dutc",
    },
    orderBy: { ts: "asc" },
    take: 300,
  })

  try {
    const data = calculateLatestIndicators(
      candles.map((candle) => ({
        ts: candle.ts,
        open: Number(candle.open),
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
        volume: Number(candle.volume),
      })),
    )

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return apiFail(error instanceof Error ? error.message : "Ошибка расчета индикаторов", 400)
  }
}
