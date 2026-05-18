"use client"

import React from "react"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { User } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { usePathname } from "next/navigation"
import { useApiStatus } from "@/components/providers/api-status-provider"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/components/providers/auth-provider"

const SECTION_LABELS: Record<string, string> = {
  dashboard: "Панель управления",
  market: "Анализ рынка",
  strategies: "Стратегия",
  operations: "Операции",
  analytics: "Отчёты",
  settings: "Настройки",
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { status } = useApiStatus()
  const { user, isAuthenticated, isLoading, logout } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return null

  const getBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean)
    const items = [{ label: SECTION_LABELS.dashboard, href: "/dashboard", active: segments.length === 1 }]

    if (segments.length > 1) {
      const section = segments[1]
      const sectionLabel = SECTION_LABELS[section] || section
      if (segments.length === 2) {
        items.push({ label: sectionLabel, href: `/dashboard/${section}`, active: true })
      } else {
        items.push({ label: sectionLabel, href: `/dashboard/${section}`, active: false })
        const detailLabel = section === "market" ? segments[2].toUpperCase().replace("-", "/") : segments[2]
        items.push({ label: detailLabel, href: `/dashboard/${section}/${segments[2]}`, active: true })
      }
    }
    return items
  }

  const breadcrumbs = getBreadcrumbs()

  const statusConfig = (() => {
    switch (status) {
      case "connected": return { label: "Подключено", dot: "bg-emerald-500", text: "text-emerald-500" }
      case "error": return { label: "Ошибка", dot: "bg-red-500", text: "text-red-500" }
      default: return { label: "Отключено", dot: "bg-amber-500", text: "text-amber-500" }
    }
  })()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
          <div className="flex items-center gap-2 min-w-0">
            <SidebarTrigger className="-ml-1 shrink-0" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((item, index) => (
                  <React.Fragment key={item.href}>
                    <BreadcrumbItem className={index === 0 ? "hidden md:block" : ""}>
                      {item.active ? (
                        <BreadcrumbPage className="truncate max-w-[150px]">{item.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={item.href} className="truncate max-w-[150px]">{item.label}</BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {index < breadcrumbs.length - 1 && <BreadcrumbSeparator className="hidden md:block" />}
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-secondary border border-border text-xs cursor-default">
                    <span className={`h-2 w-2 rounded-full ${statusConfig.dot}`} />
                    <span className="text-muted-foreground">Торговый API OKX:</span>
                    <span className={`font-medium ${statusConfig.text}`}>{statusConfig.label}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="end" className="max-w-56 text-xs">
                  {status === "connected" && (
                    <p>Торговый API OKX подключён. Demo-операции могут отправляться после risk-check.</p>
                  )}
                  {status === "error" && (
                    <p>Не удалось подключиться к private/demo API OKX. Прогнозы могут строиться по публичным рыночным данным, но операции не отправляются.</p>
                  )}
                  {status === "disconnected" && (
                    <p>Торговые API-ключи не настроены. Публичные market data доступны отдельно; demo-операции не отправляются.</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                    {user?.login?.charAt(0).toUpperCase() || <User className="h-4 w-4" />}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user?.login || "Аккаунт"}</DropdownMenuLabel>
                <DropdownMenuItem className="text-xs text-muted-foreground">{user?.email}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><a href="/dashboard/settings">Настройки</a></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={logout}>Выйти</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
