// LSTM-стратегия BTC-USDT (единственная стратегия в прототипе, согласно ВКР)

import type { StrategySettings } from "@/types"
import { LSTM_MODEL_METADATA } from "@/lib/lstm-contract"

export type StrategyConfig = {
  id: string
  title: string
  description: string
  active: boolean
  ticker: string
  indicators: string[]
  model: typeof LSTM_MODEL_METADATA
  parameters: StrategySettings
}

// Параметры стратегии по умолчанию
const defaultStrategySettings: StrategySettings = {
  id: 1,
  user_id: 1,
  crypto_id: 1,
  window_size: 30,           // размер окна LSTM (LOOKBACK)
  horizon: 1,                 // горизонт прогноза
  timeframe: "1D",            // дневной таймфрейм
  noise_threshold: 0.002,     // порог отсечения шума (0.2%)
  stop_loss_pct: 0.02,        // стоп-лосс 2%
  take_profit_pct: 0.04,      // тейк-профит 4%
  max_operation_amount: 1000, // максимальный объем операции в USDT
  is_active: true,
}

export const strategies: StrategyConfig[] = [
  {
    id: "lstm-btc-usdt",
    title: "LSTM-стратегия BTC-USDT",
    description:
      "Стратегия использует прогноз логарифмической доходности следующего периода (predicted_log_return), " +
      "восстановленную прогнозную цену закрытия (predicted_close), технические индикаторы (EMA12, EMA26, MACD, RSI, Полосы Боллинджера) " +
      "и риск-ограничения для формирования решения «покупка», «продажа» или «удержание». " +
      "Операции выполняются в демо-режиме OKX.",
    active: true,
    ticker: "BTC-USDT",
    indicators: ["EMA12", "EMA26", "MACD", "MACD signal", "RSI", "Полосы Боллинджера"],
    model: LSTM_MODEL_METADATA,
    parameters: defaultStrategySettings,
  },
]

export const findStrategyById = (id: string): StrategyConfig | undefined => {
  return strategies.find((s) => s.id === id)
}

export const getActiveStrategy = (): StrategyConfig | undefined => {
  return strategies.find((s) => s.active)
}

// Функция восстановления прогнозной цены из логарифмической доходности
export function restorePredictedClose(lastClose: number, predictedLogReturn: number): number {
  return lastClose * Math.exp(predictedLogReturn)
}

type EmaDecisionIndicators = {
  ema_12: number
  ema_26: number
}

// Функция формирования торгового решения на основе прогноза и EMA-пересечения
export function makeDecision(
  predictedLogReturn: number,
  noiseThreshold: number,
  previous?: EmaDecisionIndicators,
  current?: EmaDecisionIndicators
): "покупка" | "продажа" | "удержание" {
  if (!previous || !current) return "удержание"

  const bullishCross = previous.ema_12 <= previous.ema_26 && current.ema_12 > current.ema_26
  const bearishCross = previous.ema_12 >= previous.ema_26 && current.ema_12 < current.ema_26

  if (bullishCross && predictedLogReturn > noiseThreshold) return "покупка"
  if (bearishCross && predictedLogReturn < -noiseThreshold) return "продажа"
  return "удержание"
}
