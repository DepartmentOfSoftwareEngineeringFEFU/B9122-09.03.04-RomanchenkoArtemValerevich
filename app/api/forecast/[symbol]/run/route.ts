import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/server/auth"
import { ForecastJobError, runForecastCycle } from "@/lib/server/forecast-cycle"
import { finishJobRun, startJobRun } from "@/lib/server/internal-jobs"
import { serializeDecision, serializeForecast, serializeOperation } from "@/lib/server/serializers"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { symbol } = await params
  const jobRun = await startJobRun({
    jobName: "forecast-run",
    symbol,
    timeframe: "1D",
    runSource: "manual",
  })

  try {
    const result = await runForecastCycle({
      symbol,
      userId: user.id,
      runSource: "manual",
    })

    await finishJobRun({
      id: jobRun.id,
      status: "success",
      forecastId: result.forecast.id,
      decisionId: result.decision.id,
      operationId: result.operation?.id,
      metadata: { run_source: "manual" },
    })

    return NextResponse.json({
      success: true,
      data: {
        forecast: serializeForecast(result.forecast),
        decision: serializeDecision(result.decision, "BTC-USDT"),
        operation: result.operation ? serializeOperation(result.operation, "BTC-USDT") : null,
      },
      ...(result.warning ? { warning: result.warning } : {}),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка запуска прогноза"
    await finishJobRun({
      id: jobRun.id,
      status: "failed",
      errorMessage: message,
      metadata: error instanceof ForecastJobError ? error.details : undefined,
    })

    if (error instanceof ForecastJobError) {
      return NextResponse.json(
        { success: false, error: error.message, details: error.details },
        { status: error.status },
      )
    }

    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }
}
