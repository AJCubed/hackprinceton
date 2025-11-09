"use client"

import { useState } from "react"
import { ConversationList } from "@/components/conversation-list"
import { MessageDetail } from "@/components/message-detail"
import { Dashboard } from "@/components/dashboard"
import { Sidebar } from "@/components/sidebar"

export default function Home() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [currentView, setCurrentView] = useState<"messages" | "dashboard">("messages")

  const handleContactClick = (chatId: string) => {
    setSelectedConversation(chatId)
    setCurrentView("messages")
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      <div className="flex flex-1 overflow-hidden">
        {currentView === "messages" ? (
          <>
            <ConversationList
              selectedConversation={selectedConversation}
              onSelectConversation={setSelectedConversation}
            />
            {selectedConversation && <MessageDetail conversationId={selectedConversation} />}
          </>
        ) : (
          <Dashboard onContactClick={handleContactClick} />
        )}
      </div>
    </div>
  )
}
