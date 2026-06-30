import { NextResponse } from "next/server"
import { ensureCoreData } from "@/lib/server/core-data"
import { prisma } from "@/lib/server/prisma"
import { findCryptoBySymbol } from "@/lib/server/symbols"
import { serializeForecast } from "@/lib/server/serializers"
import { SELECTED_BACKTEST_RUN_SOURCE } from "@/lib/strategy-defaults"

const DAY_MS = 24 * 60 * 60 * 1000

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  await ensureCoreData()
  const { symbol } = await params
  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get("days") || "7", 10)
  const requestedRunSource = searchParams.get("run_source")
  
  const crypto = await findCryptoBySymbol(symbol)
  
  if (!crypto) {
    return NextResponse.json(
      { success: false, error: "Криптовалюта не найдена" },
      { status: 404 }
    )
  }

  if (crypto.ticker !== "BTC-USDT") {
    return NextResponse.json(
      { success: false, error: "В прототипе прогноз выполняется только для BTC-USDT" },
      { status: 400 }
    )
  }

  const from = new Date()
  from.setDate(from.getDate() - days)
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
      createdAt: { gte: from },
      ...(effectiveRunSource ? { runSource: effectiveRunSource } : {}),
    },
    orderBy: [{ ts: "desc" }, { id: "desc" }],
    take: Math.max(days, 1) * 24,
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
