"use client"

import { Area, CartesianGrid, ComposedChart, LabelList, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { OhlcvDataPoint } from "@/types"

type ChartPoint = {
  time: string
  close?: number
  predicted?: number
  isForecastPoint?: boolean
  predictedLabel?: string
}

function formatShortDate(value: string | Date) {
  return new Date(value).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })
}

function formatMoney(value: number) {
  return value.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function nextForecastDate(value: string) {
  const date = new Date(value)
  date.setUTCDate(date.getUTCDate() + 1)
  return date
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-lg border bg-background p-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-muted-foreground">{label}</p>
      {payload.map((p: any) => (
        p.value !== undefined && p.value !== null ? (
          <p key={p.dataKey} style={{ color: p.stroke }}>
            {p.dataKey === "close" ? "Цена закрытия" : "Прогнозная цена"}:{" "}
            <span className="font-mono font-semibold">
              {formatMoney(Number(p.value))}
            </span>
          </p>
        ) : null
      ))}
    </div>
  )
}

function ForecastLabel({ x, y, payload }: any) {
  if (!payload?.isForecastPoint || !payload.predictedLabel || typeof x !== "number" || typeof y !== "number") {
    return null
  }

  const text = `Прогноз ${payload.predictedLabel}`
  const width = Math.max(112, text.length * 6.5)
  const labelX = Math.max(4, x - width / 2)
  const labelY = Math.max(4, y - 34)

  return (
    <g>
      <rect
        x={labelX}
        y={labelY}
        width={width}
        height={24}
        rx={6}
        fill="hsl(160, 84%, 12%)"
        stroke="hsl(160, 84%, 39%)"
        strokeWidth={1}
      />
      <text
        x={labelX + width / 2}
        y={labelY + 16}
        textAnchor="middle"
        fill="hsl(160, 84%, 70%)"
        fontSize={11}
        fontWeight={600}
      >
        {text}
      </text>
    </g>
  )
}

interface MarketChartProps {
  ohlcv: OhlcvDataPoint[]
  forecasts?: { ts: string; predicted_close: number }[]
  forecastDisplayDate?: string | Date
  title?: string
  description?: string
}

export function MarketChart({
  ohlcv,
  forecasts,
  forecastDisplayDate,
  title = "График цены",
  description = "Динамика цены закрытия",
}: MarketChartProps) {
  if (ohlcv.length === 0) {
    return (
      <Card className="h-[400px] flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 items-center justify-center text-center text-sm text-muted-foreground">
          Нет сохраненных рыночных данных. Запустите market-sync, чтобы построить график.
        </CardContent>
      </Card>
    )
  }

  const chartData: ChartPoint[] = ohlcv.map((d) => ({
    time: formatShortDate(d.ts),
    close: d.close,
  }))

  const validForecasts = (forecasts ?? [])
    .filter((forecast) => Number.isFinite(forecast.predicted_close))
    .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())

  if (validForecasts.length > 0) {
    const lastPoint = chartData[chartData.length - 1]
    const lastCandle = ohlcv[ohlcv.length - 1]
    lastPoint.predicted = lastCandle.close

    validForecasts.forEach((forecast) => {
      chartData.push({
        time: formatShortDate(forecastDisplayDate ?? nextForecastDate(forecast.ts)),
        predicted: forecast.predicted_close,
        isForecastPoint: true,
        predictedLabel: formatMoney(forecast.predicted_close),
      })
    })
  }

  const allValues = [
    ...ohlcv.map((d) => d.close),
    ...validForecasts.map((f) => f.predicted_close),
  ]
  const minVal = Math.min(...allValues)
  const maxVal = Math.max(...allValues)
  const padding = Math.max((maxVal - minVal) * 0.08, Math.abs(maxVal) * 0.002, 1)

  return (
    <Card className="h-[400px] flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 px-2 sm:px-6 pb-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ left: 0, right: 20, top: 36, bottom: 0 }}>
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
            <Tooltip content={<CustomTooltip />} />
            <defs>
              <linearGradient id="fillClose" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="fillPredicted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
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
            {validForecasts.length > 0 && (
              <Line
                dataKey="predicted"
                type="linear"
                stroke="hsl(160, 84%, 45%)"
                strokeWidth={3}
                strokeDasharray="6 4"
                dot={{ r: 5, strokeWidth: 2, fill: "hsl(160, 84%, 45%)", stroke: "hsl(160, 84%, 95%)" }}
                activeDot={{ r: 7, strokeWidth: 2, fill: "hsl(160, 84%, 45%)", stroke: "hsl(160, 84%, 95%)" }}
                isAnimationActive={false}
              >
                <LabelList content={<ForecastLabel />} />
              </Line>
            )}
          </ComposedChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-center gap-4 pt-2 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-sm bg-blue-500" />
            <span className="text-muted-foreground">Цена закрытия</span>
          </div>
          {validForecasts.length > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-sm bg-emerald-600" />
              <span className="text-muted-foreground">Прогнозная цена</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
