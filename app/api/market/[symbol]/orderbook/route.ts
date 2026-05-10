import { NextResponse } from "next/server"
import { apiFail } from "@/lib/server/api"
import { ensureCoreData } from "@/lib/server/core-data"
import { findCryptoBySymbol } from "@/lib/server/symbols"
import { fetchOkxOrderBook } from "@/lib/server/okx"

type OkxBook = {
  ts?: string
  asks?: string[][]
  bids?: string[][]
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  await ensureCoreData()
  const { symbol } = await params
  const crypto = await findCryptoBySymbol(symbol)
  if (!crypto) return apiFail("Торговая пара не найдена", 404)

  const result = await fetchOkxOrderBook(crypto.ticker)
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.message, okx_response_json: result.raw },
      { status: result.timeout ? 504 : 502 },
    )
  }

  const book = Array.isArray(result.data.data) ? (result.data.data[0] as OkxBook | undefined) : undefined
  if (result.data.code !== "0" || !book) {
    return NextResponse.json(
      { success: false, error: "OKX не вернул стакан", okx_response_json: result.raw },
      { status: 502 },
    )
  }

  const normalizeRows = (rows: string[][] | undefined) =>
    (rows || []).map((row) => [row[0] || "0", row[1] || "0", row[2] || "0", row[3] || "0"])

  const data = {
    ts: book.ts ? new Date(Number(book.ts)).toISOString() : new Date().toISOString(),
    asks: normalizeRows(book.asks),
    bids: normalizeRows(book.bids),
  }

  return NextResponse.json({ success: true, data })
}
