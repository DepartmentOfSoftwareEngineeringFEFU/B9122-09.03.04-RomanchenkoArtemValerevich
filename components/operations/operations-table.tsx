"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, X } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
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

export function OperationsTable() {
  const [statusFilter, setStatusFilter] = useState("all")
  const [orderTypeFilter, setOrderTypeFilter] = useState("all")

  const filtered = operations.filter((op) => {
    const matchStatus = statusFilter === "all" || op.status === statusFilter
    const matchType = orderTypeFilter === "all" || op.order_type === orderTypeFilter
    return matchStatus && matchType
  })

  const clearFilters = () => {
    setStatusFilter("all")
    setOrderTypeFilter("all")
  }

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
        {(statusFilter !== "all" || orderTypeFilter !== "all") && (
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
              <TableHead>Тип ордера</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Цена</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Кол-во</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Детали</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
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
                    <Badge variant="secondary" className={orderTypeColors[op.order_type] || ""}>
                      {op.order_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right hidden sm:table-cell font-mono">
                    {op.price.toLocaleString("ru-RU", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right hidden sm:table-cell font-mono">{op.amount}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[op.status] || ""}>
                      {op.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4 text-muted-foreground group-hover:text-blue-400" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Детали операции #{op.id}</DialogTitle>
                          <DialogDescription>{op.ticker} - {op.order_type}</DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-4 py-4">
                          <div><p className="text-sm text-muted-foreground">Тикер</p><p className="font-bold">{op.ticker}</p></div>
                          <div><p className="text-sm text-muted-foreground">Тип ордера</p><p className="font-medium">{op.order_type}</p></div>
                          <div><p className="text-sm text-muted-foreground">Цена</p><p className="font-mono">{op.price.toLocaleString("ru-RU", { minimumFractionDigits: 2 })}</p></div>
                          <div><p className="text-sm text-muted-foreground">Количество</p><p className="font-mono">{op.amount}</p></div>
                          <div><p className="text-sm text-muted-foreground">Статус</p><p>{op.status}</p></div>
                          <div><p className="text-sm text-muted-foreground">Дата</p><p>{op.ts}</p></div>
                          <div><p className="text-sm text-muted-foreground">crypto_id</p><p className="font-mono">{op.crypto_id}</p></div>
                        </div>
                      </DialogContent>
                    </Dialog>
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
