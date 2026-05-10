import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/server/auth"
import { readJson } from "@/lib/server/api"
import { prisma } from "@/lib/server/prisma"
import { encryptSecret, maskApiKey } from "@/lib/server/secrets"

export async function GET(request: NextRequest) {
  void request
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const creds = await prisma.apiCredential.findFirst({
    where: { userId: user.id, isDemo: true },
    orderBy: { id: "desc" },
  })

  if (!creds) {
    return NextResponse.json({
      configured: false,
      has_credentials: false,
      api_key_masked: null,
      secret_key_masked: null,
      passphrase_masked: null,
    })
  }

  return NextResponse.json({
    configured: true,
    has_credentials: true,
    api_key_masked: maskApiKey(creds.apiKey),
    secret_key_masked: "****",
    passphrase_masked: "****",
  })
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await readJson<{
    api_key?: string
    secret_key?: string
    apiKey?: string
    secretKey?: string
    passphrase?: string
  }>(request)
  const apiKey = String(body.api_key || body.apiKey || "").trim()
  const secretKey = String(body.secret_key || body.secretKey || "").trim()
  const passphrase = String(body.passphrase || "").trim()

  if (!apiKey || !secretKey || !passphrase) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  await prisma.apiCredential.upsert({
    where: { userId_isDemo: { userId: user.id, isDemo: true } },
    update: {
      apiKey,
      secretKeyEncrypted: encryptSecret(secretKey),
      passphraseEncrypted: encryptSecret(passphrase),
    },
    create: {
      userId: user.id,
      apiKey,
      secretKeyEncrypted: encryptSecret(secretKey),
      passphraseEncrypted: encryptSecret(passphrase),
      isDemo: true,
    },
  })

  return NextResponse.json({ saved: true })
}

export async function POST(request: NextRequest) {
  return PUT(request)
}

export async function DELETE(request: NextRequest) {
  void request
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await prisma.apiCredential.deleteMany({
    where: { userId: user.id, isDemo: true },
  })

  return NextResponse.json({ deleted: true })
}
