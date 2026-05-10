/**
 * Strategies API endpoints (согласно ВКР)
 * LSTM-стратегия BTC-USDT
 */

import { api } from "./client"
import type { StrategySettings } from "@/types"
import type { StrategyConfig } from "@/data/strategies"

interface UpdateStrategyRequest {
  is_active?: boolean
  noise_threshold?: number
  stop_loss_pct?: number
  take_profit_pct?: number
  max_operation_amount?: number
}

type UpdateStrategySettingsRequest = Pick<
  Partial<StrategySettings>,
  "is_active" | "noise_threshold" | "stop_loss_pct" | "take_profit_pct" | "max_operation_amount"
>

export const strategiesApi = {
  getAll: () => api.get<StrategyConfig[]>("/strategies"),

  getById: (id: string) => api.get<StrategyConfig>(`/strategies/${id}`),

  update: (id: string, data: UpdateStrategyRequest) => 
    api.put<StrategyConfig>(`/strategies/${id}`, data),
    
  // Получить параметры стратегии
  getSettings: (id: string) =>
    api.get<StrategySettings>(`/strategies/${id}/settings`),
    
  // Обновить параметры стратегии
  updateSettings: (id: string, data: UpdateStrategySettingsRequest) =>
    api.put<StrategySettings>(`/strategies/${id}/settings`, data),
}
