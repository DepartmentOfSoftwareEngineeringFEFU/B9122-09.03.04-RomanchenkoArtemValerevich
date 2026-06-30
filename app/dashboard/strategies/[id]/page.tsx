"use client"

import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Loader2, Save } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import type { StrategyConfig } from "@/types"
import { LSTM_MODEL_METADATA } from "@/lib/lstm-contract"
import { SELECTED_STRATEGY_DEFAULTS } from "@/lib/strategy-defaults"

type StrategyResponse = {
  success: boolean
  data?: StrategyConfig
  error?: string
}

const CONTRACT_MISMATCH_ERROR = "Strategy settings do not match LSTM preprocessor contract"
const CONTRACT_MISMATCH_MESSAGE =
  "Параметры стратегии не соответствуют активной LSTM-модели. Проверьте model/preprocessor artifact."

function readableApiError(error: unknown) {
  if (typeof error === "string") {
    return error === CONTRACT_MISMATCH_ERROR ? CONTRACT_MISMATCH_MESSAGE : error
  }

  if (error && typeof error === "object" && "error" in error && typeof error.error === "string") {
    return error.error === CONTRACT_MISMATCH_ERROR ? CONTRACT_MISMATCH_MESSAGE : error.error
  }

  return "Ошибка API"
}

function pctText(value: string) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return "Введите число"
  return `${(parsed * 100).toLocaleString("ru-RU", { maximumFractionDigits: 4 })}%`
}

export default function StrategyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [strategy, setStrategy] = useState<StrategyConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [noiseThreshold, setNoiseThreshold] = useState(String(SELECTED_STRATEGY_DEFAULTS.noiseThreshold))
  const [stopLossPct, setStopLossPct] = useState(String(SELECTED_STRATEGY_DEFAULTS.stopLossPct))
  const [takeProfitPct, setTakeProfitPct] = useState(String(SELECTED_STRATEGY_DEFAULTS.takeProfitPct))
  const [maxOperationAmount, setMaxOperationAmount] = useState("1000")

  useEffect(() => {
    let cancelled = false

    async function loadStrategy() {
      setIsLoading(true)
      setMessage(null)

      try {
        const response = await fetch(`/api/strategies/${id}`)
        const payload = await response.json().catch(() => null) as StrategyResponse | null
        if (!response.ok || !payload?.success || !payload.data) {
          throw payload ?? { error: response.statusText }
        }

        if (cancelled) return

        setStrategy(payload.data)
        setIsActive(payload.data.active)
        setNoiseThreshold(String(payload.data.parameters.noise_threshold))
        setStopLossPct(String(payload.data.parameters.stop_loss_pct))
        setTakeProfitPct(String(payload.data.parameters.take_profit_pct))
        setMaxOperationAmount(String(payload.data.parameters.max_operation_amount))
      } catch (error) {
        if (!cancelled) setMessage({ type: "error", text: readableApiError(error) })
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadStrategy()
    return () => {
      cancelled = true
    }
  }, [id])

  const model = strategy?.model ?? LSTM_MODEL_METADATA
  const modelRows = [
    ["Криптовалюта", strategy?.ticker ?? "BTC-USDT"],
    ["Таймфрейм", model.timeframe === "1D" ? "1D UTC" : model.timeframe],
    ["Окно модели", `${model.window_size} дней`],
    ["Горизонт прогноза", `${model.horizon} день`],
    ["Количество признаков", String(model.features_count)],
    ["Целевая переменная", "прогнозная логарифмическая доходность"],
    ["Форма входа", `[${model.input_shape.join(", ")}]`],
    ["Выход модели", model.output_scaled ? "масштабированная прогнозная логарифмическая доходность" : "прогнозная логарифмическая доходность"],
    ["Постобработка", model.requires_y_scaler ? "y_scaler inverse transform" : "не требуется"],
  ]

  const handleSave = async () => {
    setIsSaving(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/strategies/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noise_threshold: Number(noiseThreshold),
          stop_loss_pct: Number(stopLossPct),
          take_profit_pct: Number(takeProfitPct),
          max_operation_amount: Number(maxOperationAmount),
          is_active: isActive,
        }),
      })
      const payload = await response.json().catch(() => null) as StrategyResponse | null
      if (!response.ok || !payload?.success || !payload.data) {
        throw payload ?? { error: response.statusText }
      }

      setStrategy(payload.data)
      setIsActive(payload.data.active)
      setNoiseThreshold(String(payload.data.parameters.noise_threshold))
      setStopLossPct(String(payload.data.parameters.stop_loss_pct))
      setTakeProfitPct(String(payload.data.parameters.take_profit_pct))
      setMaxOperationAmount(String(payload.data.parameters.max_operation_amount))
      setMessage({ type: "success", text: "Настройки стратегии и риска сохранены." })
    } catch (error) {
      setMessage({ type: "error", text: readableApiError(error) })
    } finally {
      setIsSaving(false)
    }
  }

  if (!strategy && !isLoading) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/strategies"><ArrowLeft className="mr-2 h-4 w-4" />Назад</Link>
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <h2 className="text-xl font-bold mb-2">Стратегия не найдена</h2>
            <p className="text-muted-foreground">{message?.text ?? `Стратегия "${id}" не существует.`}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto pb-10 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/strategies"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{strategy?.title ?? "LSTM-стратегия BTC-USDT"}</h1>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {strategy?.description ?? "Загрузка параметров стратегии"}
          </p>
        </div>
      </div>

      {message && (
        <div className={`rounded-md border px-4 py-3 text-sm ${
          message.type === "success"
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            : "border-red-500/30 bg-red-500/10 text-red-300"
        }`}>
          {message.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Параметры активной LSTM-модели</CardTitle>
          <CardDescription>Паспорт модели, которая используется серверной частью для расчёта прогноза</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            {modelRows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-sm font-mono text-right">{value}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Эти параметры относятся к обученной LSTM-модели и не изменяются в интерфейсе. Для другого окна, таймфрейма или горизонта требуется другая заранее обученная модель.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Настройки стратегии и риска</CardTitle>
          <CardDescription>
            Эти параметры применяются после прогноза модели и влияют на торговое решение и риск-ограничения без переобучения LSTM.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-3">
            <div>
              <p className="font-medium">Стратегия {isActive ? "активна" : "приостановлена"}</p>
              <p className="text-sm text-muted-foreground">
                {isActive ? "Серверная часть может формировать торговые решения" : "Формирование решений отключено"}
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="noise">Порог прогноза</Label>
              <Input id="noise" type="number" step="0.0001" value={noiseThreshold} onChange={(event) => setNoiseThreshold(event.target.value)} />
              <p className="text-xs text-muted-foreground">Порог выбранной конфигурации: 0.001 = 0.1%</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxAmount">Размер позиции (USDT)</Label>
              <Input id="maxAmount" type="number" min="0" step="1" value={maxOperationAmount} onChange={(event) => setMaxOperationAmount(event.target.value)} />
              <p className="text-xs text-muted-foreground">Максимальный объём операции</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sl">Стоп-лосс</Label>
              <Input id="sl" type="number" step="0.001" value={stopLossPct} onChange={(event) => setStopLossPct(event.target.value)} />
              <p className="text-xs text-muted-foreground">Доля от цены: текущее значение {pctText(stopLossPct)}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tp">Тейк-профит</Label>
              <Input id="tp" type="number" step="0.001" value={takeProfitPct} onChange={(event) => setTakeProfitPct(event.target.value)} />
              <p className="text-xs text-muted-foreground">Доля от цены: текущее значение {pctText(takeProfitPct)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Криптовалюта и индикаторы</CardTitle>
          <CardDescription>Контекст стратегии</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Криптовалюта</Label>
            <Badge variant="outline" className="text-base">{strategy?.ticker ?? "BTC-USDT"}</Badge>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Индикаторы decision engine</Label>
            <div className="flex flex-wrap gap-2">
              {(strategy?.indicators ?? ["EMA12", "EMA26", "MACD", "RSI", "Volatility"]).map((indicator) => (
                <Badge key={indicator} variant="secondary" className="bg-blue-500/10 text-blue-400 border-0">
                  {indicator}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" asChild><Link href="/dashboard/strategies">Отмена</Link></Button>
        <Button onClick={handleSave} disabled={isSaving || isLoading}>
          {isSaving
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Сохранение...</>
            : <><Save className="mr-2 h-4 w-4" />Сохранить</>}
        </Button>
      </div>
    </div>
  )
}
