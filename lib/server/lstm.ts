import { access, readFile } from "fs/promises"
import path from "path"
import {
  LSTM_FEATURES,
  LSTM_FEATURES_COUNT,
  LSTM_HORIZON,
  LSTM_TIMEFRAME,
  LSTM_WINDOW_SIZE,
  type LstmFeature,
} from "@/lib/lstm-contract"
import type { Candle } from "./indicators"

export {
  LSTM_FEATURES,
  LSTM_FEATURES_COUNT,
  LSTM_HORIZON,
  LSTM_MODEL_METADATA,
  LSTM_TIMEFRAME,
  LSTM_WINDOW_SIZE,
} from "@/lib/lstm-contract"

export const LSTM_PREPROCESSOR_CONTRACT_ERROR = "Invalid LSTM preprocessor contract"
export const LSTM_FEATURE_CONTRACT_ERROR = "Invalid LSTM preprocessor feature contract"
export const LSTM_STRATEGY_CONTRACT_ERROR = "Strategy settings do not match LSTM preprocessor contract"
export const LSTM_INSUFFICIENT_FEATURE_ROWS_ERROR = "Недостаточно данных после расчета признаков для LSTM"

export type LstmTensorShape = [1, typeof LSTM_WINDOW_SIZE, typeof LSTM_FEATURES_COUNT]

type StandardScaler = {
  method: "standard"
  mean: number[]
  std: number[]
}

export type LstmPreprocessor = {
  version: 1
  window_size: typeof LSTM_WINDOW_SIZE
  horizon: typeof LSTM_HORIZON
  timeframe: typeof LSTM_TIMEFRAME
  features: LstmFeature[]
  x_scaler: StandardScaler
  y_scaler: StandardScaler
}

export type LstmFeatureRow = Candle & Record<LstmFeature, number>

export type LstmStrategySettingsContract = {
  window_size?: number
  windowSize?: number
  horizon: number
  timeframe: string
}

export type PreparedLstmTensor = {
  tensorData: Float32Array
  shape: LstmTensorShape
  rows: LstmFeatureRow[]
  windowRows: LstmFeatureRow[]
  previousIndicators: Pick<LstmFeatureRow, "ema_12" | "ema_26">
  currentIndicators: Pick<LstmFeatureRow, "ema_12" | "ema_26">
  lastClose: number
  lastTimestamp: Date
}

export type LstmInferenceResult = PreparedLstmTensor & {
  scaledOutput: number
  predictedLogReturn: number
  predictedClose: number
}

export class LstmConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "LstmConfigurationError"
  }
}

function modelPath() {
  return path.resolve(process.cwd(), process.env.LSTM_MODEL_PATH || "models/lstm-btc-usdt.onnx")
}

function preprocessorPath() {
  return path.resolve(process.cwd(), process.env.LSTM_PREPROCESSOR_PATH || "models/lstm-btc-usdt-scaler.json")
}

async function assertReadable(filePath: string, label: string) {
  try {
    await access(filePath)
  } catch {
    throw new LstmConfigurationError(`${label} не найден: ${filePath}`)
  }
}

function failInvalidPreprocessor(): never {
  throw new LstmConfigurationError(LSTM_PREPROCESSOR_CONTRACT_ERROR)
}

function failInvalidFeatures(): never {
  throw new LstmConfigurationError(LSTM_FEATURE_CONTRACT_ERROR)
}

function objectRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") failInvalidPreprocessor()
  return value as Record<string, unknown>
}

function assertNumberArray(value: unknown, expectedLength: number) {
  if (!Array.isArray(value) || value.length !== expectedLength) failInvalidPreprocessor()

  const numbers = value.map((item) => Number(item))
  if (numbers.some((item) => !Number.isFinite(item))) failInvalidPreprocessor()

  return numbers
}

function assertStandardScaler(value: unknown, expectedLength: number): StandardScaler {
  const scaler = objectRecord(value)
  if (scaler.method !== "standard") failInvalidPreprocessor()

  const mean = assertNumberArray(scaler.mean, expectedLength)
  const std = assertNumberArray(scaler.std, expectedLength)
  if (std.some((item) => item === 0)) failInvalidPreprocessor()

  return { method: "standard", mean, std }
}

function hasExpectedFeatures(value: unknown): value is LstmFeature[] {
  return (
    Array.isArray(value) &&
    value.length === LSTM_FEATURES_COUNT &&
    value.every((feature, index) => feature === LSTM_FEATURES[index])
  )
}

export function validatePreprocessor(raw: unknown): LstmPreprocessor {
  const candidate = objectRecord(raw)

  if (candidate.version !== 1) failInvalidPreprocessor()
  if (!hasExpectedFeatures(candidate.features)) failInvalidFeatures()
  if (candidate.window_size !== LSTM_WINDOW_SIZE) failInvalidPreprocessor()
  if (candidate.horizon !== LSTM_HORIZON) failInvalidPreprocessor()
  if (candidate.timeframe !== LSTM_TIMEFRAME) failInvalidPreprocessor()

  const xScaler = assertStandardScaler(candidate.x_scaler, LSTM_FEATURES_COUNT)
  const yScaler = assertStandardScaler(candidate.y_scaler, 1)

  return {
    version: 1,
    window_size: LSTM_WINDOW_SIZE,
    horizon: LSTM_HORIZON,
    timeframe: LSTM_TIMEFRAME,
    features: [...LSTM_FEATURES],
    x_scaler: xScaler,
    y_scaler: yScaler,
  }
}

export async function loadPreprocessor() {
  const filePath = preprocessorPath()
  await assertReadable(filePath, "LSTM preprocessor/scaler")

  const raw = JSON.parse(await readFile(filePath, "utf8")) as unknown
  return validatePreprocessor(raw)
}

export function validateStrategySettingsContract(
  settings: LstmStrategySettingsContract,
  preprocessor: LstmPreprocessor,
) {
  const windowSize = settings.window_size ?? settings.windowSize
  if (
    windowSize !== preprocessor.window_size ||
    settings.horizon !== preprocessor.horizon ||
    settings.timeframe !== preprocessor.timeframe
  ) {
    throw new LstmConfigurationError(LSTM_STRATEGY_CONTRACT_ERROR)
  }
}

function timestampMs(ts: string | Date) {
  const value = ts instanceof Date ? ts.getTime() : new Date(ts).getTime()
  return Number.isFinite(value) ? value : Number.NaN
}

function sortCandlesAscending(candles: Candle[]) {
  return [...candles].sort((left, right) => timestampMs(left.ts) - timestampMs(right.ts))
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function calculateEma(values: number[], span: number) {
  if (values.length === 0) return []
  const alpha = 2 / (span + 1)
  const output = Array<number>(values.length)
  output[0] = values[0]

  for (let index = 1; index < values.length; index += 1) {
    output[index] = values[index] * alpha + output[index - 1] * (1 - alpha)
  }

  return output
}

function rollingMean(values: number[], windowSize: number) {
  return values.map((_, index) => {
    if (index < windowSize - 1) return Number.NaN

    const window = values.slice(index - windowSize + 1, index + 1)
    if (window.some((value) => !Number.isFinite(value))) return Number.NaN

    return window.reduce((sum, value) => sum + value, 0) / windowSize
  })
}

function rollingStd(values: number[], windowSize: number) {
  return values.map((_, index) => {
    if (index < windowSize - 1) return Number.NaN

    const window = values.slice(index - windowSize + 1, index + 1)
    if (window.some((value) => !Number.isFinite(value))) return Number.NaN

    const mean = window.reduce((sum, value) => sum + value, 0) / windowSize
    const variance =
      window.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, windowSize - 1)

    return Math.sqrt(variance)
  })
}

function backfill(values: number[]) {
  const output = [...values]
  let nextFinite = Number.NaN

  for (let index = output.length - 1; index >= 0; index -= 1) {
    if (Number.isFinite(output[index])) {
      nextFinite = output[index]
    } else if (Number.isFinite(nextFinite)) {
      output[index] = nextFinite
    }
  }

  return output
}

function dayOfWeek(ts: string | Date) {
  const date = ts instanceof Date ? ts : new Date(ts)
  if (!Number.isFinite(date.getTime())) return Number.NaN
  return (date.getUTCDay() + 6) % 7
}

function finiteFeatureRow(row: LstmFeatureRow) {
  return LSTM_FEATURES.every((feature) => isFiniteNumber(row[feature]))
}

export function buildLstmFeatureRows(candles: Candle[]): LstmFeatureRow[] {
  const sortedCandles = sortCandlesAscending(candles)
  const close = sortedCandles.map((candle) => Number(candle.close))
  const ema12 = calculateEma(close, 12)
  const ema26 = calculateEma(close, 26)
  const macd = close.map((_, index) => ema12[index] - ema26[index])
  const macdSignal = calculateEma(macd, 9)
  const macdHist = macd.map((value, index) => value - macdSignal[index])

  const delta = close.map((value, index) => (index === 0 ? Number.NaN : value - close[index - 1]))
  const gain = delta.map((value) => (Number.isFinite(value) ? Math.max(value, 0) : Number.NaN))
  const loss = delta.map((value) => (Number.isFinite(value) ? Math.max(-value, 0) : Number.NaN))
  const avgGain = rollingMean(gain, 14)
  const avgLoss = rollingMean(loss, 14)
  const rsi = backfill(
    avgGain.map((gainValue, index) => {
      const lossValue = avgLoss[index]
      if (!Number.isFinite(gainValue) || !Number.isFinite(lossValue)) return Number.NaN
      if (lossValue === 0) return 100

      const rs = gainValue / lossValue
      return 100 - 100 / (1 + rs)
    }),
  )

  const bbMid = rollingMean(close, 20)
  const bbStd = rollingStd(close, 20)
  const bbUpper = bbMid.map((value, index) => value + 2 * bbStd[index])
  const bbLower = bbMid.map((value, index) => value - 2 * bbStd[index])
  const bbWidth = bbUpper.map((value, index) => (value - bbLower[index]) / bbMid[index])

  const ret1 = close.map((value, index) => {
    if (index === 0 || close[index - 1] <= 0) return Number.NaN
    return value / close[index - 1] - 1
  })
  const logret1 = close.map((value, index) => {
    if (index === 0 || value <= 0 || close[index - 1] <= 0) return Number.NaN
    return Math.log(value) - Math.log(close[index - 1])
  })
  const vol7 = rollingStd(logret1, 7)
  const vol14 = rollingStd(logret1, 14)

  const rows = sortedCandles.map((candle, index) => {
    const closeValue = Number(candle.close)
    const high = Number(candle.high)
    const low = Number(candle.low)
    const open = Number(candle.open)

    return {
      ...candle,
      close: closeValue,
      volume: Number(candle.volume),
      ema_12: ema12[index],
      ema_26: ema26[index],
      macd: macd[index],
      macd_signal: macdSignal[index],
      macd_hist: macdHist[index],
      rsi: rsi[index],
      bb_mid: bbMid[index],
      bb_upper: bbUpper[index],
      bb_lower: bbLower[index],
      bb_width: bbWidth[index],
      ret_1: ret1[index],
      logret_1: logret1[index],
      range_hl: closeValue === 0 ? Number.NaN : (high - low) / closeValue,
      body_co: closeValue === 0 ? Number.NaN : (closeValue - open) / closeValue,
      vol_7: vol7[index],
      vol_14: vol14[index],
      dow: dayOfWeek(candle.ts),
    } satisfies LstmFeatureRow
  })

  return rows.filter(finiteFeatureRow)
}

function valuesForRow(row: LstmFeatureRow, features: LstmFeature[]) {
  return features.map((feature) => row[feature])
}

function normalizeValues(values: number[], scaler: StandardScaler) {
  return values.map((value, index) => (value - scaler.mean[index]) / scaler.std[index])
}

export function prepareLstmTensor(candles: Candle[], preprocessor: LstmPreprocessor): PreparedLstmTensor {
  const rows = buildLstmFeatureRows(candles)
  if (rows.length < preprocessor.window_size) {
    throw new LstmConfigurationError(LSTM_INSUFFICIENT_FEATURE_ROWS_ERROR)
  }

  const windowRows = rows.slice(-preprocessor.window_size)
  const tensorData = new Float32Array(
    windowRows.flatMap((row) => normalizeValues(valuesForRow(row, preprocessor.features), preprocessor.x_scaler)),
  )
  const previous = windowRows[windowRows.length - 2]
  const current = windowRows[windowRows.length - 1]

  return {
    tensorData,
    shape: [1, preprocessor.window_size, preprocessor.features.length] as LstmTensorShape,
    rows,
    windowRows,
    previousIndicators: { ema_12: previous.ema_12, ema_26: previous.ema_26 },
    currentIndicators: { ema_12: current.ema_12, ema_26: current.ema_26 },
    lastClose: current.close,
    lastTimestamp: current.ts instanceof Date ? current.ts : new Date(current.ts),
  }
}

export function inverseTransformScaledOutput(
  scaledOutput: number,
  preprocessor: LstmPreprocessor,
  lastClose: number,
) {
  const predictedLogReturn = scaledOutput * preprocessor.y_scaler.std[0] + preprocessor.y_scaler.mean[0]
  const predictedClose = lastClose * Math.exp(predictedLogReturn)

  if (!Number.isFinite(predictedLogReturn) || !Number.isFinite(predictedClose)) {
    throw new LstmConfigurationError("ONNX model вернул некорректный predicted_log_return")
  }

  return { predictedLogReturn, predictedClose }
}

export async function runLstmInference(input: {
  candles: Candle[]
  preprocessor?: LstmPreprocessor
  strategySettings?: LstmStrategySettingsContract
}): Promise<LstmInferenceResult> {
  const preprocessor = input.preprocessor ?? await loadPreprocessor()
  if (input.strategySettings) validateStrategySettingsContract(input.strategySettings, preprocessor)

  const filePath = modelPath()
  await assertReadable(filePath, "LSTM ONNX model")

  const prepared = prepareLstmTensor(input.candles, preprocessor)

  let ort: typeof import("onnxruntime-node")
  try {
    ort = await import("onnxruntime-node")
  } catch {
    throw new LstmConfigurationError("ONNX runtime не установлен")
  }

  const session = await ort.InferenceSession.create(filePath)
  const inputName = session.inputNames[0]
  const outputName = session.outputNames[0]
  const feeds = {
    [inputName]: new ort.Tensor("float32", prepared.tensorData, prepared.shape),
  }
  const results = await session.run(feeds)
  const output = results[outputName]
  const scaledOutput = Number(output?.data?.[0])

  if (!Number.isFinite(scaledOutput)) {
    throw new LstmConfigurationError("ONNX model вернул некорректный scaled predicted_log_return")
  }

  const prediction = inverseTransformScaledOutput(scaledOutput, preprocessor, prepared.lastClose)

  return {
    ...prepared,
    scaledOutput,
    ...prediction,
  }
}
