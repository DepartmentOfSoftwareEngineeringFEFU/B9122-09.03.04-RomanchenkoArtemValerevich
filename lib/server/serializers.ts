import type {
  Cryptocurrency,
  Forecast,
  JobRun,
  StrategySetting,
  TradeDecision,
  TradeOperation,
} from "@prisma/client"

function numberValue(value: unknown) {
  return Number(value)
}

function jsonObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function optionalNumber(value: unknown) {
  if (value == null || value === "") return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function optionalString(value: unknown) {
  return value == null || value === "" ? null : String(value)
}

function localizeOperationReason(value: unknown) {
  const reason = optionalString(value)
  if (reason === "buy_signal") return "сигнал покупки"
  if (reason === "ema_bearish_state") return "EMA12 < EMA26"
  if (reason === "stop_loss") return "стоп-лосс"
  if (reason === "take_profit") return "тейк-профит"
  if (reason === "negative_forecast") return "отрицательный прогноз"
  if (reason === "max_holding_period") return "максимальный срок удержания"
  return reason
}

function localizeDecisionReason(value: unknown) {
  const reason = optionalString(value)
  if (!reason) return reason

  return reason
    .replace(/\|predicted_log_return\| <= noise_threshold/g, "прогнозная логарифмическая доходность не превысила порог 0.001")
    .replace(/predicted_log_return > 0\.001/g, "прогнозная логарифмическая доходность > 0.001")
    .replace(/predicted_log_return < -0\.001/g, "прогнозная логарифмическая доходность < -0.001")
    .replace(/predicted_log_return > noise_threshold/g, "прогнозная логарифмическая доходность > порога")
    .replace(/predicted_log_return < -noise_threshold/g, "прогнозная логарифмическая доходность < -порога")
    .replace(/predicted_log_return/g, "прогнозная логарифмическая доходность")
    .replace(/noise_threshold/g, "порог 0.001")
    .replace(/no open position/g, "открытой позиции нет")
    .replace(/open position/g, "есть открытая позиция")
    .replace(/stop-loss/g, "стоп-лосс")
    .replace(/take-profit/g, "тейк-профит")
    .replace(/max holding period/g, "максимальный срок удержания")
    .replace(/\bAND\b/g, "и")
    .replace(/\bOR\b/g, "или")
}

export function serializeCrypto(crypto: Cryptocurrency) {
  return {
    id: crypto.id,
    ticker: crypto.ticker,
    slug: crypto.slug,
    asset_type: crypto.assetType,
    instrument_type: crypto.assetType === "spot" ? "demo" : crypto.assetType,
    name: crypto.ticker === "BTC-USDT" ? "Bitcoin" : crypto.ticker,
  }
}

export function serializeForecast(
  forecast: Forecast,
  extras: { actualNextClose?: number | null } = {},
) {
  return {
    id: forecast.id,
    model_id: forecast.modelId,
    crypto_id: forecast.cryptoId,
    ts: forecast.ts.toISOString(),
    last_close: numberValue(forecast.lastClose),
    actual_next_close: extras.actualNextClose ?? null,
    predicted_log_return: numberValue(forecast.predictedLogReturn),
    predicted_close: numberValue(forecast.predictedClose),
    run_source: forecast.runSource,
    created_at: forecast.createdAt.toISOString(),
  }
}

export function serializeStrategySettings(settings: StrategySetting) {
  return {
    id: settings.id,
    user_id: settings.userId,
    crypto_id: settings.cryptoId,
    window_size: settings.windowSize,
    horizon: settings.horizon,
    timeframe: settings.timeframe,
    noise_threshold: numberValue(settings.noiseThreshold),
    stop_loss_pct: numberValue(settings.stopLossPct),
    take_profit_pct: numberValue(settings.takeProfitPct),
    max_operation_amount: numberValue(settings.maxOperationAmount),
    is_active: settings.isActive,
    created_at: settings.createdAt.toISOString(),
    updated_at: settings.updatedAt.toISOString(),
  }
}

export function serializeDecision(decision: TradeDecision, ticker = "BTC-USDT") {
  return {
    id: decision.id,
    user_id: decision.userId,
    crypto_id: decision.cryptoId,
    forecast_id: decision.forecastId,
    strategy_settings_id: decision.strategySettingsId,
    ts: decision.ts.toISOString(),
    decision_type: decision.decisionType,
    ticker,
    reason: localizeDecisionReason(decision.reason),
    raw_reason: decision.reason,
    risk_check_status: decision.riskCheckStatus,
    no_operation_reason: decision.noOperationReason,
    predicted_log_return: numberValue(decision.predictedLogReturn),
    predicted_close: numberValue(decision.predictedClose),
    run_source: decision.runSource,
    created_at: decision.createdAt.toISOString(),
  }
}

export function serializeOperation(operation: TradeOperation, ticker = "BTC-USDT") {
  const okxResponse = jsonObject(operation.okxResponseJson)
  const operationNo = okxResponse ? optionalNumber(okxResponse.operation_no) : null
  const strategyOperationId = okxResponse
    ? optionalString(okxResponse.strategy_operation_id) ?? optionalString(operation.okxOrderId)
    : optionalString(operation.okxOrderId)
  const rawOperationReason = okxResponse ? optionalString(okxResponse.reason) : null

  return {
    id: operation.id,
    operation_no: operationNo,
    strategy_operation_id: strategyOperationId,
    user_id: operation.userId,
    crypto_id: operation.cryptoId,
    decision_id: operation.decisionId,
    ticker,
    order_type: operation.orderType,
    side: operation.side,
    ts: operation.ts.toISOString(),
    price: numberValue(operation.price),
    amount: numberValue(operation.amount),
    stop_loss_price: operation.stopLossPrice == null ? null : numberValue(operation.stopLossPrice),
    take_profit_price: operation.takeProfitPrice == null ? null : numberValue(operation.takeProfitPrice),
    status: operation.status,
    fee: okxResponse ? optionalNumber(okxResponse.fee) : null,
    trade_result: okxResponse ? optionalNumber(okxResponse.trade_result) : null,
    operation_reason: localizeOperationReason(rawOperationReason),
    raw_operation_reason: rawOperationReason,
    okx_order_id: operation.okxOrderId,
    okx_response_json: operation.okxResponseJson,
    demo: true,
    created_at: operation.createdAt.toISOString(),
    updated_at: operation.updatedAt.toISOString(),
  }
}

export function serializeJobRun(jobRun: JobRun) {
  return {
    id: jobRun.id,
    job_name: jobRun.jobName,
    symbol: jobRun.symbol,
    timeframe: jobRun.timeframe,
    run_source: jobRun.runSource,
    status: jobRun.status,
    started_at: jobRun.startedAt.toISOString(),
    finished_at: jobRun.finishedAt?.toISOString() ?? null,
    error_message: jobRun.errorMessage,
    created_forecast_id: jobRun.createdForecastId,
    created_decision_id: jobRun.createdDecisionId,
    created_operation_id: jobRun.createdOperationId,
    metadata_json: jobRun.metadataJson,
  }
}
