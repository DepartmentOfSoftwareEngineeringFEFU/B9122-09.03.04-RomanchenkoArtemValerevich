"use client"

import { OperationsTable } from "@/components/operations/operations-table"

export default function OperationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          История операций
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Журнал всех сделок, исполненных системой и вручную
        </p>
      </div>
      <OperationsTable />
    </div>
  )
}
