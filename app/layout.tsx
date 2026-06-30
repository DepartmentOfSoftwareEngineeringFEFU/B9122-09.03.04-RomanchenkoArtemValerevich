import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { ApiStatusProvider } from "@/components/providers/api-status-provider"
import { AuthProvider } from "@/components/providers/auth-provider"

const _geist = Geist({ subsets: ["latin", "cyrillic"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "AlgoTrade.AI",
  description: "Прототип веб-приложения для проверки торговой стратегии в демонстрационном режиме OKX",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" className="dark">
      <body className={`font-sans antialiased min-h-screen bg-background text-foreground`}>
        <AuthProvider>
          <ApiStatusProvider>
            {children}
            <Analytics />
            <Toaster />
          </ApiStatusProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
