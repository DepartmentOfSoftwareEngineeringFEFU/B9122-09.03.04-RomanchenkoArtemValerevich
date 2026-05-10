/**
 * Operations API endpoints (согласно ВКР)
 */

import { api } from "./client"
import type { TradeOperation, OperationStatus, OrderType } from "@/types"

interface OperationsParams {
  symbol?: string  // "BTC-USDT"
  side?: "покупка" | "продажа"
  status?: OperationStatus
  order_type?: OrderType
  from?: string
  to?: string
}

export const operationsApi = {
  getAll: (params?: OperationsParams) =>
    api.get<TradeOperation[]>("/operations", { params: params as Record<string, string> }),

  getById: (id: string) => api.get<TradeOperation>(`/operations/${id}`),
  
  // Все операции только BTC-USDT в демо-режиме
  getBySymbol: (symbol: string = "BTC-USDT") =>
    api.get<TradeOperation[]>(`/operations?symbol=${symbol}`),
}
