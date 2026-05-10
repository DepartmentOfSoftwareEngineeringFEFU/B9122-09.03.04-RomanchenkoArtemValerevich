/**
 * Forecast API endpoints (согласно ВКР)
 * Прогнозирование LSTM для BTC-USDT
 */

import { api } from "./client"
import type { Forecast, TradeDecision, TradeOperation } from "@/types"

export const forecastApi = {
  // Получить последний прогноз
  getLatest: (symbol: string = "BTC-USDT") =>
    api.get<Forecast>(`/forecast/${symbol}/latest`),

  // Получить серию прогнозов
  getSeries: (symbol: string = "BTC-USDT", days: number = 7) =>
    api.get<Forecast[]>(`/forecast/${symbol}/series`, { params: { days: String(days) } }),

  // Запустить расчёт прогноза и формирование торгового решения
  run: (symbol: string = "BTC-USDT") =>
    api.post<{
      forecast: Forecast
      decision: TradeDecision
      operation: TradeOperation | null
    }>(`/forecast/${symbol}/run`),
}
