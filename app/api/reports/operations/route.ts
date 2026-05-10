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
  const symbol = normalizeSymbol(searchParams.get("symbol"))
  const status = searchParams.get("status")
  const side = searchParams.get("side")
  const orderType = searchParams.get("order_type")

  const operations = await prisma.tradeOperation.findMany({
    where: {
      userId: user.id,
      ...(status ? { status } : {}),
      ...(side ? { side } : {}),
      ...(orderType ? { orderType } : {}),
      ...(symbol ? { crypto: { slug: symbol.slug } } : {}),
    },
    include: { crypto: true },
    orderBy: { ts: "desc" },
    take: 500,
  })

  const data = operations.map((operation) => serializeOperation(operation, operation.crypto.ticker))
  return NextResponse.json({ success: true, data, operations: data })
}
