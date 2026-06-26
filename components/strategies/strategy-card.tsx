"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Settings2, PlayCircle, PauseCircle } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import type { StrategyConfig } from "@/data/strategies"

interface StrategyCardProps {
  strategy: StrategyConfig
}

export function StrategyCard({ strategy }: StrategyCardProps) {
  const [isActive, setIsActive] = useState(strategy.active)

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-xl truncate min-w-0">{strategy.title}</CardTitle>
          <Switch checked={isActive} onCheckedChange={setIsActive} className="shrink-0" />
        </div>
        <CardDescription className="mt-2 line-clamp-3">{strategy.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <div className="flex flex-wrap gap-2">
          {strategy.indicators.map((ind) => (
            <Badge key={ind} variant="secondary" className="bg-blue-500/10 text-blue-400 border-0 text-xs">
              {ind}
            </Badge>
          ))}
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Таймфрейм</span>
            <span className="font-mono">{strategy.parameters.timeframe}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Окно (window_size)</span>
            <span className="font-mono">{strategy.parameters.window_size}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Горизонт</span>
            <span className="font-mono">{strategy.parameters.horizon}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Stop Loss</span>
            <span className="font-mono text-red-400">{strategy.parameters.stopLoss}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Take Profit</span>
            <span className="font-mono text-emerald-400">{strategy.parameters.takeProfit}%</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {strategy.assets.map((a) => (
            <Badge key={a} variant="outline" className="text-xs">{a}</Badge>
          ))}
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
