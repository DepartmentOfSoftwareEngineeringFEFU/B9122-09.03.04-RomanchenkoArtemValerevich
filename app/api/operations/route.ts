import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/server/auth"
import { ensureCoreData } from "@/lib/server/core-data"
import { prisma } from "@/lib/server/prisma"
import { normalizeSymbol } from "@/lib/server/symbols"
import { serializeOperation } from "@/lib/server/serializers"

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await ensureCoreData(user.id)
  const { searchParams } = new URL(request.url)
  const instrument = searchParams.get("instrument") || searchParams.get("symbol")
  const side = searchParams.get("side")
  const status = searchParams.get("status")
  const orderType = searchParams.get("order_type")
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const limit = Math.min(Number(searchParams.get("limit") || 100), 500)
  const offset = Math.max(Number(searchParams.get("offset") || 0), 0)
  const normalized = normalizeSymbol(instrument)

  const result = await prisma.tradeOperation.findMany({
    where: {
      userId: user.id,
      ...(side ? { side } : {}),
      ...(status ? { status } : {}),
      ...(orderType ? { orderType } : {}),
      ...(normalized ? { crypto: { slug: normalized.slug } } : {}),
      ...(from || to
        ? {
            ts: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    include: { crypto: true },
    orderBy: { ts: "desc" },
    take: Number.isFinite(limit) && limit > 0 ? limit : 100,
    skip: Number.isFinite(offset) ? offset : 0,
  })

  const data = result.map((operation) => serializeOperation(operation, operation.crypto.ticker))

  return NextResponse.json({ success: true, data, operations: data })
}
