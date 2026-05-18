"use client"

import { useEffect, useState } from "react"
import type * as React from "react"
import { LayoutDashboard, LineChart, Cpu, History, BarChart3, Settings, LogOut, Activity } from "lucide-react"
import { useApiStatus } from "@/components/providers/api-status-provider"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail,
  SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { status } = useApiStatus()
  const [hasActiveStrategy, setHasActiveStrategy] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadStrategies() {
      try {
        const response = await fetch("/api/strategies")
        const payload = await response.json().catch(() => null) as { success?: boolean; data?: { active?: boolean }[] } | null
        if (!cancelled) setHasActiveStrategy(Boolean(payload?.success && payload.data?.some((strategy) => strategy.active)))
      } catch {
        if (!cancelled) setHasActiveStrategy(false)
      }
    }

    loadStrategies()
    return () => {
      cancelled = true
    }
  }, [])

  const isConnected = status === "connected"

  const systemState =
    !isConnected
      ? (status === "error" ? "error" : "disconnected")
      : hasActiveStrategy
        ? "running"
        : "paused"

  const systemConfig = {
    running:    { dot: "bg-emerald-500 animate-pulse", label: "Система работает",    tooltip: "Торговый API OKX подключён и хотя бы одна стратегия активна. Прогнозы используют публичные рыночные данные." },
    paused:     { dot: "bg-amber-500",                 label: "Работа приостановлена", tooltip: "Торговый API OKX подключён, но все стратегии приостановлены. Публичные рыночные данные доступны отдельно." },
    error:      { dot: "bg-red-500",                   label: "Торговый API не подключён",  tooltip: "Не удалось подключиться к private/demo API OKX. Прогноз может строиться по публичным рыночным данным, но операции не отправляются." },
    disconnected: { dot: "bg-slate-500",               label: "Торговый API не подключён",  tooltip: "Торговые API-ключи не настроены. Прогноз может работать по публичным данным, но demo-операции не отправляются." },
  }[systemState]

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <Activity className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">AlgoTrade</span>
                  
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Основное</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/dashboard"} tooltip="Панель управления">
                <Link href="/dashboard"><LayoutDashboard /><span>Панель управления</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname?.startsWith("/dashboard/market")} tooltip="Анализ рынка">
                <Link href="/dashboard/market"><LineChart /><span>Анализ рынка</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname?.startsWith("/dashboard/strategies")} tooltip="Стратегия">
                <Link href="/dashboard/strategies"><Cpu /><span>Стратегия</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/dashboard/operations"} tooltip="Операции">
                <Link href="/dashboard/operations"><History /><span>Операции</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/dashboard/analytics"} tooltip="Отчёты">
                <Link href="/dashboard/analytics"><BarChart3 /><span>Отчёты</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel>Система</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/dashboard/settings"} tooltip="Настройки">
                <Link href="/dashboard/settings"><Settings /><span>Настройки</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Выйти">
                <Link href="/login"><LogOut /><span>Выйти</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="p-2">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 rounded-md bg-sidebar-accent p-2 text-sm cursor-default">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${systemConfig.dot}`} />
                  <span className="text-muted-foreground text-xs truncate">{systemConfig.label}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" align="start" className="max-w-60 text-xs">
                <p>{systemConfig.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
