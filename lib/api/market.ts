/**
 * Market Data API endpoints (согласно ВКР)
 * Символы передаются в формате OKX: BTC-USDT
 */

import { api } from "./client"
import type { TradingPair, OhlcvDataPoint, OrderBook, Indicator } from "@/types"

interface MarketAssetsParams {
  instrument_type?: "spot" | "demo"
  search?: string
}

interface CandlesParams {
  interval?: "1H" | "4H" | "1D"
  from?: string
  to?: string
}

export const marketApi = {
  // Получить список торговых пар
  getAssets: (params?: MarketAssetsParams) =>
    api.get<TradingPair[]>("/market/assets", { params: params as Record<string, string> }),

  // Получить OHLCV данные (формат OKX: BTC-USDT)
  getCandles: (symbol: string = "BTC-USDT", params?: CandlesParams) =>
    api.get<OhlcvDataPoint[]>(`/market/${symbol}/candles`, { params: params as Record<string, string> }),

  // Получить технические индикаторы
  getIndicators: (symbol: string = "BTC-USDT") =>
    api.get<Indicator[]>(`/market/${symbol}/indicators`),

  // Получить стакан заявок OKX (справочная информация)
  getOrderbook: (symbol: string = "BTC-USDT") =>
    api.get<OrderBook>(`/market/${symbol}/orderbook`),
}
