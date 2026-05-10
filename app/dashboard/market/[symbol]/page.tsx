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
import { findCryptoBySlug, generateOhlcv, generateIndicators, generateOrderBook, modelMetrics } from "@/data/market"
import { MarketChart } from "@/components/market/market-chart"
import type { Forecast, JobRun, OhlcvDataPoint, TradeDecision, TradeOperation } from "@/types"

type ForecastRunData = {
  forecast: Forecast
  decision: TradeDecision
  operation: TradeOperation | null
}

type DecisionChain = TradeDecision & {
  forecast: Forecast | null
  operation: TradeOperation | null
}

type ApiPayload<T> = {
  success: boolean
  data?: T
  error?: string
  message?: string
  no_operation_reason?: string
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

function operationText(decision?: TradeDecision | null, operation?: TradeOperation | null) {
  if (operation) return `создана: ${operation.status}`

  const reason = normalizeNoOperationReason(decision, operation)
  if (reason === "OKX API не подключён") {
    return "Торговый API OKX не подключён. Решение сформировано, операция не отправлена."
  }

  return reason ? `не создана: ${reason}` : "не создана"
}

function formatRunSource(value?: string | null) {
  if (value === "airflow") return "Airflow"
  if (value === "manual") return "manual"
  if (value === "system") return "system"
  return value ?? "—"
}

function formatJobStatus(value?: string | null) {
  if (value === "success") return "success"
  if (value === "failed") return "failed"
  if (value === "running") return "running"
  if (value === "skipped") return "skipped"
  return value ?? "—"
}

function nextAirflowRunText() {
  const now = new Date()
  const next = new Date(now)
  next.setUTCHours(0, 10, 0, 0)
  if (next <= now) {
    next.setUTCDate(next.getUTCDate() + 1)
  }
  return `${next.toLocaleString("ru-RU")} (00:10 UTC daily)`
}

export default function InstrumentPage() {
  const { symbol } = useParams<{ symbol: string }>()
  const [isRunningForecast, setIsRunningForecast] = useState(false)
  const [isLoadingBackendData, setIsLoadingBackendData] = useState(false)
  const [forecastRunMessage, setForecastRunMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [backendError, setBackendError] = useState<string | null>(null)
  const [runData, setRunData] = useState<ForecastRunData | null>(null)
  const [latestForecast, setLatestForecast] = useState<Forecast | null>(null)
  const [decisionHistory, setDecisionHistory] = useState<DecisionChain[]>([])
  const [backendOhlcv, setBackendOhlcv] = useState<OhlcvDataPoint[] | null>(null)
  const [jobRuns, setJobRuns] = useState<JobRun[]>([])
  const crypto = findCryptoBySlug(symbol)
  const isBtcUsdt = crypto?.ticker === "BTC-USDT"
  const noiseThreshold = 0.002

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
      return "Параметры стратегии не соответствуют активной LSTM-модели. Проверьте model/preprocessor artifact. Backend error: Strategy settings do not match LSTM preprocessor contract"
    }

    return text
  }

  useEffect(() => {
    if (!isBtcUsdt) {
      setLatestForecast(null)
      setDecisionHistory([])
      setRunData(null)
      setBackendOhlcv(null)
      setJobRuns([])
      setBackendError(null)
      return
    }

    let cancelled = false

    async function loadBackendData() {
      setIsLoadingBackendData(true)
      setBackendError(null)

      try {
        const [forecastResponse, decisionsResponse] = await Promise.all([
          fetch(`/api/forecast/${symbol}/latest`),
          fetch(`/api/trade-decisions?symbol=${symbol}&limit=10`),
        ])
        const candlesResponse = await fetch(`/api/market/${symbol}/candles?limit=30`)
        const jobRunsResponse = await fetch("/api/job-runs/latest?limit=10")
        const [forecast, decisions, candles] = await Promise.all([
          readApiData<Forecast | null>(forecastResponse),
          readApiData<DecisionChain[]>(decisionsResponse),
          readApiData<OhlcvDataPoint[]>(candlesResponse),
        ])
        const loadedJobRuns = jobRunsResponse.ok
          ? await readApiData<JobRun[]>(jobRunsResponse)
          : []

        if (cancelled) return
        setLatestForecast(forecast)
        setDecisionHistory(decisions)
        setBackendOhlcv(candles.length > 0 ? candles : null)
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
      setForecastRunMessage({ type: "success", text: operationText(data.decision, data.operation) })
    } catch (error) {
      setForecastRunMessage({ type: "error", text: forecastErrorText(error) })
    } finally {
      setIsRunningForecast(false)
    }
  }

  const currentDecision = runData?.decision ?? decisionHistory[0] ?? null
  const currentForecast = runData?.forecast ?? currentDecision?.forecast ?? latestForecast
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

  const ohlcv = backendOhlcv?.length ? backendOhlcv : generateOhlcv(crypto.id, 30)
  const indicators = generateIndicators(crypto.id)
  const orderBook = generateOrderBook(crypto.id)

  const lastPrice = ohlcv[ohlcv.length - 1].close
  const prevPrice = ohlcv[ohlcv.length - 2].close
  const change = ((lastPrice - prevPrice) / prevPrice) * 100
  const isPositive = change >= 0

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
            <span className="text-3xl font-bold font-mono">{lastPrice.toLocaleString("ru-RU", { minimumFractionDigits: 2 })}</span>
            <span className={`font-medium font-mono ${isPositive ? "text-emerald-500" : "text-red-500"}`}>
              {isPositive ? "+" : ""}{change.toFixed(2)}%
            </span>
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
              Airflow обновляет публичные рыночные данные BTC-USDT 1D UTC и запускает backend LSTM-контур по расписанию.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              <div>
                <p className="text-xs text-muted-foreground">Последний запуск</p>
                <p className="font-mono font-bold">{formatDateTime(latestJobRun?.started_at)}</p>
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
                <p className="text-xs text-muted-foreground">Источник</p>
                <p className="font-mono font-bold">{formatRunSource(latestJobRun?.run_source ?? "airflow")}</p>
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
          <TabsTrigger value="orderbook">Стакан OKX</TabsTrigger>
          <TabsTrigger value="decision" disabled={!isBtcUsdt}>Торговое решение</TabsTrigger>
        </TabsList>

        <TabsContent value="chart">
          <MarketChart
            ohlcv={ohlcv}
            title={`OHLCV ${crypto.ticker}`}
            description={`Данные за последние 30 дней · Последнее обновление: ${new Date(ohlcv[ohlcv.length - 1].ts).toLocaleString("ru-RU")}`}
          />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">open</p><p className="text-lg font-bold font-mono">{ohlcv[ohlcv.length - 1].open.toLocaleString("ru-RU")}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">high</p><p className="text-lg font-bold font-mono">{ohlcv[ohlcv.length - 1].high.toLocaleString("ru-RU")}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">low</p><p className="text-lg font-bold font-mono">{ohlcv[ohlcv.length - 1].low.toLocaleString("ru-RU")}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">close</p><p className="text-lg font-bold font-mono">{ohlcv[ohlcv.length - 1].close.toLocaleString("ru-RU")}</p></CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">volume (BTC)</p>
              <p className="text-lg font-bold font-mono">{ohlcv[ohlcv.length - 1].volume.toLocaleString("ru-RU")}</p>
            </CardContent></Card>
          </div>
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
              Backend-данные прогноза и решений не загружены: {backendError}
            </div>
          )}

          {isLoadingBackendData && (
            <div className="mb-4 rounded-md border px-4 py-3 text-sm text-muted-foreground">
              Загружаю последний forecast и связанные решения из backend...
            </div>
          )}

          <MarketChart
            ohlcv={ohlcv}
            forecasts={chartForecasts.length > 0 ? chartForecasts : undefined}
            title={`Прогноз LSTM для ${crypto.ticker}`}
            description={
              currentForecast
                ? `Показан backend forecast.id=${currentForecast.id ?? "—"} · Дата рыночных данных: ${formatDateTime(currentForecast.ts)}`
                : `Прогноз строится по последним сохранённым дневным OHLCV-данным BTC-USDT.`
            }
          />

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Последний прогноз</CardTitle>
              <CardDescription>Последний сохранённый forecast из backend: manual или Airflow</CardDescription>
            </CardHeader>
            <CardContent>
              {currentForecast ? (
                <div className="grid gap-4 md:grid-cols-7">
                  <div>
                    <p className="text-xs text-muted-foreground">forecast.id</p>
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
                    <p className="text-xs text-muted-foreground">last_close</p>
                    <p className="font-mono font-bold">{formatMoney(currentForecast.last_close)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">predicted_log_return</p>
                    <p className={`font-mono font-bold ${
                      currentForecast.predicted_log_return > 0 ? "text-emerald-400" :
                      currentForecast.predicted_log_return < 0 ? "text-red-400" : ""
                    }`}>
                      {formatLogReturn(currentForecast.predicted_log_return)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">predicted_close</p>
                    <p className="font-mono font-bold">{formatMoney(currentForecast.predicted_close)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">run_source</p>
                    <p className="font-mono font-bold">{formatRunSource(currentForecast.run_source)}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  В backend пока нет forecast для отображения. Mock-прогнозы здесь не используются.
                </p>
              )}
            </CardContent>
          </Card>
          
          {/* Model metrics */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Метрики модели LSTM</CardTitle>
              <CardDescription>Качество прогнозирования</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">window_size</p>
                  <p className="font-mono font-bold">{modelMetrics.window_size}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">horizon</p>
                  <p className="font-mono font-bold">{modelMetrics.horizon}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Таймфрейм модели</p>
                  <p className="font-mono font-bold">1D UTC</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">RMSE</p>
                  <p className="font-mono font-bold">{modelMetrics.rmse}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">MAE</p>
                  <p className="font-mono font-bold">{modelMetrics.mae}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">MAPE (%)</p>
                  <p className="font-mono font-bold">{modelMetrics.mape}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Backend-история прогнозов</CardTitle>
              <CardDescription>Только прогнозы, связанные с решениями из API/DB</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>forecast.id</TableHead>
                    <TableHead>Дата рыночных данных</TableHead>
                    <TableHead className="text-right">last_close</TableHead>
                    <TableHead className="text-right">predicted_log_return</TableHead>
                    <TableHead className="text-right">predicted_close</TableHead>
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
                        История backend-решений пуста. Mock/history data не подставляется.
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
              <CardDescription>EMA12, EMA26, MACD, Сигнальная линия MACD, RSI, Полосы Боллинджера, Логарифмическая доходность, Волатильность</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {indicators.map((ind) => (
                  <div key={ind.name} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <span className="font-medium text-sm">{ind.name}</span>
                    <span className="font-mono font-bold">{ind.value.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orderbook">
          <Card className="mb-4 border-blue-500/30 bg-blue-500/5">
            <CardContent className="flex items-center gap-3 p-4">
              <p className="text-sm text-blue-200">
                Стакан заявок загружается через публичный OKX market data API. Для него не нужны пользовательские торговые ключи.
              </p>
            </CardContent>
          </Card>
          <Card className="mb-4 border-amber-500/30 bg-amber-500/5">
            <CardContent className="flex items-center gap-3 p-4">
              <p className="text-sm text-amber-200">
                Если публичные данные OKX временно недоступны, отображается последний сохранённый снимок стакана. Данные могут быть устаревшими.
              </p>
            </CardContent>
          </Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Стакан OKX</h2>
            <span className="text-xs text-muted-foreground">
              Снимок: {new Date(orderBook.ts).toLocaleTimeString("ru-RU")}
            </span>
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
                        <TableCell className="font-mono text-red-400">{a[0]}</TableCell>
                        <TableCell className="text-right font-mono">{a[1]}</TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">{a[3]}</TableCell>
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
                        <TableCell className="font-mono text-emerald-400">{b[0]}</TableCell>
                        <TableCell className="text-right font-mono">{b[1]}</TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">{b[3]}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
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
                  <CardDescription>Последний decision из backend, связанный с forecast_id</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="outline" className={`${decisionColors[currentDecision.decision_type]} text-lg px-4 py-2`}>
                      {currentDecision.decision_type.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className={forecastDecisionLinked ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}>
                      decision.forecast_id = {currentDecision.forecast_id}
                    </Badge>
                    {currentForecast?.id != null && (
                      <Badge variant="outline" className={forecastDecisionLinked ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}>
                        forecast.id = {currentForecast.id}
                      </Badge>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-5">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Дата рыночных данных</p>
                      <p className="text-sm font-mono font-bold">{formatDateTime(currentForecast?.ts)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Дата формирования решения</p>
                      <p className="text-sm font-mono font-bold">{formatDateTime(currentDecision.created_at ?? currentDecision.ts)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">decision.id</p>
                      <p className="text-sm font-mono font-bold">{currentDecision.id}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Источник запуска</p>
                      <p className="text-sm font-mono font-bold">{formatRunSource(currentDecision.run_source ?? currentForecast?.run_source)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">operation.id</p>
                      <p className="text-sm font-mono font-bold">{currentOperation?.id ?? "не создана"}</p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">predicted_log_return</p>
                      <p className={`text-xl font-mono font-bold ${
                        (currentForecast?.predicted_log_return ?? 0) > 0 ? "text-emerald-400" :
                        (currentForecast?.predicted_log_return ?? 0) < 0 ? "text-red-400" : ""
                      }`}>
                        {formatLogReturn(currentForecast?.predicted_log_return)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">last_close</p>
                      <p className="text-xl font-mono font-bold">
                        {formatMoney(currentForecast?.last_close)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">predicted_close = last_close × exp(predicted_log_return)</p>
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
                      <span className="text-sm text-muted-foreground">noise_threshold</span>
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
                        {operationText(currentDecision, currentOperation)}
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
                    {!currentOperation && currentNoOperationReason && currentNoOperationReason !== "OKX API не подключён" && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">no_operation_reason</span>
                        <span className="text-sm text-right text-amber-400">{currentNoOperationReason}</span>
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
                          <TableHead>Дата формирования решения</TableHead>
                          <TableHead className="text-right">last_close</TableHead>
                          <TableHead className="text-right">predicted_log_return</TableHead>
                          <TableHead className="text-right">predicted_close</TableHead>
                          <TableHead>Решение</TableHead>
                          <TableHead>Основание</TableHead>
                          <TableHead>Операция</TableHead>
                          <TableHead>no_operation_reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {decisionHistory.map((d) => {
                          const forecast = d.forecast
                          const noOperationReason = normalizeNoOperationReason(d, d.operation)
                          return (
                            <TableRow key={d.id}>
                              <TableCell>{formatDateTime(forecast?.ts)}</TableCell>
                              <TableCell>{formatDateTime(d.created_at ?? d.ts)}</TableCell>
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
                              <TableCell className="max-w-[260px] text-xs">{d.reason}</TableCell>
                              <TableCell className="text-xs">
                                {d.operation?.status ?? "не создана"}
                              </TableCell>
                              <TableCell className="max-w-[260px] text-xs text-muted-foreground">
                                {noOperationReason ?? "—"}
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
                В backend пока нет торгового решения для {crypto.ticker}. Mock decisions не отображаются как реальные текущие решения.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
