"use client"

import { useState, useEffect, useRef } from "react"
import { Send, Sparkles, Clock, Gift, Smile, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { MessageInsights } from "@/components/message-insights"
import { AIAssistant } from "@/components/ai-assistant"
import { Message } from "../lib/types"
import { analyzeConversation } from "@/lib/conversation-analysis"
import { getConversation } from "@/lib/db"


interface MessageDetailProps {
  conversationId: string
  initialContactName?: string | null
}

export function MessageDetail({ conversationId, initialContactName }: MessageDetailProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [inputValue, setInputValue] = useState("")
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [contactName, setContactName] = useState<string>(initialContactName || "Contact")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const currentConversationIdRef = useRef<string>(conversationId)

  // Keep the ref updated with the current conversationId
  useEffect(() => {
    currentConversationIdRef.current = conversationId
  }, [conversationId])

  useEffect(() => {
    // Clear messages and reset state when conversation changes
    setMessages([])
    setLoading(true)
    setContactName(initialContactName || "Contact")
    
    const loadMessages = async () => {
      await fetchMessages(conversationId)
      
      // Set up polling for new messages every 5 seconds
      // pollingIntervalRef.current = setInterval(() => {
      //   // Use the ref to always get the current conversationId
      //   fetchMessages(currentConversationIdRef.current, true)
      // }, 5000)
    }
    
    loadMessages()
    
    // Cleanup interval on unmount or conversation change
    return () => {
      // if (pollingIntervalRef.current) {
      //   clearInterval(pollingIntervalRef.current)
      //   pollingIntervalRef.current = null
      // }
    }
  }, [conversationId, initialContactName])

  useEffect(() => {
    // Scroll to bottom when messages change or load
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" })
    }
  }, [messages])

  useEffect(() => {
    // Ensure we scroll to bottom immediately after loading state changes
    if (!loading && messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" })
      }, 0)
    }
  }, [loading, messages.length])

  const fetchMessages = async (chatId: string, isBackgroundRefresh = false) => {
    // Only show loading spinner on initial load, not on background refreshes
    if (!isBackgroundRefresh) {
      setLoading(true)
    }
    try {
      // Try both chatId and sender parameters
      let url = `/api/messages?chatId=${encodeURIComponent(chatId)}`
      let response = await fetch(url)
      let data = await response.json()
      
      // If no messages found with chatId, try with sender
      if (!data.messages || data.messages.length === 0) {
        url = `/api/messages?sender=${encodeURIComponent(chatId)}`
        response = await fetch(url)
        data = await response.json()
      }
      
      const newMessages = data.messages || []
      
      // Update contact name from messages if we don't have initialContactName
      // or if the current name is still "Contact"
      if (!initialContactName || contactName === "Contact") {
        if (newMessages.length > 0) {
          const firstMessage = newMessages[0]
          const name = firstMessage.senderName || firstMessage.sender
          if (name !== contactName) {
            setContactName(name)
          }
        } else {
          // Fallback to database lookup only if no messages
          const conversation = await getConversation(chatId);
          const name = conversation?.senderName || conversation?.sender || "Contact"
          if (name !== contactName) {
            setContactName(name)
          }
        }
      }
      
      // Only update if messages have changed (to avoid unnecessary re-renders)
      const hasNewMessages = newMessages.length !== messages.length || 
        (newMessages.length > 0 && messages.length > 0 && 
         newMessages[newMessages.length - 1].id !== messages[messages.length - 1].id)
      
      if (hasNewMessages || !isBackgroundRefresh) {
        setMessages(newMessages)
        
        // Auto-scroll to bottom if new messages arrived
        if (hasNewMessages && newMessages.length > messages.length) {
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
          }, 100)
        }
      }
      
      // Analyze conversation (only on initial load or significant changes)
      if (newMessages.length > 0 && (!isBackgroundRefresh || hasNewMessages)) {
        analyzeConversation(chatId, newMessages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      if (!isBackgroundRefresh) {
        setLoading(false)
      }
    }
  }

  const handleSend = async () => {
    if (!inputValue.trim()) return

    const messageText = inputValue.trim()
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    
    // Optimistically add the message to the UI immediately
    const optimisticMessage: Message = {
      id: tempId,
      text: messageText,
      sender: conversationId,
      senderName: null,
      date: new Date().toISOString(),
      isFromMe: true,
      isRead: true
    }
    
    setMessages(prev => [...prev, optimisticMessage])
    setInputValue("")
    
    // Scroll to bottom to show the new message
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 0)

    try {
      await fetch(`/api/messages?recipient=${encodeURIComponent(conversationId)}&message=${encodeURIComponent(messageText)}`, {
        method: 'POST'
      })
      
      // Refresh messages in background (without showing loading screen)
      // This will replace the optimistic message with the real one from the server
      fetchMessages(conversationId, true)
    } catch (error) {
      console.error('Error sending message:', error)
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempId))
      // Restore the input value so user can retry
      setInputValue(messageText)
    }
  }

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  if (loading && messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
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
        {/* <Button variant="ghost" size="icon">
          <Sparkles className="w-5 h-5 text-primary" />
        </Button> */}
      </div>

      <div className="flex-1 flex overflow-hidden gap-2">
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
                      className={`max-w-xs px-4 py-2 rounded-xl break-words ${
                        message.isFromMe
                          ? "bg-primary text-primary-foreground rounded-br-none"
                          : "bg-muted text-foreground rounded-bl-none"
                      }`}
                    >
                      <p className="text-sm break-words whitespace-pre-wrap">{message.text || "(No text content)"}</p>
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

            {/* Message Input */}
            <div className="flex gap-2 items-end">
              <Textarea
                placeholder={`Message ${contactName}...`}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                className="bg-muted border-muted resize-none min-h-[40px] max-h-[120px]"
                rows={1}
              />
              {/* <Button
                size="icon"
                onClick={() => setShowAIAssistant(!showAIAssistant)}
                variant={showAIAssistant ? "default" : "outline"}
                className="shrink-0"
              >
                <Sparkles className="w-4 h-4" />
              </Button> */}
              <Button size="icon" onClick={handleSend} className="shrink-0">
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
                  text: m.text || "",
                  timestamp: formatMessageTime(m.date)
                })),
              }}
            />
          ) : (
            <MessageInsights 
              conversationId={conversationId}
              onSuggestMessage={(message) => setInputValue(message)}
            />
          )}
        </div>
      </div>
    </div>
  )
}

