import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/server/auth"
import { ensureCoreData } from "@/lib/server/core-data"
import { prisma } from "@/lib/server/prisma"
import { normalizeSymbol } from "@/lib/server/symbols"
import { serializeOperation } from "@/lib/server/serializers"
import { SELECTED_BACKTEST_RUN_SOURCE } from "@/lib/strategy-defaults"

function endOfDateFilter(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T23:59:59.999Z`)
  }
  return new Date(value)
}

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await ensureCoreData(user.id)
  const { searchParams } = new URL(request.url)
  const instrument = searchParams.get("instrument") || searchParams.get("symbol")
  const side = searchParams.get("side")
  const status = searchParams.get("status")
  const orderType = searchParams.get("order_type")
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const requestedRunSource = searchParams.get("run_source")
  const limit = Math.min(Number(searchParams.get("limit") || 100), 500)
  const offset = Math.max(Number(searchParams.get("offset") || 0), 0)
  const normalized = normalizeSymbol(instrument)
  const selectedOperationsCount = await prisma.tradeOperation.count({
    where: {
      userId: user.id,
      decision: { runSource: SELECTED_BACKTEST_RUN_SOURCE },
      ...(normalized ? { crypto: { slug: normalized.slug } } : {}),
    },
  })
  const effectiveRunSource =
    requestedRunSource && requestedRunSource !== "all"
      ? requestedRunSource
      : selectedOperationsCount > 0
        ? SELECTED_BACKTEST_RUN_SOURCE
        : null

  const result = await prisma.tradeOperation.findMany({
    where: {
      userId: user.id,
      ...(effectiveRunSource ? { decision: { runSource: effectiveRunSource } } : {}),
      ...(side ? { side } : {}),
      ...(status ? { status } : {}),
      ...(orderType ? { orderType } : {}),
      ...(normalized ? { crypto: { slug: normalized.slug } } : {}),
      ...(from || to
        ? {
            ts: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: endOfDateFilter(to) } : {}),
            },
          }
        : {}),
    },
    include: { crypto: true },
    orderBy: { ts: "desc" },
    take: Number.isFinite(limit) && limit > 0 ? limit : 100,
    skip: Number.isFinite(offset) ? offset : 0,
  })

  const data = result.map((operation) => serializeOperation(operation, operation.crypto.ticker))

  return NextResponse.json({ success: true, data, operations: data })
}
