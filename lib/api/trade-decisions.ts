/**
 * Trade Decisions API endpoints (согласно ВКР)
 * Торговые решения для BTC-USDT
 */

import { api } from "./client"
import type { TradeDecision } from "@/types"

export const tradeDecisionsApi = {
  // Получить последние торговые решения
  getLatest: (limit: number = 10) =>
    api.get<TradeDecision[]>("/trade-decisions/latest", { params: { limit: String(limit) } }),

  // Получить торговое решение по ID прогноза
  getByForecast: (forecastId: number) =>
    api.get<TradeDecision>(`/trade-decisions/by-forecast/${forecastId}`),

  // Получить торговые решения по тикеру
  getBySymbol: (symbol: string = "BTC-USDT") =>
    api.get<TradeDecision[]>(`/trade-decisions?symbol=${symbol}`),
}
