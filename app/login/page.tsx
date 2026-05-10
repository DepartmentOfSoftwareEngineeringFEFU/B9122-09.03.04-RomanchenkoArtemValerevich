"use client"

import type React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Activity, ArrowLeft, Loader2 } from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/components/providers/auth-provider"

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [loginValue, setLoginValue] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<{ login?: string; password?: string; general?: string }>({})
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: typeof errors = {}

    if (!loginValue.trim()) {
      newErrors.login = "Введите логин"
    }
    if (!password) {
      newErrors.password = "Введите пароль"
    }

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    setIsLoading(true)
    const result = await login(loginValue, password)
    if (!result.success) {
      setErrors({ general: result.error || "Неверный логин или пароль" })
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-background to-background pointer-events-none" />

      <div className="absolute top-8 left-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          <ArrowLeft className="h-4 w-4" /> На главную
        </Link>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white mb-4 shadow-lg shadow-blue-500/20">
            <Activity className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Авторизация</h1>
          <p className="text-muted-foreground mt-2">Введите логин и пароль для входа в систему.</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 md:p-8 shadow-xl">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="login">Логин</Label>
              <Input
                id="login"
                placeholder="Введите логин"
                className="bg-background border-border focus:border-blue-500"
                value={loginValue}
                onChange={(e) => setLoginValue(e.target.value)}
                aria-invalid={!!errors.login}
              />
              {errors.login && <p className="text-destructive text-sm">{errors.login}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="Введите пароль"
                className="bg-background border-border focus:border-blue-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!errors.password}
              />
              {errors.password && <p className="text-destructive text-sm">{errors.password}</p>}
            </div>

            {errors.general && (
              <p className="text-destructive text-sm text-center">{errors.general}</p>
            )}

            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Вход...
                </>
              ) : (
                "Войти"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {"Нет аккаунта? "}
            <Link href="/register" className="text-blue-400 hover:text-blue-300 font-medium">
              Зарегистрироваться
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
