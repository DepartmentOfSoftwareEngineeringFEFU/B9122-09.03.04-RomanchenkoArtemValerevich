import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/server/auth"
import { ensureCoreData, ensureUserStrategy } from "@/lib/server/core-data"
import { prisma } from "@/lib/server/prisma"
import { serializeStrategyConfig } from "@/lib/server/strategy-config"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { crypto } = await ensureCoreData(user.id)
  await ensureUserStrategy(user.id, crypto.id)
  const settings = await prisma.strategySetting.findMany({
    where: { userId: user.id },
    include: { crypto: true },
    orderBy: { id: "asc" },
  })
  const data = settings.map((setting) => serializeStrategyConfig(setting, setting.crypto))

  return NextResponse.json({ success: true, data, strategies: data })
}
