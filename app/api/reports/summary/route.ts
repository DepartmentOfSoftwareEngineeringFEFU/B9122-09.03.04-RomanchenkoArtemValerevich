import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/server/auth"
import { ensureCoreData } from "@/lib/server/core-data"
import { prisma } from "@/lib/server/prisma"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await ensureCoreData(user.id)
  const [
    decisionsTotal,
    buyCount,
    sellCount,
    holdCount,
    operationsTotal,
    riskRejectedCount,
    openOperations,
    executedOperations,
    cancelledOperations,
  ] = await Promise.all([
    prisma.tradeDecision.count({ where: { userId: user.id } }),
    prisma.tradeDecision.count({ where: { userId: user.id, decisionType: "покупка" } }),
    prisma.tradeDecision.count({ where: { userId: user.id, decisionType: "продажа" } }),
    prisma.tradeDecision.count({ where: { userId: user.id, decisionType: "удержание" } }),
    prisma.tradeOperation.count({ where: { userId: user.id } }),
    prisma.tradeDecision.count({ where: { userId: user.id, riskCheckStatus: "запрещено" } }),
    prisma.tradeOperation.count({ where: { userId: user.id, status: "открыта" } }),
    prisma.tradeOperation.count({ where: { userId: user.id, status: "исполнена" } }),
    prisma.tradeOperation.count({ where: { userId: user.id, status: "отменена" } }),
  ])

  return NextResponse.json({
    success: true,
    data: {
      decisions_total: decisionsTotal,
      buy_count: buyCount,
      sell_count: sellCount,
      hold_count: holdCount,
      operations_total: operationsTotal,
      risk_rejected_count: riskRejectedCount,
      open_operations: openOperations,
      executed_operations: executedOperations,
      cancelled_operations: cancelledOperations,
    },
  })
}
