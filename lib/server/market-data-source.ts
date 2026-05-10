export type MarketDataSource = {
  source: "OKX"
  timeframe: string
  sourceBar: string
  timezone: string
}

export function okxBarForLstmTimeframe(timeframe: string) {
  return timeframe === "1D" ? "1Dutc" : timeframe
}

export function okxTimezoneForBar(sourceBar: string) {
  return sourceBar.toLowerCase().endsWith("utc") ? "UTC" : "Asia/Hong_Kong"
}

export function lstmMarketDataSource(timeframe: string): MarketDataSource {
  const sourceBar = okxBarForLstmTimeframe(timeframe)
  return {
    source: "OKX",
    timeframe,
    sourceBar,
    timezone: okxTimezoneForBar(sourceBar),
  }
}
