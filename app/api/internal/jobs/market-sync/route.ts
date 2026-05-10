import { NextResponse } from "next/server"
import { readJson } from "@/lib/server/api"
import { finishJobRun, isValidInternalJobsToken, startJobRun } from "@/lib/server/internal-jobs"
import { syncOkxMarketData } from "@/lib/server/market-sync"

export async function POST(request: Request) {
  if (!isValidInternalJobsToken(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized internal job request" },
      { status: 401 },
    )
  }

  const body = await readJson<{ symbol?: string; timeframe?: string; limit?: number }>(request)
  const symbol = body.symbol || "BTC-USDT"
  const timeframe = body.timeframe || "1D"
  const limit = body.limit ?? 200
  const jobRun = await startJobRun({
    jobName: "market-sync",
    symbol,
    timeframe,
    runSource: "airflow",
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
    const message = error instanceof Error ? error.message : "Market sync job failed"
    await finishJobRun({
      id: jobRun.id,
      status: "failed",
      errorMessage: message,
      metadata: { symbol, timeframe, limit },
    })

    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }
}
