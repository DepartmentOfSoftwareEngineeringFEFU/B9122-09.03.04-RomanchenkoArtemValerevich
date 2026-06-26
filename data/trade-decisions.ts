import type { TradeDecision } from "@/types"

export const tradeDecisions: TradeDecision[] = [
  {
    id: 1,
    ts: "2026-02-19 14:00:00",
    decision_type: "покупка",
    crypto_id: 1,
    forecast_id: 101,
    ticker: "BTC/USDT",
  },
  {
    id: 2,
    ts: "2026-02-19 13:00:00",
    decision_type: "удержание",
    crypto_id: 2,
    forecast_id: 102,
    ticker: "ETH/USDT",
  },
  {
    id: 3,
    ts: "2026-02-19 12:00:00",
    decision_type: "продажа",
    crypto_id: 3,
    forecast_id: 103,
    ticker: "SOL/USDT",
  },
  {
    id: 4,
    ts: "2026-02-18 14:00:00",
    decision_type: "покупка",
    crypto_id: 5,
    forecast_id: 104,
    ticker: "XRP/USDT",
  },
  {
    id: 5,
    ts: "2026-02-18 10:00:00",
    decision_type: "удержание",
    crypto_id: 4,
    forecast_id: 105,
    ticker: "BNB/USDT",
  },
  {
    id: 6,
    ts: "2026-02-17 16:00:00",
    decision_type: "продажа",
    crypto_id: 1,
    forecast_id: 106,
    ticker: "BTC/USDT",
  },
]
