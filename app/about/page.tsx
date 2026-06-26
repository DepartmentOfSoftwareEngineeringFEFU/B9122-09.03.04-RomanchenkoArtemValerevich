import { SiteHeader } from "@/components/public/site-header"
import { SiteFooter } from "@/components/public/site-footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, Database, LineChart, ArrowRight, Server, Globe, Activity } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 md:py-24 bg-slate-950">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-6">О проекте AlgoTrade.AI</h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                AlgoTrade.AI — передовая платформа алгоритмической торговли, созданная для демократизации
                институциональных торговых стратегий. Мы объединяем модели машинного обучения LSTM и крипторынки,
                позволяя автоматизировать торговлю на OKX с точностью, основанной на данных.
              </p>
            </div>
          </div>
        </section>

        {/* Architecture Section */}
        <section className="py-16 md:py-24 border-t border-slate-900">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Архитектура системы</h2>

            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 max-w-6xl mx-auto overflow-x-auto pb-8">
              <div className="flex flex-col items-center gap-4 p-6 bg-slate-900/50 rounded-xl border border-slate-800 min-w-[200px]">
                <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <Globe className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <div className="font-semibold">Пользователь</div>
                  <div className="text-sm text-muted-foreground">Веб-интерфейс</div>
                </div>
              </div>

              <ArrowRight className="text-slate-700 rotate-90 md:rotate-0 shrink-0" />

              <div className="flex flex-col items-center gap-4 p-6 bg-slate-900/50 rounded-xl border border-slate-800 min-w-[200px]">
                <div className="h-12 w-12 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-500">
                  <Server className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <div className="font-semibold">Backend API</div>
                  <div className="text-sm text-muted-foreground">FastAPI / Python</div>
                </div>
              </div>

              <ArrowRight className="text-slate-700 rotate-90 md:rotate-0 shrink-0" />

              <div className="flex flex-col items-center gap-4 p-6 bg-gradient-to-b from-blue-900/20 to-slate-900/50 rounded-xl border border-blue-500/30 min-w-[240px]">
                <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
                  <Brain className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <div className="font-semibold">ML Core</div>
                  <div className="text-sm text-muted-foreground">LSTM, Индикаторы</div>
                </div>
              </div>

              <ArrowRight className="text-slate-700 rotate-90 md:rotate-0 shrink-0" />

              <div className="flex flex-col items-center gap-4 p-6 bg-slate-900/50 rounded-xl border border-slate-800 min-w-[200px]">
                <div className="h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
                  <Database className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <div className="font-semibold">Биржа OKX</div>
                  <div className="text-sm text-muted-foreground">Данные и исполнение</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Technologies Section */}
        <section className="py-16 md:py-24 bg-slate-950/50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Ключевые технологии</h2>
            <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="h-5 w-5 text-blue-500" />
                    LSTM Networks
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  Нейронные сети с долгой краткосрочной памятью для прогнозирования временных рядов. Наши модели
                  обучаются на исторических данных для предсказания краткосрочных движений рынка.
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-violet-500" />
                    Технические индикаторы
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  Расчёт EMA12, EMA26, MACD, RSI и полос Боллинджера для определения точек входа и выхода из сделок на основе технического анализа.
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-pink-500" />
                    Глубина рынка
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  Анализ стакана заявок (order book) с asks/bids для оценки ликвидности и определения оптимальных ценовых уровней для исполнения ордеров.
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Disclaimer Section */}
        <section className="py-16 bg-slate-950">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto p-8 rounded-xl border border-red-900/30 bg-red-950/10 text-center">
              <h3 className="text-xl font-semibold text-red-400 mb-4">Раскрытие рисков</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Торговля криптовалютами сопряжена с высоким уровнем риска и может не подходить для всех инвесторов.
                Кредитное плечо может работать как в вашу пользу, так и против вас. Перед принятием решения о торговле
                криптовалютами следует тщательно оценить свои инвестиционные цели, уровень опыта и склонность к риску.
                Существует вероятность потери части или всех первоначальных инвестиций. AlgoTrade.AI предоставляет
                автоматизированные инструменты, но не гарантирует прибыль.
              </p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
