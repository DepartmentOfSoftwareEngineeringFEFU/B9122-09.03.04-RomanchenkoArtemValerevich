import { NextResponse } from "next/server"
import { operations } from "@/data/operations"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const instrument = searchParams.get("instrument")
  const side = searchParams.get("side")
  const status = searchParams.get("status")

  let result = [...operations]

  if (instrument) {
    result = result.filter((o) => o.instrument === instrument)
  }
  if (side) {
    result = result.filter((o) => o.side === side)
  }
  if (status) {
    result = result.filter((o) => o.status === status)
  }

  return NextResponse.json({ operations: result })
}
