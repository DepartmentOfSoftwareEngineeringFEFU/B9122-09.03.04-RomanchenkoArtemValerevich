import { NextResponse } from "next/server"

export function apiOk<T>(data: T, extra: Record<string, unknown> = {}, status = 200) {
  return NextResponse.json({ success: true, data, ...extra }, { status })
}

export function apiFail(
  error: string,
  status = 400,
  extra: Record<string, unknown> = {},
) {
  return NextResponse.json({ success: false, error, ...extra }, { status })
}

export async function readJson<T = Record<string, unknown>>(request: Request): Promise<Partial<T>> {
  try {
    return (await request.json()) as Partial<T>
  } catch {
    return {}
  }
}
