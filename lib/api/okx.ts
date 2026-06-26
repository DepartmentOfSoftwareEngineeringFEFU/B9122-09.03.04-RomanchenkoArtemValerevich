/**
 * OKX Integration API endpoints
 */

import { api } from "./client"

interface OkxCredentials {
  apiKey: string
  secretKey: string
  passphrase: string
}

interface OkxStatus {
  connected: boolean
  error?: string
}

export const okxApi = {
  saveCredentials: (credentials: OkxCredentials) => api.post<void>("/okx/credentials", credentials),

  testConnection: () => api.post<OkxStatus>("/okx/test-connection"),

  getStatus: () => api.get<OkxStatus>("/okx/status"),
}
