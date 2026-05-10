import type { Cryptocurrency, StrategySetting } from "@prisma/client"
import { LSTM_MODEL_METADATA } from "@/lib/lstm-contract"
import { serializeStrategySettings } from "./serializers"

export function strategyIdForCrypto(crypto: Cryptocurrency) {
  return `lstm-${crypto.slug}`
}

export function serializeStrategyConfig(settings: StrategySetting, crypto: Cryptocurrency) {
  return {
    id: strategyIdForCrypto(crypto),
    title: `LSTM-стратегия ${crypto.ticker}`,
    description:
      "Стратегия использует predicted_log_return, predicted_close, технические индикаторы и риск-ограничения для формирования решений в demo OKX.",
    active: settings.isActive,
    ticker: crypto.ticker,
    indicators: ["EMA12", "EMA26", "MACD", "RSI", "Volatility"],
    model: LSTM_MODEL_METADATA,
    parameters: serializeStrategySettings(settings),
  }
}

export function normalizePctInput(value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  return parsed > 1 ? parsed / 100 : parsed
}
