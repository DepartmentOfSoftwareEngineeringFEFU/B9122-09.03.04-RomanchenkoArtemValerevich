"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, BookOpen, AlertTriangle, Activity, Brain, TrendingUp } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useState } from "react"
import { references } from "@/data/references"

const COLOR_STYLES = {
  blue: "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20",
  violet: "bg-violet-500/10 text-violet-400 hover:bg-violet-500/20",
  orange: "bg-orange-500/10 text-orange-400 hover:bg-orange-500/20",
  emerald: "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",
} as const

const ICON_MAP = {
  Brain: Brain,
  Activity: Activity,
  AlertTriangle: AlertTriangle,
  BookOpen: BookOpen,
  TrendingUp: TrendingUp,
}

const LEVEL_LABELS: Record<string, string> = {
  Beginner: "Начальный",
  Intermediate: "Средний",
  Advanced: "Продвинутый",
}

export default function ReferencePage() {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredReferences = references.filter(
    (ref) =>
      ref.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ref.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ref.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Справочная библиотека</h1>
        <p className="text-muted-foreground">Документация по стратегиям, индикаторам и управлению рисками.</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Поиск документации..."
            className="pl-8 bg-slate-950/50 border-slate-800"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">Все</TabsTrigger>
          <TabsTrigger value="strategies">Стратегии</TabsTrigger>
          <TabsTrigger value="indicators">Индикаторы</TabsTrigger>
          <TabsTrigger value="risk">Риск-менеджмент</TabsTrigger>
        </TabsList>

        {["all", "strategies", "indicators", "risk"].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-0">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredReferences
                .filter((ref) => tab === "all" || ref.type === tab)
                .map((ref) => {
                  const Icon = ICON_MAP[ref.iconName as keyof typeof ICON_MAP] || BookOpen
                  return (
                    <Card
                      key={ref.id}
                      className="hover:bg-slate-900/60 transition-colors border-slate-800 flex flex-col cursor-pointer group"
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="secondary" className={COLOR_STYLES[ref.color as keyof typeof COLOR_STYLES]}>
                            {ref.category}
                          </Badge>
                          <Icon className="h-5 w-5 text-slate-500 group-hover:text-slate-300 transition-colors" />
                        </div>
                        <CardTitle className="text-xl">{ref.title}</CardTitle>
                        <CardDescription>{ref.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="mt-auto">
                        <div className="flex flex-wrap gap-2 mb-4">
                          {ref.tags.map((tag) => (
                            <span key={tag} className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="link" className="p-0 h-auto text-blue-400 group-hover:text-blue-300">
                              Читать далее
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <div className="flex items-center gap-3 mb-2">
                                <div
                                  className={`p-2 rounded-lg ${COLOR_STYLES[ref.color as keyof typeof COLOR_STYLES].split(" ")[0]}`}
                                >
                                  <Icon
                                    className={`h-6 w-6 ${COLOR_STYLES[ref.color as keyof typeof COLOR_STYLES].split(" ")[1]}`}
                                  />
                                </div>
                                <div>
                                  <DialogTitle className="text-2xl">{ref.title}</DialogTitle>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                    <span>Уровень: {LEVEL_LABELS[ref.level] || ref.level}</span>
                                    <span>•</span>
                                    <span>{ref.category}</span>
                                  </div>
                                </div>
                              </div>
                              <DialogDescription className="text-base">{ref.description}</DialogDescription>
                            </DialogHeader>
                            <div className="py-4 text-sm leading-relaxed text-slate-300 whitespace-pre-wrap border-t border-slate-800 mt-4 pt-6">
                              {ref.content}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </CardContent>
                    </Card>
                  )
                })}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
