"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { OhlcvDataPoint } from "@/types"

const chartConfig = {
  close: {
    label: "Цена закрытия",
    color: "hsl(217, 91%, 60%)",
  },
  predicted: {
    label: "Прогноз LSTM",
    color: "hsl(160, 84%, 39%)",
  },
} satisfies ChartConfig

interface MarketChartProps {
  ohlcv: OhlcvDataPoint[]
  forecasts?: { ts: string; predicted_close: number }[]
  title?: string
  description?: string
}

export function MarketChart({ ohlcv, forecasts, title = "График цены", description = "Динамика цены закрытия" }: MarketChartProps) {
  const chartData = ohlcv.map((d) => ({
    time: new Date(d.ts).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }),
    close: d.close,
  }))

  if (forecasts && forecasts.length > 0) {
    forecasts.forEach((f) => {
      chartData.push({
        time: new Date(f.ts).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }),
        close: undefined as unknown as number,
        predicted: f.predicted_close,
      } as typeof chartData[number] & { predicted?: number })
    })
  }

  const allValues = [
    ...ohlcv.map((d) => d.close),
    ...(forecasts?.map((f) => f.predicted_close) || []),
  ]
  const minVal = Math.min(...allValues)
  const maxVal = Math.max(...allValues)
  const padding = (maxVal - minVal) * 0.05

  return (
    <Card className="h-[400px] flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 px-2 sm:px-6 pb-4">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <AreaChart data={chartData} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.1} />
            <XAxis dataKey="time" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
            <YAxis
              domain={[minVal - padding, maxVal + padding]}
              tickLine={false}
              axisLine={false}
              width={60}
              fontSize={11}
              tickFormatter={(v: number) => v.toLocaleString("ru-RU")}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <defs>
              <linearGradient id="fillClose" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="fillPredicted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <Area
              dataKey="close"
              type="monotone"
              fill="url(#fillClose)"
              fillOpacity={0.4}
              stroke="hsl(217, 91%, 60%)"
              strokeWidth={2}
            />
            {forecasts && (
              <Area
                dataKey="predicted"
                type="monotone"
                fill="url(#fillPredicted)"
                fillOpacity={0.3}
                stroke="hsl(160, 84%, 39%)"
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            )}
          </AreaChart>
        </ChartContainer>
        <div className="flex items-center justify-center gap-4 pt-2 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-sm bg-blue-500" />
            <span className="text-muted-foreground">Цена закрытия</span>
          </div>
          {forecasts && (
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-sm bg-emerald-600" />
              <span className="text-muted-foreground">Прогноз LSTM</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
