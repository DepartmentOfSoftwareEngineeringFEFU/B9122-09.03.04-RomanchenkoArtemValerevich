/**
 * Authentication API endpoints
 */

import { api } from "./client"
import type { User } from "@/types"

interface LoginRequest {
  email: string
  password: string
}

interface RegisterRequest {
  name: string
  email: string
  password: string
}

interface AuthResponse {
  user: User
  token: string
}

export const authApi = {
  login: (data: LoginRequest) => api.post<AuthResponse>("/auth/login", data),

  register: (data: RegisterRequest) => api.post<AuthResponse>("/auth/register", data),

  logout: () => api.post<void>("/auth/logout"),

  me: () => api.get<User>("/auth/me"),
}
