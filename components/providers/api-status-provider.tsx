"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"

type Status = "connected" | "disconnected" | "error"

interface ApiStatusContextType {
  status: Status
  setStatus: (status: Status) => void
  checkConnection: (apiKey?: string, secretKey?: string, passphrase?: string) => Promise<void>
}

const ApiStatusContext = createContext<ApiStatusContextType | undefined>(undefined)

export function ApiStatusProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("disconnected")

  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async (apiKey?: string, secretKey?: string, passphrase?: string) => {
    // If credentials provided — call /api/okx/test directly
    if (apiKey && secretKey && passphrase) {
      try {
        const res = await fetch("/api/okx/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey, secretKey, passphrase }),
        })
        const data = await res.json()
        setStatus(data.status === "connected" ? "connected" : "error")
      } catch {
        setStatus("error")
      }
      return
    }

    try {
      const res = await fetch("/api/okx/status")
      if (!res.ok) {
        setStatus("disconnected")
        return
      }
      const data = await res.json()
      setStatus(data.data?.status === "connected" ? "connected" : data.data?.status === "error" ? "error" : "disconnected")
    } catch {
      setStatus("error")
    }
  }

  return (
    <ApiStatusContext.Provider value={{ status, setStatus, checkConnection }}>
      {children}
    </ApiStatusContext.Provider>
  )
}

export function useApiStatus() {
  const context = useContext(ApiStatusContext)
  if (context === undefined) {
    throw new Error("useApiStatus must be used within a ApiStatusProvider")
  }
  return context
}
