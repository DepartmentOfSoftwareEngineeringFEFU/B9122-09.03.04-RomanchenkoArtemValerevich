import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { hashPassword, publicUser, setAuthCookie } from "@/lib/server/auth"
import { ensureCoreData, ensureUserStrategy } from "@/lib/server/core-data"
import { prisma } from "@/lib/server/prisma"
import { readJson } from "@/lib/server/api"

export async function POST(request: Request) {
  try {
    const body = await readJson<{ login?: string; name?: string; email?: string; password?: string }>(request)
    const login = String(body.login || body.name || "").trim()
    const email = String(body.email || "").trim().toLowerCase()
    const password = String(body.password || "")

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

    const { crypto } = await ensureCoreData()
    const user = await prisma.user.create({
      data: {
        login,
        email,
        passwordHash: await hashPassword(password),
      },
    })
    await ensureUserStrategy(user.id, crypto.id)

    const safeUser = publicUser(user)
    const response = NextResponse.json({
      ...safeUser,
      user: safeUser,
      message: "Регистрация успешна",
    })
    setAuthCookie(response, user)
    return response
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Пользователь с таким логином или email уже существует" },
        { status: 409 },
      )
    }

    return NextResponse.json(
      { error: "Ошибка сервера" },
      { status: 500 }
    )
  }
}
