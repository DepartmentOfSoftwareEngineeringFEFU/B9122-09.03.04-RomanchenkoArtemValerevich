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
              Прикладной прототип веб-приложения для проверки торговой стратегии в демонстрационном режиме OKX.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Прототип</h4>
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
                <Link href="/about" className="hover:text-blue-400">
                  О проекте
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
                  OKX API
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-blue-400">
                  История операций
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
        
      </div>
    </footer>
  )
}
