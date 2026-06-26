/**
 * Operations API endpoints
 */

import { api } from "./client"
import type { TradeOperation } from "@/types"

interface OperationsParams {
  symbol?: string
  type?: "buy" | "sell"
  status?: "completed" | "pending" | "failed"
  from?: string
  to?: string
}

export const operationsApi = {
  getAll: (params?: OperationsParams) =>
    api.get<TradeOperation[]>("/operations", { params: params as Record<string, string> }),

  getById: (id: string) => api.get<TradeOperation>(`/operations/${id}`),
}
