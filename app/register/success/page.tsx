import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, CheckCircle, Key, LineChart, Shield, Zap } from "lucide-react"

export default function RegisterSuccessPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-slate-950 to-slate-950 pointer-events-none" />

      <div className="w-full max-w-xl relative z-10">
        {/* Success Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white mb-4 shadow-lg shadow-emerald-500/30">
            <CheckCircle className="h-9 w-9" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Аккаунт создан!</h1>
          <p className="text-muted-foreground mt-2 max-w-md">
            Добро пожаловать в AlgoTrade.AI. Вы готовы начать алгоритмическую торговлю на OKX.
          </p>
        </div>

        {/* Next Steps Card */}
        <Card className="bg-slate-900/50 border-slate-800 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Следующие шаги
            </CardTitle>
            <CardDescription>Рекомендуем выполнить для начала работы</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                <Key className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-medium">Подключить OKX API ключи</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Для активации автоматической торговли необходимо подключить API-ключи вашего аккаунта OKX.
                </p>
              </div>
              <span className="text-xs text-amber-500 font-medium whitespace-nowrap">Важно</span>
            </div>

            <div className="flex items-start gap-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
                <Activity className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-medium">Выбрать торговую стратегию</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Доступны стратегии на базе LSTM, Prophet и анализа настроений рынка.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                <LineChart className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-medium">Изучить рынок и аналитику</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Просмотрите текущие сигналы, прогнозы и аналитику по криптовалютам.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card className="bg-amber-500/5 border-amber-500/20 mb-6">
          <CardContent className="p-4 flex gap-3">
            <Shield className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-500">Безопасность</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Никогда не передавайте API-ключи третьим лицам. Используйте только торговые разрешения и добавьте
                IP-адрес сервера в белый список на OKX.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            className="flex-1 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white"
            asChild
          >
            <Link href="/dashboard">Перейти в Dashboard</Link>
          </Button>
          <Button variant="outline" className="flex-1 bg-transparent border-slate-700" asChild>
            <Link href="/dashboard/settings?tab=api">Подключить API ключи</Link>
          </Button>
        </div>

        <div className="mt-4 text-center">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
            Уже зарегистрированы? Войти в аккаунт
          </Link>
        </div>
      </div>
    </div>
  )
}
