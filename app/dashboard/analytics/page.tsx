"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Download, ListFilter, PackageSearch, AlertTriangle } from "lucide-react"
import { operations } from "@/data/operations"
import type { OperationStatus, OrderType } from "@/types"

const STATUS_COLORS: Record<OperationStatus, string> = {
  "открыта": "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "исполнена": "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "отменена": "bg-red-500/15 text-red-400 border-red-500/30",
  "ошибка": "bg-red-500/15 text-red-300 border-red-500/30",
}

const ORDER_TYPE_COLORS: Record<OrderType, string> = {
  "рыночный": "bg-blue-500/10 text-blue-400 border-0",
  "лимитный": "bg-amber-500/10 text-amber-400 border-0",
  "стоп-лосс": "bg-red-500/10 text-red-400 border-0",
  "тейк-профит": "bg-emerald-500/10 text-emerald-400 border-0",
}

const SIDE_COLORS: Record<string, string> = {
  "покупка": "text-emerald-400",
  "продажа": "text-red-400",
}

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | OperationStatus>("all")
  const [orderTypeFilter, setOrderTypeFilter] = useState<"all" | OrderType>("all")
  const [sideFilter, setSideFilter] = useState<"all" | "покупка" | "продажа">("all")

  const filtered = useMemo(() => {
    return operations.filter((op) => {
      if (dateFrom && op.ts < dateFrom) return false
      if (dateTo && op.ts > dateTo + " 23:59:59") return false
      if (statusFilter !== "all" && op.status !== statusFilter) return false
      if (orderTypeFilter !== "all" && op.order_type !== orderTypeFilter) return false
      if (sideFilter !== "all" && op.side !== sideFilter) return false
      return true
    })
  }, [dateFrom, dateTo, statusFilter, orderTypeFilter, sideFilter])

  // Aggregates
  const totalCount = filtered.length
  const byStatus = useMemo(() => ({
    "открыта": filtered.filter((o) => o.status === "открыта").length,
    "исполнена": filtered.filter((o) => o.status === "исполнена").length,
    "отменена": filtered.filter((o) => o.status === "отменена").length,
  }), [filtered])
  const byOrderType = useMemo(() => ({
    "рыночный": filtered.filter((o) => o.order_type === "рыночный").length,
    "лимитный": filtered.filter((o) => o.order_type === "лимитный").length,
    "стоп-лосс": filtered.filter((o) => o.order_type === "стоп-лосс").length,
    "тейк-профит": filtered.filter((o) => o.order_type === "тейк-профит").length,
  }), [filtered])
  const bySide = useMemo(() => ({
    "покупка": filtered.filter((o) => o.side === "покупка").length,
    "продажа": filtered.filter((o) => o.side === "продажа").length,
  }), [filtered])
  const totalVolume = useMemo(
    () => filtered.reduce((acc, o) => acc + o.amount, 0),
    [filtered]
  )

  function handleExportCsv() {
    const header = ["ID", "Дата и время", "Тикер", "Сторона", "Тип ордера", "Цена", "Объём", "Статус", "OKX Order ID", "Режим"]
    const rows = filtered.map((o) => [
      o.id,
      o.ts,
      o.ticker,
      o.side,
      o.order_type,
      o.price,
      o.amount,
      o.status,
      o.okx_order_id ?? "",
      o.demo ? "Demo OKX" : "Live",
    ])
    const csv = [header, ...rows].map((r) => r.join(";")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "report_operations.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleReset() {
    setDateFrom("")
    setDateTo("")
    setStatusFilter("all")
    setOrderTypeFilter("all")
    setSideFilter("all")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Отчёты
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Отчёт по торговым операциям BTC-USDT в демо-режиме OKX
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={handleExportCsv}>
          <Download className="h-4 w-4" />
          Экспорт CSV
        </Button>
      </div>

      {/* Disclaimer */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="flex items-center gap-3 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-200">
            Отчёт отображает результаты операций прототипа. ВКР не доказывает прибыльность стратегии; метрики модели не являются гарантией торгового результата.
          </p>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ListFilter className="h-4 w-4" />
            Фильтры
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">С (дата)</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-background/50"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">По (дата)</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-background/50"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Статус</label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  <SelectItem value="открыта">Открыта</SelectItem>
                  <SelectItem value="исполнена">Исполнена</SelectItem>
                  <SelectItem value="отменена">Отменена</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Тип ордера</label>
              <Select value={orderTypeFilter} onValueChange={(v) => setOrderTypeFilter(v as typeof orderTypeFilter)}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  <SelectItem value="рыночный">Рыночный</SelectItem>
                  <SelectItem value="лимитный">Лимитный</SelectItem>
                  <SelectItem value="стоп-лосс">Стоп-лосс</SelectItem>
                  <SelectItem value="тейк-профит">Тейк-профит</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Сторона</label>
              <Select value={sideFilter} onValueChange={(v) => setSideFilter(v as typeof sideFilter)}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  <SelectItem value="покупка">Покупка</SelectItem>
                  <SelectItem value="продажа">Продажа</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs">
              Сбросить фильтры
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Aggregates */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Всего операций</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">По статусам</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-xs flex justify-between">
              <span className="text-blue-400">Открыта</span>
              <span className="font-semibold">{byStatus["открыта"]}</span>
            </p>
            <p className="text-xs flex justify-between">
              <span className="text-emerald-400">Исполнена</span>
              <span className="font-semibold">{byStatus["исполнена"]}</span>
            </p>
            <p className="text-xs flex justify-between">
              <span className="text-red-400">Отменена</span>
              <span className="font-semibold">{byStatus["отменена"]}</span>
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">По типам ордеров</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-xs flex justify-between">
              <span className="text-muted-foreground">Рыночный</span>
              <span className="font-semibold">{byOrderType["рыночный"]}</span>
            </p>
            <p className="text-xs flex justify-between">
              <span className="text-muted-foreground">Лимитный</span>
              <span className="font-semibold">{byOrderType["лимитный"]}</span>
            </p>
            <p className="text-xs flex justify-between">
              <span className="text-muted-foreground">Стоп-лосс</span>
              <span className="font-semibold">{byOrderType["стоп-лосс"]}</span>
            </p>
            <p className="text-xs flex justify-between">
              <span className="text-muted-foreground">Тейк-профит</span>
              <span className="font-semibold">{byOrderType["тейк-профит"]}</span>
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Покупки / Продажи</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-xs flex justify-between">
              <span className="text-emerald-400">Покупка</span>
              <span className="font-semibold">{bySide["покупка"]}</span>
            </p>
            <p className="text-xs flex justify-between">
              <span className="text-red-400">Продажа</span>
              <span className="font-semibold">{bySide["продажа"]}</span>
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Суммарный объём</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalVolume.toLocaleString("ru-RU", { maximumFractionDigits: 4 })}</p>
            <p className="text-xs text-muted-foreground mt-1">BTC</p>
          </CardContent>
        </Card>
      </div>

      {/* Operations table */}
      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle className="text-base">Операции за период</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
              <PackageSearch className="h-10 w-10 opacity-40" />
              <p className="text-sm">Нет операций за выбранный период</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-xs w-16">ID</TableHead>
                    <TableHead className="text-xs">Дата и время</TableHead>
                    <TableHead className="text-xs">Тикер</TableHead>
                    <TableHead className="text-xs">Сторона</TableHead>
                    <TableHead className="text-xs">Тип ордера</TableHead>
                    <TableHead className="text-xs text-right">Цена</TableHead>
                    <TableHead className="text-xs text-right">Объём</TableHead>
                    <TableHead className="text-xs">Статус</TableHead>
                    <TableHead className="text-xs hidden lg:table-cell">OKX Order ID</TableHead>
                    <TableHead className="text-xs hidden xl:table-cell">Режим</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((op) => (
                    <TableRow key={op.id} className="border-border/30 hover:bg-muted/30">
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {op.id}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                        {op.ts}
                      </TableCell>
                      <TableCell className="text-xs font-semibold">
                        {op.ticker}
                      </TableCell>
                      <TableCell className={`text-xs font-medium ${SIDE_COLORS[op.side]}`}>
                        {op.side}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] ${ORDER_TYPE_COLORS[op.order_type]}`}
                        >
                          {op.order_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono">
                        {op.price.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono">
                        {op.amount.toLocaleString("ru-RU", { maximumFractionDigits: 6 })}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${STATUS_COLORS[op.status]}`}
                        >
                          {op.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs hidden lg:table-cell font-mono text-muted-foreground">
                        {op.okx_order_id ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs hidden xl:table-cell">
                        <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/20">
                          Demo OKX
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
