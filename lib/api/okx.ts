/**
 * OKX Integration API endpoints
 */

import { api } from "./client"

interface OkxCredentials {
  api_key: string
  secret_key: string
  passphrase: string
}

interface OkxStatus {
  connected: boolean
  error?: string
}

export const okxApi = {
  saveCredentials: (credentials: OkxCredentials) => api.put<void>("/okx/credentials", credentials),

  testConnection: () => api.post<OkxStatus>("/okx/test"),

  getStatus: () => api.get<OkxStatus>("/okx/status"),
}
