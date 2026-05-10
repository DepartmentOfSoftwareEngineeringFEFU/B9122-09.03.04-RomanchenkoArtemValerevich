"use client"

import { Suspense } from "react"
import { SettingsContent } from "@/components/settings/settings-content"
import { Loader2 } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="max-w-2xl pb-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Настройки</h1>
        <p className="text-muted-foreground">Учётные данные API OKX.</p>
      </div>
      <Suspense fallback={<div className="flex items-center justify-center min-h-[200px]"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>}>
        <SettingsContent />
      </Suspense>
    </div>
  )
}
