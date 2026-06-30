"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, AlertTriangle, Info } from "lucide-react"
import Link from "next/link"
import { LSTM_MODEL_METADATA, LSTM_MODEL_QUALITY_METRICS } from "@/lib/lstm-contract"
import { SELECTED_BACKTEST_RUN_SOURCE, SELECTED_STRATEGY_DEFAULTS } from "@/lib/strategy-defaults"
import { MarketChart } from "@/components/market/market-chart"
import type { Forecast, Indicator, JobRun, OhlcvDataPoint, TradeDecision, TradeOperation, TradingPair } from "@/types"

type ForecastRunData = {
  forecast: Forecast
  decision: TradeDecision
  operation: TradeOperation | null
}

type DecisionChain = TradeDecision & {
  forecast: Forecast | null
  operation: TradeOperation | null
}

type OrderBookRow = {
  price: number
  size: number
  order_count: number
}

type OrderBookData = {
  symbol: string
  source: "OKX" | "DB_SNAPSHOT" | string
  snapshot_ts: string
  is_live: boolean
  is_stale: boolean
  stale_seconds: number
  last_price: number | null
  mid_price: number | null
  sanity_diff_pct: number | null
  asks: OrderBookRow[]
  bids: OrderBookRow[]
}

type ApiPayload<T> = {
  success: boolean
  data?: T
  warning?: string
  error?: string
  message?: string
  no_operation_reason?: string
}

const SUPPORTED_ASSETS: TradingPair[] = [
  { id: 1, ticker: "BTC-USDT", name: "Bitcoin", instrument_type: "spot" },
]

const TEMP_DOCUMENTATION_DATES = {
  lastRun: "31.01.2026, 10:00:00",
  nextRun: "01.02.2026, 10:00:00",
  ohlcvUpdatedAt: "31.01.2026, 10:00:00",
  forecastMarketDate: "2026-05-10",
  forecastPointDate: "2026-05-11T10:00:00",
} as const

function findSupportedAssetBySlug(slug: string): TradingPair | undefined {
  const normalized = slug.toUpperCase().replace("/", "-")
  return SUPPORTED_ASSETS.find(
    (asset) =>
      asset.ticker === normalized ||
      asset.ticker === `${normalized}-USDT` ||
      asset.ticker.split("-")[0] === normalized ||
      asset.id === Number(slug),
  )
}

async function readApiData<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null) as ApiPayload<T> | null
  if (!response.ok || !payload?.success) {
    throw payload ?? { error: response.statusText }
  }

  return payload.data as T
}

function formatDateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString("ru-RU") : "—"
}

function formatStrategyDate(value?: string | null) {
  return value
    ? new Date(value).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "—"
}

function formatMoney(value?: number | null) {
  return typeof value === "number"
    ? value.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "—"
}

function formatLogReturn(value?: number | null) {
  return typeof value === "number" ? value.toFixed(6) : "—"
}

function normalizeNoOperationReason(decision?: TradeDecision | null, operation?: TradeOperation | null) {
  if (!decision || operation) return null

  const reason = decision.no_operation_reason
  if (reason === "API-ключи OKX не настроены" || reason === "OKX status != connected" || reason === "OKX API не подключен") {
    return "OKX API не подключён"
  }

  if (reason) return reason
  if (decision.decision_type === "удержание") return "Решение удержание"
  if (decision.risk_check_status === "запрещено") return "risk-check запрещен"
  return "Операция не создана"
}

function operationText(operation?: TradeOperation | null) {
  if (operation) return `создана: ${operation.status}`
  return "не создана"
}

function formatJobStatus(value?: string | null) {
  if (value === "success") return "success"
  if (value === "failed") return "failed"
  if (value === "running") return "running"
  if (value === "skipped") return "skipped"
  return value ?? "—"
}

function nextAirflowRunText() {
  return TEMP_DOCUMENTATION_DATES.nextRun
}

function isSameUtcDate(value: string, date: string) {
  return value.slice(0, 10) === date
}

export default function InstrumentPage() {
  const { symbol } = useParams<{ symbol: string }>()
  const [isRunningForecast, setIsRunningForecast] = useState(false)
  const [isLoadingBackendData, setIsLoadingBackendData] = useState(false)
  const [forecastRunMessage, setForecastRunMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [backendError, setBackendError] = useState<string | null>(null)
  const [runData, setRunData] = useState<ForecastRunData | null>(null)
  const [latestForecast, setLatestForecast] = useState<Forecast | null>(null)
  const [targetForecast, setTargetForecast] = useState<Forecast | null>(null)
  const [decisionHistory, setDecisionHistory] = useState<DecisionChain[]>([])
  const [backendOhlcv, setBackendOhlcv] = useState<OhlcvDataPoint[] | null>(null)
  const [backendIndicators, setBackendIndicators] = useState<Indicator[]>([])
  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null)
  const [orderBookWarning, setOrderBookWarning] = useState<string | null>(null)
  const [orderBookError, setOrderBookError] = useState<string | null>(null)
  const [jobRuns, setJobRuns] = useState<JobRun[]>([])
  const crypto = findSupportedAssetBySlug(symbol)
  const isBtcUsdt = crypto?.ticker === "BTC-USDT"
  const noiseThreshold = SELECTED_STRATEGY_DEFAULTS.noiseThreshold

  const decisionColors: Record<string, string> = {
    "покупка": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "продажа": "bg-red-500/10 text-red-400 border-red-500/20",
    "удержание": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  }

  const forecastErrorText = (error: unknown) => {
    const text =
      error && typeof error === "object" && "error" in error && typeof error.error === "string"
        ? error.error
        : typeof error === "string"
          ? error
          : "Ошибка запуска прогноза"

    if (text === "Strategy settings do not match LSTM preprocessor contract") {
      return "Параметры стратегии не соответствуют активной LSTM-модели. Проверьте model/preprocessor artifact. Ошибка серверной части: Strategy settings do not match LSTM preprocessor contract"
    }

    return text
  }

  useEffect(() => {
    if (!isBtcUsdt) {
      setLatestForecast(null)
      setTargetForecast(null)
      setDecisionHistory([])
      setRunData(null)
      setBackendOhlcv(null)
      setBackendIndicators([])
      setOrderBook(null)
      setOrderBookWarning(null)
      setOrderBookError(null)
      setJobRuns([])
      setBackendError(null)
      return
    }

    let cancelled = false

    async function loadBackendData() {
      setIsLoadingBackendData(true)
      setBackendError(null)

      try {
        const [forecastResponse, decisionsResponse, historyResponse, allDecisionsResponse] = await Promise.all([
          fetch(`/api/forecast/${symbol}/latest?run_source=${SELECTED_BACKTEST_RUN_SOURCE}`),
          fetch(`/api/trade-decisions?symbol=${symbol}&limit=10&run_source=${SELECTED_BACKTEST_RUN_SOURCE}`),
          fetch(`/api/forecast/${symbol}/history?limit=1000&run_source=all`),
          fetch(`/api/trade-decisions?symbol=${symbol}&limit=500&run_source=all`),
        ])
        const [candlesResponse, indicatorsResponse, orderBookResponse, jobRunsResponse] = await Promise.all([
          fetch(`/api/market/${symbol}/candles?limit=30`),
          fetch(`/api/market/${symbol}/indicators`),
          fetch(`/api/market/${symbol}/orderbook`),
          fetch("/api/job-runs/latest?limit=10"),
        ])
        const [forecast, decisions, forecastHistory, allDecisions, candles, indicators] = await Promise.all([
          readApiData<Forecast | null>(forecastResponse),
          readApiData<DecisionChain[]>(decisionsResponse),
          readApiData<Forecast[]>(historyResponse),
          readApiData<DecisionChain[]>(allDecisionsResponse),
          readApiData<OhlcvDataPoint[]>(candlesResponse),
          indicatorsResponse.ok ? readApiData<Indicator[]>(indicatorsResponse) : Promise.resolve([]),
        ])
        const orderBookPayload = await orderBookResponse.json().catch(() => null) as ApiPayload<OrderBookData> | null
        const loadedJobRuns = jobRunsResponse.ok
          ? await readApiData<JobRun[]>(jobRunsResponse)
          : []

        if (cancelled) return
        const selectedTargetForecast =
          forecastHistory.find((item) => isSameUtcDate(item.ts, TEMP_DOCUMENTATION_DATES.forecastMarketDate)) ?? null
        const selectedTargetDecision =
          selectedTargetForecast?.id == null
            ? null
            : allDecisions.find((item) => item.forecast_id === selectedTargetForecast.id) ?? null

        setLatestForecast(forecast)
        setTargetForecast(selectedTargetForecast)
        setDecisionHistory(
          selectedTargetDecision
            ? [selectedTargetDecision, ...decisions.filter((item) => item.id !== selectedTargetDecision.id)]
            : decisions,
        )
        setBackendOhlcv(candles.length > 0 ? candles : null)
        setBackendIndicators(indicators)
        setOrderBook(orderBookPayload?.success && orderBookPayload.data ? orderBookPayload.data : null)
        setOrderBookWarning(orderBookPayload?.warning ?? null)
        setOrderBookError(orderBookPayload?.success ? null : orderBookPayload?.error ?? "Order book data is unavailable")
        setJobRuns(loadedJobRuns)
      } catch (error) {
        if (!cancelled) {
          setBackendError(forecastErrorText(error))
        }
      } finally {
        if (!cancelled) {
          setIsLoadingBackendData(false)
        }
      }
    }

    loadBackendData()

    return () => {
      cancelled = true
    }
  }, [isBtcUsdt, symbol])

  const runForecast = async () => {
    if (!isBtcUsdt) return

    setIsRunningForecast(true)
    setForecastRunMessage(null)

    try {
      const response = await fetch(`/api/forecast/${symbol}/run`, { method: "POST" })
      const data = await readApiData<ForecastRunData>(response)
      setRunData(data)
      setLatestForecast(data.forecast)
      setDecisionHistory((items) => [
        { ...data.decision, forecast: data.forecast, operation: data.operation },
        ...items.filter((item) => item.id !== data.decision.id),
      ])
      setForecastRunMessage({ type: "success", text: operationText(data.operation) })
    } catch (error) {
      setForecastRunMessage({ type: "error", text: forecastErrorText(error) })
    } finally {
      setIsRunningForecast(false)
    }
  }

  const currentDecision = runData?.decision ?? decisionHistory[0] ?? null
  const currentForecast = runData?.forecast ?? targetForecast ?? currentDecision?.forecast ?? latestForecast
  const currentOperation = runData ? runData.operation : currentDecision?.operation ?? null
  const currentNoOperationReason = normalizeNoOperationReason(currentDecision, currentOperation)
  const chartForecasts = currentForecast ? [currentForecast] : []
  const forecastDecisionLinked =
    currentForecast?.id != null && currentDecision?.forecast_id != null
      ? currentDecision.forecast_id === currentForecast.id
      : false
  const latestScheduledRun = jobRuns.find((jobRun) => jobRun.run_source === "airflow") ?? null
  const latestJobRun = latestScheduledRun ?? jobRuns[0] ?? null

  if (!crypto) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/market"><ArrowLeft className="mr-2 h-4 w-4" />Назад к рынку</Link>
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <h2 className="text-xl font-bold mb-2">Инструмент не найден</h2>
            <p className="text-muted-foreground text-center max-w-md">
              {"Инструмент \""}{symbol}{"\" не найден в базе данных. Проверьте правильность тикера."}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const ohlcv = backendOhlcv ?? []
  const indicators = backendIndicators
  const lastCandle = ohlcv[ohlcv.length - 1] ?? null
  const previousCandle = ohlcv[ohlcv.length - 2] ?? null
  const lastPrice = orderBook?.last_price ?? lastCandle?.close ?? null
  const change = lastCandle && previousCandle && previousCandle.close !== 0
    ? ((lastCandle.close - previousCandle.close) / previousCandle.close) * 100
    : null
  const isPositive = (change ?? 0) >= 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard/market"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">{crypto.ticker}</h1>
            <Badge variant="outline">{crypto.instrument_type === "demo" ? "Demo OKX" : "Спот"}</Badge>
          </div>
          <div className="flex items-baseline gap-3 ml-12">
            <span className="text-3xl font-bold font-mono">
              {lastPrice != null ? lastPrice.toLocaleString("ru-RU", { minimumFractionDigits: 2 }) : "—"}
            </span>
            {change != null && (
              <span className={`font-medium font-mono ${isPositive ? "text-emerald-500" : "text-red-500"}`}>
                {isPositive ? "+" : ""}{change.toFixed(2)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Warning for non-BTC pairs */}
      {!isBtcUsdt && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-200">
              В прототипе расчёт LSTM-прогноза и формирование торговых решений выполняется только для BTC-USDT.
            </p>
          </CardContent>
        </Card>
      )}

      {isBtcUsdt && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Плановое обновление</CardTitle>
            <CardDescription>
              Airflow обновляет рыночные данные BTC-USDT и запускает LSTM по расписанию.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Последний запуск</p>
                <p className="font-mono font-bold">{TEMP_DOCUMENTATION_DATES.lastRun}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Статус</p>
                <Badge variant="outline" className={
                  latestJobRun?.status === "success"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : latestJobRun?.status === "failed"
                      ? "bg-red-500/10 text-red-400 border-red-500/20"
                      : "bg-secondary text-muted-foreground border-border"
                }>
                  {formatJobStatus(latestJobRun?.status)}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Следующий запуск</p>
                <p className="font-mono font-bold">{nextAirflowRunText()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Последняя ошибка</p>
                <p className="text-sm text-muted-foreground">{latestJobRun?.error_message ?? "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="chart" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chart">OHLCV</TabsTrigger>
          <TabsTrigger value="forecast" disabled={!isBtcUsdt}>Прогноз LSTM</TabsTrigger>
          <TabsTrigger value="indicators">Индикаторы</TabsTrigger>
          <TabsTrigger value="orderbook">Глубина рынка</TabsTrigger>
          <TabsTrigger value="decision" disabled={!isBtcUsdt}>Торговое решение</TabsTrigger>
        </TabsList>

        <TabsContent value="chart">
          <MarketChart
            ohlcv={ohlcv}
            title={`OHLCV ${crypto.ticker}`}
            description={
              lastCandle
                ? `Последнее обновление: ${TEMP_DOCUMENTATION_DATES.ohlcvUpdatedAt}`
                : "Нет сохраненных OHLCV данных. Mock history не подставляется."
            }
          />
          {lastCandle && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
              <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">open</p><p className="text-lg font-bold font-mono">{lastCandle.open.toLocaleString("ru-RU")}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">high</p><p className="text-lg font-bold font-mono">{lastCandle.high.toLocaleString("ru-RU")}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">low</p><p className="text-lg font-bold font-mono">{lastCandle.low.toLocaleString("ru-RU")}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">close</p><p className="text-lg font-bold font-mono">{lastCandle.close.toLocaleString("ru-RU")}</p></CardContent></Card>
              <Card><CardContent className="p-4">
                <p className="text-xs text-muted-foreground">volume (BTC)</p>
                <p className="text-lg font-bold font-mono">{lastCandle.volume.toLocaleString("ru-RU")}</p>
              </CardContent></Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="forecast">
          <Card className="mb-4">
            <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium">Запуск LSTM-прогноза вручную</p>
                <p className="text-sm text-muted-foreground">
                  Ручной запуск используется для проверки. В рабочем режиме прогноз формируется автоматически по расписанию.
                </p>
              </div>
              <Button onClick={runForecast} disabled={!isBtcUsdt || isRunningForecast}>
                {isRunningForecast ? "Расчёт..." : "Запустить прогноз вручную"}
              </Button>
            </CardContent>
          </Card>

          {forecastRunMessage && (
            <div className={`mb-4 rounded-md border px-4 py-3 text-sm ${
              forecastRunMessage.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-red-500/30 bg-red-500/10 text-red-300"
            }`}>
              {forecastRunMessage.text}
            </div>
          )}

          {backendError && (
            <div className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              Данные прогноза и решений из серверной части не загружены: {backendError}
            </div>
          )}

          {isLoadingBackendData && (
            <div className="mb-4 rounded-md border px-4 py-3 text-sm text-muted-foreground">
              Загружаю последний прогноз и связанные решения из серверной части...
            </div>
          )}

          <MarketChart
            ohlcv={ohlcv}
            forecasts={chartForecasts.length > 0 ? chartForecasts : undefined}
            forecastDisplayDate={TEMP_DOCUMENTATION_DATES.forecastPointDate}
            title={`Прогноз LSTM для ${crypto.ticker}`}
            description={
              currentForecast
                ? `Дата рыночных данных: ${formatStrategyDate(currentForecast.ts)}`
                : `Прогноз строится по последним сохранённым дневным OHLCV-данным BTC-USDT.`
            }
          />

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Последний прогноз</CardTitle>
            </CardHeader>
            <CardContent>
              {currentForecast ? (
                <div className="grid gap-4 md:grid-cols-6">
                  <div>
                    <p className="text-xs text-muted-foreground">ID прогноза</p>
                    <p className="font-mono font-bold">{currentForecast.id ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Дата последней рыночной свечи</p>
                    <p className="font-mono font-bold">{formatDateTime(currentForecast.ts)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Дата формирования прогноза</p>
                    <p className="font-mono font-bold">{formatDateTime(currentForecast.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Цена закрытия</p>
                    <p className="font-mono font-bold">{formatMoney(currentForecast.last_close)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Прогнозная логарифмическая доходность</p>
                    <p className={`font-mono font-bold ${
                      currentForecast.predicted_log_return > 0 ? "text-emerald-400" :
                      currentForecast.predicted_log_return < 0 ? "text-red-400" : ""
                    }`}>
                      {formatLogReturn(currentForecast.predicted_log_return)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Прогнозная цена закрытия</p>
                    <p className="font-mono font-bold">{formatMoney(currentForecast.predicted_close)}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  В серверной части пока нет прогноза для отображения. Mock-прогнозы здесь не используются.
                </p>
              )}
            </CardContent>
          </Card>
          
          {/* Model metrics */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Метрики модели LSTM</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">window_size</p>
                  <p className="font-mono font-bold">{LSTM_MODEL_METADATA.window_size}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">horizon</p>
                  <p className="font-mono font-bold">{LSTM_MODEL_METADATA.horizon}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Таймфрейм модели</p>
                  <p className="font-mono font-bold">1D UTC</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">RMSE</p>
                  <p className="font-mono font-bold">
                    {LSTM_MODEL_QUALITY_METRICS.rmse.value.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} {LSTM_MODEL_QUALITY_METRICS.rmse.unit}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">MAE</p>
                  <p className="font-mono font-bold">
                    {LSTM_MODEL_QUALITY_METRICS.mae.value.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} {LSTM_MODEL_QUALITY_METRICS.mae.unit}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">MAPE (%)</p>
                  <p className="font-mono font-bold">
                    {LSTM_MODEL_QUALITY_METRICS.mape.value.toLocaleString("ru-RU", { minimumFractionDigits: 2 })}{LSTM_MODEL_QUALITY_METRICS.mape.unit}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">История прогнозов</CardTitle>
              <CardDescription>Только прогнозы, связанные с решениями из API/DB</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID прогноза</TableHead>
                    <TableHead>Дата рыночных данных</TableHead>
                    <TableHead className="text-right">Цена закрытия</TableHead>
                    <TableHead className="text-right">Прогнозная логарифмическая доходность</TableHead>
                    <TableHead className="text-right">Прогнозная цена закрытия</TableHead>
                    <TableHead>Связанное решение</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {decisionHistory.length > 0 ? (
                    decisionHistory.map((item) => {
                      const forecast = item.forecast
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono">{forecast?.id ?? "—"}</TableCell>
                          <TableCell>{formatDateTime(forecast?.ts)}</TableCell>
                          <TableCell className="text-right font-mono">{formatMoney(forecast?.last_close)}</TableCell>
                          <TableCell className={`text-right font-mono ${
                            (forecast?.predicted_log_return ?? 0) > 0 ? "text-emerald-400" :
                            (forecast?.predicted_log_return ?? 0) < 0 ? "text-red-400" : ""
                          }`}>
                            {formatLogReturn(forecast?.predicted_log_return)}
                          </TableCell>
                          <TableCell className="text-right font-mono">{formatMoney(forecast?.predicted_close)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={decisionColors[item.decision_type]}>
                              {item.decision_type}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                        История решений пуста. Mock/history data не подставляется.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="indicators">
          <Card>
            <CardHeader>
              <CardTitle>Технические индикаторы</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {indicators.length > 0 ? (
                  indicators.map((ind) => (
                    <div key={ind.name} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <span className="font-medium text-sm">{ind.name}</span>
                      <span className="font-mono font-bold">{ind.value.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span>
                    </div>
                  ))
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Нет рассчитанных индикаторов. Mock indicators не подставляются.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orderbook">
          {orderBook ? (
            <>
          <Card className="mb-4 border-blue-500/30 bg-blue-500/5">
            <CardContent className="flex items-center gap-3 p-4">
              <p className="text-sm text-blue-200">
                Глубина рынка загружается через публичный OKX market data API. Для неё не нужны пользовательские торговые ключи.
              </p>
            </CardContent>
          </Card>
          <Card className="mb-4 border-amber-500/30 bg-amber-500/5">
            <CardContent className="flex items-center gap-3 p-4">
              <p className="text-sm text-amber-200">
                Если публичные данные OKX временно недоступны, отображается последний сохранённый снимок глубины рынка. Данные могут быть устаревшими.
              </p>
            </CardContent>
          </Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Глубина рынка</h2>
            <span className="text-xs text-muted-foreground">
              Снимок: {formatDateTime(orderBook.snapshot_ts)} · источник: {orderBook.source} · возраст данных: {orderBook.stale_seconds} с
            </span>
          </div>
          {(orderBookWarning || (orderBook.sanity_diff_pct != null && orderBook.sanity_diff_pct > 0.05) || !orderBook.is_live || orderBook.is_stale) && (
            <Card className="mb-4 border-amber-500/30 bg-amber-500/5">
              <CardContent className="flex items-center gap-3 p-4">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                <p className="text-sm text-amber-200">
                  {orderBookWarning ?? "Глубина рынка не соответствует текущей рыночной цене. Данные могут быть устаревшими."}
                </p>
              </CardContent>
            </Card>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Последняя цена</p><p className="text-lg font-bold font-mono">{formatMoney(orderBook.last_price)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Средняя цена спроса и предложения</p><p className="text-lg font-bold font-mono">{formatMoney(orderBook.mid_price)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Отклонение от последней цены</p><p className="text-lg font-bold font-mono">{orderBook.sanity_diff_pct != null ? `${(orderBook.sanity_diff_pct * 100).toFixed(2)}%` : "—"}</p></CardContent></Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-red-400">Заявки на продажу (asks)</CardTitle>
                <CardDescription>Цена продажи — объём предложения</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Цена (USDT)</TableHead>
                      <TableHead className="text-right">Объём</TableHead>
                      <TableHead className="text-right">Количество заявок</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderBook.asks.map((a, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-red-400">{formatMoney(a.price)}</TableCell>
                        <TableCell className="text-right font-mono">{a.size.toLocaleString("ru-RU", { maximumFractionDigits: 8 })}</TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">{a.order_count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-emerald-400">Заявки на покупку (bids)</CardTitle>
                <CardDescription>Цена покупки — объём спроса</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Цена (USDT)</TableHead>
                      <TableHead className="text-right">Объём</TableHead>
                      <TableHead className="text-right">Количество заявок</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderBook.bids.map((b, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-emerald-400">{formatMoney(b.price)}</TableCell>
                        <TableCell className="text-right font-mono">{b.size.toLocaleString("ru-RU", { maximumFractionDigits: 8 })}</TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">{b.order_count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                {orderBookError ?? "Order book data is unavailable"}. Mock order book не подставляется.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="decision">
          {currentDecision ? (
            <div className="space-y-4">
              {currentNoOperationReason === "OKX API не подключён" && !currentOperation && (
                <Card className="border-amber-500/30 bg-amber-500/5">
                  <CardContent className="flex items-center gap-3 p-4">
                    <Info className="h-5 w-5 text-amber-500 shrink-0" />
                    <p className="text-sm text-amber-200">
                      Торговый API OKX не подключён. Решение сформировано, операция не отправлена.
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Текущее торговое решение</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="outline" className={`${decisionColors[currentDecision.decision_type]} text-lg px-4 py-2`}>
                      {currentDecision.decision_type.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className={forecastDecisionLinked ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}>
                      ID прогноза в решении = {currentDecision.forecast_id}
                    </Badge>
                    {currentForecast?.id != null && (
                      <Badge variant="outline" className={forecastDecisionLinked ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}>
                        ID прогноза = {currentForecast.id}
                      </Badge>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Дата рыночных данных</p>
                      <p className="text-sm font-mono font-bold">{formatDateTime(currentForecast?.ts)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Дата решения стратегии</p>
                      <p className="text-sm font-mono font-bold">{formatStrategyDate(currentDecision.ts)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">ID решения</p>
                      <p className="text-sm font-mono font-bold">{currentDecision.id}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">№ операции</p>
                      <p className="text-sm font-mono font-bold">{currentOperation?.operation_no ?? "не создана"}</p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Прогнозная логарифмическая доходность</p>
                      <p className={`text-xl font-mono font-bold ${
                        (currentForecast?.predicted_log_return ?? 0) > 0 ? "text-emerald-400" :
                        (currentForecast?.predicted_log_return ?? 0) < 0 ? "text-red-400" : ""
                      }`}>
                        {formatLogReturn(currentForecast?.predicted_log_return)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Цена закрытия</p>
                      <p className="text-xl font-mono font-bold">
                        {formatMoney(currentForecast?.last_close)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Прогнозная цена закрытия</p>
                      <p className="text-xl font-mono font-bold">
                        {formatMoney(currentForecast?.predicted_close)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 p-4 rounded-lg bg-secondary/50">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Основание решения</span>
                      <span className="text-sm text-right">{currentDecision.reason}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Порог прогноза</span>
                      <span className="text-sm font-mono">{noiseThreshold}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Риск-проверка</span>
                      {currentDecision.decision_type === "удержание" ? (
                        <Badge variant="outline" className="bg-secondary text-muted-foreground border-border">
                          не требуется
                        </Badge>
                      ) : (
                        <Badge variant="outline" className={
                          currentDecision.risk_check_status === "разрешено"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }>
                          {currentDecision.risk_check_status}
                        </Badge>
                      )}
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-border">
                      <span className="text-sm text-muted-foreground">Операция</span>
                      <span className={`text-sm text-right ${currentOperation ? "text-emerald-400" : currentNoOperationReason === "OKX API не подключён" ? "text-amber-400" : "text-muted-foreground"}`}>
                        {operationText(currentOperation)}
                      </span>
                    </div>
                    {currentOperation && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Детали операции</span>
                        <span className="text-sm text-right">
                          {currentOperation.side}, amount {currentOperation.amount}, price {formatMoney(currentOperation.price)}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">История торговых решений</CardTitle>
                  <CardDescription>Связанная цепочка forecast → decision → operation из API/DB</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table className="min-w-[1200px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Дата рыночных данных</TableHead>
                          <TableHead>Дата решения стратегии</TableHead>
                          <TableHead className="text-right">Цена закрытия</TableHead>
                          <TableHead className="text-right">Прогнозная логарифмическая доходность</TableHead>
                          <TableHead className="text-right">Прогнозная цена закрытия</TableHead>
                          <TableHead>Решение</TableHead>
                          <TableHead className="w-[360px] whitespace-normal px-4">Основание</TableHead>
                          <TableHead className="w-[240px] whitespace-normal px-4">Операция</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {decisionHistory.map((d) => {
                          const forecast = d.forecast
                          return (
                            <TableRow key={d.id}>
                              <TableCell>{formatDateTime(forecast?.ts)}</TableCell>
                              <TableCell>{formatStrategyDate(d.ts)}</TableCell>
                              <TableCell className="text-right font-mono">{formatMoney(forecast?.last_close)}</TableCell>
                              <TableCell className={`text-right font-mono ${
                                (forecast?.predicted_log_return ?? 0) > 0 ? "text-emerald-400" :
                                (forecast?.predicted_log_return ?? 0) < 0 ? "text-red-400" : ""
                              }`}>
                                {formatLogReturn(forecast?.predicted_log_return)}
                              </TableCell>
                              <TableCell className="text-right font-mono">{formatMoney(forecast?.predicted_close)}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={decisionColors[d.decision_type]}>
                                  {d.decision_type}
                                </Badge>
                              </TableCell>
                              <TableCell className="w-[360px] whitespace-normal break-words px-4 text-xs leading-relaxed">{d.reason}</TableCell>
                              <TableCell className="w-[240px] whitespace-normal break-words px-4 text-xs leading-relaxed">
                                {d.operation?.status ?? "не создана"}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                В серверной части пока нет торгового решения для {crypto.ticker}. Mock decisions не отображаются как реальные текущие решения.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
