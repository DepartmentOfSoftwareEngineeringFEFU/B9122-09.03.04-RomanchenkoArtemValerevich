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

  const { searchParams } = new URL(request.url)
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
  const forecast = await prisma.forecast.findFirst({
    where: {
      cryptoId: crypto.id,
      ...(effectiveRunSource ? { runSource: effectiveRunSource } : {}),
    },
    orderBy: [{ ts: "desc" }, { id: "desc" }],
  })
  const actualNextCandle = forecast
    ? await prisma.marketData.findFirst({
        where: {
          cryptoId: crypto.id,
          timeframe: "1D",
          source: "OKX",
          sourceBar: "1Dutc",
          ts: new Date(forecast.ts.getTime() + DAY_MS),
        },
      })
    : null
  
  return NextResponse.json({
    success: true,
    data: forecast
      ? serializeForecast(forecast, {
          actualNextClose: actualNextCandle == null ? null : Number(actualNextCandle.close),
        })
      : null,
  })
}
