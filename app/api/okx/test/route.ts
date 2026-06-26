import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { apiKey, secretKey, passphrase } = await request.json()

    if (!apiKey || !secretKey || !passphrase) {
      return NextResponse.json(
        { status: "error", message: "Все поля обязательны" },
        { status: 400 }
      )
    }

    // Mock: validate key format
    if (apiKey.length < 8 || secretKey.length < 8 || passphrase.length < 4) {
      return NextResponse.json(
        { status: "error", message: "Неверный формат ключей" },
        { status: 400 }
      )
    }

    // Simulate successful connection
    return NextResponse.json({
      status: "connected",
      message: "Подключение к OKX установлено",
      account: {
        uid: "OKX-" + apiKey.slice(0, 6).toUpperCase(),
        level: "1",
      },
    })
  } catch {
    return NextResponse.json(
      { status: "error", message: "Ошибка соединения с OKX" },
      { status: 500 }
    )
  }
}
