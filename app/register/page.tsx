"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Activity, ArrowLeft, Loader2 } from "lucide-react"
import { useAuth } from "@/components/providers/auth-provider"

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{ login?: string; email?: string; password?: string; general?: string }>({})

  const [loginValue, setLoginValue] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const validate = () => {
    const newErrors: typeof errors = {}
    if (loginValue.length < 3 || loginValue.length > 50) {
      newErrors.login = "Логин должен содержать от 3 до 50 символов"
    }
    if (!email.includes("@") || !email.includes(".")) {
      newErrors.email = "Введите корректный email адрес"
    }
    if (password.length < 6) {
      newErrors.password = "Пароль должен содержать минимум 6 символов"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)
    const result = await register(loginValue, email, password)
    setIsLoading(false)

    if (result.success) {
      router.push("/login")
    } else {
      setErrors({ general: result.error })
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-background to-background pointer-events-none" />

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
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Регистрация</h1>
          <p className="text-muted-foreground mt-2">Создайте аккаунт в системе алгоритмической торговли.</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 md:p-8 shadow-xl">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="login">Логин</Label>
              <Input
                id="login"
                placeholder="Введите логин (от 3 символов)"
                className="bg-background border-border focus:border-blue-500"
                value={loginValue}
                onChange={(e) => setLoginValue(e.target.value)}
                aria-invalid={!!errors.login}
              />
              {errors.login && <p className="text-destructive text-sm">{errors.login}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                className="bg-background border-border focus:border-blue-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!errors.email}
              />
              {errors.email && <p className="text-destructive text-sm">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="Минимум 6 символов"
                className="bg-background border-border focus:border-blue-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!errors.password}
              />
              {errors.password && <p className="text-destructive text-sm">{errors.password}</p>}
            </div>

            {errors.general && <p className="text-destructive text-sm text-center">{errors.general}</p>}

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-2"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Регистрация..." : "Зарегистрироваться"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {"Уже есть аккаунт? "}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">
              Войти
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
