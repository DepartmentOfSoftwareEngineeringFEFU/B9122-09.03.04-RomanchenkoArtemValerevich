"use client"

import { useEffect, useMemo, useState } from "react"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SELECTED_BACKTEST_RUN_SOURCE } from "@/lib/strategy-defaults"
import type { OrderType, OperationStatus, TradeOperation } from "@/types"

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

const statusColors: Record<string, string> = {
  открыта: "border-blue-500/50 text-blue-400",
  исполнена: "border-emerald-500/50 text-emerald-400",
  отменена: "border-red-500/50 text-red-400",
  ошибка: "border-red-500/50 text-red-300",
}

const orderTypeColors: Record<string, string> = {
  рыночный: "bg-blue-500/10 text-blue-400 border-0",
  лимитный: "bg-amber-500/10 text-amber-400 border-0",
  "стоп-лосс": "bg-red-500/10 text-red-400 border-0",
  "тейк-профит": "bg-emerald-500/10 text-emerald-400 border-0",
}

const sideColors: Record<string, string> = {
  покупка: "text-emerald-400",
  продажа: "text-red-400",
}

function formatMoney(value: number) {
  return value.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function OperationsTable() {
  const [statusFilter, setStatusFilter] = useState<"all" | OperationStatus>("all")
  const [orderTypeFilter, setOrderTypeFilter] = useState<"all" | OrderType>("all")
  const [sideFilter, setSideFilter] = useState("all")
  const [operations, setOperations] = useState<TradeOperation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadOperations() {
      setIsLoading(true)
      setError(null)
      try {
        const data = await readApiData<TradeOperation[]>(
          await fetch(`/api/operations?symbol=btc&limit=500&run_source=${SELECTED_BACKTEST_RUN_SOURCE}`),
        )
        if (!cancelled) setOperations(data)
      } catch (loadError) {
        if (!cancelled) {
          setOperations([])
          setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить операции")
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadOperations()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    return operations.filter((op) => {
      const matchStatus = statusFilter === "all" || op.status === statusFilter
      const matchType = orderTypeFilter === "all" || op.order_type === orderTypeFilter
      const matchSide = sideFilter === "all" || op.side === sideFilter
      return matchStatus && matchType && matchSide
    })
  }, [operations, orderTypeFilter, sideFilter, statusFilter])

  const clearFilters = () => {
    setStatusFilter("all")
    setOrderTypeFilter("all")
    setSideFilter("all")
  }

  const hasActiveFilters = statusFilter !== "all" || orderTypeFilter !== "all" || sideFilter !== "all"

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-sm text-blue-100">
        Источник данных: <span className="font-mono">{SELECTED_BACKTEST_RUN_SOURCE}</span>. Торговый API OKX не подключен; показаны операции ретроспективного прогона из БД.
      </div>

      {error && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Серверная часть не загрузила операции: {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | OperationStatus)}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Статус" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="открыта">Открыта</SelectItem>
            <SelectItem value="исполнена">Исполнена</SelectItem>
            <SelectItem value="отменена">Отменена</SelectItem>
            <SelectItem value="ошибка">Ошибка</SelectItem>
          </SelectContent>
        </Select>
        <Select value={orderTypeFilter} onValueChange={(value) => setOrderTypeFilter(value as "all" | OrderType)}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Тип ордера" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            <SelectItem value="рыночный">Рыночный</SelectItem>
            <SelectItem value="лимитный">Лимитный</SelectItem>
            <SelectItem value="стоп-лосс">Стоп-лосс</SelectItem>
            <SelectItem value="тейк-профит">Тейк-профит</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sideFilter} onValueChange={setSideFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Сторона" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все стороны</SelectItem>
            <SelectItem value="покупка">Покупка</SelectItem>
            <SelectItem value="продажа">Продажа</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="ghost" size="icon" onClick={clearFilters}><X className="h-4 w-4" /></Button>
        )}
      </div>

      <div className="rounded-md border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">№ операции</TableHead>
              <TableHead className="hidden md:table-cell">Дата операции</TableHead>
              <TableHead>Тикер</TableHead>
              <TableHead>Сторона</TableHead>
              <TableHead>Тип ордера</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Цена</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Объем</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right hidden lg:table-cell">Результат</TableHead>
              <TableHead className="hidden xl:table-cell">Причина</TableHead>
              <TableHead className="hidden lg:table-cell">ID операции стратегии</TableHead>
              <TableHead className="hidden xl:table-cell">ID решения</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={12} className="h-24 text-center text-muted-foreground">
                  Загрузка...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="h-24 text-center text-muted-foreground">
                  Операции не найдены. Mock operations не отображаются.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((op) => (
                <TableRow key={op.id} className="group">
                  <TableCell className="font-mono text-xs text-muted-foreground">{op.operation_no ?? op.id}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{formatDate(op.ts)}</TableCell>
                  <TableCell className="font-medium">
                    {op.ticker}
                    <div className="md:hidden text-xs text-muted-foreground mt-0.5">{formatDate(op.ts)}</div>
                  </TableCell>
                  <TableCell>
                    <span className={sideColors[op.side] || ""}>{op.side}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={orderTypeColors[op.order_type] || ""}>
                      {op.order_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right hidden sm:table-cell font-mono">
                    {formatMoney(op.price)}
                  </TableCell>
                  <TableCell className="text-right hidden sm:table-cell font-mono">
                    {op.amount.toLocaleString("ru-RU", { minimumFractionDigits: 4, maximumFractionDigits: 8 })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[op.status] || ""}>
                      {op.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right hidden lg:table-cell font-mono">
                    {op.trade_result == null ? "—" : formatMoney(op.trade_result)}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">
                    {op.operation_reason || "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell font-mono text-xs text-muted-foreground">
                    {op.strategy_operation_id || "не создан"}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell font-mono text-xs text-muted-foreground">
                    {op.decision_id ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
