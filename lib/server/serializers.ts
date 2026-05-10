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

export function serializeForecast(forecast: Forecast) {
  return {
    id: forecast.id,
    model_id: forecast.modelId,
    crypto_id: forecast.cryptoId,
    ts: forecast.ts.toISOString(),
    last_close: numberValue(forecast.lastClose),
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
    reason: decision.reason,
    risk_check_status: decision.riskCheckStatus,
    no_operation_reason: decision.noOperationReason,
    predicted_log_return: numberValue(decision.predictedLogReturn),
    predicted_close: numberValue(decision.predictedClose),
    run_source: decision.runSource,
    created_at: decision.createdAt.toISOString(),
  }
}

export function serializeOperation(operation: TradeOperation, ticker = "BTC-USDT") {
  return {
    id: operation.id,
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
