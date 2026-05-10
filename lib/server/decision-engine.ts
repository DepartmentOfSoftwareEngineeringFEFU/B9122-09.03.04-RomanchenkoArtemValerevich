export type DecisionType = "покупка" | "продажа" | "удержание"

export type EmaDecisionIndicators = {
  ema_12: number
  ema_26: number
}

export function makeDecision(input: {
  predicted_log_return: number
  noise_threshold: number
  previous: EmaDecisionIndicators
  current: EmaDecisionIndicators
}): { decision_type: DecisionType; reason: string } {
  const positiveForecast = input.predicted_log_return > input.noise_threshold
  const negativeForecast = input.predicted_log_return < -input.noise_threshold
  const bullishCross = input.previous.ema_12 <= input.previous.ema_26 && input.current.ema_12 > input.current.ema_26
  const bearishCross = input.previous.ema_12 >= input.previous.ema_26 && input.current.ema_12 < input.current.ema_26

  if (bullishCross && positiveForecast) {
    return {
      decision_type: "покупка",
      reason: "EMA12 пересекла EMA26 снизу вверх, predicted_log_return > noise_threshold",
    }
  }

  if (bearishCross && negativeForecast) {
    return {
      decision_type: "продажа",
      reason: "EMA12 пересекла EMA26 сверху вниз, predicted_log_return < -noise_threshold",
    }
  }

  if (!positiveForecast && !negativeForecast) {
    return { decision_type: "удержание", reason: "|predicted_log_return| <= noise_threshold" }
  }

  if ((positiveForecast && !bullishCross) || (negativeForecast && !bearishCross)) {
    return { decision_type: "удержание", reason: "EMA-пересечение не подтверждено" }
  }

  return { decision_type: "удержание", reason: "Условия покупки или продажи не выполнены" }
}
