import { floor8 } from "./math"
import type { DecisionType } from "./decision-engine"

export type RiskInput = {
  decision_type: DecisionType
  latest_price: number
  stop_loss_pct: number
  take_profit_pct: number
  max_operation_amount: number
  has_credentials: boolean
  okx_connected: boolean
}

export type RiskResult = {
  risk_check_status: "разрешено" | "запрещено" | "не требуется"
  no_operation_reason: string | null
  amount: number | null
  stop_loss_price: number | null
  take_profit_price: number | null
}

export function riskNotRequiredForHold(): RiskResult {
  return {
    risk_check_status: "не требуется",
    no_operation_reason: "Решение удержание",
    amount: null,
    stop_loss_price: null,
    take_profit_price: null,
  }
}

export function runRiskCheck(input: RiskInput): RiskResult {
  if (input.decision_type === "удержание") {
    return riskNotRequiredForHold()
  }

  if (!input.has_credentials) {
    return forbidden("OKX API не подключён")
  }

  if (!Number.isFinite(input.latest_price) || input.latest_price <= 0) {
    return forbidden("Нет актуальной цены")
  }

  if (!input.okx_connected) {
    return forbidden("OKX API не подключён")
  }

  const amount = floor8(input.max_operation_amount / input.latest_price)
  if (!Number.isFinite(amount) || amount <= 0) {
    return forbidden("Не удалось рассчитать amount")
  }

  if (amount * input.latest_price > input.max_operation_amount) {
    return forbidden("Превышен лимит max_operation_amount")
  }

  const isBuy = input.decision_type === "покупка"
  const stopLossPrice = isBuy
    ? input.latest_price * (1 - input.stop_loss_pct)
    : input.latest_price * (1 + input.stop_loss_pct)
  const takeProfitPrice = isBuy
    ? input.latest_price * (1 + input.take_profit_pct)
    : input.latest_price * (1 - input.take_profit_pct)

  if (!Number.isFinite(stopLossPrice) || !Number.isFinite(takeProfitPrice)) {
    return forbidden("Не удалось рассчитать stop-loss/take-profit")
  }

  return {
    risk_check_status: "разрешено",
    no_operation_reason: null,
    amount,
    stop_loss_price: Number(stopLossPrice.toFixed(2)),
    take_profit_price: Number(takeProfitPrice.toFixed(2)),
  }
}

function forbidden(noOperationReason: string): RiskResult {
  return {
    risk_check_status: "запрещено",
    no_operation_reason: noOperationReason,
    amount: null,
    stop_loss_price: null,
    take_profit_price: null,
  }
}
