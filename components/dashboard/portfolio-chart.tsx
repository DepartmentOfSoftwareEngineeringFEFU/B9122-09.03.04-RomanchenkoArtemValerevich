"use client"

import { useState, useEffect } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, TrendingUp } from "lucide-react"

function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
}

function generatePortfolioData() {
  const random = seededRandom(42)
  const data = []
  let value = 10000

  for (let i = 0; i < 12; i++) {
    const date = new Date()
    date.setDate(date.getDate() - (11 - i))
    value = value * (1 + (random() * 0.06 - 0.02))
    data.push({
      date: date.toISOString().split("T")[0],
      value: Math.round(value),
    })
  }
  return data
}

function CustomTooltip({
  active,
  payload,
  label,
}: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (active && payload && payload.length) {
    const value = payload[0].value
    const formatted = new Intl.NumberFormat("ru-RU").format(value)
    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-sm font-semibold text-foreground">{formatted} USDT</p>
      </div>
    )
  }
  return null
}

export function PortfolioChart() {
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<{ date: string; value: number }[]>([])

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await new Promise((resolve) => setTimeout(resolve, 800))
      setData(generatePortfolioData())
      setIsLoading(false)
    }
    loadData()
  }, [])

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Динамика портфеля</CardTitle>
        <CardDescription>За последние 12 дней (USDT)</CardDescription>
      </CardHeader>
      <CardContent className="h-[280px] px-2 sm:px-6">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            <span>Загрузка данных...</span>
          </div>
        ) : data.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <TrendingUp className="h-8 w-8 text-slate-600" />
            <span>Нет данных для отображения</span>
            <span className="text-xs">Данные появятся после первых операций</span>
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
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value.slice(5)}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                width={40}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1 }}
              />
              <defs>
                <linearGradient id="fillPortfolioValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <Area
                dataKey="value"
                type="natural"
                fill="url(#fillPortfolioValue)"
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
