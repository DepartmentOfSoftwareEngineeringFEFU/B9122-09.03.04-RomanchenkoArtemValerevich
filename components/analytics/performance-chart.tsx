"use client"

import { useState, useEffect } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, LineChart } from "lucide-react"

const pnlData = [
  { date: "Янв", pnl: 1200, volume: 45000 },
  { date: "Фев", pnl: 800, volume: 38000 },
  { date: "Мар", pnl: 2100, volume: 52000 },
  { date: "Апр", pnl: -400, volume: 31000 },
  { date: "Май", pnl: 1800, volume: 48000 },
  { date: "Июн", pnl: 2500, volume: 61000 },
  { date: "Июл", pnl: 1900, volume: 55000 },
  { date: "Авг", pnl: 3200, volume: 72000 },
]

export function PerformanceChart() {
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<typeof pnlData>([])

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await new Promise((resolve) => setTimeout(resolve, 900))
      setData(pnlData)
      setIsLoading(false)
    }
    loadData()
  }, [])

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50 h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-balance">Динамика PnL и объёма</CardTitle>
        <CardDescription>За последние 8 месяцев</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 px-2 sm:px-6">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            <span>Загрузка данных...</span>
          </div>
        ) : data.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <LineChart className="h-8 w-8 text-slate-600" />
            <span>Нет данных для отображения</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{
                left: 0,
                right: 0,
                top: 10,
                bottom: 0,
              }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.1} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} stroke="#64748b" fontSize={12} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                width={50}
                stroke="#64748b"
                fontSize={12}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#020617",
                  borderColor: "#1e293b",
                  borderRadius: "8px",
                }}
                itemStyle={{ color: "#e2e8f0" }}
                labelStyle={{ color: "#94a3b8", marginBottom: "4px" }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, "PnL"]}
              />
              <defs>
                <linearGradient id="fillPnl" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <Area
                dataKey="pnl"
                type="natural"
                fill="url(#fillPnl)"
                fillOpacity={0.4}
                stroke="#3b82f6"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
