"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

type Status = "connected" | "disconnected" | "error"

interface ApiStatusContextType {
  status: Status
  setStatus: (status: Status) => void
  checkConnection: () => Promise<void>
  clearCredentials: () => void
}

const ApiStatusContext = createContext<ApiStatusContextType | undefined>(undefined)

export function ApiStatusProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("disconnected")

  // Check connection status on mount by calling the backend
  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    try {
      const response = await fetch("/api/okx/credentials", {
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        if (data.has_credentials) {
          setStatus("connected")
        } else {
          setStatus("disconnected")
        }
      } else {
        setStatus("error")
      }
    } catch (error) {
      console.error("Failed to check API credentials:", error)
      setStatus("error")
    }
  }

  const clearCredentials = async () => {
    try {
      await fetch("/api/okx/credentials", {
        method: "DELETE",
        credentials: "include",
      })
      setStatus("disconnected")
    } catch (error) {
      console.error("Failed to clear credentials:", error)
    }
  }

  return (
    <ApiStatusContext.Provider value={{ status, setStatus, checkConnection, clearCredentials }}>
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
