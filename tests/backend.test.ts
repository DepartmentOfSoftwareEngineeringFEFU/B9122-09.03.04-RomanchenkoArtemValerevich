import { mkdtemp, rm } from "fs/promises"
import { tmpdir } from "os"
import path from "path"
import { afterEach, describe, expect, it } from "vitest"
import { makeDecision } from "@/lib/server/decision-engine"
import type { Candle } from "@/lib/server/indicators"
import { floor8 } from "@/lib/server/math"
import { normalizeSymbol } from "@/lib/server/symbols"
import { mapOkxOrderStatus } from "@/lib/server/okx-status"
import { riskNotRequiredForHold, runRiskCheck } from "@/lib/server/risk"
import {
  buildLstmFeatureRows,
  inverseTransformScaledOutput,
  LSTM_FEATURES,
  LSTM_FEATURES_COUNT,
  LSTM_FEATURE_CONTRACT_ERROR,
  LSTM_INSUFFICIENT_FEATURE_ROWS_ERROR,
  LSTM_PREPROCESSOR_CONTRACT_ERROR,
  LSTM_STRATEGY_CONTRACT_ERROR,
  LSTM_TIMEFRAME,
  LSTM_WINDOW_SIZE,
  loadPreprocessor,
  prepareLstmTensor,
  runLstmInference,
  validatePreprocessor,
  validateStrategySettingsContract,
  type LstmPreprocessor,
} from "@/lib/server/lstm"
import { decryptSecret, encryptSecret } from "@/lib/server/secrets"

const originalPreprocessorPath = process.env.LSTM_PREPROCESSOR_PATH
const originalModelPath = process.env.LSTM_MODEL_PATH

afterEach(() => {
  process.env.LSTM_PREPROCESSOR_PATH = originalPreprocessorPath
  process.env.LSTM_MODEL_PATH = originalModelPath
})

function validPreprocessor(overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    window_size: LSTM_WINDOW_SIZE,
    horizon: 1,
    timeframe: LSTM_TIMEFRAME,
    features: [...LSTM_FEATURES],
    x_scaler: {
      method: "standard",
      mean: Array(LSTM_FEATURES_COUNT).fill(0),
      std: Array(LSTM_FEATURES_COUNT).fill(1),
    },
    y_scaler: {
      method: "standard",
      mean: [0],
      std: [1],
    },
    ...overrides,
  }
}

function candles(count: number): Candle[] {
  return Array.from({ length: count }, (_, index) => {
    const close = 100 + index + Math.sin(index / 3)

    return {
      ts: new Date(Date.UTC(2026, 0, index + 1)),
      open: close - 0.5,
      high: close + 1,
      low: close - 1,
      close,
      volume: 1000 + index * 3,
    }
  })
}

describe("backend helpers", () => {
  it("normalizes BTC aliases to the single BTC-USDT asset", () => {
    expect(normalizeSymbol("btc")).toEqual({ ticker: "BTC-USDT", slug: "btc-usdt" })
    expect(normalizeSymbol("BTC")).toEqual({ ticker: "BTC-USDT", slug: "btc-usdt" })
    expect(normalizeSymbol("BTC-USDT")).toEqual({ ticker: "BTC-USDT", slug: "btc-usdt" })
    expect(normalizeSymbol("eth")).toBeNull()
  })

  it("requires EMA cross confirmation for buy and sell decisions", () => {
    expect(makeDecision({
      predicted_log_return: 0.003,
      noise_threshold: 0.002,
      previous: { ema_12: 99, ema_26: 100 },
      current: { ema_12: 101, ema_26: 100 },
    })).toEqual({
      decision_type: "покупка",
      reason: "EMA12 пересекла EMA26 снизу вверх, predicted_log_return > noise_threshold",
    })

    expect(makeDecision({
      predicted_log_return: -0.003,
      noise_threshold: 0.002,
      previous: { ema_12: 101, ema_26: 100 },
      current: { ema_12: 99, ema_26: 100 },
    })).toEqual({
      decision_type: "продажа",
      reason: "EMA12 пересекла EMA26 сверху вниз, predicted_log_return < -noise_threshold",
    })
  })

  it("holds when EMA cross is absent or forecast is inside the noise threshold", () => {
    expect(makeDecision({
      predicted_log_return: 0.003,
      noise_threshold: 0.002,
      previous: { ema_12: 101, ema_26: 100 },
      current: { ema_12: 102, ema_26: 100 },
    })).toEqual({
      decision_type: "удержание",
      reason: "EMA-пересечение не подтверждено",
    })

    expect(makeDecision({
      predicted_log_return: 0.001,
      noise_threshold: 0.002,
      previous: { ema_12: 99, ema_26: 100 },
      current: { ema_12: 101, ema_26: 100 },
    })).toEqual({
      decision_type: "удержание",
      reason: "|predicted_log_return| <= noise_threshold",
    })
  })

  it("maps OKX order statuses to Russian frontend labels", () => {
    expect(mapOkxOrderStatus("live")).toBe("открыта")
    expect(mapOkxOrderStatus("partially_filled")).toBe("открыта")
    expect(mapOkxOrderStatus("filled")).toBe("исполнена")
    expect(mapOkxOrderStatus("canceled")).toBe("отменена")
    expect(mapOkxOrderStatus("mystery")).toBe("ошибка")
  })

  it("calculates floor8 amount and risk prices", () => {
    expect(floor8(1.123456789)).toBe(1.12345678)

    const buy = runRiskCheck({
      decision_type: "покупка",
      latest_price: 50000,
      stop_loss_pct: 0.02,
      take_profit_pct: 0.04,
      max_operation_amount: 100,
      has_credentials: true,
      okx_connected: true,
    })
    expect(buy).toMatchObject({
      risk_check_status: "разрешено",
      amount: 0.002,
      stop_loss_price: 49000,
      take_profit_price: 52000,
    })
  })

  it("does not require risk check and creates no operation for hold decisions", () => {
    expect(runRiskCheck({
      decision_type: "удержание",
      latest_price: 50000,
      stop_loss_pct: 0.02,
      take_profit_pct: 0.04,
      max_operation_amount: 100,
      has_credentials: true,
      okx_connected: true,
    })).toEqual(riskNotRequiredForHold())

    expect(riskNotRequiredForHold()).toMatchObject({
      risk_check_status: "не требуется",
      no_operation_reason: "Решение удержание",
      amount: null,
    })
  })

  it("encrypts OKX secrets without returning plaintext", () => {
    process.env.OKX_CREDENTIALS_ENCRYPTION_KEY = "test-encryption-key"
    const encrypted = encryptSecret("secret")
    expect(encrypted).not.toContain("secret")
    expect(decryptSecret(encrypted)).toBe("secret")
  })
})

describe("LSTM preprocessor contract", () => {
  it("rejects the legacy 8-feature preprocessor", () => {
    expect(() => validatePreprocessor({
      version: 1,
      window_size: 60,
      features: ["open", "high", "low", "close", "volume", "EMA12", "EMA26", "RSI"],
      method: "standard",
      mean: Array(8).fill(0),
      std: Array(8).fill(1),
    })).toThrow(LSTM_FEATURE_CONTRACT_ERROR)
  })

  it("accepts the exact 19-feature standard scaler schema", () => {
    expect(validatePreprocessor(validPreprocessor())).toMatchObject({
      window_size: 30,
      horizon: 1,
      timeframe: "1D",
      features: [...LSTM_FEATURES],
      x_scaler: { method: "standard" },
      y_scaler: { method: "standard" },
    })
  })

  it("rejects wrong feature order with the feature contract error", () => {
    const features = [...LSTM_FEATURES]
    const first = features[0]
    features[0] = features[1]
    features[1] = first

    expect(() => validatePreprocessor(validPreprocessor({ features }))).toThrow(LSTM_FEATURE_CONTRACT_ERROR)
  })

  it("rejects missing y_scaler and invalid y_scaler length", () => {
    const missingYScaler = validPreprocessor()
    delete (missingYScaler as Record<string, unknown>).y_scaler

    expect(() => validatePreprocessor(missingYScaler)).toThrow(LSTM_PREPROCESSOR_CONTRACT_ERROR)
    expect(() => validatePreprocessor(validPreprocessor({
      y_scaler: { method: "standard", mean: [0, 0], std: [1, 1] },
    }))).toThrow(LSTM_PREPROCESSOR_CONTRACT_ERROR)
  })

  it("rejects non-finite scaler values and zero std", () => {
    expect(() => validatePreprocessor(validPreprocessor({
      x_scaler: {
        method: "standard",
        mean: [...Array(18).fill(0), Number.NaN],
        std: Array(19).fill(1),
      },
    }))).toThrow(LSTM_PREPROCESSOR_CONTRACT_ERROR)

    expect(() => validatePreprocessor(validPreprocessor({
      x_scaler: {
        method: "standard",
        mean: Array(19).fill(0),
        std: [...Array(18).fill(1), 0],
      },
    }))).toThrow(LSTM_PREPROCESSOR_CONTRACT_ERROR)
  })

  it("returns a clear error when scaler/preprocessor is absent", async () => {
    process.env.LSTM_PREPROCESSOR_PATH = path.join(tmpdir(), "missing-scaler.json")
    await expect(loadPreprocessor()).rejects.toThrow(/preprocessor\/scaler.*не найден/)
  })

  it("fails strategy validation when window_size or timeframe do not match", () => {
    const preprocessor = validatePreprocessor(validPreprocessor())

    expect(() => validateStrategySettingsContract({
      windowSize: 60,
      horizon: 1,
      timeframe: "1D",
    }, preprocessor)).toThrow(LSTM_STRATEGY_CONTRACT_ERROR)

    expect(() => validateStrategySettingsContract({
      windowSize: 30,
      horizon: 1,
      timeframe: "1H",
    }, preprocessor)).toThrow(LSTM_STRATEGY_CONTRACT_ERROR)
  })

  it("returns a clear error when the ONNX file is absent", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "lstm-test-"))
    process.env.LSTM_MODEL_PATH = path.join(dir, "missing.onnx")

    await expect(runLstmInference({
      preprocessor: validatePreprocessor(validPreprocessor()),
      candles: candles(70),
    })).rejects.toThrow(/ONNX model.*не найден/)

    await rm(dir, { recursive: true, force: true })
  })
})

describe("LSTM feature and tensor preparation", () => {
  it("calculates all 19 required features and drops invalid warm-up rows", () => {
    const rows = buildLstmFeatureRows(candles(70))
    expect(rows.length).toBeGreaterThanOrEqual(30)

    const latest = rows[rows.length - 1]
    expect(Object.keys(latest)).toEqual(expect.arrayContaining([...LSTM_FEATURES]))
    expect(LSTM_FEATURES.every((feature) => Number.isFinite(latest[feature]))).toBe(true)
    expect(latest.macd).toBeCloseTo(latest.ema_12 - latest.ema_26, 12)
    expect(latest.bb_width).toBeCloseTo((latest.bb_upper - latest.bb_lower) / latest.bb_mid, 12)
    expect(latest.dow).toBeGreaterThanOrEqual(0)
    expect(latest.dow).toBeLessThanOrEqual(6)
  })

  it("throws when fewer than 30 valid rows remain after feature calculation", () => {
    const preprocessor = validatePreprocessor(validPreprocessor())
    expect(() => prepareLstmTensor(candles(40), preprocessor)).toThrow(LSTM_INSUFFICIENT_FEATURE_ROWS_ERROR)
  })

  it("builds input tensor shape [1, 30, 19] and applies x_scaler to all features", () => {
    const preprocessor = validatePreprocessor(validPreprocessor({
      x_scaler: {
        method: "standard",
        mean: Array.from({ length: LSTM_FEATURES_COUNT }, (_, index) => index + 1),
        std: Array.from({ length: LSTM_FEATURES_COUNT }, (_, index) => index + 2),
      },
    })) as LstmPreprocessor
    const prepared = prepareLstmTensor(candles(70), preprocessor)

    expect(prepared.shape).toEqual([1, 30, 19])
    expect(prepared.tensorData).toHaveLength(30 * 19)

    const firstWindowRow = prepared.windowRows[0]
    LSTM_FEATURES.forEach((feature, index) => {
      expect(prepared.tensorData[index]).toBeCloseTo(
        (firstWindowRow[feature] - preprocessor.x_scaler.mean[index]) / preprocessor.x_scaler.std[index],
        4,
      )
    })
  })

  it("inverse-transforms ONNX output through y_scaler and restores predicted_close", () => {
    const preprocessor = validatePreprocessor(validPreprocessor({
      y_scaler: {
        method: "standard",
        mean: [0.01],
        std: [2],
      },
    }))
    const result = inverseTransformScaledOutput(0.005, preprocessor, 100)

    expect(result.predictedLogReturn).toBeCloseTo(0.02, 12)
    expect(result.predictedClose).toBeCloseTo(100 * Math.exp(0.02), 12)
  })
})
