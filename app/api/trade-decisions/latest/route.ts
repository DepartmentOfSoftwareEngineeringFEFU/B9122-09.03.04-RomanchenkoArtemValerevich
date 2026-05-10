import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/server/auth"
import { ensureCoreData } from "@/lib/server/core-data"
import { prisma } from "@/lib/server/prisma"
import { serializeDecision, serializeForecast, serializeOperation } from "@/lib/server/serializers"

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await ensureCoreData(user.id)
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get("limit") || "10", 10)
  const decisions = await prisma.tradeDecision.findMany({
    where: { userId: user.id },
    include: {
      crypto: true,
      forecast: true,
      operations: {
        orderBy: [{ createdAt: "desc" }, { ts: "desc" }, { id: "desc" }],
        take: 1,
      },
    },
    orderBy: [{ createdAt: "desc" }, { ts: "desc" }, { id: "desc" }],
    take: Number.isFinite(limit) && limit > 0 ? limit : 10,
  })
  const data = decisions.map((decision) => ({
    ...serializeDecision(decision, decision.crypto.ticker),
    forecast: serializeForecast(decision.forecast),
    operation: decision.operations[0] ? serializeOperation(decision.operations[0], decision.crypto.ticker) : null,
  }))
  
  return NextResponse.json({
    success: true,
    data,
  })
}
