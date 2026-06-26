"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  TrendingUp,
  ArrowDownRight,
  Target,
  BarChart3,
  Download,
} from "lucide-react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from "recharts"

const equityData = [
  { d: "01.01", equity: 10000, benchmark: 10000 },
  { d: "15.01", equity: 10320, benchmark: 10150 },
  { d: "01.02", equity: 10850, benchmark: 10400 },
  { d: "15.02", equity: 10600, benchmark: 10350 },
  { d: "01.03", equity: 11200, benchmark: 10700 },
  { d: "15.03", equity: 11850, benchmark: 10600 },
  { d: "01.04", equity: 12100, benchmark: 11000 },
  { d: "15.04", equity: 12450, benchmark: 11200 },
]

const monthlyPnl = [
  { month: "Окт", pnl: 820 },
  { month: "Ноя", pnl: -340 },
  { month: "Дек", pnl: 1150 },
  { month: "Янв", pnl: 640 },
  { month: "Фев", pnl: -180 },
  { month: "Мар", pnl: 1420 },
  { month: "Апр", pnl: 930 },
]

function EquityTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border/50 bg-background p-3 shadow-xl text-xs">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.dataKey === "equity" ? "Стратегия" : "BTC Hold"}:{" "}
          ${p.value.toLocaleString("ru-RU")}
        </p>
      ))}
    </div>
  )
}

function PnlTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const val = payload[0].value
  return (
    <div className="rounded-lg border border-border/50 bg-background p-3 shadow-xl text-xs">
      <p className="font-medium">{label}</p>
      <p className={val >= 0 ? "text-emerald-500" : "text-red-500"}>
        {val >= 0 ? "+" : ""}${val.toLocaleString("ru-RU")}
      </p>
    </div>
  )
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<"3m" | "6m" | "1y">("6m")

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Отчёты
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Эффективность торговли и сравнение с benchmark
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Экспорт CSV
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Общий PnL</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500 shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">+$2,450</div>
            <p className="text-xs text-muted-foreground">+24.5% за период</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Target className="h-4 w-4 text-blue-500 shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">68.5%</div>
            <p className="text-xs text-muted-foreground">142 / 207 сделок</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Profit Factor</CardTitle>
            <BarChart3 className="h-4 w-4 text-indigo-500 shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1.85</div>
            <p className="text-xs text-muted-foreground">Прибыль / Убыток</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Макс. просадка</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-red-500 shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">-4.2%</div>
            <p className="text-xs text-muted-foreground">14 янв 2024</p>
          </CardContent>
        </Card>
      </div>

      {/* Equity curve */}
      <Card className="bg-card/50">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base">Кривая доходности</CardTitle>
            <CardDescription>Стратегия vs BTC Buy & Hold</CardDescription>
          </div>
          <div className="flex gap-1">
            {(["3m", "6m", "1y"] as const).map((p) => (
              <Button
                key={p}
                variant={period === p ? "default" : "ghost"}
                size="sm"
                onClick={() => setPeriod(p)}
                className={period === p ? "bg-indigo-600 hover:bg-indigo-700 text-white" : ""}
              >
                {p === "3m" ? "3 мес" : p === "6m" ? "6 мес" : "1 год"}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={equityData}>
              <defs>
                <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="d" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<EquityTooltip />} />
              <Area
                type="monotone"
                dataKey="equity"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#eqGrad)"
              />
              <Area
                type="monotone"
                dataKey="benchmark"
                stroke="#64748b"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                fill="none"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly PnL */}
      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle className="text-base">PnL по месяцам</CardTitle>
          <CardDescription>Прибыль / убыток в USDT</CardDescription>
        </CardHeader>
        <CardContent className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyPnl}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip content={<PnlTooltip />} />
              <Bar
                dataKey="pnl"
                radius={[4, 4, 0, 0]}
                fill="#6366f1"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Legend row */}
      <div className="flex flex-wrap gap-6 text-sm text-muted-foreground px-1">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-indigo-500" />
          Стратегия
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-slate-500" />
          BTC Buy & Hold (benchmark)
        </span>
      </div>
    </div>
  )
}
