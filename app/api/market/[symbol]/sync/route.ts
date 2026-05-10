import { NextResponse } from "next/server"
import { apiFail, readJson } from "@/lib/server/api"
import { getCurrentUser } from "@/lib/server/auth"
import { ensureCoreData } from "@/lib/server/core-data"
import { finishJobRun, startJobRun } from "@/lib/server/internal-jobs"
import { syncOkxMarketData } from "@/lib/server/market-sync"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await ensureCoreData(user.id)
  const { symbol } = await params
  const { searchParams } = new URL(request.url)
  const body = await readJson<{ timeframe?: string; limit?: number }>(request)
  const timeframe = String(body.timeframe || searchParams.get("timeframe") || "1D")
  const limit = Math.min(Number(body.limit || searchParams.get("limit") || 100), 300)

  const jobRun = await startJobRun({
    jobName: "market-sync",
    symbol,
    timeframe,
    runSource: "manual",
    metadata: { limit },
  })

  try {
    const data = await syncOkxMarketData({ symbol, timeframe, limit })
    await finishJobRun({
      id: jobRun.id,
      status: "success",
      metadata: data,
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка синхронизации рыночных данных"
    await finishJobRun({
      id: jobRun.id,
      status: "failed",
      errorMessage: message,
      metadata: { symbol, timeframe, limit },
    })

    return apiFail(message, 400)
  }
}
