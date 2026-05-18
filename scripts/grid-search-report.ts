import { mkdir, readFile, writeFile } from "fs/promises"
import path from "path"
import { buildLstmFeatureRows, type LstmFeatureRow } from "../lib/server/lstm"
import type { Candle } from "../lib/server/indicators"

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
}

type BuyRule =
  | "forecast_and_ema_state"
  | "forecast_only"
  | "predicted_close_and_ema_state"

type SellRule =
  | "negative_forecast"
  | "negative_forecast_or_ema_bearish"
  | "negative_forecast_or_ema_bearish_or_risk_or_max_hold"

type GridConfig = {
  configName: string
  noiseThreshold: number
  buyRule: BuyRule
  sellRule: SellRule
  stopLossPct: number
  takeProfitPct: number
  maxHoldingDays: number
}

type ClosedTrade = {
  result: number
}

type DetailedDecision = {
  ts: string
  decision_type: string
  reason: string
  predicted_log_return: number
  predicted_close: number
  last_close: number
  close: number
  ema12: number
  ema26: number
}

type DetailedOperation = {
  operation_no: number
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

type GridResult = {
  config_name: string
  noise_threshold: number
  buy_rule: BuyRule
  sell_rule: SellRule
  stop_loss_pct: number
  take_profit_pct: number
  max_holding_days: number
  decisions_count: number
  hold_count: number
  buy_count: number
  sell_count: number
  operations_count: number
  trades_count: number
  initial_balance: number
  final_balance: number
  total_return_pct: number
  sharpe_ratio: number
  max_drawdown_pct: number
  win_rate_pct: number
  total_fees: number
  avg_trade_result: number
  model_rmse: number
  model_mae: number
  model_mape: number
  open_position_amount: number
}

const DAY_MS = 24 * 60 * 60 * 1000
const REPORT_RUN_SOURCE = "factual-backtest-2025-02-01_2026-01-31"

const config = {
  periodStart: new Date(Date.UTC(2025, 1, 1)),
  periodEnd: new Date(Date.UTC(2026, 0, 31)),
  symbol: "BTC-USDT",
  timeframe: "1D",
  source: "OKX",
  sourceBar: "1Dutc",
  timezone: "UTC",
  initialBalance: Number(process.env.BACKTEST_INITIAL_BALANCE || 10_000),
  commissionRate: Number(process.env.BACKTEST_COMMISSION_RATE || process.env.TRADE_FEE_RATE || 0),
  outputDir: process.env.BACKTEST_OUTPUT_DIR || "reports",
}

const noiseThresholds = [0.00025, 0.0005, 0.00075, 0.001, 0.002]
const buyRules: BuyRule[] = [
  "forecast_and_ema_state",
  "forecast_only",
  "predicted_close_and_ema_state",
]
const sellRules: SellRule[] = [
  "negative_forecast",
  "negative_forecast_or_ema_bearish",
  "negative_forecast_or_ema_bearish_or_risk_or_max_hold",
]
const stopLossPcts = [0.02, 0.03, 0.05]
const takeProfitPcts = [0.04, 0.06, 0.08]
const maxHoldingDays = [10, 20, 30]

const buyRuleDescriptions: Record<BuyRule, string> = {
  forecast_and_ema_state:
    "predicted_log_return > noise_threshold AND EMA12 > EMA26 AND no open position",
  forecast_only:
    "predicted_log_return > noise_threshold AND no open position",
  predicted_close_and_ema_state:
    "predicted_close > last_close * (1 + noise_threshold) AND EMA12 > EMA26 AND no open position",
}

const sellRuleDescriptions: Record<SellRule, string> = {
  negative_forecast:
    "open position AND predicted_log_return < -noise_threshold",
  negative_forecast_or_ema_bearish:
    "open position AND (predicted_log_return < -noise_threshold OR EMA12 < EMA26)",
  negative_forecast_or_ema_bearish_or_risk_or_max_hold:
    "open position AND (predicted_log_return < -noise_threshold OR EMA12 < EMA26 OR stop-loss OR take-profit OR max holding period)",
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
    // Environment variables may also be supplied by the shell.
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

function configName(input: Omit<GridConfig, "configName">) {
  return [
    `nt${input.noiseThreshold}`,
    `buy_${input.buyRule}`,
    `sell_${input.sellRule}`,
    `sl${input.stopLossPct}`,
    `tp${input.takeProfitPct}`,
    `hold${input.maxHoldingDays}`,
  ].join("__")
}

function buildGridConfigs() {
  const configs: GridConfig[] = []

  for (const noiseThreshold of noiseThresholds) {
    for (const buyRule of buyRules) {
      for (const sellRule of sellRules) {
        for (const stopLossPct of stopLossPcts) {
          for (const takeProfitPct of takeProfitPcts) {
            for (const maxHolding of maxHoldingDays) {
              const item = {
                noiseThreshold,
                buyRule,
                sellRule,
                stopLossPct,
                takeProfitPct,
                maxHoldingDays: maxHolding,
              }
              configs.push({ ...item, configName: configName(item) })
            }
          }
        }
      }
    }
  }

  return configs
}

function shouldBuy(point: ForecastPoint, gridConfig: GridConfig) {
  if (gridConfig.buyRule === "forecast_and_ema_state") {
    return point.predictedLogReturn > gridConfig.noiseThreshold && point.ema12 > point.ema26
  }

  if (gridConfig.buyRule === "forecast_only") {
    return point.predictedLogReturn > gridConfig.noiseThreshold
  }

  return point.predictedClose > point.lastClose * (1 + gridConfig.noiseThreshold) && point.ema12 > point.ema26
}

function sellSignal(input: {
  point: ForecastPoint
  gridConfig: GridConfig
  entryTs: Date
  activeStopLoss: number
  activeTakeProfit: number
}) {
  const negativeForecast = input.point.predictedLogReturn < -input.gridConfig.noiseThreshold
  const emaBearish = input.point.ema12 < input.point.ema26

  if (input.gridConfig.sellRule === "negative_forecast") {
    return negativeForecast ? { price: input.point.close, reason: "negative_forecast" } : null
  }

  if (input.gridConfig.sellRule === "negative_forecast_or_ema_bearish") {
    if (negativeForecast) return { price: input.point.close, reason: "negative_forecast" }
    if (emaBearish) return { price: input.point.close, reason: "ema_bearish_state" }
    return null
  }

  if (input.point.low <= input.activeStopLoss) {
    return { price: input.activeStopLoss, reason: "stop_loss" }
  }

  if (input.point.high >= input.activeTakeProfit) {
    return { price: input.activeTakeProfit, reason: "take_profit" }
  }

  if (negativeForecast) return { price: input.point.close, reason: "negative_forecast" }
  if (emaBearish) return { price: input.point.close, reason: "ema_bearish_state" }

  const heldDays = Math.floor((input.point.ts.getTime() - input.entryTs.getTime()) / DAY_MS)
  if (heldDays >= input.gridConfig.maxHoldingDays) {
    return { price: input.point.close, reason: "max_holding_period" }
  }

  return null
}

function simulateConfig(input: {
  gridConfig: GridConfig
  points: ForecastPoint[]
  positionPct: number
  modelMetrics: Pick<GridResult, "model_rmse" | "model_mae" | "model_mape">
}): GridResult {
  let cash = config.initialBalance
  let positionAmount = 0
  let entryCost = 0
  let entryTs: Date | null = null
  let activeStopLoss = 0
  let activeTakeProfit = 0
  let totalFees = 0
  let holdCount = 0
  let buyCount = 0
  let sellCount = 0
  let operationsCount = 0
  const equityCurve: number[] = []
  const dailyReturns: number[] = []
  const closedTrades: ClosedTrade[] = []
  let previousEquity = config.initialBalance

  for (const point of input.points) {
    let acted = false

    if (positionAmount > 0 && entryTs) {
      const signal = sellSignal({
        point,
        gridConfig: input.gridConfig,
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

        positionAmount = 0
        entryCost = 0
        entryTs = null
        activeStopLoss = 0
        activeTakeProfit = 0
        sellCount += 1
        operationsCount += 1
        acted = true
      }
    }

    if (!acted && positionAmount === 0 && shouldBuy(point, input.gridConfig)) {
      const allocation = cash * input.positionPct
      const grossNotional = allocation / (1 + config.commissionRate)
      const buyFee = grossNotional * config.commissionRate

      positionAmount = grossNotional / point.close
      entryCost = grossNotional + buyFee
      entryTs = point.ts
      activeStopLoss = point.close * (1 - input.gridConfig.stopLossPct)
      activeTakeProfit = point.close * (1 + input.gridConfig.takeProfitPct)
      cash -= grossNotional + buyFee
      totalFees += buyFee
      buyCount += 1
      operationsCount += 1
      acted = true
    }

    if (!acted) holdCount += 1

    const equity = cash + positionAmount * point.close
    equityCurve.push(equity)
    dailyReturns.push(previousEquity > 0 ? equity / previousEquity - 1 : 0)
    previousEquity = equity
  }

  const finalPoint = input.points[input.points.length - 1]
  const finalBalance = cash + positionAmount * finalPoint.close
  const returnStd = standardDeviation(dailyReturns)
  const winningTrades = closedTrades.filter((trade) => trade.result > 0).length

  return {
    config_name: input.gridConfig.configName,
    noise_threshold: input.gridConfig.noiseThreshold,
    buy_rule: input.gridConfig.buyRule,
    sell_rule: input.gridConfig.sellRule,
    stop_loss_pct: input.gridConfig.stopLossPct,
    take_profit_pct: input.gridConfig.takeProfitPct,
    max_holding_days: input.gridConfig.maxHoldingDays,
    decisions_count: input.points.length,
    hold_count: holdCount,
    buy_count: buyCount,
    sell_count: sellCount,
    operations_count: operationsCount,
    trades_count: closedTrades.length,
    initial_balance: round(config.initialBalance, 2),
    final_balance: round(finalBalance, 2),
    total_return_pct: round((finalBalance / config.initialBalance - 1) * 100, 6),
    sharpe_ratio: round(returnStd === 0 ? 0 : (mean(dailyReturns) / returnStd) * Math.sqrt(365), 6),
    max_drawdown_pct: round(maxDrawdownPct(equityCurve), 6),
    win_rate_pct: closedTrades.length === 0 ? 0 : round((winningTrades / closedTrades.length) * 100, 6),
    total_fees: round(totalFees, 8),
    avg_trade_result: closedTrades.length === 0 ? 0 : round(mean(closedTrades.map((trade) => trade.result)), 8),
    model_rmse: input.modelMetrics.model_rmse,
    model_mae: input.modelMetrics.model_mae,
    model_mape: input.modelMetrics.model_mape,
    open_position_amount: round(positionAmount, 8),
  }
}

function simulateConfigDetailed(input: {
  gridConfig: GridConfig
  points: ForecastPoint[]
  positionPct: number
}) {
  let cash = config.initialBalance
  let positionAmount = 0
  let entryCost = 0
  let entryTs: Date | null = null
  let activeStopLoss = 0
  let activeTakeProfit = 0
  let operationNo = 0
  const decisions: DetailedDecision[] = []
  const operations: DetailedOperation[] = []

  for (const point of input.points) {
    let decisionType = "удержание"
    let reason = "Условия входа/выхода не выполнены"

    if (positionAmount > 0 && entryTs) {
      const signal = sellSignal({
        point,
        gridConfig: input.gridConfig,
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
        decisionType = "продажа"
        reason = sellRuleReason(signal.reason)
        operationNo += 1
        operations.push({
          operation_no: operationNo,
          ts: point.ts.toISOString(),
          side: "продажа",
          order_type: sellOrderType(signal.reason),
          price: round(signal.price, 2),
          amount: round(positionAmount, 8),
          status: "исполнена",
          fee: round(sellFee, 8),
          trade_result: round(result, 8),
          reason: signal.reason,
        })

        positionAmount = 0
        entryCost = 0
        entryTs = null
        activeStopLoss = 0
        activeTakeProfit = 0
      } else {
        reason = "Позиция открыта, условия выхода не выполнены"
      }
    }

    if (positionAmount === 0 && decisionType !== "продажа" && shouldBuy(point, input.gridConfig)) {
      const allocation = cash * input.positionPct
      const grossNotional = allocation / (1 + config.commissionRate)
      const buyFee = grossNotional * config.commissionRate

      positionAmount = grossNotional / point.close
      entryCost = grossNotional + buyFee
      entryTs = point.ts
      activeStopLoss = point.close * (1 - input.gridConfig.stopLossPct)
      activeTakeProfit = point.close * (1 + input.gridConfig.takeProfitPct)
      cash -= grossNotional + buyFee
      decisionType = "покупка"
      reason = buyRuleDescriptions[input.gridConfig.buyRule]
      operationNo += 1
      operations.push({
        operation_no: operationNo,
        ts: point.ts.toISOString(),
        side: "покупка",
        order_type: "рыночный",
        price: round(point.close, 2),
        amount: round(positionAmount, 8),
        status: "исполнена",
        fee: round(buyFee, 8),
        trade_result: null,
        reason: "buy_signal",
      })
    }

    decisions.push({
      ts: point.ts.toISOString(),
      decision_type: decisionType,
      reason,
      predicted_log_return: round(point.predictedLogReturn, 12),
      predicted_close: round(point.predictedClose, 2),
      last_close: round(point.lastClose, 2),
      close: round(point.close, 2),
      ema12: round(point.ema12, 6),
      ema26: round(point.ema26, 6),
    })
  }

  return { decisions, operations }
}

function sellRuleReason(reason: string) {
  if (reason === "negative_forecast") return "predicted_log_return < -noise_threshold"
  if (reason === "ema_bearish_state") return "EMA12 < EMA26"
  if (reason === "stop_loss") return "Сработал stop-loss"
  if (reason === "take_profit") return "Сработал take-profit"
  if (reason === "max_holding_period") return "Сработал max holding period"
  return reason
}

function sellOrderType(reason: string) {
  if (reason === "stop_loss") return "стоп-лосс"
  if (reason === "take_profit") return "тейк-профит"
  return "рыночный"
}

function selectedDecisionExamples(decisions: DetailedDecision[]) {
  const hold = decisions.filter((row) => row.decision_type === "удержание").slice(0, 4)
  const buy = decisions.filter((row) => row.decision_type === "покупка").slice(0, 4)
  const sell = decisions.filter((row) => row.decision_type === "продажа").slice(0, 4)

  return [...hold, ...buy, ...sell]
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

function strategyPointByTimestamp(rows: LstmFeatureRow[]) {
  return new Map(rows.map((row) => [new Date(row.ts).getTime(), row]))
}

async function main() {
  await loadDotEnv()

  if (!Number.isFinite(config.initialBalance) || config.initialBalance <= 0) {
    throw new Error(`Invalid initial balance: ${config.initialBalance}`)
  }
  if (!Number.isFinite(config.commissionRate) || config.commissionRate < 0) {
    throw new Error(`Invalid commission rate: ${config.commissionRate}`)
  }

  const { PrismaClient } = await import("@prisma/client")
  const prisma = new PrismaClient()

  try {
    const crypto = await prisma.cryptocurrency.findUnique({ where: { slug: "btc-usdt" } })
    if (!crypto) throw new Error("BTC-USDT is not present in DB. Run seed/import first.")

    const strategy = await prisma.strategySetting.findFirst({
      where: { cryptoId: crypto.id, user: { login: "factual_report" } },
      orderBy: { id: "asc" },
    })
    if (!strategy) throw new Error("factual_report strategy_settings not found. Run factual report first.")

    const candles = await prisma.marketData.findMany({
      where: {
        cryptoId: crypto.id,
        timeframe: config.timeframe,
        source: config.source,
        sourceBar: config.sourceBar,
        timezone: config.timezone,
        ts: { lte: new Date(config.periodEnd.getTime() + DAY_MS) },
      },
      orderBy: { ts: "asc" },
    })
    const marketCandles: MarketCandle[] = candles.map((row) => ({
      ts: row.ts,
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      volume: Number(row.volume),
    }))

    const featureByTs = strategyPointByTimestamp(buildLstmFeatureRows(marketCandles))
    const candleByTs = new Map(marketCandles.map((row) => [row.ts.getTime(), row]))
    const forecasts = await prisma.forecast.findMany({
      where: {
        cryptoId: crypto.id,
        runSource: REPORT_RUN_SOURCE,
        ts: { gte: config.periodStart, lte: config.periodEnd },
      },
      orderBy: { ts: "asc" },
    })

    if (forecasts.length === 0) {
      throw new Error(`No DB forecasts found for runSource=${REPORT_RUN_SOURCE}`)
    }

    const points: ForecastPoint[] = forecasts.map((forecast) => {
      const candle = candleByTs.get(forecast.ts.getTime())
      const feature = featureByTs.get(forecast.ts.getTime())
      const nextCandle = candleByTs.get(forecast.ts.getTime() + DAY_MS)

      if (!candle || !feature) {
        throw new Error(`Missing candle or feature row for ${forecast.ts.toISOString()}`)
      }

      return {
        ts: forecast.ts,
        close: candle.close,
        high: candle.high,
        low: candle.low,
        lastClose: Number(forecast.lastClose),
        predictedLogReturn: Number(forecast.predictedLogReturn),
        predictedClose: Number(forecast.predictedClose),
        actualNextClose: nextCandle?.close ?? null,
        ema12: feature.ema_12,
        ema26: feature.ema_26,
      }
    })

    const metrics = modelMetrics(points)
    const positionPct = Number(strategy.maxOperationAmount) / config.initialBalance
    const gridConfigs = buildGridConfigs()
    const results = gridConfigs.map((gridConfig) =>
      simulateConfig({
        gridConfig,
        points,
        positionPct,
        modelMetrics: metrics,
      }),
    )

    const baseline =
      results.find(
        (row) =>
          row.noise_threshold === 0.002 &&
          row.buy_rule === "forecast_and_ema_state" &&
          row.sell_rule === "negative_forecast_or_ema_bearish_or_risk_or_max_hold" &&
          row.stop_loss_pct === 0.02 &&
          row.take_profit_pct === 0.04 &&
          row.max_holding_days === 10,
      ) ?? null

    const baselineReturnPct = baseline?.total_return_pct ?? -Infinity
    const selectedResult =
      results.find(
        (row) =>
          row.noise_threshold === 0.001 &&
          row.buy_rule === "forecast_only" &&
          row.sell_rule === "negative_forecast_or_ema_bearish_or_risk_or_max_hold" &&
          row.stop_loss_pct === 0.03 &&
          row.take_profit_pct === 0.06 &&
          row.max_holding_days === 20,
      ) ?? null
    const selectedGridConfig = gridConfigs.find((gridConfig) => gridConfig.configName === selectedResult?.config_name)
    if (!selectedResult || !selectedGridConfig) {
      throw new Error("Selected strategy configuration was not found in grid results")
    }

    const candidates = results
      .filter((row) => row.trades_count > 10 && row.total_return_pct >= baselineReturnPct)
      .sort((left, right) => {
        if (right.total_return_pct !== left.total_return_pct) {
          return right.total_return_pct - left.total_return_pct
        }
        if (left.max_drawdown_pct !== right.max_drawdown_pct) {
          return left.max_drawdown_pct - right.max_drawdown_pct
        }
        return right.trades_count - left.trades_count
      })
    const closedCandidates = candidates.filter((row) => row.open_position_amount === 0)
    const topClosedCandidates = closedCandidates.slice(0, 10)
    const topStrictEmaClosedCandidates = closedCandidates
      .filter((row) => row.buy_rule === "forecast_and_ema_state" || row.buy_rule === "predicted_close_and_ema_state")
      .slice(0, 10)
    const topEmaBuyClosedRows = results
      .filter(
        (row) =>
          row.open_position_amount === 0 &&
          (row.buy_rule === "forecast_and_ema_state" || row.buy_rule === "predicted_close_and_ema_state"),
      )
      .sort((left, right) => {
        if (right.total_return_pct !== left.total_return_pct) {
          return right.total_return_pct - left.total_return_pct
        }
        if (left.max_drawdown_pct !== right.max_drawdown_pct) {
          return left.max_drawdown_pct - right.max_drawdown_pct
        }
        return right.trades_count - left.trades_count
      })
      .slice(0, 10)
    const selectedDetails = simulateConfigDetailed({
      gridConfig: selectedGridConfig,
      points,
      positionPct,
    })

    const outputDir = path.resolve(process.cwd(), config.outputDir)
    await mkdir(outputDir, { recursive: true })

    const baseName = "grid-search-btc-usdt-2025-02-01_2026-01-31"
    await writeFile(path.join(outputDir, `${baseName}.csv`), `${toCsv(results)}\n`, "utf8")
    await writeFile(path.join(outputDir, `${baseName}-candidates.csv`), `${toCsv(candidates)}\n`, "utf8")
    await writeFile(path.join(outputDir, `${baseName}-closed-candidates.csv`), `${toCsv(closedCandidates)}\n`, "utf8")
    await writeFile(path.join(outputDir, `${baseName}-selected-row.csv`), `${toCsv([selectedResult])}\n`, "utf8")
    await writeFile(path.join(outputDir, `${baseName}-top10-closed-candidates.csv`), `${toCsv(topClosedCandidates)}\n`, "utf8")
    await writeFile(
      path.join(outputDir, `${baseName}-top10-strict-ema-buy-closed-candidates.csv`),
      `${toCsv(topStrictEmaClosedCandidates, Object.keys(selectedResult))}\n`,
      "utf8",
    )
    await writeFile(path.join(outputDir, `${baseName}-top10-ema-buy-closed-all.csv`), `${toCsv(topEmaBuyClosedRows)}\n`, "utf8")
    await writeFile(path.join(outputDir, `${baseName}-selected-operations.csv`), `${toCsv(selectedDetails.operations)}\n`, "utf8")
    await writeFile(
      path.join(outputDir, `${baseName}-selected-decision-examples.csv`),
      `${toCsv(selectedDecisionExamples(selectedDetails.decisions))}\n`,
      "utf8",
    )
    await writeFile(
      path.join(outputDir, `${baseName}.json`),
      `${JSON.stringify(
        {
          metadata: {
            generated_at: new Date().toISOString(),
            source: "DB market_data + DB forecasts",
            forecast_run_source: REPORT_RUN_SOURCE,
            symbol: config.symbol,
            period_start: formatDate(config.periodStart),
            period_end: formatDate(config.periodEnd),
            timeframe: config.timeframe,
            source_bar: config.sourceBar,
            timezone: config.timezone,
            configs_count: results.length,
            candidates_count: candidates.length,
            closed_candidates_count: closedCandidates.length,
            initial_balance: config.initialBalance,
            position_pct: round(positionPct, 8),
            commission_rate: config.commissionRate,
            fee_config_source:
              config.commissionRate === 0
                ? "No fee setting found in app config; BACKTEST_COMMISSION_RATE/TRADE_FEE_RATE not set, defaulted to 0"
                : "BACKTEST_COMMISSION_RATE or TRADE_FEE_RATE",
            execution_price_rule:
              "signal exits and entries use signal candle close; stop-loss/take-profit use daily low/high with conservative stop-first priority",
            buy_rule_descriptions: buyRuleDescriptions,
            sell_rule_descriptions: sellRuleDescriptions,
            model_metrics: metrics,
            baseline_config: baseline,
            selected_config: selectedResult,
            strict_ema_buy_closed_candidates_count: topStrictEmaClosedCandidates.length,
          },
          top_by_return: [...results]
            .sort((left, right) => right.total_return_pct - left.total_return_pct)
            .slice(0, 25),
          top_candidates: candidates.slice(0, 25),
          top_closed_candidates: closedCandidates.slice(0, 25),
          top_strict_ema_buy_closed_candidates: topStrictEmaClosedCandidates,
          top_ema_buy_closed_all: topEmaBuyClosedRows,
          results,
        },
        null,
        2,
      )}\n`,
      "utf8",
    )

    console.log(
      JSON.stringify(
        {
          configs_count: results.length,
          candidates_count: candidates.length,
          closed_candidates_count: closedCandidates.length,
          baseline_return_pct: baseline?.total_return_pct ?? null,
          best_return: results[0]
            ? [...results].sort((left, right) => right.total_return_pct - left.total_return_pct)[0]
            : null,
          best_candidate: candidates[0] ?? null,
          outputs: {
            json: path.join(outputDir, `${baseName}.json`),
            csv: path.join(outputDir, `${baseName}.csv`),
            candidates_csv: path.join(outputDir, `${baseName}-candidates.csv`),
            closed_candidates_csv: path.join(outputDir, `${baseName}-closed-candidates.csv`),
            selected_row_csv: path.join(outputDir, `${baseName}-selected-row.csv`),
            top10_closed_candidates_csv: path.join(outputDir, `${baseName}-top10-closed-candidates.csv`),
            top10_strict_ema_buy_closed_candidates_csv: path.join(
              outputDir,
              `${baseName}-top10-strict-ema-buy-closed-candidates.csv`,
            ),
            top10_ema_buy_closed_all_csv: path.join(outputDir, `${baseName}-top10-ema-buy-closed-all.csv`),
            selected_operations_csv: path.join(outputDir, `${baseName}-selected-operations.csv`),
            selected_decision_examples_csv: path.join(outputDir, `${baseName}-selected-decision-examples.csv`),
          },
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
