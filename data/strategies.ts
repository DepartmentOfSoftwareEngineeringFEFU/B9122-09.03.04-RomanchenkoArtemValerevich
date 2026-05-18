// LSTM-стратегия BTC-USDT (единственная стратегия в прототипе, согласно ВКР)

import type { StrategyConfig, StrategySettings } from "@/types"
import { LSTM_MODEL_METADATA } from "@/lib/lstm-contract"
import { SELECTED_STRATEGY_DEFAULTS } from "@/lib/strategy-defaults"

// Параметры стратегии по умолчанию
const defaultStrategySettings: StrategySettings = {
  id: 1,
  user_id: 1,
  crypto_id: 1,
  window_size: 30,           // размер окна LSTM (LOOKBACK)
  horizon: 1,                 // горизонт прогноза
  timeframe: "1D",            // дневной таймфрейм
  noise_threshold: SELECTED_STRATEGY_DEFAULTS.noiseThreshold,
  stop_loss_pct: SELECTED_STRATEGY_DEFAULTS.stopLossPct,
  take_profit_pct: SELECTED_STRATEGY_DEFAULTS.takeProfitPct,
  max_operation_amount: SELECTED_STRATEGY_DEFAULTS.maxOperationAmount,
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

// Функция формирования торгового решения на основе выбранной рабочей конфигурации
export function makeDecision(
  predictedLogReturn: number,
  noiseThreshold: number,
  previous?: EmaDecisionIndicators,
  current?: EmaDecisionIndicators
): "покупка" | "продажа" | "удержание" {
  if (!current) return "удержание"

  const negativeForecast = predictedLogReturn < -noiseThreshold
  const bearishState = current.ema_12 < current.ema_26

  if (predictedLogReturn > noiseThreshold) return "покупка"
  if (previous && (negativeForecast || bearishState)) return "продажа"
  return "удержание"
}
