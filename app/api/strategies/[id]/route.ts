import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/server/auth"
import { ensureCoreData, ensureUserStrategy } from "@/lib/server/core-data"
import { prisma } from "@/lib/server/prisma"
import { readJson } from "@/lib/server/api"
import { normalizePctInput, serializeStrategyConfig } from "@/lib/server/strategy-config"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const setting = await findSetting(user.id, id)
  if (!setting) return NextResponse.json({ success: false, error: "Стратегия не найдена" }, { status: 404 })

  return NextResponse.json({
    success: true,
    data: serializeStrategyConfig(setting, setting.crypto),
  })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const setting = await findSetting(user.id, id)
  if (!setting) return NextResponse.json({ success: false, error: "Стратегия не найдена" }, { status: 404 })

  const body = await readJson<Record<string, unknown>>(request)
  const data = settingsUpdateData(body)
  const updated = await prisma.strategySetting.update({
    where: { id: setting.id },
    data,
    include: { crypto: true },
  })

  return NextResponse.json({
    success: true,
    data: serializeStrategyConfig(updated, updated.crypto),
  })
}

async function findSetting(userId: number, id: string) {
  const { crypto } = await ensureCoreData(userId)
  if (id === "lstm-btc-usdt") {
    await ensureUserStrategy(userId, crypto.id)
    return prisma.strategySetting.findFirst({
      where: { userId, cryptoId: crypto.id },
      include: { crypto: true },
      orderBy: { id: "asc" },
    })
  }

  return prisma.strategySetting.findFirst({
    where: { id: Number(id), userId },
    include: { crypto: true },
  })
}

function settingsUpdateData(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {}
  if (body.is_active != null || body.active != null) data.isActive = Boolean(body.is_active ?? body.active)
  if (body.noise_threshold != null) data.noiseThreshold = Number(body.noise_threshold)
  if (body.stop_loss_pct != null) data.stopLossPct = normalizePctInput(body.stop_loss_pct)
  if (body.take_profit_pct != null) data.takeProfitPct = normalizePctInput(body.take_profit_pct)
  if (body.max_operation_amount != null) data.maxOperationAmount = Number(body.max_operation_amount)
  return data
}
