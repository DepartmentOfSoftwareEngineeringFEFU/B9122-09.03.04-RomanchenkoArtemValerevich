export const SELECTED_BACKTEST_RUN_SOURCE = "selected-grid-backtest-2025-02-01_2026-01-31"
export const FACTUAL_DEMO_USER_LOGIN = "demo_user"
export const SELECTED_BACKTEST_PERIOD_START = "2025-02-01"
export const SELECTED_BACKTEST_PERIOD_END = "2026-01-31"

export const SELECTED_STRATEGY_DEFAULTS = {
  noiseThreshold: 0.001,
  stopLossPct: 0.03,
  takeProfitPct: 0.06,
  maxOperationAmount: 1000,
  maxHoldingDays: 20,
  buyRule: "forecast_only",
  sellRule: "negative_forecast_or_ema_bearish_or_risk_or_max_hold",
} as const

export const SELECTED_STRATEGY_RULES = {
  buy: "predicted_log_return > 0.001 AND no open position",
  sell:
    "open position AND (predicted_log_return < -0.001 OR EMA12 < EMA26 OR stop-loss OR take-profit OR max holding period)",
  execution:
    "market entries/exits use the strategy module price; historical report uses signal candle close and daily high/low for stop-loss/take-profit",
} as const

export function localizeRunSource(value?: string | null) {
  if (value === SELECTED_BACKTEST_RUN_SOURCE) return "сохранённые данные"
  if (value === "airflow") return "Airflow"
  if (value === "manual") return "ручной запуск"
  if (value === "system") return "системный запуск"
  return value ?? "не указан"
}
