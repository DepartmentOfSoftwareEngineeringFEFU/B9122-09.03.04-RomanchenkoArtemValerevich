"use client"

import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, Eye, EyeOff, AlertCircle, X, Loader2, Key } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { useEffect, useState } from "react"
import { useApiStatus } from "@/components/providers/api-status-provider"

export function SettingsContent() {
  const { toast } = useToast()
  const { status, setStatus } = useApiStatus()
  const [isChecking, setIsChecking] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showSecretKey, setShowSecretKey] = useState(false)
  const [showPassphrase, setShowPassphrase] = useState(false)

  const [apiKey, setApiKey] = useState("")
  const [secretKey, setSecretKey] = useState("")
  const [passphrase, setPassphrase] = useState("")
  const [showDisconnectedAlert, setShowDisconnectedAlert] = useState(true)
  const [errors, setErrors] = useState<{ apiKey?: string; secretKey?: string; passphrase?: string }>({})

  const validate = () => {
    const newErrors: typeof errors = {}
    if (apiKey.length < 10) newErrors.apiKey = "API-ключ должен содержать минимум 10 символов."
    if (secretKey.length < 15) newErrors.secretKey = "Секретный ключ должен содержать минимум 15 символов."
    if (passphrase.length < 6) newErrors.passphrase = "Парольная фраза должна содержать минимум 6 символов."
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isValid = apiKey.length >= 10 && secretKey.length >= 15 && passphrase.length >= 6

  useEffect(() => {
    fetch("/api/okx/credentials")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.configured) return
        setApiKey(data.api_key_masked ?? "")
        setSecretKey("")
        setPassphrase("")
        setShowDisconnectedAlert(false)
      })
      .catch(() => undefined)
  }, [])

  const handleTestConnection = async () => {
    if (!validate()) return
    setIsChecking(true)
    try {
      const res = await fetch("/api/okx/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim(), secretKey: secretKey.trim(), passphrase: passphrase.trim() }),
      })
      const data = await res.json()
      if (data.status === "connected") {
        setStatus("connected")
        toast({ title: "Успешно", description: "Подключение к OKX установлено." })
      } else {
        setStatus("error")
        toast({ title: "Ошибка подключения", description: data.message ?? "Неверные учётные данные.", variant: "destructive" })
      }
    } catch {
      setStatus("error")
      toast({ title: "Ошибка", description: "Не удалось связаться с сервером.", variant: "destructive" })
    }
    setIsChecking(false)
  }

  const handleSave = async () => {
    if (!validate()) return
    setIsSaving(true)
    try {
      const saveRes = await fetch("/api/okx/credentials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey.trim(), secret_key: secretKey.trim(), passphrase: passphrase.trim() }),
      })
      const saveData = await saveRes.json().catch(() => ({}))
      if (!saveRes.ok) {
        setStatus("error")
        toast({ title: "Ошибка", description: saveData.error ?? "Не удалось сохранить учётные данные.", variant: "destructive" })
        setIsSaving(false)
        return
      }

      const res = await fetch("/api/okx/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const data = await res.json()
      if (data.status === "connected") {
        setStatus("connected")
        toast({ title: "Сохранено", description: "Учётные данные API OKX успешно сохранены." })
      } else {
        setStatus("error")
        toast({ title: "Ошибка", description: data.message ?? "Неверные учётные данные.", variant: "destructive" })
      }
    } catch {
      toast({ title: "Ошибка", description: "Ошибка сервера.", variant: "destructive" })
    }
    setIsSaving(false)
  }

  const handleDelete = () => {
    fetch("/api/okx/credentials", { method: "DELETE" }).finally(() => {
      setApiKey("")
      setSecretKey("")
      setPassphrase("")
      setErrors({})
      setStatus("disconnected")
      setShowDisconnectedAlert(true)
      toast({ title: "Удалено", description: "Учётные данные API OKX удалены." })
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/10 shrink-0">
            <Key className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <CardTitle>Учётные данные API OKX</CardTitle>
            <CardDescription>Ввод и обновление ключей для подключения к бирже OKX</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {status === "connected" && (
          <Alert className="border-emerald-500/20 bg-emerald-500/5">
            <Check className="h-4 w-4 text-emerald-500" />
            <AlertTitle className="text-emerald-400">Подключено</AlertTitle>
            <AlertDescription className="text-emerald-500/80">
              Аккаунт OKX подключён и готов к торговле.
            </AlertDescription>
          </Alert>
        )}
        {status === "error" && (
          <Alert variant="destructive" className="border-red-500/20 bg-red-500/5">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Ошибка подключения</AlertTitle>
            <AlertDescription>Проверьте учётные данные и белый список IP.</AlertDescription>
          </Alert>
        )}
        {status === "disconnected" && showDisconnectedAlert && (
          <Alert className="border-amber-500/20 bg-amber-500/5 relative">
            <button
              type="button"
              onClick={() => setShowDisconnectedAlert(false)}
              className="absolute top-2 right-2 text-amber-500 hover:text-amber-600"
              aria-label="Закрыть уведомление"
            >
              <X className="h-4 w-4" />
            </button>
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertTitle className="text-amber-400">Не подключено</AlertTitle>
            <AlertDescription className="text-amber-500/80">
              Введите учётные данные API для подключения к бирже.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="apiKey">API-ключ <span className="text-destructive">*</span></Label>
            <Input
              id="apiKey"
              placeholder="Введите API-ключ OKX"
              className="font-mono"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              aria-invalid={!!errors.apiKey}
            />
            {errors.apiKey && <p className="text-destructive text-sm">{errors.apiKey}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="secretKey">Секретный ключ <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Input
                id="secretKey"
                type={showSecretKey ? "text" : "password"}
                placeholder="Введите секретный ключ"
                className="font-mono pr-10"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                aria-invalid={!!errors.secretKey}
              />
              <button
                type="button"
                className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                onClick={() => setShowSecretKey(!showSecretKey)}
                aria-label={showSecretKey ? "Скрыть" : "Показать"}
              >
                {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.secretKey && <p className="text-destructive text-sm">{errors.secretKey}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="passphrase">Парольная фраза <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Input
                id="passphrase"
                type={showPassphrase ? "text" : "password"}
                placeholder="Введите парольную фразу"
                className="font-mono pr-10"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                aria-invalid={!!errors.passphrase}
              />
              <button
                type="button"
                className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassphrase(!showPassphrase)}
                aria-label={showPassphrase ? "Скрыть" : "Показать"}
              >
                {showPassphrase ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.passphrase && <p className="text-destructive text-sm">{errors.passphrase}</p>}
          </div>
        </div>

        <Alert className="border-border bg-secondary/50">
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
          <AlertTitle className="text-sm">Безопасность</AlertTitle>
          <AlertDescription className="text-muted-foreground text-xs">
            Учётные данные хранятся защищённо на сервере и не отображаются полностью в интерфейсе.
            Включите только торговые разрешения и добавьте IP-адрес сервера в белый список на OKX.
          </AlertDescription>
        </Alert>
      </CardContent>
      <CardFooter className="border-t border-border px-6 py-4 flex flex-col sm:flex-row gap-3 sm:justify-between">
        <Button variant="destructive" type="button" onClick={handleDelete}>Очистить</Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" type="button" onClick={handleTestConnection} disabled={isChecking || !isValid}>
            {isChecking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isChecking ? "Проверка..." : "Проверить соединение"}
          </Button>
          <Button type="button" onClick={handleSave} disabled={!isValid || isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Сохранить
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
