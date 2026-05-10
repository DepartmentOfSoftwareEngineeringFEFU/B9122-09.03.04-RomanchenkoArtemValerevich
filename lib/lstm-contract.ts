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

export type LstmFeature = (typeof LSTM_FEATURES)[number]
