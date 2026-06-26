// Стратегия: LSTM + EMA12/EMA26 + индикаторы + правила управления рисками
// Только вариации LSTM + разрешённых индикаторов (Глава 2)

export type StrategyConfig = {
  id: string
  title: string
  description: string
  active: boolean
  indicators: string[]
  assets: string[]
  parameters: {
    window_size: number
    horizon: number
    timeframe: string
    stopLoss: number
    takeProfit: number
    maxPositionSize?: number
  }
}

export const strategies: StrategyConfig[] = [
  {
    id: "lstm-ema-main",
    title: "LSTM + EMA12/EMA26",
    description:
      "Основная стратегия. Торговое решение формируется на основе прогноза нейронной сети LSTM и пересечения скользящих средних EMA12/EMA26. Прогноз цены закрытия сравнивается с текущей ценой и подтверждается индикаторами.",
    active: true,
    indicators: ["EMA12", "EMA26", "MACD", "RSI", "Полосы Боллинджера"],
    assets: ["BTC/USDT", "ETH/USDT", "SOL/USDT"],
    parameters: {
      window_size: 60,
      horizon: 1,
      timeframe: "1ч",
      stopLoss: 2.0,
      takeProfit: 4.0,
      maxPositionSize: 1000,
    },
  },
  {
    id: "lstm-scalp",
    title: "LSTM Скальпинг (EMA + RSI)",
    description:
      "Краткосрочная вариация стратегии LSTM для скальпинга. Использует меньший размер окна и горизонт прогнозирования. Подтверждение через RSI и полосы Боллинджера.",
    active: false,
    indicators: ["EMA12", "EMA26", "RSI", "Полосы Боллинджера", "Объём"],
    assets: ["BTC/USDT", "ETH/USDT"],
    parameters: {
      window_size: 30,
      horizon: 1,
      timeframe: "15м",
      stopLoss: 1.5,
      takeProfit: 3.0,
      maxPositionSize: 500,
    },
  },
]

export const findStrategyById = (id: string): StrategyConfig | undefined => {
  return strategies.find((s) => s.id === id)
}
