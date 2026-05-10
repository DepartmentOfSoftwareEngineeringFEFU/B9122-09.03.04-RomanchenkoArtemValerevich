import { getPlainOkxCredentials } from "./credentials"
import { ensureCoreData, ensureUserStrategy } from "./core-data"
import { makeDecision } from "./decision-engine"
import {
  loadPreprocessor,
  runLstmInference,
  validateStrategySettingsContract,
  LstmConfigurationError,
  type LstmPreprocessor,
} from "./lstm"
import { lstmMarketDataSource } from "./market-data-source"
import { placeDemoMarketOrder, testOkxCredentials } from "./okx"
import { prisma } from "./prisma"
import { riskNotRequiredForHold, runRiskCheck } from "./risk"
import { findCryptoBySymbol } from "./symbols"
import type { RunSource } from "./internal-jobs"

export class ForecastJobError extends Error {
  constructor(
    message: string,
    public status = 400,
    public details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = "ForecastJobError"
  }
}

export type ForecastCycleResult = {
  forecast: Awaited<ReturnType<typeof prisma.forecast.upsert>>
  decision: Awaited<ReturnType<typeof prisma.tradeDecision.upsert>>
  operation: Awaited<ReturnType<typeof prisma.tradeOperation.create>> | null
  warning?: string
}

function staleDetails(latestTs: Date | null, timeframe: string) {
  const dataSource = lstmMarketDataSource(timeframe)
  return {
    latest_ts: latestTs?.toISOString() ?? null,
    expected_timeframe: timeframe,
    source: dataSource.source,
    source_bar: dataSource.sourceBar,
    timezone: dataSource.timezone,
  }
}

function isStaleMarketData(latestTs: Date | null, timeframe: string) {
  if (!latestTs) return true
  if (timeframe !== "1D") return false

  const maxAgeMs = 49 * 60 * 60 * 1000
  return Date.now() - latestTs.getTime() > maxAgeMs
}

function configurationMessage(error: unknown) {
  if (error instanceof LstmConfigurationError) return error.message
  if (error instanceof Error) return `Ошибка LSTM inference: ${error.message}`
  return "Ошибка LSTM inference"
}

async function loadValidatedPreprocessor(strategy: {
  windowSize: number
  horizon: number
  timeframe: string
}) {
  let preprocessor: LstmPreprocessor
  try {
    preprocessor = await loadPreprocessor()
    validateStrategySettingsContract({
      windowSize: strategy.windowSize,
      horizon: strategy.horizon,
      timeframe: strategy.timeframe,
    }, preprocessor)
  } catch (error) {
    throw new ForecastJobError(configurationMessage(error), 400)
  }

  return preprocessor
}

export async function runForecastCycle(input: {
  symbol?: string | null
  userId: number
  runSource: RunSource
}): Promise<ForecastCycleResult> {
  await ensureCoreData(input.userId)

  const crypto = await findCryptoBySymbol(input.symbol || "BTC-USDT")
  if (!crypto) {
    throw new ForecastJobError("Торговая пара не найдена", 404)
  }

  if (crypto.ticker !== "BTC-USDT") {
    throw new ForecastJobError("В прототипе прогноз выполняется только для BTC-USDT", 400)
  }

  const strategy = await ensureUserStrategy(input.userId, crypto.id)
  if (!strategy.isActive) {
    throw new ForecastJobError("Активные strategy_settings не найдены", 400, {
      no_operation_reason: "Стратегия не активна",
    })
  }

  const preprocessor = await loadValidatedPreprocessor({
    windowSize: strategy.windowSize,
    horizon: strategy.horizon,
    timeframe: strategy.timeframe,
  })

  const dataSource = lstmMarketDataSource(preprocessor.timeframe)
  const candleRows = await prisma.marketData.findMany({
    where: {
      cryptoId: crypto.id,
      timeframe: dataSource.timeframe,
      source: dataSource.source,
      sourceBar: dataSource.sourceBar,
      timezone: dataSource.timezone,
    },
    orderBy: { ts: "asc" },
  })
  const latestCandleTs = candleRows[candleRows.length - 1]?.ts ?? null

  if (isStaleMarketData(latestCandleTs, preprocessor.timeframe)) {
    throw new ForecastJobError(
      `Market data is stale for ${crypto.ticker} ${preprocessor.timeframe}`,
      409,
      staleDetails(latestCandleTs, preprocessor.timeframe),
    )
  }

  if (candleRows.length < strategy.windowSize) {
    throw new ForecastJobError("Недостаточно данных после расчета признаков для LSTM", 400, {
      no_operation_reason: "Недостаточно данных OHLCV",
      received: candleRows.length,
      required: strategy.windowSize,
    })
  }

  const candles = candleRows.map((candle) => ({
    ts: candle.ts,
    open: Number(candle.open),
    high: Number(candle.high),
    low: Number(candle.low),
    close: Number(candle.close),
    volume: Number(candle.volume),
  }))

  let inference
  try {
    inference = await runLstmInference({ candles, preprocessor })
  } catch (error) {
    throw new ForecastJobError(configurationMessage(error), 400)
  }

  const { model } = await ensureCoreData(input.userId)
  const forecast = await prisma.forecast.upsert({
    where: {
      modelId_cryptoId_ts: {
        modelId: model.id,
        cryptoId: crypto.id,
        ts: inference.lastTimestamp,
      },
    },
    create: {
      modelId: model.id,
      cryptoId: crypto.id,
      ts: inference.lastTimestamp,
      lastClose: inference.lastClose,
      predictedLogReturn: inference.predictedLogReturn,
      predictedClose: inference.predictedClose,
      runSource: input.runSource,
    },
    update: {
      lastClose: inference.lastClose,
      predictedLogReturn: inference.predictedLogReturn,
      predictedClose: inference.predictedClose,
      runSource: input.runSource,
    },
  })

  const decisionResult = makeDecision({
    predicted_log_return: inference.predictedLogReturn,
    noise_threshold: Number(strategy.noiseThreshold),
    previous: inference.previousIndicators,
    current: inference.currentIndicators,
  })
  const shouldRunRiskCheck = decisionResult.decision_type === "покупка" || decisionResult.decision_type === "продажа"
  const credentials = shouldRunRiskCheck ? await getPlainOkxCredentials(input.userId) : null
  const okxStatus = credentials ? await testOkxCredentials(credentials) : null
  const risk = shouldRunRiskCheck
    ? runRiskCheck({
        decision_type: decisionResult.decision_type,
        latest_price: inference.lastClose,
        stop_loss_pct: Number(strategy.stopLossPct),
        take_profit_pct: Number(strategy.takeProfitPct),
        max_operation_amount: Number(strategy.maxOperationAmount),
        has_credentials: Boolean(credentials),
        okx_connected: Boolean(okxStatus?.success),
      })
    : riskNotRequiredForHold()

  const decision = await prisma.tradeDecision.upsert({
    where: { forecastId: forecast.id },
    create: {
      userId: input.userId,
      cryptoId: crypto.id,
      forecastId: forecast.id,
      strategySettingsId: strategy.id,
      ts: new Date(),
      decisionType: decisionResult.decision_type,
      reason: decisionResult.reason,
      riskCheckStatus: risk.risk_check_status,
      noOperationReason: risk.no_operation_reason,
      predictedLogReturn: inference.predictedLogReturn,
      predictedClose: inference.predictedClose,
      runSource: input.runSource,
    },
    update: {
      strategySettingsId: strategy.id,
      ts: new Date(),
      decisionType: decisionResult.decision_type,
      reason: decisionResult.reason,
      riskCheckStatus: risk.risk_check_status,
      noOperationReason: risk.no_operation_reason,
      predictedLogReturn: inference.predictedLogReturn,
      predictedClose: inference.predictedClose,
      runSource: input.runSource,
    },
  })

  const existingOperation = await prisma.tradeOperation.findUnique({
    where: { decisionId: decision.id },
  })
  if (existingOperation) {
    return { forecast, decision, operation: existingOperation }
  }

  let operation = null
  if (shouldRunRiskCheck && credentials && risk.risk_check_status === "разрешено" && risk.amount) {
    const side = decisionResult.decision_type === "покупка" ? "buy" : "sell"
    const okxOrder = await placeDemoMarketOrder({
      credentials,
      instId: crypto.ticker,
      side,
      amount: risk.amount,
    })
    const firstOrder =
      okxOrder.success && Array.isArray(okxOrder.data.data)
        ? (okxOrder.data.data[0] as Record<string, unknown> | undefined)
        : undefined
    const okxOrderId = typeof firstOrder?.ordId === "string" ? firstOrder.ordId : null
    const orderError = !okxOrder.success || okxOrder.data.code !== "0" || (firstOrder?.sCode && firstOrder.sCode !== "0")

    operation = await prisma.tradeOperation.create({
      data: {
        userId: input.userId,
        cryptoId: crypto.id,
        decisionId: decision.id,
        ts: new Date(),
        orderType: "рыночный",
        side: decisionResult.decision_type,
        price: inference.lastClose,
        amount: risk.amount,
        stopLossPrice: risk.stop_loss_price,
        takeProfitPrice: risk.take_profit_price,
        status: orderError ? "ошибка" : "открыта",
        okxOrderId,
        okxResponseJson: okxOrder.success ? okxOrder.raw as object : { error: okxOrder.message, raw: okxOrder.raw },
      },
    })
  }

  return { forecast, decision, operation }
}
