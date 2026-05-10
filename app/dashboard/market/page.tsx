import { MarketTable } from "@/components/market/market-table"

export default function MarketPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Анализ рынка</h1>
        <p className="text-muted-foreground">Список торгуемых инструментов на бирже OKX.</p>
      </div>
      <MarketTable />
    </div>
  )
}
