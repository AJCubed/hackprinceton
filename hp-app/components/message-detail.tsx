"use client"

import { useState, useEffect, useRef } from "react"
import { Send, Sparkles, Clock, Gift, Smile } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MessageInsights } from "@/components/message-insights"
import { AIAssistant } from "@/components/ai-assistant"
import { Message } from "../lib/types"
import { analyzeConversation } from "@/lib/conversation-analysis"


interface MessageDetailProps {
  conversationId: string
}

export function MessageDetail({ conversationId }: MessageDetailProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [inputValue, setInputValue] = useState("")
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [contactName, setContactName] = useState<string>("Contact")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchMessages()
  }, [conversationId])

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" })
  }, [messages])

  const fetchMessages = async () => {
    setLoading(true)
    try {
      // Try both chatId and sender parameters
      let url = `/api/messages?chatId=${encodeURIComponent(conversationId)}`
      let response = await fetch(url)
      let data = await response.json()
      
      // If no messages found with chatId, try with sender
      if (!data.messages || data.messages.length === 0) {
        url = `/api/messages?sender=${encodeURIComponent(conversationId)}`
        response = await fetch(url)
        data = await response.json()
      }
      
      setMessages(data.messages || [])
      
      // Set contact name from first message
      if (data.messages && data.messages.length > 0) {
        const firstMessage = data.messages[0]
        setContactName(firstMessage.senderName || firstMessage.sender)
      }

      // Analyze conversation
      if (data.messages && data.messages.length > 0) {
        const analysis = await analyzeConversation(conversationId, data.messages)
        console.log('[MessageDetail] Analysis:', analysis);
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    if (!inputValue.trim()) return

    try {
      await fetch(`/api/messages?recipient=${encodeURIComponent(conversationId)}&message=${encodeURIComponent(inputValue)}`, {
        method: 'POST'
      })
      
      // Refresh messages after sending
      fetchMessages()
      setInputValue("")
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading messages...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Message Header */}
      <div className="h-16 bg-card border-b border-border px-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{contactName}</h2>
          <p className="text-xs text-muted-foreground">{messages.length} messages</p>
        </div>
        <Button variant="ghost" size="icon">
          <Sparkles className="w-5 h-5 text-primary" />
        </Button>
      </div>

      <div className="flex-1 flex overflow-hidden gap-4">
        {/* Messages */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Message Thread */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No messages yet</p>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.isFromMe ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-xs px-4 py-2 rounded-xl ${
                        message.isFromMe
                          ? "bg-primary text-primary-foreground rounded-br-none"
                          : "bg-muted text-foreground rounded-bl-none"
                      }`}
                    >
                      <p className="text-sm">{message.text || "(No text content)"}</p>
                      <p
                        className={`text-xs mt-1 ${
                          message.isFromMe ? "text-primary-foreground/70" : "text-muted-foreground"
                        }`}
                      >
                        {formatMessageTime(message.date)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border bg-card p-4 space-y-4">
            {/* Quick Actions */}
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" className="gap-2 text-xs bg-transparent">
                <Clock className="w-4 h-4" />
                Schedule
              </Button>
              <Button variant="outline" size="sm" className="gap-2 text-xs bg-transparent">
                <Gift className="w-4 h-4" />
                Birthday
              </Button>
              <Button variant="outline" size="sm" className="gap-2 text-xs bg-transparent">
                <Smile className="w-4 h-4" />
                React
              </Button>
            </div>

            {/* Message Input */}
            <div className="flex gap-2">
              <Input
                placeholder={`Message ${contactName}...`}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                className="bg-muted border-muted"
              />
              <Button
                size="icon"
                onClick={() => setShowAIAssistant(!showAIAssistant)}
                variant={showAIAssistant ? "default" : "outline"}
              >
                <Sparkles className="w-4 h-4" />
              </Button>
              <Button size="icon" onClick={handleSend}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar - Insights & AI Assistant */}
        <div className="w-80 bg-card border-l border-border flex flex-col overflow-hidden">
          {showAIAssistant ? (
            <AIAssistant
              conversationContext={{
                name: contactName,
                sentiment: "neutral",
                recentMessages: messages.slice(-3).map(m => ({
                  id: m.id,
                  sender: m.isFromMe ? "user" : "contact",
                  text: m.text,
                  timestamp: formatMessageTime(m.date)
                })),
              }}
            />
          ) : (
            <MessageInsights conversationId={conversationId} />
          )}
        </div>
      </div>
    </div>
  )
}

