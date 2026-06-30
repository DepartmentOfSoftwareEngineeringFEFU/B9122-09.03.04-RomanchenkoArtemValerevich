// === Перечисления (контракт UI <-> API, Глава 2 ВКР) ===

export const DECISION_TYPES = ["покупка", "продажа", "удержание"] as const
export type DecisionType = (typeof DECISION_TYPES)[number]

export const ORDER_TYPES = ["рыночный", "лимитный", "стоп-лосс", "тейк-профит"] as const
export type OrderType = (typeof ORDER_TYPES)[number]

export const OPERATION_STATUSES = ["открыта", "исполнена", "отменена", "ошибка"] as const
export type OperationStatus = (typeof OPERATION_STATUSES)[number]

export const RISK_CHECK_STATUSES = ["разрешено", "запрещено", "не требуется"] as const
export type RiskCheckStatus = (typeof RISK_CHECK_STATUSES)[number]

export const INSTRUMENT_TYPES = ["spot", "demo"] as const
export type InstrumentType = (typeof INSTRUMENT_TYPES)[number]

// === Сущности БД (раздел 3.8 ВКР) ===

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

// Криптовалюта (в прототипе: BTC-USDT)
export type TradingPair = {
  id: number
  ticker: string // "BTC-USDT"
  name: string
  instrument_type: InstrumentType
}

// OHLCV данные
export type OhlcvDataPoint = {
  ts: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type OrderBookEntry = {
  price: number
  size: number
  order_count: number
}

export type OrderBook = {
  symbol?: string
  source?: "OKX" | "DB_SNAPSHOT" | string
  ts?: string
  snapshot_ts: string
  is_live?: boolean
  is_stale?: boolean
  stale_seconds?: number
  last_price?: number | null
  mid_price?: number | null
  sanity_diff_pct?: number | null
  asks: OrderBookEntry[]
  bids: OrderBookEntry[]
}

export type MarketData = {
  crypto_id: number
  ohlcv: OhlcvDataPoint[]
  orderbook: OrderBook
}

// Технические индикаторы
export type IndicatorValue = {
  id?: number
  indicator_id?: number
  crypto_id: number
  ts: string
  name: "EMA12" | "EMA26" | "MACD" | "MACD_signal" | "RSI" | "Bollinger_upper" | "Bollinger_lower" | string
  value: number
}

export type Indicator = {
  name: string
  value: number
}

// Модель LSTM
export type Model = {
  id: number
  name: string
  window_size: number
  horizon: number
  rmse: number
  mae: number
  mape: number
}

// Прогноз LSTM (согласно ВКР)
export type Forecast = {
  id?: number
  model_id: number
  crypto_id: number
  ts: string
  predicted_log_return: number  // логарифмическая доходность
  predicted_close: number       // восстановленная прогнозная цена
  last_close?: number           // последняя цена закрытия для справки
  actual_next_close?: number | null
  run_source?: "manual" | "airflow" | "system" | string
  created_at?: string
}

// Параметры стратегии и риск-ограничения (ВКР раздел 2)
export type StrategySettings = {
  id: number
  user_id: number
  crypto_id: number
  max_operation_amount: number  // максимальный объем операции
  noise_threshold: number       // порог отсечения шума
  stop_loss_pct: number         // стоп-лосс в процентах
  take_profit_pct: number       // тейк-профит в процентах
  is_active: boolean            // активность стратегии
  window_size: number           // размер окна LSTM
  horizon: number               // горизонт прогноза
  timeframe: string             // таймфрейм (1D, 1H и т.д.)
}

export type StrategyConfig = {
  id: string
  title: string
  description: string
  active: boolean
  ticker: string
  indicators: string[]
  model: {
    input_shape: readonly number[]
    window_size: number
    horizon: number
    timeframe: string
    target: string
    output_scaled: boolean
    requires_y_scaler: boolean
    features_count: number
  }
  parameters: StrategySettings
}

// Торговое решение (ВКР раздел 2)
export type TradeDecision = {
  id: number
  user_id?: number
  crypto_id: number
  forecast_id: number
  strategy_settings_id?: number
  ts: string
  decision_type: DecisionType
  ticker?: string
  reason?: string                          // основание решения
  raw_reason?: string
  risk_check_status?: RiskCheckStatus      // статус проверки риск-ограничений
  no_operation_reason?: string             // причина, почему операция не создана
  predicted_log_return?: number
  predicted_close?: number
  run_source?: "manual" | "airflow" | "system" | string
  created_at?: string
  forecast?: Forecast | null
  operation?: TradeOperation | null
}

// Торговая операция (демо-режим OKX)
export type TradeOperation = {
  id: number
  operation_no?: number | null
  strategy_operation_id?: string | null
  user_id?: number
  crypto_id: number
  decision_id?: number
  ticker: string                // "BTC-USDT"
  order_type: OrderType
  side: "покупка" | "продажа"   // сторона операции
  ts: string
  price: number
  amount: number
  stop_loss_price?: number | null
  take_profit_price?: number | null
  status: OperationStatus
  fee?: number | null
  trade_result?: number | null
  operation_reason?: string | null
  raw_operation_reason?: string | null
  okx_order_id?: string         // ID ордера в OKX
  okx_response_json?: unknown
  demo: boolean                 // всегда true в прототипе
  created_at?: string
  updated_at?: string
}

export type JobRun = {
  id: number
  job_name: string
  symbol: string | null
  timeframe: string | null
  run_source: "manual" | "airflow" | "system" | string
  status: "running" | "success" | "failed" | "skipped" | string
  started_at: string
  finished_at: string | null
  error_message: string | null
  created_forecast_id: number | null
  created_decision_id: number | null
  created_operation_id: number | null
  metadata_json?: unknown
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
  by_side: { покупка: number; продажа: number }
  total_volume: number
  period: string
}

// === Устаревшие типы для обратной совместимости ===
// @deprecated Использовать TradingPair
export type Cryptocurrency = TradingPair & {
  asset_type?: "spot" | "futures"
}
