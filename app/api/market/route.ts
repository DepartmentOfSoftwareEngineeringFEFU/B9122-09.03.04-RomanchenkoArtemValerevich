import { NextResponse } from "next/server"
import { ensureCoreData } from "@/lib/server/core-data"
import { prisma } from "@/lib/server/prisma"
import { serializeCrypto } from "@/lib/server/serializers"

export async function GET(request: Request) {
  await ensureCoreData()
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type") // spot | futures | all
  const search = searchParams.get("q")?.toLowerCase()

  const assets = await prisma.cryptocurrency.findMany({ orderBy: { id: "asc" } })
  let result = assets.map(serializeCrypto)

  if (type && type !== "all") {
    result = result.filter((c) => c.asset_type === type || c.instrument_type === type)
  }

  if (search) {
    result = result.filter(
      (c) =>
        c.ticker.toLowerCase().includes(search) ||
        c.name.toLowerCase().includes(search)
    )
  }

  return NextResponse.json({ success: true, data: result, instruments: result })
}
