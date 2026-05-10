"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { tradeDecisions, getLatestDecision } from "@/data/trade-decisions"
import { operations } from "@/data/operations"
import { generateIndicators, generateForecasts } from "@/data/market"
import { ArrowDown, ArrowRight, ArrowUp, TrendingUp, Activity } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useApiStatus } from "@/components/providers/api-status-provider"

const decisionColors: Record<string, string> = {
  "покупка": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "продажа": "bg-red-500/10 text-red-400 border-red-500/20",
  "удержание": "bg-amber-500/10 text-amber-400 border-amber-500/20",
}

const decisionIcons: Record<string, React.ReactNode> = {
  "покупка": <ArrowUp className="h-3 w-3" />,
  "продажа": <ArrowDown className="h-3 w-3" />,
  "удержание": <ArrowRight className="h-3 w-3" />,
}

const statusColors: Record<string, string> = {
  "открыта": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "исполнена": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "отменена": "bg-red-500/10 text-red-400 border-red-500/20",
}

export default function DashboardPage() {
  const { status } = useApiStatus()
  const latestDecision = getLatestDecision()
  const latestDecisions = tradeDecisions.slice(0, 5)
  const latestOperations = operations.slice(0, 5)
  const btcIndicators = generateIndicators(1)
  const forecasts = generateForecasts(1, 1)
  const latestForecast = forecasts[0]
  const lastClose = btcIndicators.find((i) => i.name === "Цена закрытия")?.value ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-balance">Панель управления</h1>
        <p className="text-muted-foreground">Сводка текущего состояния системы BTC-USDT.</p>
      </div>

      {/* Main metrics cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Торговая пара</p>
            <p className="text-xl font-bold mt-1">BTC-USDT</p>
            <p className="text-xs text-muted-foreground mt-1">Demo OKX</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Последняя цена закрытия</p>
            <p className="text-xl font-bold font-mono mt-1">
              {lastClose.toLocaleString("ru-RU", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">USDT</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">predicted_log_return</p>
            <p className={`text-xl font-bold font-mono mt-1 ${
              (latestForecast?.predicted_log_return ?? 0) > 0 ? "text-emerald-400" : 
              (latestForecast?.predicted_log_return ?? 0) < 0 ? "text-red-400" : ""
            }`}>
              {latestForecast?.predicted_log_return?.toFixed(6) ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Прогноз LSTM</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">predicted_close</p>
            <p className="text-xl font-bold font-mono mt-1">
              {latestForecast?.predicted_close?.toLocaleString("ru-RU", { minimumFractionDigits: 2 }) ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">USDT</p>
          </CardContent>
        </Card>
      </div>

      {/* Current decision and OKX status */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Текущее торговое решение</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                latestDecision.decision_type === "покупка" ? "bg-emerald-500/20" :
                latestDecision.decision_type === "продажа" ? "bg-red-500/20" : "bg-amber-500/20"
              }`}>
                {decisionIcons[latestDecision.decision_type]}
              </div>
              <div>
                <Badge variant="outline" className={decisionColors[latestDecision.decision_type]}>
                  {latestDecision.decision_type.toUpperCase()}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">{latestDecision.reason}</p>
                {latestDecision.risk_check_status && (
                  <p className="text-xs mt-1">
                    Риск-проверка:{" "}
                    <span className={
                      latestDecision.risk_check_status === "разрешено"
                        ? "text-emerald-400"
                        : latestDecision.risk_check_status === "не требуется"
                          ? "text-muted-foreground"
                          : "text-red-400"
                    }>
                      {latestDecision.risk_check_status}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Статус торгового API OKX</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
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
                  {status === "connected"
                    ? "Private/demo API активен для операций"
                    : "Прогнозы используют public market data; для операций нужны API-ключи"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Trade Decisions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Последние торговые решения</CardTitle>
              <CardDescription>Решения системы BTC-USDT</CardDescription>
            </div>
            <TrendingUp className="h-5 w-5 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {latestDecisions.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {decisionIcons[d.decision_type]}
                      <span className="font-medium text-sm truncate">{d.ticker}</span>
                    </div>
                    <Badge variant="outline" className={decisionColors[d.decision_type]}>
                      {d.decision_type}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{d.ts.split(" ")[1]?.slice(0, 5)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Latest Operations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Последние demo-операции OKX</CardTitle>
              <CardDescription>Операции в демо-режиме</CardDescription>
            </div>
            <Link href="/dashboard/operations">
              <Button variant="ghost" size="sm" className="text-xs">Все операции</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Сторона</TableHead>
                  <TableHead>Тип ордера</TableHead>
                  <TableHead className="text-right">Цена</TableHead>
                  <TableHead className="text-right">Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latestOperations.map((op) => (
                  <TableRow key={op.id}>
                    <TableCell className="font-medium text-sm">
                      <span className={op.side === "покупка" ? "text-emerald-400" : "text-red-400"}>
                        {op.side}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{op.order_type}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {op.price.toLocaleString("ru-RU", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={statusColors[op.status]}>
                        {op.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
