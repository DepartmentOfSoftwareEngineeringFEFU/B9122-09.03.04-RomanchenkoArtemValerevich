import { createHmac } from "crypto"
import type { PlainOkxCredentials } from "./credentials"

export type OkxResult<T = unknown> =
  | { success: true; data: T; raw: T }
  | { success: false; message: string; timeout?: boolean; statusCode?: number; raw?: unknown }

const OKX_BASE_URL = process.env.OKX_BASE_URL || "https://www.okx.com"

function okxTimeoutMs() {
  const parsed = Number(process.env.OKX_TIMEOUT_MS || 10000)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10000
}

function buildUrl(path: string) {
  return `${OKX_BASE_URL}${path}`
}

function okxSign(credentials: PlainOkxCredentials, timestamp: string, method: string, path: string, body: string) {
  const prehash = `${timestamp}${method.toUpperCase()}${path}${body}`
  return createHmac("sha256", credentials.secretKey).update(prehash).digest("base64")
}

async function okxFetch<T>(path: string, init: RequestInit): Promise<OkxResult<T>> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), okxTimeoutMs())

  try {
    const response = await fetch(buildUrl(path), { ...init, signal: controller.signal })
    const raw = await response.json().catch(() => null)

    if (!response.ok) {
      return {
        success: false,
        statusCode: response.status,
        message: `OKX вернул HTTP ${response.status}`,
        raw,
      }
    }

    return { success: true, data: raw as T, raw: raw as T }
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError"
    return {
      success: false,
      timeout: isAbort,
      message: isAbort ? "Таймаут соединения с OKX" : "Ошибка соединения с OKX",
      raw: error instanceof Error ? { name: error.name, message: error.message } : error,
    }
  } finally {
    clearTimeout(timer)
  }
}

export async function okxPublicGet<T>(path: string) {
  return okxFetch<T>(path, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  })
}

export async function okxSignedRequest<T>(
  credentials: PlainOkxCredentials,
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>,
) {
  const bodyString = body ? JSON.stringify(body) : ""
  const timestamp = new Date().toISOString()

  return okxFetch<T>(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      "OK-ACCESS-KEY": credentials.apiKey,
      "OK-ACCESS-SIGN": okxSign(credentials, timestamp, method, path, bodyString),
      "OK-ACCESS-TIMESTAMP": timestamp,
      "OK-ACCESS-PASSPHRASE": credentials.passphrase,
      "x-simulated-trading": "1",
    },
    body: bodyString || undefined,
  })
}

type OkxEnvelope = {
  code?: string
  msg?: string
  data?: unknown[]
}

export async function testOkxCredentials(credentials: PlainOkxCredentials) {
  const response = await okxSignedRequest<OkxEnvelope>(credentials, "GET", "/api/v5/account/balance")
  if (!response.success) return response

  if (response.data.code === "0") {
    return {
      success: true as const,
      data: { status: "connected", message: "Подключение к OKX установлено" },
      raw: response.raw,
    }
  }

  return {
    success: false as const,
    message: "Неверные учетные данные API OKX",
    raw: response.raw,
  }
}

export async function fetchOkxCandles(input: { instId: string; bar: string; limit: number }) {
  const params = new URLSearchParams({
    instId: input.instId,
    bar: input.bar,
    limit: String(input.limit),
  })
  return okxPublicGet<OkxEnvelope>(`/api/v5/market/candles?${params.toString()}`)
}

export async function fetchOkxOrderBook(instId: string, size = 10) {
  const params = new URLSearchParams({ instId, sz: String(size) })
  return okxPublicGet<OkxEnvelope>(`/api/v5/market/books?${params.toString()}`)
}

export async function placeDemoMarketOrder(input: {
  credentials: PlainOkxCredentials
  instId: string
  side: "buy" | "sell"
  amount: number
}) {
  return okxSignedRequest<OkxEnvelope>(input.credentials, "POST", "/api/v5/trade/order", {
    instId: input.instId,
    tdMode: "cash",
    side: input.side,
    ordType: "market",
    sz: input.amount.toFixed(8),
    tgtCcy: "base_ccy",
  })
}

export async function fetchOkxOrderStatus(credentials: PlainOkxCredentials, instId: string, ordId: string) {
  const params = new URLSearchParams({ instId, ordId })
  return okxSignedRequest<OkxEnvelope>(credentials, "GET", `/api/v5/trade/order?${params.toString()}`)
}

export async function cancelOkxOrder(credentials: PlainOkxCredentials, instId: string, ordId: string) {
  return okxSignedRequest<OkxEnvelope>(credentials, "POST", "/api/v5/trade/cancel-order", {
    instId,
    ordId,
  })
}
