"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { cryptocurrencies, generateOhlcv } from "@/data/market"

export function MarketTable() {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  const enrichedData = cryptocurrencies.map((c) => {
    const ohlcv = generateOhlcv(c.id, 2)
    const last = ohlcv[ohlcv.length - 1]
    const prev = ohlcv[ohlcv.length - 2]
    const change = prev.close !== 0 ? ((last.close - prev.close) / prev.close) * 100 : 0
    return { ...c, price: last.close, change, volume: last.volume }
  })

  const filteredData = enrichedData.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.ticker.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTab = activeTab === "all" ? true : item.asset_type === activeTab
    return matchesSearch && matchesTab
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle>Список инструментов</CardTitle>
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
        <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-xs grid-cols-3 mb-4">
            <TabsTrigger value="all">Все</TabsTrigger>
            <TabsTrigger value="spot">Спот</TabsTrigger>
            <TabsTrigger value="futures">Фьючерсы</TabsTrigger>
          </TabsList>

          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Инструмент</TableHead>
                  <TableHead className="text-right">Цена (USDT)</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Изм. 24ч</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Объём</TableHead>
                  <TableHead className="text-right">Тип</TableHead>
                  <TableHead className="text-right">Действие</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Инструменты не найдены.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item) => {
                    const isPositive = item.change >= 0
                    const slug = item.ticker.split("/")[0].toLowerCase()
                    return (
                      <TableRow key={item.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary font-bold text-xs text-muted-foreground group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors">
                              {item.ticker[0]}
                            </div>
                            <div>
                              <div className="font-medium text-foreground">{item.name}</div>
                              <div className="text-xs text-muted-foreground">{item.ticker}</div>
                            </div>
                          </div>
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
                        <TableCell className="text-right">
                          <Badge variant="outline" className="text-xs">
                            {item.asset_type === "futures" ? "Фьючерсы" : "Спот"}
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
        </Tabs>
      </CardContent>
    </Card>
  )
}
