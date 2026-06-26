"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { activeSignals } from "@/data/signals"
import type { Signal } from "@/types"

export function SignalsTable() {
  const [isLoading, setIsLoading] = useState(true)
  const [signals, setSignals] = useState<Signal[]>([])

  useEffect(() => {
    // Simulate API fetch
    const loadData = async () => {
      setIsLoading(true)
      await new Promise((resolve) => setTimeout(resolve, 600))
      setSignals(activeSignals)
      setIsLoading(false)
    }
    loadData()
  }, [])

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle>Активные сигналы</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/50 bg-muted/30">
                <TableHead>Актив</TableHead>
                <TableHead>Сигнал</TableHead>
                <TableHead>Цена</TableHead>
                <TableHead className="hidden sm:table-cell">Уверенность</TableHead>
                <TableHead className="text-right">Время</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                      <span>Загрузка сигналов...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : signals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Нет активных сигналов.
                  </TableCell>
                </TableRow>
              ) : (
                signals.map((signal) => (
                  <TableRow key={signal.id} className="hover:bg-muted/50 border-border/50">
                    <TableCell className="font-medium text-foreground">{signal.asset}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          signal.type === "Buy" ? "default" : signal.type === "Sell" ? "destructive" : "secondary"
                        }
                        className={
                          signal.type === "Buy"
                            ? "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 border-0"
                            : signal.type === "Sell"
                              ? "bg-red-500/15 text-red-500 hover:bg-red-500/25 border-0"
                              : "bg-slate-700/50 text-slate-300 hover:bg-slate-700/70 border-0"
                        }
                      >
                        {signal.type === "Buy" ? "Покупка" : signal.type === "Sell" ? "Продажа" : "Держать"}
                      </Badge>
                    </TableCell>
                    <TableCell>{signal.price}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: signal.confidence }}></div>
                        </div>
                        <span className="text-xs text-muted-foreground">{signal.confidence}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-xs sm:text-sm">{signal.time}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
