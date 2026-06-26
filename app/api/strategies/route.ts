import { NextResponse } from "next/server"
import { strategies } from "@/data/strategies"

export async function GET() {
  return NextResponse.json({ strategies })
}
