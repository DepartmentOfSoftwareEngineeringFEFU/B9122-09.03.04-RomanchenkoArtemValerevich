import type { PortfolioSummary, PerformanceDataPoint } from "@/types"

export const portfolioSummary: PortfolioSummary = {
  totalValue: 125750.5,
  totalValueFormatted: "$125,750.50",
  pnl24h: 2450.25,
  pnl24hFormatted: "+$2,450.25",
  pnl24hPercent: 1.99,
  pnlTotal: 25750.5,
  pnlTotalFormatted: "+$25,750.50",
  pnlTotalPercent: 25.75,
  activeStrategies: 3,
  openPositions: 5,
}

export const performanceData: PerformanceDataPoint[] = [
  { date: "Янв", portfolio: 100000, benchmark: 100000 },
  { date: "Фев", portfolio: 105200, benchmark: 102500 },
  { date: "Мар", portfolio: 98500, benchmark: 95000 },
  { date: "Апр", portfolio: 112000, benchmark: 105000 },
  { date: "Май", portfolio: 108500, benchmark: 98000 },
  { date: "Июн", portfolio: 118750, benchmark: 108000 },
  { date: "Июл", portfolio: 115000, benchmark: 102000 },
  { date: "Авг", portfolio: 122500, benchmark: 110000 },
  { date: "Сен", portfolio: 119000, benchmark: 105000 },
  { date: "Окт", portfolio: 128000, benchmark: 115000 },
  { date: "Ноя", portfolio: 132500, benchmark: 120000 },
  { date: "Дек", portfolio: 125750, benchmark: 118000 },
]

export const getPerformanceByPeriod = (period: "1M" | "3M" | "1Y"): PerformanceDataPoint[] => {
  switch (period) {
    case "1M":
      return performanceData.slice(-1)
    case "3M":
      return performanceData.slice(-3)
    case "1Y":
    default:
      return performanceData
  }
}
