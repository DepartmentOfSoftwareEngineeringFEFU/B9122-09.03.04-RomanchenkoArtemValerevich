export const LSTM_WINDOW_SIZE = 30
export const LSTM_HORIZON = 1
export const LSTM_TIMEFRAME = "1D"
export const LSTM_FEATURES = [
  "close",
  "volume",
  "ema_12",
  "ema_26",
  "macd",
  "macd_signal",
  "macd_hist",
  "rsi",
  "bb_mid",
  "bb_upper",
  "bb_lower",
  "bb_width",
  "ret_1",
  "logret_1",
  "range_hl",
  "body_co",
  "vol_7",
  "vol_14",
  "dow",
] as const

export const LSTM_FEATURES_COUNT = LSTM_FEATURES.length
export const LSTM_INPUT_SHAPE = [1, LSTM_WINDOW_SIZE, LSTM_FEATURES_COUNT] as const
export const LSTM_TARGET = "predicted_log_return"
export const LSTM_OUTPUT_DESCRIPTION = "scaled predicted_log_return"
export const LSTM_POSTPROCESSING = "y_scaler inverse transform"

export const LSTM_MODEL_METADATA = {
  input_shape: [...LSTM_INPUT_SHAPE],
  window_size: LSTM_WINDOW_SIZE,
  horizon: LSTM_HORIZON,
  timeframe: LSTM_TIMEFRAME,
  target: LSTM_TARGET,
  output_scaled: true,
  requires_y_scaler: true,
  features_count: LSTM_FEATURES_COUNT,
}

export const LSTM_MODEL_QUALITY_METRICS = {
  rmse: { value: 2107.69756314, unit: "USDT", label: "RMSE по цене закрытия" },
  mae: { value: 1537.91571758, unit: "USDT", label: "MAE по цене закрытия" },
  mape: { value: 1.56150688, unit: "%", label: "MAPE по цене закрытия" },
  source: "selected-grid-backtest-2025-02-01_2026-01-31",
} as const

export type LstmFeature = (typeof LSTM_FEATURES)[number]
