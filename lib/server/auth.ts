import { createHmac, timingSafeEqual } from "crypto"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"

export const AUTH_COOKIE_NAME = "auth-session"
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7

type SessionPayload = {
  sub: string
  login: string
  exp: number
}

function getAuthSecret() {
  if (process.env.AUTH_JWT_SECRET) return process.env.AUTH_JWT_SECRET
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_JWT_SECRET is required in production")
  }
  return "dev-auth-secret-change-me"
}

function base64Url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url")
}

function sign(data: string) {
  return createHmac("sha256", getAuthSecret()).update(data).digest("base64url")
}

export function createSessionToken(user: { id: number; login: string }) {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  const payload = base64Url(
    JSON.stringify({
      sub: String(user.id),
      login: user.login,
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    } satisfies SessionPayload),
  )
  const body = `${header}.${payload}`
  return `${body}.${sign(body)}`
}

export function verifySessionToken(token: string): SessionPayload | null {
  const parts = token.split(".")
  if (parts.length !== 3) return null

  const [header, payload, signature] = parts
  const expected = sign(`${header}.${payload}`)
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)

  if (actualBuffer.length !== expectedBuffer.length) return null
  if (!timingSafeEqual(actualBuffer, expectedBuffer)) return null

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionPayload
    if (!decoded.sub || !decoded.exp || decoded.exp < Math.floor(Date.now() / 1000)) return null
    return decoded
  } catch {
    return null
  }
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export function publicUser(user: { id: number; login: string; email: string; createdAt?: Date; updatedAt?: Date }) {
  return {
    id: user.id,
    login: user.login,
    email: user.email,
    created_at: user.createdAt?.toISOString() ?? "",
    updated_at: user.updatedAt?.toISOString(),
  }
}

export function setAuthCookie(response: NextResponse, user: { id: number; login: string }) {
  response.cookies.set(AUTH_COOKIE_NAME, createSessionToken(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  })
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })
}

export async function getCurrentUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value
  if (!token) return null

  const payload = verifySessionToken(token)
  if (!payload) return null

  return prisma.user.findUnique({
    where: { id: Number(payload.sub) },
  })
}
