import { StrategyCard } from "@/components/strategies/strategy-card"
import { strategies } from "@/data/strategies"

export default function StrategiesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Стратегия</h1>
        <p className="text-muted-foreground">
          Конфигурация торговой стратегии LSTM + EMA12/EMA26.
        </p>
      </div>
      <div className="max-w-2xl">
        {strategies.map((strategy) => (
          <StrategyCard key={strategy.id} strategy={strategy} />
        ))}
      </div>
    </div>
  )
}
