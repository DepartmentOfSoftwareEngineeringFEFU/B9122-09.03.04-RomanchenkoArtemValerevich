import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Brain, Zap, TrendingUp, Shield, Check } from "lucide-react"
import Image from "next/image"
import { SiteHeader } from "@/components/public/site-header"
import { SiteFooter } from "@/components/public/site-footer"

export default function LandingPage() {
  const featureColors: Record<string, string> = {
    blue: "bg-blue-500/50",
    violet: "bg-violet-500/50",
    cyan: "bg-cyan-500/50",
    emerald: "bg-emerald-500/50",
    amber: "bg-amber-500/50",
    rose: "bg-rose-500/50",
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-24 pb-32 md:pt-32 md:pb-48">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-background to-background" />
          <div className="container relative z-10 mx-auto px-4 text-center">
            <div className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-400 mb-8 backdrop-blur-sm">
              <span className="flex h-2 w-2 rounded-full bg-blue-500 mr-2 animate-pulse"></span>
              Новое: Интеграция с OKX API
            </div>
            <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight text-foreground sm:text-6xl md:text-7xl mb-6">
              Алгоритмическая торговля на OKX с{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-500">
                машинным обучением
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground mb-10 leading-relaxed">
              Автоматизируйте торговые стратегии с помощью нейросети LSTM. Анализируйте рыночные данные, 
              прогнозируйте тренды и исполняйте сделки мгновенно через OKX API.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Button
                size="lg"
                asChild
                className="w-full sm:w-auto h-12 px-8 text-base bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 border-0 shadow-xl shadow-blue-500/20 rounded-full"
              >
                <Link href="/register">Начать торговлю</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="w-full sm:w-auto h-12 px-8 text-base border-slate-700 hover:bg-slate-800 rounded-full bg-transparent"
              >
                <Link href="#how-it-works">Узнать больше</Link>
              </Button>
            </div>

            {/* Dashboard Preview */}
            <div className="relative mx-auto max-w-5xl rounded-xl border border-slate-800 bg-slate-900/50 shadow-2xl shadow-blue-900/20 backdrop-blur-sm overflow-hidden">
              <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
              <div className="p-2 md:p-4">
                <Image
                  src="/dark-mode-crypto-dashboard-ui.jpg"
                  alt="Превью панели управления"
                  width={1200}
                  height={600}
                  className="rounded-lg border border-slate-800/60 w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity duration-500"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section id="how-it-works" className="py-24 bg-slate-950/50 border-y border-slate-900">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Как это работает</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Простая настройка, мощное исполнение. Начните за несколько минут.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Zap, title: "Подключите OKX", desc: "Безопасно привяжите аккаунт биржи через API-ключи." },
                { icon: Brain, title: "AI-анализ", desc: "Наши модели анализируют рыночные данные и индикаторы 24/7." },
                {
                  icon: TrendingUp,
                  title: "Торговые решения",
                  desc: "Получайте решения на покупку/продажу на основе LSTM-прогнозов.",
                },
                {
                  icon: Shield,
                  title: "Автоматическое исполнение",
                  desc: "Стратегии исполняют сделки автоматически или ждут вашего подтверждения.",
                },
              ].map((step, i) => (
                <div key={i} className="relative group">
                  <div className="absolute -inset-px bg-gradient-to-b from-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />
                  <div className="relative h-full p-8 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900 transition-colors">
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                      <step.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                    <p className="text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-24">
          <div className="container mx-auto px-4">
            <div className="mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
                Инструменты институционального уровня
              </h2>
              <p className="text-muted-foreground max-w-2xl">
                Получите доступ к тем же технологиям, что используют количественные хедж-фонды.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  title: "Прогнозирование цен",
                  desc: "Использование нейросетей LSTM для предсказания движения цен на основе исторических данных с учётом технических индикаторов.",
                  color: "blue",
                },
                {
                  title: "Глубина рынка",
                  desc: "Анализ стакана заявок (order book) для оценки ликвидности и определения оптимальных ценовых уровней исполнения ордеров.",
                  color: "violet",
                },
                {
                  title: "Технические индикаторы",
                  desc: "Расчёт EMA12, EMA26, MACD, RSI и полос Боллинджера для определения точек входа и выхода из сделок.",
                  color: "cyan",
                },
                {
                  title: "Умный риск-менеджмент",
                  desc: "Автоматические stop-loss и take-profit, динамически корректируемые на основе волатильности рынка.",
                  color: "emerald",
                },
                {
                  title: "Отчёты по операциям",
                  desc: "Детальный анализ торговых операций с фильтрацией по типу ордера и статусу исполнения.",
                  color: "amber",
                },
                {
                  title: "Безопасная архитектура",
                  desc: "Ваши средства остаются на OKX. Мы только исполняем сделки. API-ключи шифруются на уровне предприятия.",
                  color: "rose",
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/50 hover:border-slate-700 transition-colors"
                >
                  <div className={`h-1 w-full ${featureColors[feature.color]}`} />
                  <div className="p-6">
                    <h3 className="text-xl font-semibold mb-3 group-hover:text-blue-400 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-900/10 to-slate-950" />
          <div className="container relative z-10 mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-6">
              Готовы улучшить свою торговлю?
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground mb-10">
              Присоединяйтесь к трейдерам, использующим AI для получения преимущества на рынке.
            </p>
            <Button
              size="lg"
              asChild
              className="h-14 px-10 text-lg bg-white text-slate-950 hover:bg-slate-200 rounded-full font-bold"
            >
              <Link href="/register">Создать бесплатный аккаунт</Link>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
