import { NextResponse } from "next/server"
import { readJson } from "@/lib/server/api"
import { ForecastJobError, runForecastCycle } from "@/lib/server/forecast-cycle"
import {
  finishJobRun,
  isValidInternalJobsToken,
  resolveInternalJobUser,
  startJobRun,
} from "@/lib/server/internal-jobs"
import { serializeDecision, serializeForecast, serializeOperation } from "@/lib/server/serializers"

export async function POST(request: Request) {
  if (!isValidInternalJobsToken(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized internal job request" },
      { status: 401 },
    )
  }

  const body = await readJson<{ symbol?: string }>(request)
  const symbol = body.symbol || "BTC-USDT"
  const jobRun = await startJobRun({
    jobName: "forecast-run",
    symbol,
    timeframe: "1D",
    runSource: "airflow",
  })

  try {
    const user = await resolveInternalJobUser()
    if (!user) {
      throw new ForecastJobError("Internal forecast job user not found", 400)
    }

    const result = await runForecastCycle({
      symbol,
      userId: user.id,
      runSource: "airflow",
    })

    await finishJobRun({
      id: jobRun.id,
      status: "success",
      forecastId: result.forecast.id,
      decisionId: result.decision.id,
      operationId: result.operation?.id,
      metadata: { run_source: "airflow", user_id: user.id },
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
    const message = error instanceof Error ? error.message : "Forecast job failed"
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
