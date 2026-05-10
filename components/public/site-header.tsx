import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Activity, ArrowRight } from "lucide-react"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tighter">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 text-white">
            <Activity className="h-5 w-5" />
          </div>
          <span>AlgoTrade.AI</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <a href="/#features" className="hover:text-foreground transition-colors">
            Возможности
          </a>
          <a href="/#how-it-works" className="hover:text-foreground transition-colors">
            Как это работает
          </a>
          <Link href="/about" className="hover:text-foreground transition-colors">
            О проекте
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors hidden sm:block">
            Войти
          </Link>
          <Button
            asChild
            className="bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 text-white border-0 shadow-lg shadow-blue-500/20"
          >
            <Link href="/register">
              Начать <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
