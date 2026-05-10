import { NextResponse } from "next/server"
import { ensureCoreData } from "@/lib/server/core-data"
import { prisma } from "@/lib/server/prisma"
import { findCryptoBySymbol } from "@/lib/server/symbols"
import { serializeForecast } from "@/lib/server/serializers"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  await ensureCoreData()
  const { symbol } = await params
  const crypto = await findCryptoBySymbol(symbol)
  if (!crypto) {
    return NextResponse.json({ success: false, error: "Торговая пара не найдена" }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const limit = Math.min(Number(searchParams.get("limit") || 100), 1000)
  const forecasts = await prisma.forecast.findMany({
    where: { cryptoId: crypto.id },
    orderBy: [{ ts: "desc" }, { id: "desc" }],
    take: Number.isFinite(limit) && limit > 0 ? limit : 100,
  })

  return NextResponse.json({
    success: true,
    data: forecasts.map(serializeForecast),
  })
}
