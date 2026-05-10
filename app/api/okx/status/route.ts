import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/server/auth"
import { getPlainOkxCredentials } from "@/lib/server/credentials"
import { testOkxCredentials } from "@/lib/server/okx"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const credentials = await getPlainOkxCredentials(user.id)
  if (!credentials) {
    return NextResponse.json({
      success: true,
      data: {
        status: "disconnected",
        message: "API-ключи не настроены. Перейдите в раздел Настройки.",
      },
    })
  }

  const result = await testOkxCredentials(credentials)
  if (!result.success) {
    if (result.timeout) {
      return NextResponse.json({
        success: false,
        error: result.message,
        data: {
          status: "error",
          message: result.message,
          mode: "demo",
        },
        okx_response_json: result.raw,
      }, { status: 504 })
    }

    return NextResponse.json({
      success: true,
      data: {
        status: "error",
        message: result.message,
        mode: "demo",
      },
      okx_response_json: result.raw,
    }, { status: result.timeout ? 504 : 200 })
  }

  return NextResponse.json({
    success: true,
    data: {
      status: "connected",
      message: "Демо-режим OKX активен",
      mode: "demo",
    },
  })
}
