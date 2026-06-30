import { NextResponse } from "next/server"
import { ensureCoreData } from "@/lib/server/core-data"
import { prisma } from "@/lib/server/prisma"
import { findCryptoBySymbol } from "@/lib/server/symbols"
import { serializeForecast } from "@/lib/server/serializers"
import { SELECTED_BACKTEST_RUN_SOURCE } from "@/lib/strategy-defaults"

const DAY_MS = 24 * 60 * 60 * 1000

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  await ensureCoreData()
  const { symbol } = await params
  const crypto = await findCryptoBySymbol(symbol)
  if (!crypto) {
    return NextResponse.json({ success: false, error: "Криптовалюта не найдена" }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const limit = Math.min(Number(searchParams.get("limit") || 100), 1000)
  const requestedRunSource = searchParams.get("run_source")
  const selectedForecastsCount = await prisma.forecast.count({
    where: { cryptoId: crypto.id, runSource: SELECTED_BACKTEST_RUN_SOURCE },
  })
  const effectiveRunSource =
    requestedRunSource === "all"
      ? null
      : requestedRunSource
      ? requestedRunSource
      : selectedForecastsCount > 0
        ? SELECTED_BACKTEST_RUN_SOURCE
        : null
  const forecasts = await prisma.forecast.findMany({
    where: {
      cryptoId: crypto.id,
      ...(effectiveRunSource ? { runSource: effectiveRunSource } : {}),
    },
    orderBy: [{ ts: "desc" }, { id: "desc" }],
    take: Number.isFinite(limit) && limit > 0 ? limit : 100,
  })
  const targetDates = forecasts.map((forecast) => new Date(forecast.ts.getTime() + DAY_MS))
  const actualCandles = await prisma.marketData.findMany({
    where: {
      cryptoId: crypto.id,
      timeframe: "1D",
      source: "OKX",
      sourceBar: "1Dutc",
      ts: { in: targetDates },
    },
  })
  const actualCloseByTs = new Map(actualCandles.map((candle) => [candle.ts.getTime(), Number(candle.close)]))

  return NextResponse.json({
    success: true,
    data: forecasts.map((forecast) =>
      serializeForecast(forecast, {
        actualNextClose: actualCloseByTs.get(forecast.ts.getTime() + DAY_MS) ?? null,
      }),
    ),
  })
}
