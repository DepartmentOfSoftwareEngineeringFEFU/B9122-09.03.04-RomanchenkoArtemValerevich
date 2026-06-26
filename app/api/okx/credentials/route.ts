import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

// Mock storage - в продакшене заменить на БД
const credentials = new Map<string, { api_key: string; secret_key: string; passphrase: string }>()

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const userId = cookieStore.get("user_id")?.value

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const creds = credentials.get(userId)

  if (!creds) {
    return NextResponse.json({
      has_credentials: false,
      api_key_masked: null,
      secret_key_masked: null,
      passphrase_masked: null,
    })
  }

  return NextResponse.json({
    has_credentials: true,
    api_key_masked: `****${creds.api_key.slice(-4)}`,
    secret_key_masked: `****${creds.secret_key.slice(-4)}`,
    passphrase_masked: "****",
  })
}

export async function PUT(request: NextRequest) {
  const cookieStore = await cookies()
  const userId = cookieStore.get("user_id")?.value

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { api_key, secret_key, passphrase } = body

  if (!api_key || !secret_key || !passphrase) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  credentials.set(userId, { api_key, secret_key, passphrase })

  return NextResponse.json({ saved: true })
}

export async function DELETE(request: NextRequest) {
  const cookieStore = await cookies()
  const userId = cookieStore.get("user_id")?.value

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  credentials.delete(userId)

  return NextResponse.json({ deleted: true })
}
