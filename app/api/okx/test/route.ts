import { NextResponse } from "next/server"
import { readJson } from "@/lib/server/api"
import { getCurrentUser } from "@/lib/server/auth"
import { getPlainOkxCredentials } from "@/lib/server/credentials"
import { testOkxCredentials } from "@/lib/server/okx"

export async function POST(request: Request) {
  try {
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

    const credentials =
      apiKey && secretKey && passphrase
        ? { apiKey, secretKey, passphrase }
        : await getSavedCredentials()

    if (!credentials) {
      return NextResponse.json(
        { success: false, status: "error", message: "API-ключи не настроены" },
        { status: 400 }
      )
    }

    const result = await testOkxCredentials(credentials)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          status: "error",
          message: result.message,
          okx_response_json: result.raw,
        },
        { status: result.timeout ? 504 : 401 }
      )
    }

    return NextResponse.json({
      success: true,
      status: "connected",
      message: "Подключение к OKX установлено",
    })
  } catch {
    return NextResponse.json(
      { status: "error", message: "Ошибка соединения с OKX" },
      { status: 500 }
    )
  }
}

async function getSavedCredentials() {
  const user = await getCurrentUser()
  if (!user) return null
  return getPlainOkxCredentials(user.id)
}
