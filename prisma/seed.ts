import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { LSTM_MODEL_METADATA } from "../lib/lstm-contract"

const prisma = new PrismaClient()

async function main() {
  const btc = await prisma.cryptocurrency.upsert({
    where: { slug: "btc-usdt" },
    update: { ticker: "BTC-USDT", assetType: "spot" },
    create: { ticker: "BTC-USDT", slug: "btc-usdt", assetType: "spot" },
  })

  await prisma.forecastModel.upsert({
    where: { name: "LSTM BTC-USDT" },
    update: { version: "v1", metadataJson: LSTM_MODEL_METADATA },
    create: { name: "LSTM BTC-USDT", version: "v1", metadataJson: LSTM_MODEL_METADATA },
  })

  for (const name of ["EMA12", "EMA26", "MACD", "RSI", "Volatility"]) {
    await prisma.indicator.upsert({
      where: { name },
      update: {},
      create: { name },
    })
  }

  const login = process.env.SEED_USER_LOGIN || "demo"
  const email = process.env.SEED_USER_EMAIL || "demo@algotrade.local"
  const password = process.env.SEED_USER_PASSWORD || "demo1234"

  let user = await prisma.user.findUnique({ where: { login } })
  if (!user) {
    user = await prisma.user.create({
      data: {
        login,
        email,
        passwordHash: await bcrypt.hash(password, 12),
      },
    })
  }

  const existingSettings = await prisma.strategySetting.findFirst({
    where: { userId: user.id, cryptoId: btc.id },
    orderBy: { id: "asc" },
  })

  if (!existingSettings) {
    await prisma.strategySetting.create({
      data: {
        userId: user.id,
        cryptoId: btc.id,
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
  } else {
    await prisma.strategySetting.update({
      where: { id: existingSettings.id },
      data: {
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

  console.log(`Seeded ${btc.ticker}, model metadata, indicators, and default strategy settings for ${login}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
