"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Settings2, PlayCircle, PauseCircle } from "lucide-react"
import Link from "next/link"
import type { StrategyConfig } from "@/data/strategies"

interface StrategyCardProps {
  strategy: StrategyConfig
}

export function StrategyCard({ strategy }: StrategyCardProps) {
  const isActive = strategy.active
  const pct = (value: number) => `${(value * 100).toLocaleString("ru-RU", { maximumFractionDigits: 4 })}%`

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-xl truncate min-w-0">{strategy.title}</CardTitle>
          <Badge variant="outline" className={isActive ? "text-emerald-400" : "text-muted-foreground"}>
            {isActive ? "активна" : "приостановлена"}
          </Badge>
        </div>
        <CardDescription className="mt-2 line-clamp-3">{strategy.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <div>
          <span className="text-xs text-muted-foreground">Торговая пара</span>
          <Badge variant="outline" className="ml-2">{strategy.ticker}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {strategy.indicators.map((ind) => (
            <Badge key={ind} variant="secondary" className="bg-blue-500/10 text-blue-400 border-0 text-xs">
              {ind}
            </Badge>
          ))}
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Таймфрейм модели</span>
            <span className="font-mono">{strategy.model.timeframe}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Окно модели</span>
            <span className="font-mono">{strategy.model.window_size} дней</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Форма входа</span>
            <span className="font-mono">[{strategy.model.input_shape.join(", ")}]</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">noise_threshold</span>
            <span className="font-mono">{strategy.parameters.noise_threshold}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">stop_loss_pct</span>
            <span className="font-mono text-red-400">{pct(strategy.parameters.stop_loss_pct)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">take_profit_pct</span>
            <span className="font-mono text-emerald-400">{pct(strategy.parameters.take_profit_pct)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">max_operation_amount</span>
            <span className="font-mono">{strategy.parameters.max_operation_amount} USDT</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-4 border-t border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isActive ? (
            <><PlayCircle className="h-4 w-4 text-emerald-500" /><span className="text-emerald-500">Активна</span></>
          ) : (
            <><PauseCircle className="h-4 w-4" /><span>Приостановлена</span></>
          )}
        </div>
        <Button variant="outline" size="sm" className="gap-2" asChild>
          <Link href={`/dashboard/strategies/${strategy.id}`}>
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Настроить</span>
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
