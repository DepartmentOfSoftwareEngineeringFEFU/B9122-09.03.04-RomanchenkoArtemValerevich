import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/server/auth"
import { getPlainOkxCredentials } from "@/lib/server/credentials"
import { fetchOkxOrderStatus } from "@/lib/server/okx"
import { mapOkxOrderStatus } from "@/lib/server/okx-status"
import { prisma } from "@/lib/server/prisma"
import { serializeOperation } from "@/lib/server/serializers"

export async function POST(
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
  if (!operation.okxOrderId) {
    return NextResponse.json({ success: false, error: "У операции нет okx_order_id" }, { status: 400 })
  }

  const credentials = await getPlainOkxCredentials(user.id)
  if (!credentials) {
    return NextResponse.json({ success: false, error: "Торговые API-ключи OKX не настроены" }, { status: 400 })
  }

  const result = await fetchOkxOrderStatus(credentials, operation.crypto.ticker, operation.okxOrderId)
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.message, okx_response_json: result.raw },
      { status: result.timeout ? 504 : 502 },
    )
  }

  const first = Array.isArray(result.data.data)
    ? (result.data.data[0] as Record<string, unknown> | undefined)
    : undefined
  const rawStatus = first?.state
  const updated = await prisma.tradeOperation.update({
    where: { id: operation.id },
    data: {
      status: mapOkxOrderStatus(rawStatus),
      okxResponseJson: {
        raw_status: String(rawStatus ?? ""),
        raw: JSON.parse(JSON.stringify(result.raw ?? null)),
      },
    },
  })

  return NextResponse.json({
    success: true,
    data: serializeOperation(updated, operation.crypto.ticker),
  })
}
