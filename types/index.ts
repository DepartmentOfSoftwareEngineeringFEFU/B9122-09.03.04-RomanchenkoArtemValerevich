// === Перечисления (контракт UI <-> API, Глава 2) ===

export const DECISION_TYPES = ["покупка", "продажа", "удержание"] as const
export type DecisionType = (typeof DECISION_TYPES)[number]

export const ORDER_TYPES = ["рыночный", "лимитный", "стоп-лосс", "тейк-профит"] as const
export type OrderType = (typeof ORDER_TYPES)[number]

export const OPERATION_STATUSES = ["открыта", "исполнена", "отменена"] as const
export type OperationStatus = (typeof OPERATION_STATUSES)[number]

export const ASSET_TYPES = ["spot", "futures"] as const
export type AssetType = (typeof ASSET_TYPES)[number]

// === Сущности БД (раздел 3.8) ===

export type User = {
  id: number
  login: string
  email: string
  created_at: string
}

export type ApiCredentials = {
  has_credentials: boolean
  api_key_masked: string | null
  secret_key_masked: string | null
  passphrase_masked: string | null
}

export type Cryptocurrency = {
  id: number
  ticker: string
  name: string
  asset_type: AssetType
}

export type OhlcvDataPoint = {
  ts: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type OrderBookEntry = [string, string, string, string] // [price, size, liquidatedOrders, numberOfOrders]

export type OrderBook = {
  ts: string
  asks: OrderBookEntry[]
  bids: OrderBookEntry[]
}

export type MarketData = {
  crypto_id: number
  ohlcv: OhlcvDataPoint[]
  orderbook: OrderBook
}

export type Indicator = {
  name: string
  value: number
}

export type Model = {
  id: number
  name: string
  window_size: number
  horizon: number
  rmse: number
  mae: number
  mape: number
}

export type Forecast = {
  ts: string
  predicted_close: number
  crypto_id: number
  model_id: number
}

export type TradeDecision = {
  id: number
  ts: string
  decision_type: DecisionType
  crypto_id: number
  forecast_id: number
  ticker?: string
}

export type TradeOperation = {
  id: number
  crypto_id: number
  ticker?: string
  order_type: OrderType
  ts: string
  price: number
  amount: number
  status: OperationStatus
}

// === Вспомогательные типы UI ===

export type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export type OkxConnectionStatus = "connected" | "disconnected" | "error" | "checking"

// === Агрегаты для отчётов (на основе операций) ===

export type OperationsReport = {
  total_count: number
  by_status: Record<OperationStatus, number>
  by_order_type: Record<OrderType, number>
  total_volume: number
  period: string
}
