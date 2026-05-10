"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { operations } from "@/data/operations"

const statusColors: Record<string, string> = {
  "открыта": "border-blue-500/50 text-blue-400",
  "исполнена": "border-emerald-500/50 text-emerald-400",
  "отменена": "border-red-500/50 text-red-400",
}

const orderTypeColors: Record<string, string> = {
  "рыночный": "bg-blue-500/10 text-blue-400 border-0",
  "лимитный": "bg-amber-500/10 text-amber-400 border-0",
  "стоп-лосс": "bg-red-500/10 text-red-400 border-0",
  "тейк-профит": "bg-emerald-500/10 text-emerald-400 border-0",
}

const sideColors: Record<string, string> = {
  "покупка": "text-emerald-400",
  "продажа": "text-red-400",
}

export function OperationsTable() {
  const [statusFilter, setStatusFilter] = useState("all")
  const [orderTypeFilter, setOrderTypeFilter] = useState("all")
  const [sideFilter, setSideFilter] = useState("all")

  const filtered = operations.filter((op) => {
    const matchStatus = statusFilter === "all" || op.status === statusFilter
    const matchType = orderTypeFilter === "all" || op.order_type === orderTypeFilter
    const matchSide = sideFilter === "all" || op.side === sideFilter
    return matchStatus && matchType && matchSide
  })

  const clearFilters = () => {
    setStatusFilter("all")
    setOrderTypeFilter("all")
    setSideFilter("all")
  }

  const hasActiveFilters = statusFilter !== "all" || orderTypeFilter !== "all" || sideFilter !== "all"

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Статус" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="открыта">Открыта</SelectItem>
            <SelectItem value="исполнена">Исполнена</SelectItem>
            <SelectItem value="отменена">Отменена</SelectItem>
          </SelectContent>
        </Select>
        <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter}>
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
              <TableHead className="w-[60px]">ID</TableHead>
              <TableHead className="hidden md:table-cell">Дата и время</TableHead>
              <TableHead>Тикер</TableHead>
              <TableHead>Сторона</TableHead>
              <TableHead>Тип ордера</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Цена</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Объём</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="hidden lg:table-cell">OKX Order ID</TableHead>
              <TableHead className="hidden xl:table-cell">Режим</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                  Операции не найдены.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((op) => (
                <TableRow key={op.id} className="group">
                  <TableCell className="font-mono text-xs text-muted-foreground">{op.id}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{op.ts}</TableCell>
                  <TableCell className="font-medium">
                    {op.ticker}
                    <div className="md:hidden text-xs text-muted-foreground mt-0.5">{op.ts.split(" ")[0]}</div>
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
                    {op.price.toLocaleString("ru-RU", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right hidden sm:table-cell font-mono">
                    {op.amount.toLocaleString("ru-RU", { minimumFractionDigits: 4 })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[op.status] || ""}>
                      {op.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell font-mono text-xs text-muted-foreground">
                    {op.okx_order_id || "—"}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-xs">
                      Demo OKX
                    </Badge>
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
