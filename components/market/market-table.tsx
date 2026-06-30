"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { OhlcvDataPoint, TradingPair } from "@/types"

type ApiPayload<T> = {
  success: boolean
  data?: T
  error?: string
}

type MarketRow = TradingPair & {
  price: number | null
  change: number | null
  volume: number | null
  dataStatus: "ready" | "empty" | "error"
}

async function readApiData<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null) as ApiPayload<T> | null
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error ?? response.statusText)
  }
  return payload.data as T
}

function slugForTicker(ticker: string) {
  return ticker.split("-")[0].toLowerCase()
}

export function MarketTable() {
  const [searchTerm, setSearchTerm] = useState("")
  const [rows, setRows] = useState<MarketRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadRows() {
      setIsLoading(true)
      setError(null)

      try {
        const assets = await readApiData<TradingPair[]>(await fetch("/api/market/assets"))
        const loadedRows = await Promise.all(
          assets.map(async (asset) => {
            try {
              const candles = await readApiData<OhlcvDataPoint[]>(
                await fetch(`/api/market/${slugForTicker(asset.ticker)}/candles?limit=2`),
              )
              const last = candles[candles.length - 1]
              const previous = candles[candles.length - 2]
              const change = last && previous && previous.close !== 0
                ? ((last.close - previous.close) / previous.close) * 100
                : null

              return {
                ...asset,
                price: last?.close ?? null,
                change,
                volume: last?.volume ?? null,
                dataStatus: last ? "ready" as const : "empty" as const,
              }
            } catch {
              return {
                ...asset,
                price: null,
                change: null,
                volume: null,
                dataStatus: "error" as const,
              }
            }
          }),
        )

        if (!cancelled) setRows(loadedRows)
      } catch (loadError) {
        if (!cancelled) {
          setRows([])
          setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить инструменты")
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadRows()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredData = useMemo(() => {
    return rows.filter((item) => {
      const query = searchTerm.toLowerCase()
      return item.name.toLowerCase().includes(query) || item.ticker.toLowerCase().includes(query)
    })
  }, [rows, searchTerm])

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle>Криптовалюты</CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по тикеру..."
              className="pl-8"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Backend данные не загружены: {error}
          </div>
        )}

        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Тикер</TableHead>
                <TableHead>Тип инструмента</TableHead>
                <TableHead className="text-right">Последняя цена</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Изм. 24ч</TableHead>
                <TableHead className="text-right hidden md:table-cell">Объем</TableHead>
                <TableHead>Статус данных OKX</TableHead>
                <TableHead className="text-right">Действие</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Загрузка...
                  </TableCell>
                </TableRow>
              ) : filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Нет криптовалют или рыночных данных. Mock rows не подставляются.
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((item) => {
                  const isPositive = (item.change ?? 0) >= 0
                  const slug = slugForTicker(item.ticker)
                  return (
                    <TableRow key={item.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary font-bold text-xs text-muted-foreground group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors">
                            {item.ticker[0]}
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{item.ticker}</div>
                            <div className="text-xs text-muted-foreground">{item.name}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.instrument_type === "demo" ? "Demo OKX" : "Спот"}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {item.price == null ? "—" : item.price.toLocaleString("ru-RU", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className={`text-right hidden sm:table-cell font-mono ${isPositive ? "text-emerald-500" : "text-red-500"}`}>
                        {item.change == null ? "—" : `${isPositive ? "+" : ""}${item.change.toFixed(2)}%`}
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell font-mono text-muted-foreground">
                        {item.volume == null ? "—" : item.volume.toFixed(0)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          item.dataStatus === "ready"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }>
                          {item.dataStatus === "ready" ? "Данные загружены" : "Нет данных"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" asChild className="h-8">
                          <Link href={`/dashboard/market/${slug}`}>Детали</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
