import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { login, password } = await request.json()

    if (!login || !password) {
      return NextResponse.json(
        { error: "Логин и пароль обязательны" },
        { status: 400 }
      )
    }

    // Mock: accept demo credentials
    if (login === "demo" && password === "demo1234") {
      const response = NextResponse.json({
        id: "usr_001",
        login: "demo",
        email: "demo@algotrade.ru",
        token: "mock-jwt-token-" + Date.now(),
      })

      response.cookies.set("auth-session", "mock-session-" + Date.now(), {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })

      return response
    }

    return NextResponse.json(
      { error: "Неверный логин или пароль" },
      { status: 401 }
    )
  } catch {
    return NextResponse.json(
      { error: "Ошибка сервера" },
      { status: 500 }
    )
  }
}
