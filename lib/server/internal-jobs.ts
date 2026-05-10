import { timingSafeEqual } from "crypto"
import type { Prisma } from "@prisma/client"
import { prisma } from "./prisma"

export type RunSource = "manual" | "airflow" | "system"
export type JobStatus = "running" | "success" | "failed" | "skipped"

export function isValidInternalJobsToken(request: Request) {
  const expected = process.env.INTERNAL_JOBS_TOKEN
  const actual = request.headers.get("X-Internal-Jobs-Token")

  if (!expected || !actual) return false

  const expectedBuffer = Buffer.from(expected)
  const actualBuffer = Buffer.from(actual)

  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  )
}

export async function resolveInternalJobUser() {
  const configuredUserId = Number(process.env.INTERNAL_JOBS_USER_ID)
  if (Number.isFinite(configuredUserId) && configuredUserId > 0) {
    const user = await prisma.user.findUnique({ where: { id: configuredUserId } })
    if (user) return user
  }

  return prisma.user.findFirst({ orderBy: { id: "asc" } })
}

export async function startJobRun(input: {
  jobName: string
  symbol?: string | null
  timeframe?: string | null
  runSource: RunSource
  metadata?: unknown
}) {
  return prisma.jobRun.create({
    data: {
      jobName: input.jobName,
      symbol: input.symbol ?? null,
      timeframe: input.timeframe ?? null,
      runSource: input.runSource,
      status: "running",
      metadataJson: input.metadata == null ? undefined : input.metadata as Prisma.InputJsonValue,
    },
  })
}

export async function finishJobRun(input: {
  id: number
  status: Exclude<JobStatus, "running">
  errorMessage?: string | null
  forecastId?: number | null
  decisionId?: number | null
  operationId?: number | null
  metadata?: unknown
}) {
  return prisma.jobRun.update({
    where: { id: input.id },
    data: {
      status: input.status,
      finishedAt: new Date(),
      errorMessage: input.errorMessage ?? null,
      createdForecastId: input.forecastId ?? null,
      createdDecisionId: input.decisionId ?? null,
      createdOperationId: input.operationId ?? null,
      metadataJson: input.metadata == null ? undefined : input.metadata as Prisma.InputJsonValue,
    },
  })
}
