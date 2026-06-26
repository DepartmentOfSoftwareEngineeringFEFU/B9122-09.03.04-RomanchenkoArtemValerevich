/**
 * Market Data API endpoints
 */

import { api } from "./client"
import type { Cryptocurrency, MarketData } from "@/types"

interface MarketAssetsParams {
  asset_type?: "spot" | "futures"
  search?: string
}

interface CandlesParams {
  interval?: "1h" | "4h" | "1d"
  from?: string
  to?: string
}

export const marketApi = {
  getAssets: (params?: MarketAssetsParams) =>
    api.get<Cryptocurrency[]>("/market/assets", { params: params as Record<string, string> }),

  getCandles: (symbol: string, params?: CandlesParams) =>
    api.get<MarketData[]>(`/market/${symbol}/candles`, { params: params as Record<string, string> }),

  getIndicators: (symbol: string, interval?: string) =>
    api.get<{ rsi: number; macd: number; ema12: number; ema26: number }>(`/market/${symbol}/indicators`, {
      params: interval ? { interval } : undefined,
    }),

  getOrderbook: (symbol: string) =>
    api.get<{ ts: string; asks: [string, string, string, string][]; bids: [string, string, string, string][] }>(
      `/market/${symbol}/orderbook`
    ),
}
