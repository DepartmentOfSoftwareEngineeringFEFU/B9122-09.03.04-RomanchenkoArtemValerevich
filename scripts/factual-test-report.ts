import { mkdir, readFile, writeFile } from "fs/promises"
import path from "path"
import bcrypt from "bcryptjs"
import { LSTM_MODEL_METADATA } from "../lib/lstm-contract"
import type { Candle } from "../lib/server/indicators"

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
  lastClose: number
  predictedLogReturn: number
  predictedClose: number
  actualNextClose: number | null
  previousEma12: number
  previousEma26: number
  ema12: number
  ema26: number
  decisionType: string
  reason: string
  noOperationReason: string | null
  stopLossPrice: number | null
  takeProfitPrice: number | null
  forecastId: number
  decisionId: number | null
}

type OperationExample = {
  id: number
  ts: string
  side: string
  order_type: string
  price: number
  amount: number
  status: string
  fee: number
  trade_result: number | null
  reason: string
}

type ClosedTrade = {
  entryTs: Date
  exitTs: Date
  entryPrice: number
  exitPrice: number
  amount: number
  fees: number
  result: number
  exitReason: string
}

const DAY_MS = 24 * 60 * 60 * 1000
const REPORT_RUN_SOURCE = "factual-backtest-2025-02-01_2026-01-31"
const REPORT_MODEL_NAME = "LSTM BTC-USDT factual backtest"
const REPORT_USER_LOGIN = "factual_report"
const REPORT_USER_EMAIL = "factual-report@algotrade.local"

const config = {
  symbol: process.env.BACKTEST_SYMBOL || "BTC-USDT",
  timeframe: "1D",
  okxBar: "1Dutc",
  timezone: "UTC",
  periodStart: new Date(Date.UTC(2025, 1, 1)),
  periodEnd: new Date(Date.UTC(2026, 0, 31)),
  warmupDays: Number(process.env.BACKTEST_WARMUP_DAYS || 90),
  initialBalance: Number(process.env.BACKTEST_INITIAL_BALANCE || 10_000),
  commissionRate: Number(process.env.BACKTEST_COMMISSION_RATE || process.env.TRADE_FEE_RATE || 0),
  outputDir: process.env.BACKTEST_OUTPUT_DIR || "reports",
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
    // The script can also run with environment variables supplied by the shell.
  }
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function round(value: number, digits = 8) {
  if (!Number.isFinite(value)) return value
  return Number(value.toFixed(digits))
}

function iso(date: Date) {
  return date.toISOString()
}

function assertFiniteConfig() {
  const numeric = [
    ["initial balance", config.initialBalance],
    ["commission rate", config.commissionRate],
    ["warmup days", config.warmupDays],
  ] as const

  for (const [label, value] of numeric) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Invalid ${label}: ${value}`)
    }
  }
}

async function okxPublicGet<T>(pathName: string, params: URLSearchParams) {
  const baseUrl = process.env.OKX_BASE_URL || "https://www.okx.com"
  const timeoutMs = Number(process.env.OKX_TIMEOUT_MS || 10000)
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

    const parsedRows = envelope.data
      .map((row) => {
        const ts = new Date(Number(row[0]))
        return {
          ts,
          open: Number(row[1]),
          high: Number(row[2]),
          low: Number(row[3]),
          close: Number(row[4]),
          volume: Number(row[5]),
        }
      })
      .filter((row) => {
        return (
          Number.isFinite(row.ts.getTime()) &&
          row.ts >= input.from &&
          row.ts <= input.through &&
          [row.open, row.high, row.low, row.close, row.volume].every(Number.isFinite)
        )
      })

    for (const row of parsedRows) {
      rowsByTs.set(row.ts.getTime(), row)
    }

    const pageTimestamps = envelope.data
      .map((row) => Number(row[0]))
      .filter((value) => Number.isFinite(value))

    if (pageTimestamps.length === 0) break

    const oldestTs = Math.min(...pageTimestamps)
    if (oldestTs <= input.from.getTime()) break

    cursor = oldestTs
    await sleep(120)
  }

  return [...rowsByTs.values()].sort((left, right) => left.ts.getTime() - right.ts.getTime())
}

function inPeriod(candle: MarketCandle) {
  return candle.ts >= config.periodStart && candle.ts <= config.periodEnd
}

function candleToDbRow(cryptoId: number, candle: MarketCandle) {
  return {
    cryptoId,
    ts: candle.ts,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
    source: "OKX",
    timeframe: config.timeframe,
    sourceBar: config.okxBar,
    timezone: config.timezone,
  }
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
    if (peak > 0) {
      maxDrawdown = Math.max(maxDrawdown, (peak - equity) / peak)
    }
  }

  return maxDrawdown * 100
}

function csvEscape(value: unknown) {
  if (value == null) return ""
  const text = String(value)
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, "\"\"")}"`
  return text
}

function toCsv(rows: Record<string, unknown>[], fallbackHeaders: string[] = []) {
  const headers = rows.length > 0 ? Object.keys(rows[0]) : fallbackHeaders
  if (headers.length === 0) return ""
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\n")
}

function decisionTypeCounts(points: ForecastPoint[]) {
  return points.reduce<Record<string, number>>((counts, point) => {
    counts[point.decisionType] = (counts[point.decisionType] || 0) + 1
    return counts
  }, {})
}

function conditionCounts(points: ForecastPoint[], noiseThreshold: number) {
  return points.reduce(
    (counts, point) => {
      const positiveForecast = point.predictedLogReturn > noiseThreshold
      const negativeForecast = point.predictedLogReturn < -noiseThreshold
      const ema12AboveEma26 = point.ema12 > point.ema26
      const ema12BelowEma26 = point.ema12 < point.ema26
      const bullishCross = point.previousEma12 <= point.previousEma26 && ema12AboveEma26
      const bearishCross = point.previousEma12 >= point.previousEma26 && ema12BelowEma26

      counts.days += 1
      if (positiveForecast) counts.positive_forecast_days += 1
      if (negativeForecast) counts.negative_forecast_days += 1
      if (ema12AboveEma26) counts.ema12_above_ema26_days += 1
      if (ema12BelowEma26) counts.ema12_below_ema26_days += 1
      if (bullishCross) counts.bullish_cross_days += 1
      if (bearishCross) counts.bearish_cross_days += 1
      if (positiveForecast && ema12AboveEma26) counts.positive_forecast_and_ema12_above_ema26_days += 1
      if (positiveForecast && bullishCross) counts.positive_forecast_and_bullish_cross_days += 1

      return counts
    },
    {
      days: 0,
      positive_forecast_days: 0,
      negative_forecast_days: 0,
      ema12_above_ema26_days: 0,
      ema12_below_ema26_days: 0,
      bullish_cross_days: 0,
      bearish_cross_days: 0,
      positive_forecast_and_ema12_above_ema26_days: 0,
      positive_forecast_and_bullish_cross_days: 0,
    },
  )
}

async function main() {
  await loadDotEnv()
  assertFiniteConfig()

  const { PrismaClient } = await import("@prisma/client")
  const {
    inverseTransformScaledOutput,
    loadPreprocessor,
    prepareLstmTensor,
    validateStrategySettingsContract,
  } = await import("../lib/server/lstm")
  const ort = await import("onnxruntime-node")

  const prisma = new PrismaClient()

  try {
    const user = await prisma.user.upsert({
      where: { login: REPORT_USER_LOGIN },
      update: {},
      create: {
        login: REPORT_USER_LOGIN,
        email: REPORT_USER_EMAIL,
        passwordHash: await bcrypt.hash("factual-report-user", 12),
      },
    })

    const crypto = await prisma.cryptocurrency.upsert({
      where: { slug: "btc-usdt" },
      update: { ticker: config.symbol, assetType: "spot" },
      create: { ticker: config.symbol, slug: "btc-usdt", assetType: "spot" },
    })

    const model = await prisma.forecastModel.upsert({
      where: { name: REPORT_MODEL_NAME },
      update: { version: "v1", metadataJson: { ...LSTM_MODEL_METADATA, report_run_source: REPORT_RUN_SOURCE } },
      create: {
        name: REPORT_MODEL_NAME,
        version: "v1",
        metadataJson: { ...LSTM_MODEL_METADATA, report_run_source: REPORT_RUN_SOURCE },
      },
    })

    let strategy = await prisma.strategySetting.findFirst({
      where: { userId: user.id, cryptoId: crypto.id },
      orderBy: { id: "asc" },
    })

    if (!strategy) {
      strategy = await prisma.strategySetting.create({
        data: {
          userId: user.id,
          cryptoId: crypto.id,
          windowSize: 30,
          horizon: 1,
          timeframe: config.timeframe,
          noiseThreshold: 0.002,
          stopLossPct: 0.02,
          takeProfitPct: 0.04,
          maxOperationAmount: 1000,
          isActive: true,
        },
      })
    }

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
    if (periodCandles.length === 0) {
      throw new Error("No period candles were loaded from OKX")
    }

    const allDbRows = candles.map((candle) => candleToDbRow(crypto.id, candle))
    for (const row of allDbRows) {
      await prisma.marketData.upsert({
        where: {
          cryptoId_timeframe_source_sourceBar_ts: {
            cryptoId: row.cryptoId,
            timeframe: row.timeframe,
            source: row.source,
            sourceBar: row.sourceBar,
            ts: row.ts,
          },
        },
        create: row,
        update: {
          open: row.open,
          high: row.high,
          low: row.low,
          close: row.close,
          volume: row.volume,
          timezone: row.timezone,
        },
      })
    }

    await prisma.tradeOperation.deleteMany({
      where: {
        userId: user.id,
        cryptoId: crypto.id,
        decision: { runSource: REPORT_RUN_SOURCE },
      },
    })
    await prisma.tradeDecision.deleteMany({
      where: {
        userId: user.id,
        cryptoId: crypto.id,
        runSource: REPORT_RUN_SOURCE,
      },
    })
    await prisma.forecast.deleteMany({
      where: {
        modelId: model.id,
        cryptoId: crypto.id,
        runSource: REPORT_RUN_SOURCE,
      },
    })

    const modelPath = path.resolve(process.cwd(), process.env.LSTM_MODEL_PATH || "models/lstm-btc-usdt.onnx")
    const session = await ort.InferenceSession.create(modelPath)
    const inputName = session.inputNames[0]
    const outputName = session.outputNames[0]
    const candleByTs = new Map(candles.map((candle) => [candle.ts.getTime(), candle]))
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
      const forecast = await prisma.forecast.create({
        data: {
          modelId: model.id,
          cryptoId: crypto.id,
          ts: candle.ts,
          lastClose: prepared.lastClose,
          predictedLogReturn: prediction.predictedLogReturn,
          predictedClose: prediction.predictedClose,
          runSource: REPORT_RUN_SOURCE,
        },
      })

      const actualTargetTs = candle.ts.getTime() + preprocessor.horizon * DAY_MS
      const actualNextClose = candleByTs.get(actualTargetTs)?.close ?? null

      forecastPoints.push({
        ts: candle.ts,
        lastClose: prepared.lastClose,
        predictedLogReturn: prediction.predictedLogReturn,
        predictedClose: prediction.predictedClose,
        actualNextClose,
        previousEma12: prepared.previousIndicators.ema_12,
        previousEma26: prepared.previousIndicators.ema_26,
        ema12: prepared.currentIndicators.ema_12,
        ema26: prepared.currentIndicators.ema_26,
        decisionType: "ожидает расчета",
        reason: "",
        noOperationReason: null,
        stopLossPrice: null,
        takeProfitPrice: null,
        forecastId: forecast.id,
        decisionId: null,
      })
    }

    const positionPct = Number(strategy.maxOperationAmount) / config.initialBalance
    let cash = config.initialBalance
    let positionAmount = 0
    let entryCost = 0
    let entryPrice = 0
    let entryTs: Date | null = null
    let entryBuyFee = 0
    let activeStopLoss: number | null = null
    let activeTakeProfit: number | null = null
    let totalFees = 0
    const equityCurve: number[] = []
    const dailyReturns: number[] = []
    const closedTrades: ClosedTrade[] = []
    const operationExamples: OperationExample[] = []
    let createdOperationsCount = 0
    let previousEquity = config.initialBalance

    async function createOperation(input: {
      point: ForecastPoint
      side: "покупка" | "продажа"
      orderType: string
      price: number
      amount: number
      status: string
      fee: number
      tradeResult: number | null
      reason: string
      stopLossPrice?: number | null
      takeProfitPrice?: number | null
    }) {
      if (input.point.decisionId == null) {
        throw new Error(`Trade operation cannot be created before decision for ${iso(input.point.ts)}`)
      }

      const operation = await prisma.tradeOperation.create({
        data: {
          userId: user.id,
          cryptoId: crypto.id,
          decisionId: input.point.decisionId,
          ts: input.point.ts,
          orderType: input.orderType,
          side: input.side,
          price: input.price,
          amount: input.amount,
          stopLossPrice: input.stopLossPrice ?? null,
          takeProfitPrice: input.takeProfitPrice ?? null,
          status: input.status,
          okxOrderId: `backtest-${input.side === "покупка" ? "buy" : "sell"}-${formatDate(input.point.ts)}`,
          okxResponseJson: {
            source: "historical_backtest",
            run_source: REPORT_RUN_SOURCE,
            commission_rate: config.commissionRate,
            fee: input.fee,
            trade_result: input.tradeResult,
            reason: input.reason,
          },
        },
      })
      createdOperationsCount += 1

      if (operationExamples.length < 10) {
        operationExamples.push({
          id: operation.id,
          ts: iso(input.point.ts),
          side: input.side,
          order_type: input.orderType,
          price: round(input.price, 2),
          amount: round(input.amount, 8),
          status: input.status,
          fee: round(input.fee, 8),
          trade_result: input.tradeResult == null ? null : round(input.tradeResult, 8),
          reason: input.reason,
        })
      }

      return operation
    }

    const noiseThreshold = Number(strategy.noiseThreshold)
    const stopLossPct = Number(strategy.stopLossPct)
    const takeProfitPct = Number(strategy.takeProfitPct)

    for (const point of forecastPoints) {
      const candle = candleByTs.get(point.ts.getTime())
      if (!candle) continue

      const positiveForecast = point.predictedLogReturn > noiseThreshold
      const negativeForecast = point.predictedLogReturn < -noiseThreshold
      const ema12AboveEma26 = point.ema12 > point.ema26
      const ema12BelowEma26 = point.ema12 < point.ema26
      const hasOpenPosition = positionAmount > 0

      let decisionType = "удержание"
      let reason = ""
      let noOperationReason: string | null = null
      let exitPrice: number | null = null
      let exitReason: string | null = null
      let orderType: string | null = null

      if (hasOpenPosition && activeStopLoss != null && activeTakeProfit != null) {
        if (candle.low <= activeStopLoss) {
          decisionType = "продажа"
          reason = "Сработал стоп-лосс"
          exitPrice = activeStopLoss
          exitReason = "stop_loss"
          orderType = "стоп-лосс"
        } else if (candle.high >= activeTakeProfit) {
          decisionType = "продажа"
          reason = "Сработал тейк-профит"
          exitPrice = activeTakeProfit
          exitReason = "take_profit"
          orderType = "тейк-профит"
        } else if (negativeForecast) {
          decisionType = "продажа"
          reason = "Есть открытая позиция и predicted_log_return < -noise_threshold"
          exitPrice = candle.close
          exitReason = "negative_forecast"
          orderType = "рыночный"
        } else if (ema12BelowEma26) {
          decisionType = "продажа"
          reason = "Есть открытая позиция и EMA12 < EMA26"
          exitPrice = candle.close
          exitReason = "ema_bearish_state"
          orderType = "рыночный"
        } else {
          reason = "Есть открытая позиция, условий выхода нет"
          noOperationReason = "Позиция удерживается"
        }
      }

      if (!hasOpenPosition && positiveForecast && ema12AboveEma26) {
        decisionType = "покупка"
        reason = "predicted_log_return > noise_threshold и EMA12 > EMA26, открытой позиции нет"
      } else if (!hasOpenPosition && decisionType === "удержание") {
        if (positiveForecast && !ema12AboveEma26) {
          reason = "predicted_log_return > noise_threshold, но EMA12 <= EMA26"
        } else if (negativeForecast) {
          reason = "Негативный прогноз, но открытой позиции нет"
        } else {
          reason = "|predicted_log_return| <= noise_threshold или условия входа не выполнены"
        }
        noOperationReason = "Нет сигнала входа"
      }

      point.decisionType = decisionType
      point.reason = reason
      point.noOperationReason = noOperationReason

      const isAction = decisionType === "покупка" || decisionType === "продажа"
      const decision = await prisma.tradeDecision.create({
        data: {
          userId: user.id,
          cryptoId: crypto.id,
          forecastId: point.forecastId,
          strategySettingsId: strategy.id,
          ts: point.ts,
          decisionType,
          reason,
          riskCheckStatus: isAction ? "разрешено" : "не требуется",
          noOperationReason,
          predictedLogReturn: point.predictedLogReturn,
          predictedClose: point.predictedClose,
          runSource: REPORT_RUN_SOURCE,
        },
      })
      point.decisionId = decision.id

      if (decisionType === "продажа" && exitPrice != null && exitReason && orderType && entryTs) {
        const grossProceeds = positionAmount * exitPrice
        const sellFee = grossProceeds * config.commissionRate
        const netProceeds = grossProceeds - sellFee
        const result = netProceeds - entryCost
        cash += netProceeds
        totalFees += sellFee

        closedTrades.push({
          entryTs,
          exitTs: point.ts,
          entryPrice,
          exitPrice,
          amount: positionAmount,
          fees: entryBuyFee + sellFee,
          result,
          exitReason,
        })

        await createOperation({
          point,
          side: "продажа",
          orderType,
          price: exitPrice,
          amount: positionAmount,
          status: "исполнена",
          fee: sellFee,
          tradeResult: result,
          reason: exitReason,
        })

        positionAmount = 0
        entryCost = 0
        entryPrice = 0
        entryTs = null
        entryBuyFee = 0
        activeStopLoss = null
        activeTakeProfit = null
      } else if (decisionType === "покупка") {
        const allocation = cash * positionPct
        const grossNotional = allocation / (1 + config.commissionRate)
        const buyFee = grossNotional * config.commissionRate
        const amount = grossNotional / candle.close
        const stopLossPrice = candle.close * (1 - stopLossPct)
        const takeProfitPrice = candle.close * (1 + takeProfitPct)

        cash -= grossNotional + buyFee
        totalFees += buyFee
        positionAmount = amount
        entryCost = grossNotional + buyFee
        entryPrice = candle.close
        entryTs = point.ts
        entryBuyFee = buyFee
        activeStopLoss = stopLossPrice
        activeTakeProfit = takeProfitPrice
        point.stopLossPrice = stopLossPrice
        point.takeProfitPrice = takeProfitPrice

        await createOperation({
          point,
          side: "покупка",
          orderType: "рыночный",
          price: candle.close,
          amount,
          status: "исполнена",
          fee: buyFee,
          tradeResult: null,
          reason: "buy_signal",
          stopLossPrice,
          takeProfitPrice,
        })
      }

      const equity = cash + positionAmount * candle.close
      equityCurve.push(equity)
      dailyReturns.push(previousEquity > 0 ? equity / previousEquity - 1 : 0)
      previousEquity = equity
    }

    const finalPeriodCandle = periodCandles[periodCandles.length - 1]
    const finalBalance = cash + positionAmount * finalPeriodCandle.close
    const metricPairs = forecastPoints.filter((point) => point.actualNextClose != null)
    const predictionErrors = metricPairs.map((point) => point.predictedClose - Number(point.actualNextClose))
    const absErrors = predictionErrors.map(Math.abs)
    const pctErrors = metricPairs.map((point) => Math.abs((point.predictedClose - Number(point.actualNextClose)) / Number(point.actualNextClose)) * 100)
    const returnStd = standardDeviation(dailyReturns)
    const sharpeRatio = returnStd === 0 ? 0 : (mean(dailyReturns) / returnStd) * Math.sqrt(365)
    const winningTrades = closedTrades.filter((trade) => trade.result > 0).length
    const decisionCounts = decisionTypeCounts(forecastPoints)
    const signalConditionCounts = conditionCounts(forecastPoints, noiseThreshold)

    const summary = {
      period_start: formatDate(config.periodStart),
      period_end: formatDate(config.periodEnd),
      candles_count: periodCandles.length,
      predictions_count: forecastPoints.length,
      decisions_count: forecastPoints.length,
      trades_count: closedTrades.length,
      initial_balance: round(config.initialBalance, 2),
      final_balance: round(finalBalance, 2),
      total_return_pct: round((finalBalance / config.initialBalance - 1) * 100, 6),
      sharpe_ratio: round(sharpeRatio, 6),
      max_drawdown_pct: round(maxDrawdownPct(equityCurve), 6),
      win_rate_pct: closedTrades.length === 0 ? 0 : round((winningTrades / closedTrades.length) * 100, 6),
      total_fees: round(totalFees, 8),
      avg_trade_result: closedTrades.length === 0 ? 0 : round(mean(closedTrades.map((trade) => trade.result)), 8),
      model_rmse: round(Math.sqrt(mean(predictionErrors.map((error) => error ** 2))), 8),
      model_mae: round(mean(absErrors), 8),
      model_mape: round(mean(pctErrors), 8),
    }

    const outputDir = path.resolve(process.cwd(), config.outputDir)
    await mkdir(outputDir, { recursive: true })

    const actionDecisionExamples = forecastPoints.filter((point) => point.decisionType !== "удержание")
    const selectedDecisionPoints = [
      ...forecastPoints.slice(0, Math.max(0, 10 - actionDecisionExamples.length)),
      ...actionDecisionExamples.slice(0, 10),
    ]
      .sort((left, right) => left.ts.getTime() - right.ts.getTime())
      .slice(0, 10)

    const decisionExamples = selectedDecisionPoints.map((point) => ({
      ts: iso(point.ts),
      decision_type: point.decisionType,
      reason: point.reason,
      predicted_log_return: round(point.predictedLogReturn, 12),
      predicted_close: round(point.predictedClose, 2),
      last_close: round(point.lastClose, 2),
      actual_next_close: point.actualNextClose == null ? null : round(point.actualNextClose, 2),
    }))

    const report = {
      ...summary,
      metadata: {
        run_source: REPORT_RUN_SOURCE,
        generated_at: new Date().toISOString(),
        symbol: config.symbol,
        timeframe: config.timeframe,
        source: "OKX API /api/v5/market/history-candles",
        source_bar: config.okxBar,
        timezone: config.timezone,
        execution_price_rule: "current module price: signal candle close; stop-loss/take-profit by daily low/high, conservative stop-first",
        decision_rule: {
          buy: "predicted_log_return > noise_threshold AND EMA12 > EMA26 AND no open position",
          sell: "open position AND (predicted_log_return < -noise_threshold OR EMA12 < EMA26 OR stop-loss OR take-profit)",
        },
        initial_balance: config.initialBalance,
        position_pct: round(positionPct, 8),
        commission_rate: config.commissionRate,
        fee_config_source: config.commissionRate === 0 ? "No fee setting found in app config; BACKTEST_COMMISSION_RATE/TRADE_FEE_RATE not set, defaulted to 0" : "BACKTEST_COMMISSION_RATE or TRADE_FEE_RATE",
        strategy_settings: {
          window_size: strategy.windowSize,
          horizon: strategy.horizon,
          noise_threshold: Number(strategy.noiseThreshold),
          stop_loss_pct: Number(strategy.stopLossPct),
          take_profit_pct: Number(strategy.takeProfitPct),
          max_operation_amount: Number(strategy.maxOperationAmount),
        },
        fetched_candles_count: candles.length,
        model_metrics_count: metricPairs.length,
        decision_type_counts: decisionCounts,
        signal_condition_counts: signalConditionCounts,
        operations_count: createdOperationsCount,
        operations_note: createdOperationsCount === 0
          ? "No trade operations were generated because the strategy produced no buy entries in the tested period."
          : null,
        open_position_amount: round(positionAmount, 8),
      },
      decision_examples: decisionExamples,
      operation_examples: operationExamples,
    }

    const baseName = "factual-btc-usdt-2025-02-01_2026-01-31"
    await writeFile(path.join(outputDir, `${baseName}.json`), `${JSON.stringify(report, null, 2)}\n`, "utf8")
    await writeFile(path.join(outputDir, `${baseName}-summary.csv`), `${toCsv([summary])}\n`, "utf8")
    await writeFile(path.join(outputDir, `${baseName}-decision-examples.csv`), `${toCsv(decisionExamples)}\n`, "utf8")
    await writeFile(path.join(outputDir, `${baseName}-operation-examples.csv`), `${toCsv(operationExamples, [
      "id",
      "ts",
      "side",
      "order_type",
      "price",
      "amount",
      "status",
      "fee",
      "trade_result",
      "reason",
    ])}\n`, "utf8")

    console.log(JSON.stringify({
      summary,
      output_dir: outputDir,
      json: path.join(outputDir, `${baseName}.json`),
      csv: path.join(outputDir, `${baseName}-summary.csv`),
      decision_examples_csv: path.join(outputDir, `${baseName}-decision-examples.csv`),
      operation_examples_csv: path.join(outputDir, `${baseName}-operation-examples.csv`),
    }, null, 2))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
