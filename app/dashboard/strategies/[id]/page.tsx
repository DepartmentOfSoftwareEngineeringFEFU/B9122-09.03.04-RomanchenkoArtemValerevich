"use client"

import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Save, Loader2 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { findStrategyById } from "@/data/strategies"

export default function StrategyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const strategy = findStrategyById(id)
  const [isSaving, setIsSaving] = useState(false)
  const [isActive, setIsActive] = useState(strategy?.active ?? false)
  const [windowSize, setWindowSize] = useState(String(strategy?.parameters.window_size ?? 60))
  const [horizon, setHorizon] = useState(String(strategy?.parameters.horizon ?? 1))
  const [stopLoss, setStopLoss] = useState(String(strategy?.parameters.stopLoss ?? 2))
  const [takeProfit, setTakeProfit] = useState(String(strategy?.parameters.takeProfit ?? 4))
  const [maxPosition, setMaxPosition] = useState(String(strategy?.parameters.maxPositionSize ?? 1000))

  if (!strategy) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/strategies"><ArrowLeft className="mr-2 h-4 w-4" />Назад</Link>
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <h2 className="text-xl font-bold mb-2">Стратегия не найдена</h2>
            <p className="text-muted-foreground">{"Стратегия \""}{id}{"\" не существует."}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleSave = async () => {
    setIsSaving(true)
    await new Promise((r) => setTimeout(r, 800))
    setIsSaving(false)
  }

  return (
    <div className="max-w-3xl mx-auto pb-10 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/strategies"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{strategy.title}</h1>
          <p className="text-sm text-muted-foreground line-clamp-2">{strategy.description}</p>
        </div>
      </div>

      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle>Статус</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="font-medium">Стратегия {isActive ? "активна" : "приостановлена"}</p>
            <p className="text-sm text-muted-foreground">Переключите для активации / деактивации</p>
          </div>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </CardContent>
      </Card>

      {/* Indicators & Assets */}
      <Card>
        <CardHeader>
          <CardTitle>Индикаторы и активы</CardTitle>
          <CardDescription>Используемые индикаторы и торгуемые пары</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Индикаторы</Label>
            <div className="flex flex-wrap gap-2">
              {strategy.indicators.map((ind) => (
                <Badge key={ind} variant="secondary" className="bg-blue-500/10 text-blue-400 border-0">{ind}</Badge>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Активы</Label>
            <div className="flex flex-wrap gap-2">
              {strategy.assets.map((a) => (
                <Badge key={a} variant="outline">{a}</Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Model Parameters */}
      <Card>
        <CardHeader>
          <CardTitle>Параметры модели LSTM</CardTitle>
          <CardDescription>Настройки нейронной сети</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="window">window_size</Label>
            <Input id="window" type="number" value={windowSize} onChange={(e) => setWindowSize(e.target.value)} />
            <p className="text-xs text-muted-foreground">Размер скользящего окна (кол-во свечей)</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="horizon">horizon</Label>
            <Input id="horizon" type="number" value={horizon} onChange={(e) => setHorizon(e.target.value)} />
            <p className="text-xs text-muted-foreground">Горизонт прогнозирования (свечей вперёд)</p>
          </div>
          <div className="space-y-2">
            <Label>Таймфрейм</Label>
            <Input value={strategy.parameters.timeframe} disabled />
          </div>
        </CardContent>
      </Card>

      {/* Risk Management */}
      <Card>
        <CardHeader>
          <CardTitle>Управление рисками</CardTitle>
          <CardDescription>Параметры защиты капитала</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sl">Stop Loss (%)</Label>
            <Input id="sl" type="number" step="0.1" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tp">Take Profit (%)</Label>
            <Input id="tp" type="number" step="0.1" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pos">Макс. размер позиции (USDT)</Label>
            <Input id="pos" type="number" value={maxPosition} onChange={(e) => setMaxPosition(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" asChild><Link href="/dashboard/strategies">Отмена</Link></Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Сохранение...</> : <><Save className="mr-2 h-4 w-4" />Сохранить</>}
        </Button>
      </div>
    </div>
  )
}
