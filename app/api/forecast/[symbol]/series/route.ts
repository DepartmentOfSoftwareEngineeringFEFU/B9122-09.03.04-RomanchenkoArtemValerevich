import { NextResponse } from "next/server"
import { ensureCoreData } from "@/lib/server/core-data"
import { prisma } from "@/lib/server/prisma"
import { findCryptoBySymbol } from "@/lib/server/symbols"
import { serializeForecast } from "@/lib/server/serializers"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  await ensureCoreData()
  const { symbol } = await params
  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get("days") || "7", 10)
  
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

  const from = new Date()
  from.setDate(from.getDate() - days)
  const forecasts = await prisma.forecast.findMany({
    where: { cryptoId: crypto.id, createdAt: { gte: from } },
    orderBy: [{ ts: "desc" }, { id: "desc" }],
    take: Math.max(days, 1) * 24,
  })
  
  return NextResponse.json({
    success: true,
    data: forecasts.map(serializeForecast),
  })
}
