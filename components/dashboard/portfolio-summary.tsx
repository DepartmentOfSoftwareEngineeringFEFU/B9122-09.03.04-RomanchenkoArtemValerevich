import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpRight, DollarSign, Wallet, Activity } from "lucide-react"

export function PortfolioSummary() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground truncate">Общий баланс</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">$12,345.67</div>
          <p className="text-xs text-emerald-500 flex items-center mt-1">
            <ArrowUpRight className="h-3 w-3 mr-1 shrink-0" />
            <span className="truncate">+2.5% за месяц</span>
          </p>
        </CardContent>
      </Card>
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground truncate">PnL за 24ч</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-500">+$245.00</div>
          <p className="text-xs text-muted-foreground mt-1 truncate">Дневная прибыль</p>
        </CardContent>
      </Card>
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground truncate">Открытые позиции</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground shrink-0" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">4</div>
          <p className="text-xs text-muted-foreground mt-1 truncate">2 Long, 2 Short</p>
        </CardContent>
      </Card>
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground truncate">Активная стратегия</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-400 truncate">LSTM-Hybrid</div>
          <p className="text-xs text-emerald-500 flex items-center mt-1 truncate">Работает</p>
        </CardContent>
      </Card>
    </div>
  )
}
