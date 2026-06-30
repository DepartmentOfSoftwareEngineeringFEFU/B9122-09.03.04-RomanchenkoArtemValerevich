"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { StrategyCard } from "@/components/strategies/strategy-card"
import type { StrategyConfig } from "@/types"

type ApiPayload<T> = {
  success: boolean
  data?: T
  error?: string
}

async function readApiData<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null) as ApiPayload<T> | null
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error ?? response.statusText)
  }
  return payload.data as T
}

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<StrategyConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadStrategies() {
      setIsLoading(true)
      setError(null)
      try {
        const data = await readApiData<StrategyConfig[]>(await fetch("/api/strategies"))
        if (!cancelled) setStrategies(data)
      } catch (loadError) {
        if (!cancelled) {
          setStrategies([])
          setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить стратегии")
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadStrategies()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Стратегия</h1>
      </div>
      <div className="max-w-2xl space-y-4">
        {error && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-4 text-sm text-amber-200">
              Стратегии из серверной части не загружены: {error}
            </CardContent>
          </Card>
        )}
        {isLoading ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">Загрузка...</CardContent>
          </Card>
        ) : strategies.length > 0 ? (
          strategies.map((strategy) => <StrategyCard key={strategy.id} strategy={strategy} />)
        ) : (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              В серверной части нет настроек стратегии. Mock strategy cards не подставляются.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
