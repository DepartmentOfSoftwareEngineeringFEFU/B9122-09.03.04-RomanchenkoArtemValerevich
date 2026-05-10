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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => {
        if (r.ok) return r.json()
        throw new Error("unauthorized")
      })
      .then((data) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false))
  }, [])

  const login = async (loginStr: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: loginStr, password }),
      })
      const data = await res.json()
      if (res.ok) {
        setUser(data.user ?? { id: data.id, login: data.login, email: data.email, created_at: data.created_at ?? "" })
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
    fetch("/api/auth/logout", { method: "POST" }).finally(() => {
      setUser(null)
      router.push("/login")
    })
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
