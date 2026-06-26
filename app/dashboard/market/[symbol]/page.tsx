"use client"

import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { findCryptoBySlug, generateOhlcv, generateForecasts, generateIndicators, generateOrderBook } from "@/data/market"
import { MarketChart } from "@/components/market/market-chart"

export default function InstrumentPage() {
  const { symbol } = useParams<{ symbol: string }>()
  const crypto = findCryptoBySlug(symbol)

  if (!crypto) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/market"><ArrowLeft className="mr-2 h-4 w-4" />Назад к рынку</Link>
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <h2 className="text-xl font-bold mb-2">Инструмент не найден</h2>
            <p className="text-muted-foreground text-center max-w-md">
              {"Инструмент \""}{symbol}{"\" не найден в базе данных. Проверьте правильность тикера."}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const ohlcv = generateOhlcv(crypto.id, 30)
  const forecasts = generateForecasts(crypto.id, 7)
  const indicators = generateIndicators(crypto.id)
  const orderBook = generateOrderBook(crypto.id)

  const lastPrice = ohlcv[ohlcv.length - 1].close
  const prevPrice = ohlcv[ohlcv.length - 2].close
  const change = ((lastPrice - prevPrice) / prevPrice) * 100
  const isPositive = change >= 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard/market"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">{crypto.ticker}</h1>
            <Badge variant="outline">{crypto.asset_type === "futures" ? "Фьючерсы" : "Спот"}</Badge>
          </div>
          <div className="flex items-baseline gap-3 ml-12">
            <span className="text-3xl font-bold font-mono">{lastPrice.toLocaleString("ru-RU", { minimumFractionDigits: 2 })}</span>
            <span className={`font-medium font-mono ${isPositive ? "text-emerald-500" : "text-red-500"}`}>
              {isPositive ? "+" : ""}{change.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="chart" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chart">OHLCV</TabsTrigger>
          <TabsTrigger value="forecast">Прогноз LSTM</TabsTrigger>
          <TabsTrigger value="indicators">Индикаторы</TabsTrigger>
          <TabsTrigger value="orderbook">Стакан</TabsTrigger>
        </TabsList>

        <TabsContent value="chart">
          <MarketChart
            ohlcv={ohlcv}
            title={`OHLCV ${crypto.ticker}`}
            description="Данные за последние 30 дней"
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Открытие</p><p className="text-lg font-bold font-mono">{ohlcv[ohlcv.length - 1].open.toLocaleString("ru-RU")}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Макс.</p><p className="text-lg font-bold font-mono">{ohlcv[ohlcv.length - 1].high.toLocaleString("ru-RU")}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Мин.</p><p className="text-lg font-bold font-mono">{ohlcv[ohlcv.length - 1].low.toLocaleString("ru-RU")}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Объём</p><p className="text-lg font-bold font-mono">{ohlcv[ohlcv.length - 1].volume.toLocaleString("ru-RU")}</p></CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="forecast">
          <MarketChart
            ohlcv={ohlcv}
            forecasts={forecasts}
            title={`Прогноз LSTM для ${crypto.ticker}`}
            description="Историческая цена + прогноз на 7 дней"
          />
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Прогнозные значения</CardTitle>
              <CardDescription>Прогноз цены закрытия на основе модели LSTM</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead className="text-right">Прогноз (USDT)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forecasts.map((f, i) => (
                    <TableRow key={i}>
                      <TableCell>{new Date(f.ts).toLocaleDateString("ru-RU")}</TableCell>
                      <TableCell className="text-right font-mono">{f.predicted_close.toLocaleString("ru-RU", { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="indicators">
          <Card>
            <CardHeader>
              <CardTitle>Технические индикаторы</CardTitle>
              <CardDescription>EMA12, EMA26, MACD, RSI, полосы Боллинджера</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {indicators.map((ind) => (
                  <div key={ind.name} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <span className="font-medium text-sm">{ind.name}</span>
                    <span className="font-mono font-bold">{ind.value.toLocaleString("ru-RU", { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orderbook">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-red-400">Asks (Продажа)</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Цена</TableHead>
                      <TableHead className="text-right">Кол-во</TableHead>
                      <TableHead className="text-right">Заявки</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderBook.asks.map((a, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-red-400">{a[0]}</TableCell>
                        <TableCell className="text-right font-mono">{a[1]}</TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">{a[3]}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-emerald-400">Bids (Покупка)</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Цена</TableHead>
                      <TableHead className="text-right">Кол-во</TableHead>
                      <TableHead className="text-right">Заявки</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderBook.bids.map((b, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-emerald-400">{b[0]}</TableCell>
                        <TableCell className="text-right font-mono">{b[1]}</TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">{b[3]}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
