"use client"

import { useState, useEffect } from "react"
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, PieChartIcon } from "lucide-react"

const data = [
  { name: "BTC/USDT", value: 45, color: "#3B82F6" },
  { name: "ETH/USDT", value: 30, color: "#8B5CF6" },
  { name: "SOL/USDT", value: 15, color: "#10B981" },
  { name: "AVAX/USDT", value: 10, color: "#F59E0B" },
]

export function AssetDistribution() {
  const [isLoading, setIsLoading] = useState(true)
  const [chartData, setChartData] = useState<typeof data>([])

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await new Promise((resolve) => setTimeout(resolve, 700))
      setChartData(data)
      setIsLoading(false)
    }
    loadData()
  }, [])

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50 h-full">
      <CardHeader>
        <CardTitle>Распределение по активам</CardTitle>
        <CardDescription>Объём торгов по парам</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px] flex items-center justify-center">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            <span>Загрузка данных...</span>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <PieChartIcon className="h-8 w-8 text-slate-600" />
            <span>Нет данных для отображения</span>
            <span className="text-xs">Данные появятся после первых сделок</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0.1)" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "8px" }}
                itemStyle={{ color: "#e2e8f0" }}
                formatter={(value: number) => [`${value}%`, "Доля"]}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
