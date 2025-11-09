"use client"

import type React from "react"

import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { useState, useEffect } from "react"

const geist = Geist({ 
  subsets: ["latin"],
  variable: "--font-sans"
})
const geistMono = Geist_Mono({ 
  subsets: ["latin"],
  variable: "--font-mono"
})

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // Check for dark mode preference
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setIsDark(true)
      document.documentElement.classList.add("dark")
    }

    // Listen for changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDark(e.matches)
      if (e.matches) {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [])

  return (
    <div className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}>
      {children}
      <Analytics />
    </div>
  )
}

