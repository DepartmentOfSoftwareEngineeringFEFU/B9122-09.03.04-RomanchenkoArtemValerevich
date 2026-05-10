export function floorToDecimals(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return 0
  const factor = 10 ** decimals
  return Math.floor(value * factor) / factor
}

export function floor8(value: number): number {
  return floorToDecimals(value, 8)
}

export function toFiniteNumber(value: unknown): number | null {
  const next = typeof value === "number" ? value : Number(value)
  return Number.isFinite(next) ? next : null
}
