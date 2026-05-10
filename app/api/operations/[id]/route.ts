import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/server/auth"
import { prisma } from "@/lib/server/prisma"
import { serializeOperation } from "@/lib/server/serializers"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const operation = await prisma.tradeOperation.findFirst({
    where: { id: Number(id), userId: user.id },
    include: { crypto: true },
  })

  if (!operation) {
    return NextResponse.json({ success: false, error: "Операция не найдена" }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    data: serializeOperation(operation, operation.crypto.ticker),
  })
}
