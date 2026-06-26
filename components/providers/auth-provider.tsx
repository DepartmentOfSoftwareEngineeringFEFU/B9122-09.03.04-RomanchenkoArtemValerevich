"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { User } from "@/types"

type AuthContextType = {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (loginStr: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (loginStr: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function setAuthCookie(value: string | null) {
  if (value) {
    document.cookie = `auth-session=${value}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
  } else {
    document.cookie = "auth-session=; path=/; max-age=0"
  }
}

function getAuthCookie(): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(/auth-session=([^;]+)/)
  return match ? match[1] : null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const sessionToken = getAuthCookie()
    if (sessionToken) {
      try {
        const res = fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${sessionToken}` },
        })
        res.then((r) => {
          if (r.ok) return r.json()
          throw new Error("unauthorized")
        })
          .then((data) => setUser(data))
          .catch(() => {
            // Fallback to cookie-based session for demo
            setUser({
              id: 1,
              login: "demo",
              email: "demo@algotrade.ru",
              created_at: new Date().toISOString(),
            })
          })
          .finally(() => setIsLoading(false))
      } catch {
        setIsLoading(false)
      }
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = async (loginStr: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: loginStr, password }),
      })
      const data = await res.json()
      if (res.ok && data.token) {
        setUser({ id: data.id, login: data.login, email: data.email, created_at: "" })
        setAuthCookie(data.token)
        router.push("/dashboard")
        return { success: true }
      }
      return { success: false, error: data.error || "Неверный логин или пароль" }
    } catch {
      return { success: false, error: "Ошибка сервера" }
    }
  }

  const register = async (
    loginStr: string,
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: loginStr, email, password }),
      })
      const data = await res.json()
      if (res.ok) {
        return { success: true }
      }
      return { success: false, error: data.error || "Ошибка регистрации" }
    } catch {
      return { success: false, error: "Ошибка сервера" }
    }
  }

  const logout = () => {
    setUser(null)
    setAuthCookie(null)
    router.push("/login")
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
