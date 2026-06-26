import { NextResponse } from "next/server"
import { cryptocurrencies } from "@/data/market"
import type { Cryptocurrency } from "@/types"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type") // spot | futures | all
  const search = searchParams.get("q")?.toLowerCase()

  let result: Cryptocurrency[] = [...cryptocurrencies]

  if (type && type !== "all") {
    result = result.filter((c) => c.asset_type === type)
  }

  if (search) {
    result = result.filter(
      (c) =>
        c.ticker.toLowerCase().includes(search) ||
        c.name.toLowerCase().includes(search)
    )
  }

  return NextResponse.json({ instruments: result })
}
