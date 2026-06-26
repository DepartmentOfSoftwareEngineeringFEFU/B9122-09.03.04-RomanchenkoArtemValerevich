import Link from "next/link"
import { Activity } from "lucide-react"

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-900 py-12 bg-slate-950">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 font-bold text-xl mb-4">
              <Activity className="h-6 w-6 text-blue-500" />
              <span>AlgoTrade.AI</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Передовая платформа алгоритмической торговли для современного криптоинвестора.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Платформа</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/#features" className="hover:text-blue-400">
                  Возможности
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="hover:text-blue-400">
                  Как это работает
                </Link>
              </li>
              <li>
                <Link href="/#pricing" className="hover:text-blue-400">
                  Тарифы
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Ресурсы</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/dashboard/reference" className="hover:text-blue-400">
                  Документация
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-blue-400">
                  API Reference
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-blue-400">
                  Блог
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Правовая информация</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="#" className="hover:text-blue-400">
                  Условия использования
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-blue-400">
                  Политика конфиденциальности
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-blue-400">
                  Раскрытие рисков
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-slate-900 text-center text-sm text-slate-500">
          © 2025 AlgoTrade.AI. Все права защищены.
        </div>
      </div>
    </footer>
  )
}
