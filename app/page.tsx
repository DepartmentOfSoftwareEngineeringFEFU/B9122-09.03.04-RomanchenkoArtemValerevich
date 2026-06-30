"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Brain, Zap, TrendingUp, Shield } from "lucide-react"
import { SiteHeader } from "@/components/public/site-header"
import { SiteFooter } from "@/components/public/site-footer"
import { useEffect } from "react"

export default function LandingPage() {
  useEffect(() => {
    const hash = window.location.hash
    if (hash) {
      const el = document.querySelector(hash)
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 100)
      }
    }
  }, [])
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
            <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight text-foreground sm:text-6xl md:text-7xl mb-6">
              Веб-приложение для автоматизации торговой стратегии на{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-500">
                OKX
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground mb-10 leading-relaxed">
              Прототип системы получает рыночные данные через OKX API, рассчитывает технические индикаторы,
              применяет LSTM-модель для прогноза цены BTC-USDT и формирует торговое решение в
              демонстрационном режиме.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Button
                size="lg"
                asChild
                className="w-full sm:w-auto h-12 px-8 text-base bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 border-0 shadow-xl shadow-blue-500/20 rounded-full"
              >
                <Link href="/register">Начать работу</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="w-full sm:w-auto h-12 px-8 text-base border-slate-700 hover:bg-slate-800 rounded-full bg-transparent"
              >
                <Link href="#features">Посмотреть возможности</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section id="how-it-works" className="py-24 bg-slate-950/50 border-y border-slate-900">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Как это работает</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto font-normal">
                Последовательность обработки данных, прогноза и проверки торгового решения в прототипе.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Zap, title: "Подключение OKX API", desc: "Пользователь добавляет учетные данные для работы с демонстрационным контуром OKX." },
                { icon: TrendingUp, title: "Получение рыночных данных", desc: "Система загружает OHLCV-данные и сохраняет их в базе данных." },
                {
                  icon: Brain,
                  title: "Расчет признаков и прогноз",
                  desc: "Серверная часть рассчитывает технические индикаторы и передает данные в LSTM-модель.",
                },
                {
                  icon: Shield,
                  title: "Торговое решение и риск-проверка",
                  desc: "Система формирует решение и проверяет его по заданным ограничениям стратегии.",
                },
              ].map((step, i) => (
                <div key={i} className="relative group">
                  <div className="absolute -inset-px bg-gradient-to-b from-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-lg" />
                  <div className="relative h-full p-8 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-900 transition-colors">
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
                Функциональные возможности
              </h2>
              <p className="text-muted-foreground max-w-2xl">
                Основные функции прикладного прототипа: от загрузки данных до отображения результатов через веб-интерфейс.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  title: "Получение рыночных данных",
                  desc: "Загрузка OHLCV-данных и текущей рыночной информации по торговой паре BTC-USDT через OKX API.",
                  color: "blue",
                },
                {
                  title: "Расчет технических индикаторов",
                  desc: "Формирование признаков на основе EMA, MACD, RSI и других показателей для последующего анализа.",
                  color: "violet",
                },
                {
                  title: "Прогноз LSTM-модели",
                  desc: "Использование обученной модели для прогнозирования цены закрытия следующего периода.",
                  color: "cyan",
                },
                {
                  title: "Формирование торгового решения",
                  desc: "Получение решения «покупка», «продажа» или «удержание» на основе прогноза и правил стратегии.",
                  color: "emerald",
                },
                {
                  title: "Проверка риск-ограничений",
                  desc: "Контроль порога отсечения шума, максимального размера операции, стоп-лосс и тейк-профит как расчетных уровней.",
                  color: "amber",
                },
                {
                  title: "Демонстрационный режим OKX",
                  desc: "Формирование операции в безопасном режиме без использования реальных средств.",
                  color: "rose",
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="group overflow-hidden rounded-lg border border-slate-800 bg-slate-950/50 hover:border-slate-700 transition-colors"
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
              Проверьте работу торговой стратегии в демонстрационном режиме
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground mb-10">
              Система предназначена для анализа рыночных данных, проверки алгоритмической гипотезы и
              демонстрации логики автоматизированного торгового решения.
            </p>
            <Button
              size="lg"
              asChild
              className="h-14 px-10 text-lg bg-white text-slate-950 hover:bg-slate-200 rounded-full font-bold"
            >
              <Link href="/register">Начать работу</Link>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
