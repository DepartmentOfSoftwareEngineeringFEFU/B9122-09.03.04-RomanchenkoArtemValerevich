"use client"

import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
}

export function ErrorState({
  title = "Произошла ошибка",
  message = "Не удалось загрузить данные. Пожалуйста, попробуйте снова.",
  onRetry,
}: ErrorStateProps) {
  return (
    <Card className="bg-red-500/5 border-red-500/20">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
          <AlertTriangle className="h-6 w-6 text-red-500" />
        </div>
        <CardTitle className="text-red-500">{title}</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      {onRetry && (
        <CardContent className="flex justify-center">
          <Button variant="outline" onClick={onRetry} className="border-red-500/30 hover:bg-red-500/10 bg-transparent">
            <RefreshCw className="mr-2 h-4 w-4" />
            Повторить
          </Button>
        </CardContent>
      )}
    </Card>
  )
}

export function NotFoundState({ title = "Не найдено", message = "Запрашиваемый ресурс не существует." }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
        <AlertTriangle className="h-8 w-8 text-slate-400" />
      </div>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-muted-foreground max-w-md">{message}</p>
    </div>
  )
}
