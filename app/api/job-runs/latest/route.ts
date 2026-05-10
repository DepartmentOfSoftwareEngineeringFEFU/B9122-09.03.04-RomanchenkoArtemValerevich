import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/server/auth"
import { prisma } from "@/lib/server/prisma"
import { serializeJobRun } from "@/lib/server/serializers"

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const limit = Math.min(Number(searchParams.get("limit") || 5), 20)
  const jobRuns = await prisma.jobRun.findMany({
    orderBy: [{ startedAt: "desc" }, { id: "desc" }],
    take: Number.isFinite(limit) && limit > 0 ? limit : 5,
  })

  return NextResponse.json({
    success: true,
    data: jobRuns.map(serializeJobRun),
  })
}
