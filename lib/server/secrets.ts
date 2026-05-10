import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto"

function encryptionKey() {
  const raw = process.env.OKX_CREDENTIALS_ENCRYPTION_KEY
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("OKX_CREDENTIALS_ENCRYPTION_KEY is required in production")
    }
    return createHash("sha256").update("dev-okx-credentials-key-change-me").digest()
  }

  if (/^[a-f0-9]{64}$/i.test(raw)) return Buffer.from(raw, "hex")

  const base64 = Buffer.from(raw, "base64")
  if (base64.length === 32) return base64

  return createHash("sha256").update(raw).digest()
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`
}

export function decryptSecret(value: string) {
  const [version, ivRaw, tagRaw, encryptedRaw] = value.split(":")
  if (version !== "v1" || !ivRaw || !tagRaw || !encryptedRaw) {
    throw new Error("Unsupported encrypted secret format")
  }

  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivRaw, "base64"))
  decipher.setAuthTag(Buffer.from(tagRaw, "base64"))
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64")),
    decipher.final(),
  ]).toString("utf8")
}

export function maskApiKey(apiKey: string | null | undefined) {
  if (!apiKey) return null
  return `****${apiKey.slice(-4)}`
}
