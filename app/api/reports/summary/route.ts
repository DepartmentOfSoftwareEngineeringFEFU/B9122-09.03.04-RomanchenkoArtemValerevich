import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/server/auth"
import { ensureCoreData } from "@/lib/server/core-data"
import { prisma } from "@/lib/server/prisma"
import { SELECTED_BACKTEST_RUN_SOURCE } from "@/lib/strategy-defaults"

function jsonObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await ensureCoreData(user.id)
  const { searchParams } = new URL(request.url)
  const requestedRunSource = searchParams.get("run_source")
  const effectiveRunSource =
    requestedRunSource && requestedRunSource !== "all"
      ? requestedRunSource
      : SELECTED_BACKTEST_RUN_SOURCE
  const decisionWhere = { userId: user.id, runSource: effectiveRunSource }
  const operationWhere = { userId: user.id, decision: { runSource: effectiveRunSource } }
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
    selectedJobRun,
  ] = await Promise.all([
    prisma.tradeDecision.count({ where: decisionWhere }),
    prisma.tradeDecision.count({ where: { ...decisionWhere, decisionType: "покупка" } }),
    prisma.tradeDecision.count({ where: { ...decisionWhere, decisionType: "продажа" } }),
    prisma.tradeDecision.count({ where: { ...decisionWhere, decisionType: "удержание" } }),
    prisma.tradeOperation.count({ where: operationWhere }),
    prisma.tradeDecision.count({ where: { ...decisionWhere, riskCheckStatus: "запрещено" } }),
    prisma.tradeOperation.count({ where: { ...operationWhere, status: "открыта" } }),
    prisma.tradeOperation.count({ where: { ...operationWhere, status: "исполнена" } }),
    prisma.tradeOperation.count({ where: { ...operationWhere, status: "отменена" } }),
    prisma.jobRun.findFirst({
      where: {
        jobName: "seed:factual-demo",
        runSource: SELECTED_BACKTEST_RUN_SOURCE,
        status: "success",
      },
      orderBy: { id: "desc" },
    }),
  ])
  const selectedMetadata = jsonObject(selectedJobRun?.metadataJson)

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
      selected_backtest: selectedMetadata
        ? {
            run_source: SELECTED_BACKTEST_RUN_SOURCE,
            summary: selectedMetadata.summary ?? null,
            selected_config: selectedMetadata.selected_config ?? null,
            strategy_rules: selectedMetadata.strategy_rules ?? null,
            model_metrics: selectedMetadata.model_metrics ?? null,
            tolerance_checks: selectedMetadata.tolerance_checks ?? null,
          }
        : null,
    },
  })
}
