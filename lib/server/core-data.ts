import { prisma } from "./prisma"
import { LSTM_MODEL_METADATA } from "@/lib/lstm-contract"
import { BTC_SLUG, BTC_TICKER } from "./symbols"

export async function ensureBtcCrypto() {
  return prisma.cryptocurrency.upsert({
    where: { slug: BTC_SLUG },
    update: { ticker: BTC_TICKER, assetType: "spot" },
    create: { ticker: BTC_TICKER, slug: BTC_SLUG, assetType: "spot" },
  })
}

export async function ensureForecastModel() {
  return prisma.forecastModel.upsert({
    where: { name: "LSTM BTC-USDT" },
    update: { version: "v1", metadataJson: LSTM_MODEL_METADATA },
    create: { name: "LSTM BTC-USDT", version: "v1", metadataJson: LSTM_MODEL_METADATA },
  })
}

export async function ensureIndicators() {
  await Promise.all(
    ["EMA12", "EMA26", "MACD", "RSI", "Volatility"].map((name) =>
      prisma.indicator.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  )
}

export async function ensureUserStrategy(userId: number, cryptoId?: number) {
  const crypto = cryptoId ? { id: cryptoId } : await ensureBtcCrypto()
  const existing = await prisma.strategySetting.findFirst({
    where: { userId, cryptoId: crypto.id },
    orderBy: { id: "asc" },
  })

  if (existing) return existing

  return prisma.strategySetting.create({
    data: {
      userId,
      cryptoId: crypto.id,
      windowSize: 30,
      horizon: 1,
      timeframe: "1D",
      noiseThreshold: 0.002,
      stopLossPct: 0.02,
      takeProfitPct: 0.04,
      maxOperationAmount: 1000,
      isActive: true,
    },
  })
}

export async function ensureCoreData(userId?: number) {
  const [crypto, model] = await Promise.all([ensureBtcCrypto(), ensureForecastModel(), ensureIndicators()])
  const strategy = userId ? await ensureUserStrategy(userId, crypto.id) : null
  return { crypto, model, strategy }
}
