import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/server/auth"
import { ensureCoreData } from "@/lib/server/core-data"
import { prisma } from "@/lib/server/prisma"
import { normalizeSymbol } from "@/lib/server/symbols"
import { serializeDecision, serializeForecast, serializeOperation } from "@/lib/server/serializers"
import { SELECTED_BACKTEST_RUN_SOURCE } from "@/lib/strategy-defaults"

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await ensureCoreData(user.id)
  const { searchParams } = new URL(request.url)
  const symbol = normalizeSymbol(searchParams.get("symbol"))
  const requestedRunSource = searchParams.get("run_source")
  const limit = Math.min(Number(searchParams.get("limit") || 100), 500)
  const selectedDecisionsCount = await prisma.tradeDecision.count({
    where: {
      userId: user.id,
      runSource: SELECTED_BACKTEST_RUN_SOURCE,
      ...(symbol ? { crypto: { slug: symbol.slug } } : {}),
    },
  })
  const effectiveRunSource =
    requestedRunSource === "all"
      ? null
      : requestedRunSource
      ? requestedRunSource
      : selectedDecisionsCount > 0
        ? SELECTED_BACKTEST_RUN_SOURCE
        : null

  const decisions = await prisma.tradeDecision.findMany({
    where: {
      userId: user.id,
      ...(effectiveRunSource ? { runSource: effectiveRunSource } : {}),
      ...(symbol ? { crypto: { slug: symbol.slug } } : {}),
    },
    include: {
      crypto: true,
      forecast: true,
      operations: {
        orderBy: [{ ts: "desc" }, { id: "desc" }],
        take: 1,
      },
    },
    orderBy: [{ ts: "desc" }, { id: "desc" }],
    take: Number.isFinite(limit) && limit > 0 ? limit : 100,
  })

  const data = decisions.map((decision) => ({
    ...serializeDecision(decision, decision.crypto.ticker),
    forecast: serializeForecast(decision.forecast),
    operation: decision.operations[0] ? serializeOperation(decision.operations[0], decision.crypto.ticker) : null,
  }))
  return NextResponse.json({ success: true, data })
}
