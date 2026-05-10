import { NextResponse } from "next/server"
import { ensureCoreData, ensureUserStrategy } from "@/lib/server/core-data"
import { prisma } from "@/lib/server/prisma"
import { publicUser, setAuthCookie, verifyPassword } from "@/lib/server/auth"
import { readJson } from "@/lib/server/api"

export async function POST(request: Request) {
  try {
    const body = await readJson<{ login?: string; email?: string; password?: string }>(request)
    const login = String(body.login || body.email || "").trim()
    const password = String(body.password || "")

    if (!login || !password) {
      return NextResponse.json(
        { error: "Логин и пароль обязательны" },
        { status: 400 }
      )
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ login }, { email: login.toLowerCase() }],
      },
    })

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json(
        { error: "Неверный логин или пароль" },
        { status: 401 }
      )
    }

    const { crypto } = await ensureCoreData()
    await ensureUserStrategy(user.id, crypto.id)
    const safeUser = publicUser(user)
    const response = NextResponse.json({ ...safeUser, user: safeUser })
    setAuthCookie(response, user)
    return response
  } catch {
    return NextResponse.json(
      { error: "Ошибка сервера" },
      { status: 500 }
    )
  }
}
