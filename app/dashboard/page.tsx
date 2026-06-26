"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { tradeDecisions } from "@/data/trade-decisions"
import { operations } from "@/data/operations"
import { generateIndicators } from "@/data/market"
import { ArrowDown, ArrowRight, ArrowUp, TrendingUp } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const decisionColors: Record<string, string> = {
  "покупка": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "продажа": "bg-red-500/10 text-red-400 border-red-500/20",
  "удержание": "bg-amber-500/10 text-amber-400 border-amber-500/20",
}

const decisionIcons: Record<string, React.ReactNode> = {
  "покупка": <ArrowUp className="h-3 w-3" />,
  "продажа": <ArrowDown className="h-3 w-3" />,
  "удержание": <ArrowRight className="h-3 w-3" />,
}

const statusColors: Record<string, string> = {
  "открыта": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "исполнена": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "отменена": "bg-red-500/10 text-red-400 border-red-500/20",
}

export default function DashboardPage() {
  const latestDecisions = tradeDecisions.slice(0, 5)
  const latestOperations = operations.slice(0, 5)
  const btcIndicators = generateIndicators(1)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-balance">Панель управления</h1>
        <p className="text-muted-foreground">Актуальные торговые решения и последние операции.</p>
      </div>

      {/* Quick Indicators for BTC */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {btcIndicators.slice(0, 4).map((ind) => (
          <Card key={ind.name}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground truncate">{ind.name} (BTC)</p>
              <p className="text-lg font-bold font-mono mt-1">{ind.value.toLocaleString("ru-RU")}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Trade Decisions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Актуальные торговые решения</CardTitle>
              <CardDescription>Последние решения системы</CardDescription>
            </div>
            <TrendingUp className="h-5 w-5 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {latestDecisions.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {decisionIcons[d.decision_type]}
                      <span className="font-medium text-sm truncate">{d.ticker}</span>
                    </div>
                    <Badge variant="outline" className={decisionColors[d.decision_type]}>
                      {d.decision_type}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{d.ts.split(" ")[1]?.slice(0, 5)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Latest Operations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Последние торговые операции</CardTitle>
              <CardDescription>Статусы операций</CardDescription>
            </div>
            <Link href="/dashboard/operations">
              <Button variant="ghost" size="sm" className="text-xs">Все операции</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Тикер</TableHead>
                  <TableHead>Тип ордера</TableHead>
                  <TableHead className="text-right">Цена</TableHead>
                  <TableHead className="text-right">Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latestOperations.map((op) => (
                  <TableRow key={op.id}>
                    <TableCell className="font-medium text-sm">{op.ticker}</TableCell>
                    <TableCell className="text-sm">{op.order_type}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {op.price.toLocaleString("ru-RU", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={statusColors[op.status]}>
                        {op.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
