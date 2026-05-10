import { NextResponse } from "next/server"
import { ensureCoreData } from "@/lib/server/core-data"
import { prisma } from "@/lib/server/prisma"
import { serializeCrypto } from "@/lib/server/serializers"

export async function GET(request: Request) {
  await ensureCoreData()
  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")?.toLowerCase() || searchParams.get("q")?.toLowerCase()
  const instrumentType = searchParams.get("instrument_type") || searchParams.get("type")

  let assets = (await prisma.cryptocurrency.findMany({ orderBy: { id: "asc" } })).map(serializeCrypto)

  if (instrumentType && instrumentType !== "all") {
    assets = assets.filter((asset) => asset.asset_type === instrumentType || asset.instrument_type === instrumentType)
  }

  if (search) {
    assets = assets.filter(
      (asset) => asset.ticker.toLowerCase().includes(search) || asset.slug.includes(search),
    )
  }

  return NextResponse.json({ success: true, data: assets, instruments: assets })
}
