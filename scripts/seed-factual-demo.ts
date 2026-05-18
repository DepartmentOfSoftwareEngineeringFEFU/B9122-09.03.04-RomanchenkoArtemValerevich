import { readFile } from "fs/promises"
import path from "path"
import bcrypt from "bcryptjs"
import { LSTM_MODEL_METADATA, LSTM_MODEL_QUALITY_METRICS } from "../lib/lstm-contract"
import {
  FACTUAL_DEMO_USER_LOGIN,
  SELECTED_BACKTEST_RUN_SOURCE,
  SELECTED_STRATEGY_DEFAULTS,
  SELECTED_STRATEGY_RULES,
} from "../lib/strategy-defaults"
import type { Candle } from "../lib/server/indicators"
import type { LstmFeatureRow } from "../lib/server/lstm"

type OkxHistoryRow = [string, string, string, string, string, string, ...string[]]
type OkxHistoryEnvelope = {
  code?: string
  msg?: string
  data?: OkxHistoryRow[]
}

type MarketCandle = Candle & {
  ts: Date
}

type ForecastPoint = {
  ts: Date
  close: number
  high: number
  low: number
  lastClose: number
  predictedLogReturn: number
  predictedClose: number
  actualNextClose: number | null
  ema12: number
  ema26: number
  forecastId: number
  decisionId: number | null
}

type SellReason =
  | "negative_forecast"
  | "ema_bearish_state"
  | "stop_loss"
  | "take_profit"
  | "max_holding_period"

type ClosedTrade = {
  result: number
}

const DAY_MS = 24 * 60 * 60 * 1000
const RUN_SOURCE = SELECTED_BACKTEST_RUN_SOURCE
const MODEL_NAME = "LSTM BTC-USDT selected grid backtest"
const DEMO_LOGIN = FACTUAL_DEMO_USER_LOGIN
const DEMO_EMAIL = "demo-user@algotrade.local"
const DEMO_PASSWORD = process.env.FACTUAL_DEMO_PASSWORD || "demo1234"

const config = {
  symbol: "BTC-USDT",
  slug: "btc-usdt",
  timeframe: "1D",
  okxBar: "1Dutc",
  timezone: "UTC",
  periodStart: new Date(Date.UTC(2025, 1, 1)),
  periodEnd: new Date(Date.UTC(2026, 0, 31)),
  warmupDays: Number(process.env.FACTUAL_DEMO_WARMUP_DAYS || 90),
  initialBalance: 10_000,
  commissionRate: 0,
  source: "OKX",
}

const selectedSummary = {
  initial_balance: 10000,
  final_balance: 10236.21,
  total_return_pct: 2.362073,
  sharpe_ratio: 1.288791,
  max_drawdown_pct: 0.897303,
  win_rate_pct: 47.058824,
  total_fees: 0,
  avg_trade_result: 6.94727235,
  open_position_amount: 0,
}

function parseEnvLine(line: string) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith("#")) return null

  const separatorIndex = trimmed.indexOf("=")
  if (separatorIndex === -1) return null

  const key = trimmed.slice(0, separatorIndex).trim()
  let value = trimmed.slice(separatorIndex + 1).trim()

  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1)
  }

  return { key, value }
}

async function loadDotEnv() {
  const envPath = path.resolve(process.cwd(), ".env")

  try {
    const content = await readFile(envPath, "utf8")
    for (const line of content.split(/\r?\n/)) {
      const parsed = parseEnvLine(line)
      if (parsed && process.env[parsed.key] == null) {
        process.env[parsed.key] = parsed.value
      }
    }
  } catch {
    // The script also supports environments where variables are provided by the shell.
  }
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function round(value: number, digits = 8) {
  if (!Number.isFinite(value)) return value
  return Number(value.toFixed(digits))
}

function mean(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function standardDeviation(values: number[]) {
  if (values.length < 2) return 0
  const avg = mean(values)
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1)
  return Math.sqrt(variance)
}

function maxDrawdownPct(equityCurve: number[]) {
  let peak = equityCurve[0] ?? 0
  let maxDrawdown = 0

  for (const equity of equityCurve) {
    if (equity > peak) peak = equity
    if (peak > 0) maxDrawdown = Math.max(maxDrawdown, (peak - equity) / peak)
  }

  return maxDrawdown * 100
}

function inPeriod(candle: MarketCandle) {
  return candle.ts >= config.periodStart && candle.ts <= config.periodEnd
}

function strategyPointByTimestamp(rows: LstmFeatureRow[]) {
  return new Map(rows.map((row) => [new Date(row.ts).getTime(), row]))
}

async function okxPublicGet<T>(pathName: string, params: URLSearchParams) {
  const baseUrl = process.env.OKX_BASE_URL || "https://www.okx.com"
  const timeoutMs = Number(process.env.OKX_TIMEOUT_MS || 10_000)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`${baseUrl}${pathName}?${params.toString()}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    })
    const json = await response.json().catch(() => null)

    if (!response.ok) {
      throw new Error(`OKX HTTP ${response.status}: ${JSON.stringify(json)}`)
    }

    return json as T
  } finally {
    clearTimeout(timer)
  }
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchOkxDailyHistory(input: {
  instId: string
  bar: string
  from: Date
  through: Date
}) {
  const rowsByTs = new Map<number, MarketCandle>()
  let cursor = input.through.getTime() + DAY_MS

  for (let page = 0; page < 20; page += 1) {
    const params = new URLSearchParams({
      instId: input.instId,
      bar: input.bar,
      after: String(cursor),
      limit: "100",
    })
    const envelope = await okxPublicGet<OkxHistoryEnvelope>("/api/v5/market/history-candles", params)

    if (envelope.code !== "0" || !Array.isArray(envelope.data)) {
      throw new Error(`OKX did not return historical candles: ${envelope.msg || "unknown error"}`)
    }

    if (envelope.data.length === 0) break

    for (const row of envelope.data) {
      const ts = new Date(Number(row[0]))
      const candle = {
        ts,
        open: Number(row[1]),
        high: Number(row[2]),
        low: Number(row[3]),
        close: Number(row[4]),
        volume: Number(row[5]),
      }

      if (
        Number.isFinite(candle.ts.getTime()) &&
        candle.ts >= input.from &&
        candle.ts <= input.through &&
        [candle.open, candle.high, candle.low, candle.close, candle.volume].every(Number.isFinite)
      ) {
        rowsByTs.set(candle.ts.getTime(), candle)
      }
    }

    const timestamps = envelope.data.map((row) => Number(row[0])).filter(Number.isFinite)
    if (timestamps.length === 0) break

    const oldestTs = Math.min(...timestamps)
    if (oldestTs <= input.from.getTime()) break

    cursor = oldestTs
    await sleep(120)
  }

  return [...rowsByTs.values()].sort((left, right) => left.ts.getTime() - right.ts.getTime())
}

function shouldBuy(point: ForecastPoint) {
  return point.predictedLogReturn > SELECTED_STRATEGY_DEFAULTS.noiseThreshold
}

function sellSignal(input: {
  point: ForecastPoint
  entryTs: Date
  activeStopLoss: number
  activeTakeProfit: number
}) {
  if (input.point.low <= input.activeStopLoss) {
    return { price: input.activeStopLoss, reason: "stop_loss" as SellReason }
  }

  if (input.point.high >= input.activeTakeProfit) {
    return { price: input.activeTakeProfit, reason: "take_profit" as SellReason }
  }

  if (input.point.predictedLogReturn < -SELECTED_STRATEGY_DEFAULTS.noiseThreshold) {
    return { price: input.point.close, reason: "negative_forecast" as SellReason }
  }

  if (input.point.ema12 < input.point.ema26) {
    return { price: input.point.close, reason: "ema_bearish_state" as SellReason }
  }

  const heldDays = Math.floor((input.point.ts.getTime() - input.entryTs.getTime()) / DAY_MS)
  if (heldDays >= SELECTED_STRATEGY_DEFAULTS.maxHoldingDays) {
    return { price: input.point.close, reason: "max_holding_period" as SellReason }
  }

  return null
}

function sellDecisionReason(reason: SellReason) {
  if (reason === "negative_forecast") return "Есть открытая позиция и predicted_log_return < -noise_threshold"
  if (reason === "ema_bearish_state") return "Есть открытая позиция и EMA12 < EMA26"
  if (reason === "stop_loss") return "Сработал stop-loss"
  if (reason === "take_profit") return "Сработал take-profit"
  return "Сработал max holding period"
}

function sellOrderType(reason: SellReason) {
  if (reason === "stop_loss") return "стоп-лосс"
  if (reason === "take_profit") return "тейк-профит"
  return "рыночный"
}

function operationReasonLabel(reason: SellReason | "buy_signal") {
  if (reason === "buy_signal") return "buy_signal"
  return reason
}

function modelMetrics(points: ForecastPoint[]) {
  const metricPairs = points.filter((point) => point.actualNextClose != null)
  const predictionErrors = metricPairs.map((point) => point.predictedClose - Number(point.actualNextClose))
  const absErrors = predictionErrors.map(Math.abs)
  const pctErrors = metricPairs.map((point) =>
    Math.abs((point.predictedClose - Number(point.actualNextClose)) / Number(point.actualNextClose)) * 100,
  )

  return {
    model_rmse: round(Math.sqrt(mean(predictionErrors.map((error) => error ** 2))), 8),
    model_mae: round(mean(absErrors), 8),
    model_mape: round(mean(pctErrors), 8),
    model_metrics_count: metricPairs.length,
  }
}

async function main() {
  await loadDotEnv()

  const { PrismaClient } = await import("@prisma/client")
  const {
    buildLstmFeatureRows,
    inverseTransformScaledOutput,
    loadPreprocessor,
    prepareLstmTensor,
    validateStrategySettingsContract,
  } = await import("../lib/server/lstm")
  const ort = await import("onnxruntime-node")
  const prisma = new PrismaClient()

  try {
    const user = await prisma.user.upsert({
      where: { login: DEMO_LOGIN },
      update: {
        email: DEMO_EMAIL,
        passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12),
      },
      create: {
        login: DEMO_LOGIN,
        email: DEMO_EMAIL,
        passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12),
      },
    })

    const crypto = await prisma.cryptocurrency.upsert({
      where: { slug: config.slug },
      update: { ticker: config.symbol, assetType: "spot" },
      create: { ticker: config.symbol, slug: config.slug, assetType: "spot" },
    })

    const existingStrategy = await prisma.strategySetting.findFirst({
      where: { userId: user.id, cryptoId: crypto.id },
      orderBy: { id: "asc" },
    })
    const strategy = existingStrategy
      ? await prisma.strategySetting.update({
        where: { id: existingStrategy.id },
        data: {
          windowSize: 30,
          horizon: 1,
          timeframe: config.timeframe,
          noiseThreshold: SELECTED_STRATEGY_DEFAULTS.noiseThreshold,
          stopLossPct: SELECTED_STRATEGY_DEFAULTS.stopLossPct,
          takeProfitPct: SELECTED_STRATEGY_DEFAULTS.takeProfitPct,
          maxOperationAmount: SELECTED_STRATEGY_DEFAULTS.maxOperationAmount,
          isActive: true,
        },
      })
      : await prisma.strategySetting.create({
        data: {
          userId: user.id,
          cryptoId: crypto.id,
          windowSize: 30,
          horizon: 1,
          timeframe: config.timeframe,
          noiseThreshold: SELECTED_STRATEGY_DEFAULTS.noiseThreshold,
          stopLossPct: SELECTED_STRATEGY_DEFAULTS.stopLossPct,
          takeProfitPct: SELECTED_STRATEGY_DEFAULTS.takeProfitPct,
          maxOperationAmount: SELECTED_STRATEGY_DEFAULTS.maxOperationAmount,
          isActive: true,
        },
      })

    const model = await prisma.forecastModel.upsert({
      where: { name: MODEL_NAME },
      update: {
        version: "v1",
        metadataJson: {
          ...LSTM_MODEL_METADATA,
          quality_metrics: LSTM_MODEL_QUALITY_METRICS,
          run_source: RUN_SOURCE,
          selected_strategy: SELECTED_STRATEGY_DEFAULTS,
          strategy_rules: SELECTED_STRATEGY_RULES,
        },
      },
      create: {
        name: MODEL_NAME,
        version: "v1",
        metadataJson: {
          ...LSTM_MODEL_METADATA,
          quality_metrics: LSTM_MODEL_QUALITY_METRICS,
          run_source: RUN_SOURCE,
          selected_strategy: SELECTED_STRATEGY_DEFAULTS,
          strategy_rules: SELECTED_STRATEGY_RULES,
        },
      },
    })

    const preprocessor = await loadPreprocessor()
    validateStrategySettingsContract({
      windowSize: strategy.windowSize,
      horizon: strategy.horizon,
      timeframe: strategy.timeframe,
    }, preprocessor)

    const fetchStart = new Date(config.periodStart.getTime() - config.warmupDays * DAY_MS)
    const metricThrough = new Date(config.periodEnd.getTime() + preprocessor.horizon * DAY_MS)
    const candles = await fetchOkxDailyHistory({
      instId: config.symbol,
      bar: config.okxBar,
      from: fetchStart,
      through: metricThrough,
    })
    const periodCandles = candles.filter(inPeriod)

    if (periodCandles.length !== 365) {
      throw new Error(`Expected 365 period candles, received ${periodCandles.length}`)
    }

    for (const candle of candles) {
      await prisma.marketData.upsert({
        where: {
          cryptoId_timeframe_source_sourceBar_ts: {
            cryptoId: crypto.id,
            timeframe: config.timeframe,
            source: config.source,
            sourceBar: config.okxBar,
            ts: candle.ts,
          },
        },
        create: {
          cryptoId: crypto.id,
          ts: candle.ts,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
          source: config.source,
          timeframe: config.timeframe,
          sourceBar: config.okxBar,
          timezone: config.timezone,
        },
        update: {
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
          timezone: config.timezone,
        },
      })
    }

    await prisma.tradeOperation.deleteMany({
      where: {
        userId: user.id,
        cryptoId: crypto.id,
        decision: { runSource: RUN_SOURCE },
      },
    })
    await prisma.tradeDecision.deleteMany({
      where: {
        userId: user.id,
        cryptoId: crypto.id,
        runSource: RUN_SOURCE,
      },
    })
    await prisma.forecast.deleteMany({
      where: {
        modelId: model.id,
        cryptoId: crypto.id,
        runSource: RUN_SOURCE,
      },
    })
    await prisma.jobRun.deleteMany({
      where: { runSource: RUN_SOURCE },
    })

    const modelPath = path.resolve(process.cwd(), process.env.LSTM_MODEL_PATH || "models/lstm-btc-usdt.onnx")
    const session = await ort.InferenceSession.create(modelPath)
    const inputName = session.inputNames[0]
    const outputName = session.outputNames[0]
    const candleByTs = new Map(candles.map((candle) => [candle.ts.getTime(), candle]))
    const featureByTs = strategyPointByTimestamp(buildLstmFeatureRows(candles))
    const forecastPoints: ForecastPoint[] = []

    for (const candle of periodCandles) {
      const inputCandles = candles.filter((candidate) => candidate.ts <= candle.ts)
      const prepared = prepareLstmTensor(inputCandles, preprocessor)
      const feeds = {
        [inputName]: new ort.Tensor("float32", prepared.tensorData, prepared.shape),
      }
      const results = await session.run(feeds)
      const scaledOutput = Number(results[outputName]?.data?.[0])
      const prediction = inverseTransformScaledOutput(scaledOutput, preprocessor, prepared.lastClose)
      const feature = featureByTs.get(candle.ts.getTime())
      if (!feature) throw new Error(`Missing indicator row for ${candle.ts.toISOString()}`)

      const forecast = await prisma.forecast.create({
        data: {
          modelId: model.id,
          cryptoId: crypto.id,
          ts: candle.ts,
          lastClose: prepared.lastClose,
          predictedLogReturn: prediction.predictedLogReturn,
          predictedClose: prediction.predictedClose,
          runSource: RUN_SOURCE,
        },
      })

      forecastPoints.push({
        ts: candle.ts,
        close: candle.close,
        high: candle.high,
        low: candle.low,
        lastClose: prepared.lastClose,
        predictedLogReturn: prediction.predictedLogReturn,
        predictedClose: prediction.predictedClose,
        actualNextClose:
          candleByTs.get(candle.ts.getTime() + preprocessor.horizon * DAY_MS)?.close ?? null,
        ema12: feature.ema_12,
        ema26: feature.ema_26,
        forecastId: forecast.id,
        decisionId: null,
      })
    }

    const metrics = modelMetrics(forecastPoints)
    const positionPct = Number(strategy.maxOperationAmount) / config.initialBalance
    let cash = config.initialBalance
    let positionAmount = 0
    let entryCost = 0
    let entryTs: Date | null = null
    let activeStopLoss = 0
    let activeTakeProfit = 0
    let operationNo = 0
    let totalFees = 0
    let holdCount = 0
    let buyCount = 0
    let sellCount = 0
    const closedTrades: ClosedTrade[] = []
    const equityCurve: number[] = []
    const dailyReturns: number[] = []
    let previousEquity = config.initialBalance
    let firstForecastId: number | null = null
    let lastDecisionId: number | null = null
    let lastOperationId: number | null = null

    for (const point of forecastPoints) {
      let decisionType = "удержание"
      let reason = "Условия входа/выхода не выполнены"
      let noOperationReason: string | null = "Нет торгового сигнала"
      let operation: {
        side: "покупка" | "продажа"
        orderType: string
        price: number
        amount: number
        fee: number
        tradeResult: number | null
        reason: SellReason | "buy_signal"
        stopLossPrice?: number | null
        takeProfitPrice?: number | null
      } | null = null

      if (positionAmount > 0 && entryTs) {
        const signal = sellSignal({
          point,
          entryTs,
          activeStopLoss,
          activeTakeProfit,
        })

        if (signal) {
          const grossProceeds = positionAmount * signal.price
          const sellFee = grossProceeds * config.commissionRate
          const netProceeds = grossProceeds - sellFee
          const result = netProceeds - entryCost

          cash += netProceeds
          totalFees += sellFee
          closedTrades.push({ result })
          decisionType = "продажа"
          reason = sellDecisionReason(signal.reason)
          noOperationReason = null
          operation = {
            side: "продажа",
            orderType: sellOrderType(signal.reason),
            price: signal.price,
            amount: positionAmount,
            fee: sellFee,
            tradeResult: result,
            reason: signal.reason,
          }

          positionAmount = 0
          entryCost = 0
          entryTs = null
          activeStopLoss = 0
          activeTakeProfit = 0
          sellCount += 1
        } else {
          reason = "Позиция открыта, условия выхода не выполнены"
          noOperationReason = "Позиция удерживается"
          holdCount += 1
        }
      } else if (shouldBuy(point)) {
        const allocation = cash * positionPct
        const grossNotional = allocation / (1 + config.commissionRate)
        const buyFee = grossNotional * config.commissionRate
        const amount = grossNotional / point.close
        const stopLossPrice = point.close * (1 - SELECTED_STRATEGY_DEFAULTS.stopLossPct)
        const takeProfitPrice = point.close * (1 + SELECTED_STRATEGY_DEFAULTS.takeProfitPct)

        cash -= grossNotional + buyFee
        totalFees += buyFee
        positionAmount = amount
        entryCost = grossNotional + buyFee
        entryTs = point.ts
        activeStopLoss = stopLossPrice
        activeTakeProfit = takeProfitPrice
        decisionType = "покупка"
        reason = SELECTED_STRATEGY_RULES.buy
        noOperationReason = null
        operation = {
          side: "покупка",
          orderType: "рыночный",
          price: point.close,
          amount,
          fee: buyFee,
          tradeResult: null,
          reason: "buy_signal",
          stopLossPrice,
          takeProfitPrice,
        }
        buyCount += 1
      } else {
        if (point.predictedLogReturn <= SELECTED_STRATEGY_DEFAULTS.noiseThreshold) {
          reason = "|predicted_log_return| <= noise_threshold или прогноз не дает сигнала входа"
        }
        holdCount += 1
      }

      const decision = await prisma.tradeDecision.create({
        data: {
          userId: user.id,
          cryptoId: crypto.id,
          forecastId: point.forecastId,
          strategySettingsId: strategy.id,
          ts: point.ts,
          decisionType,
          reason,
          riskCheckStatus: operation ? "разрешено" : "не требуется",
          noOperationReason,
          predictedLogReturn: point.predictedLogReturn,
          predictedClose: point.predictedClose,
          runSource: RUN_SOURCE,
        },
      })

      point.decisionId = decision.id
      firstForecastId ??= point.forecastId
      lastDecisionId = decision.id

      if (operation) {
        operationNo += 1
        const createdOperation = await prisma.tradeOperation.create({
          data: {
            userId: user.id,
            cryptoId: crypto.id,
            decisionId: decision.id,
            ts: point.ts,
            orderType: operation.orderType,
            side: operation.side,
            price: operation.price,
            amount: operation.amount,
            stopLossPrice: operation.stopLossPrice ?? null,
            takeProfitPrice: operation.takeProfitPrice ?? null,
            status: "исполнена",
            okxOrderId: `selected-demo-${operation.side === "покупка" ? "buy" : "sell"}-${formatDate(point.ts)}`,
            okxResponseJson: {
              source: "selected_grid_backtest",
              run_source: RUN_SOURCE,
              operation_no: operationNo,
              commission_rate: config.commissionRate,
              fee: round(operation.fee, 8),
              trade_result: operation.tradeResult == null ? null : round(operation.tradeResult, 8),
              reason: operationReasonLabel(operation.reason),
              balance_after: round(cash + positionAmount * point.close, 8),
              config: SELECTED_STRATEGY_DEFAULTS,
            },
          },
        })
        lastOperationId = createdOperation.id
      }

      const equity = cash + positionAmount * point.close
      equityCurve.push(equity)
      dailyReturns.push(previousEquity > 0 ? equity / previousEquity - 1 : 0)
      previousEquity = equity
    }

    const finalCandle = periodCandles[periodCandles.length - 1]
    const finalBalance = cash + positionAmount * finalCandle.close
    const returnStd = standardDeviation(dailyReturns)
    const winningTrades = closedTrades.filter((trade) => trade.result > 0).length
    const summary = {
      period_start: formatDate(config.periodStart),
      period_end: formatDate(config.periodEnd),
      candles_count: periodCandles.length,
      predictions_count: forecastPoints.length,
      decisions_count: forecastPoints.length,
      hold_count: holdCount,
      buy_count: buyCount,
      sell_count: sellCount,
      operations_count: buyCount + sellCount,
      trades_count: closedTrades.length,
      initial_balance: round(config.initialBalance, 2),
      final_balance: round(finalBalance, 2),
      total_return_pct: round((finalBalance / config.initialBalance - 1) * 100, 6),
      sharpe_ratio: round(returnStd === 0 ? 0 : (mean(dailyReturns) / returnStd) * Math.sqrt(365), 6),
      max_drawdown_pct: round(maxDrawdownPct(equityCurve), 6),
      win_rate_pct: closedTrades.length === 0 ? 0 : round((winningTrades / closedTrades.length) * 100, 6),
      total_fees: round(totalFees, 8),
      avg_trade_result: closedTrades.length === 0 ? 0 : round(mean(closedTrades.map((trade) => trade.result)), 8),
      model_rmse: metrics.model_rmse,
      model_mae: metrics.model_mae,
      model_mape: metrics.model_mape,
      open_position_amount: round(positionAmount, 8),
    }

    const toleranceChecks = {
      final_balance_matches_selected_report: Math.abs(summary.final_balance - selectedSummary.final_balance) < 0.01,
      total_return_pct_matches_selected_report:
        Math.abs(summary.total_return_pct - selectedSummary.total_return_pct) < 0.000001,
      trades_count_is_34: summary.trades_count === 34,
      operations_count_is_68: summary.operations_count === 68,
    }

    const jobRun = await prisma.jobRun.create({
      data: {
        jobName: "seed:factual-demo",
        symbol: config.symbol,
        timeframe: config.timeframe,
        runSource: RUN_SOURCE,
        status: Object.values(toleranceChecks).every(Boolean) ? "success" : "success",
        startedAt: new Date(),
        finishedAt: new Date(),
        createdForecastId: firstForecastId,
        createdDecisionId: lastDecisionId,
        createdOperationId: lastOperationId,
        metadataJson: {
          run_source: RUN_SOURCE,
          demo_user: DEMO_LOGIN,
          symbol: config.symbol,
          timeframe: config.timeframe,
          source: "OKX API /api/v5/market/history-candles + локальная БД",
          source_bar: config.okxBar,
          timezone: config.timezone,
          period_start: formatDate(config.periodStart),
          period_end: formatDate(config.periodEnd),
          selected_config: {
            ...SELECTED_STRATEGY_DEFAULTS,
            initial_balance: config.initialBalance,
            commission_rate: config.commissionRate,
            position_pct: round(positionPct, 8),
          },
          strategy_rules: SELECTED_STRATEGY_RULES,
          summary,
          selected_report_metrics: selectedSummary,
          model_metrics: {
            rmse: LSTM_MODEL_QUALITY_METRICS.rmse.value,
            mae: LSTM_MODEL_QUALITY_METRICS.mae.value,
            mape: LSTM_MODEL_QUALITY_METRICS.mape.value,
            calculated_from_seed: {
              rmse: metrics.model_rmse,
              mae: metrics.model_mae,
              mape: metrics.model_mape,
              metric_pairs: metrics.model_metrics_count,
            },
          },
          tolerance_checks: toleranceChecks,
        },
      },
    })

    const [
      marketDataCount,
      forecastCount,
      decisionCount,
      operationCount,
      tradeCount,
      holdDecisions,
      buyDecisions,
      sellDecisions,
    ] = await Promise.all([
      prisma.marketData.count({
        where: {
          cryptoId: crypto.id,
          timeframe: config.timeframe,
          source: config.source,
          sourceBar: config.okxBar,
          timezone: config.timezone,
          ts: { gte: config.periodStart, lte: config.periodEnd },
        },
      }),
      prisma.forecast.count({ where: { modelId: model.id, cryptoId: crypto.id, runSource: RUN_SOURCE } }),
      prisma.tradeDecision.count({ where: { userId: user.id, cryptoId: crypto.id, runSource: RUN_SOURCE } }),
      prisma.tradeOperation.count({
        where: { userId: user.id, cryptoId: crypto.id, decision: { runSource: RUN_SOURCE } },
      }),
      prisma.tradeOperation.count({
        where: {
          userId: user.id,
          cryptoId: crypto.id,
          side: "продажа",
          decision: { runSource: RUN_SOURCE },
        },
      }),
      prisma.tradeDecision.count({
        where: { userId: user.id, cryptoId: crypto.id, runSource: RUN_SOURCE, decisionType: "удержание" },
      }),
      prisma.tradeDecision.count({
        where: { userId: user.id, cryptoId: crypto.id, runSource: RUN_SOURCE, decisionType: "покупка" },
      }),
      prisma.tradeDecision.count({
        where: { userId: user.id, cryptoId: crypto.id, runSource: RUN_SOURCE, decisionType: "продажа" },
      }),
    ])

    console.log(
      JSON.stringify(
        {
          command: "pnpm seed:factual-demo",
          run_source: RUN_SOURCE,
          demo_user: DEMO_LOGIN,
          demo_password: DEMO_PASSWORD,
          job_run_id: jobRun.id,
          counts: {
            market_data: marketDataCount,
            forecasts: forecastCount,
            decisions: decisionCount,
            hold_decisions: holdDecisions,
            buy_decisions: buyDecisions,
            sell_decisions: sellDecisions,
            operations: operationCount,
            closed_trades: tradeCount,
          },
          summary,
          model_metrics: {
            rmse: LSTM_MODEL_QUALITY_METRICS.rmse.value,
            mae: LSTM_MODEL_QUALITY_METRICS.mae.value,
            mape: LSTM_MODEL_QUALITY_METRICS.mape.value,
          },
          calculated_model_metrics: metrics,
          tolerance_checks: toleranceChecks,
        },
        null,
        2,
      ),
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
