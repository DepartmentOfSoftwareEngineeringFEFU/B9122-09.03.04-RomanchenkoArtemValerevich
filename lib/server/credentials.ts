import { prisma } from "./prisma"
import { decryptSecret } from "./secrets"

export type PlainOkxCredentials = {
  apiKey: string
  secretKey: string
  passphrase: string
}

export async function getPlainOkxCredentials(userId: number): Promise<PlainOkxCredentials | null> {
  const credentials = await prisma.apiCredential.findFirst({
    where: { userId, isDemo: true },
    orderBy: { id: "desc" },
  })

  if (!credentials) return null

  return {
    apiKey: credentials.apiKey,
    secretKey: decryptSecret(credentials.secretKeyEncrypted),
    passphrase: decryptSecret(credentials.passphraseEncrypted),
  }
}
