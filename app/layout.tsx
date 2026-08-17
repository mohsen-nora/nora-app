import type React from "react"
import type { Metadata, Viewport } from "next"
import { Vazirmatn, Geist_Mono } from "next/font/google"
import "./globals.css"

const vazir = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazir",
  display: "swap",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "نورا | دستیار هوشمند",
  description: "پنل مدیریت و گفتگوی نورا — دستیار هوشمند شخصی شما.",
  applicationName: "NORA",
  generator: "v0.app",
}

export const viewport: Viewport = {
  themeColor: "#1a1626",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fa" dir="rtl" className={`${vazir.variable} ${geistMono.variable} bg-background`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
