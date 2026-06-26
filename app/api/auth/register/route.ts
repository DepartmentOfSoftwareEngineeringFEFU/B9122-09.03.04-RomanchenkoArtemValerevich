import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { login, email, password } = await request.json()

    if (!login || !email || !password) {
      return NextResponse.json(
        { error: "Все поля обязательны" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Пароль должен содержать минимум 6 символов" },
        { status: 400 }
      )
    }

    // Mock: always succeed
    const response = NextResponse.json({
      id: "usr_" + Date.now(),
      login,
      email,
      message: "Регистрация успешна",
    })

    response.cookies.set("auth-session", "mock-session-" + Date.now(), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })

    return response
  } catch {
    return NextResponse.json(
      { error: "Ошибка сервера" },
      { status: 500 }
    )
  }
}
