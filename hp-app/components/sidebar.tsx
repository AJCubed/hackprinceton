"use client"

import { MessageCircle, BarChart3, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

interface SidebarProps {
  currentView: "messages" | "dashboard"
  setCurrentView: (view: "messages" | "dashboard") => void
}

export function Sidebar({ currentView, setCurrentView }: SidebarProps) {
  return (
    <div className="w-16 bg-card border-r border-border flex flex-col items-center py-4 gap-4">
      <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center bg-card">
        <Image
          src="/logo.jpeg"
          alt="Logo"
          width={100}
          height={100}
          className="object-contain rounded-full"
        />
      </div>

      <nav className="flex flex-col gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentView("messages")}
          className={`rounded-lg ${currentView === "messages" ? "bg-muted text-primary" : ""}`}
          title="Messages"
        >
          <MessageCircle className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentView("dashboard")}
          className={`rounded-lg ${currentView === "dashboard" ? "bg-muted text-primary" : ""}`}
          title="Dashboard"
        >
          <BarChart3 className="w-5 h-5" />
        </Button>
      </nav>

      <div className="flex-1" />

      <Button variant="ghost" size="icon" className="rounded-lg" title="Settings">
        <Settings className="w-5 h-5" />
      </Button>
    </div>
  )
}
