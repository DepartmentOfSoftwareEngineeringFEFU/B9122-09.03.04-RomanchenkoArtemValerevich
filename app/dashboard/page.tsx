"use client"

import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import Link from "next/link"
import { Activity, ArrowDown, ArrowRight, ArrowUp, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useApiStatus } from "@/components/providers/api-status-provider"
import { SELECTED_BACKTEST_RUN_SOURCE } from "@/lib/strategy-defaults"
import type { Forecast, OhlcvDataPoint, TradeDecision, TradeOperation } from "@/types"

type DecisionChain = TradeDecision & {
  forecast?: Forecast | null
  operation?: TradeOperation | null
}

type ApiPayload<T> = {
  success: boolean
  data?: T
  error?: string
}

async function readApiData<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null) as ApiPayload<T> | null
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error ?? response.statusText)
  }
  return payload.data as T
}

function formatMoney(value?: number | null) {
  return typeof value === "number"
    ? value.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "—"
}

function formatLogReturn(value?: number | null) {
  return typeof value === "number" ? value.toFixed(6) : "—"
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString("ru-RU") : "—"
}

function formatStrategyDate(value?: string | null) {
  return value
    ? new Date(value).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "—"
}

const decisionColors: Record<string, string> = {
  покупка: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  продажа: "bg-red-500/10 text-red-400 border-red-500/20",
  удержание: "bg-amber-500/10 text-amber-400 border-amber-500/20",
}

const decisionIcons: Record<string, ReactNode> = {
  покупка: <ArrowUp className="h-3 w-3" />,
  продажа: <ArrowDown className="h-3 w-3" />,
  удержание: <ArrowRight className="h-3 w-3" />,
}

const statusColors: Record<string, string> = {
  открыта: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  исполнена: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  отменена: "bg-red-500/10 text-red-400 border-red-500/20",
  ошибка: "bg-red-500/10 text-red-300 border-red-500/20",
}

export default function DashboardPage() {
  const { status } = useApiStatus()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [latestForecast, setLatestForecast] = useState<Forecast | null>(null)
  const [decisions, setDecisions] = useState<DecisionChain[]>([])
  const [operations, setOperations] = useState<TradeOperation[]>([])
  const [candles, setCandles] = useState<OhlcvDataPoint[]>([])

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      setIsLoading(true)
      setError(null)

      try {
        const [forecastResponse, decisionsResponse, operationsResponse, candlesResponse] = await Promise.all([
          fetch(`/api/forecast/btc/latest?run_source=${SELECTED_BACKTEST_RUN_SOURCE}`),
          fetch(`/api/trade-decisions?symbol=btc&limit=5&run_source=${SELECTED_BACKTEST_RUN_SOURCE}`),
          fetch(`/api/operations?symbol=btc&limit=5&run_source=${SELECTED_BACKTEST_RUN_SOURCE}`),
          fetch("/api/market/btc/candles?limit=2"),
        ])

        const [forecast, loadedDecisions, loadedOperations, loadedCandles] = await Promise.all([
          readApiData<Forecast | null>(forecastResponse),
          readApiData<DecisionChain[]>(decisionsResponse),
          readApiData<TradeOperation[]>(operationsResponse),
          readApiData<OhlcvDataPoint[]>(candlesResponse),
        ])

        if (cancelled) return
        setLatestForecast(forecast)
        setDecisions(loadedDecisions)
        setOperations(loadedOperations)
        setCandles(loadedCandles)
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить данные серверной части")
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadDashboard()
    return () => {
      cancelled = true
    }
  }, [])

  const latestDecision = decisions[0] ?? null
  const lastCandle = candles[candles.length - 1] ?? null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-balance">Панель управления</h1>
        <p className="text-muted-foreground">Сводка BTC-USDT из серверной части и БД. Демо-операции относятся к выбранному ретроспективному прогону.</p>
      </div>

      {error && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 text-sm text-amber-200">
            Данные серверной части не загружены: {error}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Торговая пара</p>
            <p className="text-xl font-bold mt-1">BTC-USDT</p>
            <p className="text-xs text-muted-foreground mt-1">Текущие рыночные данные OKX</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Текущая цена закрытия OKX</p>
            <p className="text-xl font-bold font-mono mt-1">{formatMoney(lastCandle?.close)}</p>
            <p className="text-xs text-muted-foreground mt-1">{lastCandle ? formatDate(lastCandle.ts) : "Нет market_data"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Прогнозная логарифмическая доходность</p>
            <p className={`text-xl font-bold font-mono mt-1 ${
              (latestForecast?.predicted_log_return ?? 0) > 0 ? "text-emerald-400" :
              (latestForecast?.predicted_log_return ?? 0) < 0 ? "text-red-400" : ""
            }`}>
              {formatLogReturn(latestForecast?.predicted_log_return)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Ретропрогон на {formatStrategyDate(latestForecast?.ts)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Прогнозная цена закрытия</p>
            <p className="text-xl font-bold font-mono mt-1">{formatMoney(latestForecast?.predicted_close)}</p>
            <p className="text-xs text-muted-foreground mt-1">Последний прогноз ретроспективного прогона</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Последнее решение ретроспективного прогона</CardTitle>
          </CardHeader>
          <CardContent>
            {latestDecision ? (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                  {decisionIcons[latestDecision.decision_type] ?? <ArrowRight className="h-3 w-3" />}
                </div>
                <div>
                  <Badge variant="outline" className={decisionColors[latestDecision.decision_type] ?? "bg-secondary text-muted-foreground border-border"}>
                    {latestDecision.decision_type.toUpperCase()}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    Дата решения: {formatStrategyDate(latestDecision.ts)}
                  </p>
                  {latestDecision.reason && <p className="text-xs text-muted-foreground mt-1">{latestDecision.reason}</p>}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                В серверной части пока нет торгового решения. Mock decisions не отображаются.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Статус торгового API OKX</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                status === "connected" ? "bg-emerald-500/20" :
                status === "error" ? "bg-red-500/20" : "bg-amber-500/20"
              }`}>
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <Badge variant="outline" className={
                  status === "connected" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                  status === "error" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                  "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }>
                  {status === "connected" ? "Подключено" : status === "error" ? "Ошибка" : "Не подключено"}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  Торговый API OKX не подключен. Реальные заявки на биржу не отправляются; операции ниже взяты из ретроспективного прогона, сохранённого в БД.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Последние торговые решения</CardTitle>
              <CardDescription>Выбранный ретроспективный прогон из БД</CardDescription>
            </div>
            <TrendingUp className="h-5 w-5 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Загрузка...</p>
            ) : decisions.length > 0 ? (
              <div className="space-y-3">
                {decisions.map((decision) => (
                  <div key={decision.id} className="flex items-center justify-between gap-3 rounded-lg bg-secondary/50 p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Badge variant="outline" className={decisionColors[decision.decision_type] ?? ""}>
                        {decision.decision_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground truncate">
                        ID решения {decision.id}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{formatStrategyDate(decision.ts)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">История решений пуста. Mock rows не подставляются.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Последние операции стратегии</CardTitle>
              <CardDescription>Операции ретроспективного прогона, сохранённые в БД</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-xs" asChild>
              <Link href="/dashboard/operations">Все операции</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>№</TableHead>
                  <TableHead>Сторона</TableHead>
                  <TableHead className="text-right">Цена</TableHead>
                  <TableHead className="text-right">Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operations.length > 0 ? (
                  operations.map((operation) => (
                    <TableRow key={operation.id}>
                      <TableCell className="font-mono text-xs">{operation.operation_no ?? operation.id}</TableCell>
                      <TableCell className="font-medium text-sm">{operation.side}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatMoney(operation.price)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={statusColors[operation.status] ?? ""}>
                          {operation.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                      Операций нет. Mock operations не отображаются.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
