import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/server/auth"
import { ensureCoreData } from "@/lib/server/core-data"
import { prisma } from "@/lib/server/prisma"
import { normalizeSymbol } from "@/lib/server/symbols"
import { serializeDecision } from "@/lib/server/serializers"

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await ensureCoreData(user.id)
  const { searchParams } = new URL(request.url)
  const symbol = normalizeSymbol(searchParams.get("symbol"))
  const limit = Math.min(Number(searchParams.get("limit") || 100), 500)

  const decisions = await prisma.tradeDecision.findMany({
    where: {
      userId: user.id,
      ...(symbol ? { crypto: { slug: symbol.slug } } : {}),
    },
    include: { crypto: true, forecast: true },
    orderBy: { ts: "desc" },
    take: Number.isFinite(limit) && limit > 0 ? limit : 100,
  })

  const data = decisions.map((decision) => ({
    ...serializeDecision(decision, decision.crypto.ticker),
    forecast: {
      id: decision.forecast.id,
      predicted_log_return: Number(decision.forecast.predictedLogReturn),
      predicted_close: Number(decision.forecast.predictedClose),
      last_close: Number(decision.forecast.lastClose),
    },
  }))

  return NextResponse.json({ success: true, data })
}
