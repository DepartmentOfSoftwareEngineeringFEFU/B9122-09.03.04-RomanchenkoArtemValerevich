"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { tradingPairs, generateOhlcv } from "@/data/market"

export function MarketTable() {
  const [searchTerm, setSearchTerm] = useState("")

  const enrichedData = tradingPairs.map((p) => {
    const ohlcv = generateOhlcv(p.id, 2)
    const last = ohlcv[ohlcv.length - 1]
    const prev = ohlcv[ohlcv.length - 2]
    const change = prev.close !== 0 ? ((last.close - prev.close) / prev.close) * 100 : 0
    return { ...p, price: last.close, change, volume: last.volume }
  })

  const filteredData = enrichedData.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.ticker.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle>Торговые пары</CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по тикеру..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Тикер</TableHead>
                <TableHead>Тип инструмента</TableHead>
                <TableHead className="text-right">Последняя цена</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Изм. 24ч</TableHead>
                <TableHead className="text-right hidden md:table-cell">Объём</TableHead>
                <TableHead>Статус данных OKX</TableHead>
                <TableHead className="text-right">Действие</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Торговые пары не найдены.
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((item) => {
                  const isPositive = item.change >= 0
                  const isBtcUsdt = item.ticker === "BTC-USDT"
                  const slug = item.ticker.split("-")[0].toLowerCase()
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
                        <Badge variant="outline" className={
                          item.instrument_type === "demo" 
                            ? "bg-purple-500/10 text-purple-400 border-purple-500/20" 
                            : ""
                        }>
                          {item.instrument_type === "demo" ? "Demo OKX" : "Спот"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {item.price.toLocaleString("ru-RU", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className={`text-right hidden sm:table-cell font-mono ${isPositive ? "text-emerald-500" : "text-red-500"}`}>
                        {isPositive ? "+" : ""}{item.change.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell font-mono text-muted-foreground">
                        {item.volume.toFixed(0)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                          Актуально
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isBtcUsdt && (
                            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20">
                              не в прототипе
                            </Badge>
                          )}
                          <Button variant="outline" size="sm" asChild className="h-8">
                            <Link href={`/dashboard/market/${slug}`}>Детали</Link>
                          </Button>
                        </div>
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
