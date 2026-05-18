import { SELECTED_STRATEGY_DEFAULTS } from "@/lib/strategy-defaults"

export type DecisionType = "покупка" | "продажа" | "удержание"

export type EmaDecisionIndicators = {
  ema_12: number
  ema_26: number
}

export function makeDecision(input: {
  predicted_log_return: number
  noise_threshold: number
  current: EmaDecisionIndicators
  previous?: EmaDecisionIndicators
  has_open_position?: boolean
  holding_days?: number | null
  max_holding_days?: number | null
}): { decision_type: DecisionType; reason: string } {
  const positiveForecast = input.predicted_log_return > input.noise_threshold
  const negativeForecast = input.predicted_log_return < -input.noise_threshold
  const bearishState = input.current.ema_12 < input.current.ema_26
  const hasOpenPosition = Boolean(input.has_open_position)
  const maxHoldingDays = input.max_holding_days ?? SELECTED_STRATEGY_DEFAULTS.maxHoldingDays
  const maxHoldingReached =
    input.holding_days != null && input.holding_days >= maxHoldingDays

  if (!hasOpenPosition && positiveForecast) {
    return {
      decision_type: "покупка",
      reason: "predicted_log_return > noise_threshold, открытой позиции нет",
    }
  }

  if (hasOpenPosition && negativeForecast) {
    return {
      decision_type: "продажа",
      reason: "Есть открытая позиция и predicted_log_return < -noise_threshold",
    }
  }

  if (hasOpenPosition && bearishState) {
    return {
      decision_type: "продажа",
      reason: "Есть открытая позиция и EMA12 < EMA26",
    }
  }

  if (hasOpenPosition && maxHoldingReached) {
    return {
      decision_type: "продажа",
      reason: "Есть открытая позиция и достигнут max holding period",
    }
  }

  if (hasOpenPosition) {
    return {
      decision_type: "удержание",
      reason: "Позиция открыта, условия выхода не выполнены",
    }
  }

  if (!positiveForecast) {
    return {
      decision_type: "удержание",
      reason: "|predicted_log_return| <= noise_threshold или прогноз отрицательный",
    }
  }

  return {
    decision_type: "удержание",
    reason: "Условия покупки или продажи не выполнены",
  }
}
