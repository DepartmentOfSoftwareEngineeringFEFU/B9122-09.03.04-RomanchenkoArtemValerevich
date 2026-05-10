import { NextResponse } from "next/server"
import { ensureCoreData } from "@/lib/server/core-data"
import { prisma } from "@/lib/server/prisma"
import { findCryptoBySymbol } from "@/lib/server/symbols"
import { serializeForecast } from "@/lib/server/serializers"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  await ensureCoreData()
  const { symbol } = await params
  const crypto = await findCryptoBySymbol(symbol)
  
  if (!crypto) {
    return NextResponse.json(
      { success: false, error: "Торговая пара не найдена" },
      { status: 404 }
    )
  }

  if (crypto.ticker !== "BTC-USDT") {
    return NextResponse.json(
      { success: false, error: "В прототипе прогноз выполняется только для BTC-USDT" },
      { status: 400 }
    )
  }

  const forecast = await prisma.forecast.findFirst({
    where: { cryptoId: crypto.id },
    orderBy: [{ ts: "desc" }, { id: "desc" }],
  })
  
  return NextResponse.json({
    success: true,
    data: forecast ? serializeForecast(forecast) : null,
  })
}
