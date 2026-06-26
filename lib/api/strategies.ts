/**
 * Strategies API endpoints
 */

import { api } from "./client"
import type { Strategy } from "@/types"

interface UpdateStrategyRequest {
  active?: boolean
  autoTrading?: boolean
  riskLevel?: "Low" | "Medium" | "High"
  parameters?: {
    timeframe?: string
    stopLoss?: number
    takeProfit?: number
  }
}

export const strategiesApi = {
  getAll: () => api.get<Strategy[]>("/strategies"),

  getById: (id: string) => api.get<Strategy>(`/strategies/${id}`),

  update: (id: string, data: UpdateStrategyRequest) => api.put<Strategy>(`/strategies/${id}`, data),
}
