"use client"

import { useState, useEffect } from "react"
import { Search, Bell, MessageSquare } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn, normalizeChatId } from "@/lib/utils"
import { ConversationAnalysis } from "@/lib/types"
import { getConversationAnalyses } from "@/lib/db"

interface Conversation {
  chatId: string
  sender: string
  senderName: string | null
  lastMessage: {
    text: string | null
    date: string
    isFromMe: boolean
  }
  unreadCount: number
}

interface ConversationListProps {
  selectedConversation: string | null
  onSelectConversation: (id: string) => void
}

export function ConversationList({ selectedConversation, onSelectConversation }: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [analyses, setAnalyses] = useState<Map<string, ConversationAnalysis> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchConversations()
    
  }, [])



  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/conversations')
      const data = await response.json()
      // Ensure null text values are converted to empty strings
      const conversations = (data.conversations || []).map((conv: Conversation) => ({
        ...conv,
        lastMessage: {
          ...conv.lastMessage,
          text: conv.lastMessage.text ?? ''
        }
      }))
      setConversations(conversations)
      onSelectConversation(conversations[0].chatId);
      const analyses = await getConversationAnalyses((data.conversations || []).map((conv: Conversation) => conv.chatId))
      setAnalyses(analyses)
      console.log('Analyses Map', analyses)
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }

 

  const filteredConversations = conversations.filter(
    (conv) =>
      (conv.senderName || conv.sender).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (conv.lastMessage.text || '').toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const getInitials = (name: string) => {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0]
    }
    return name.substring(0, 2).toUpperCase()
  }

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) {
      return `${diffMins} min${diffMins !== 1 ? 's' : ''}`
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`
    } else {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''}`
    }
  }

  
  const getSentiment = (chatId: string) => {
    const analysis = analyses?.get(normalizeChatId(chatId))
    return analysis?.sentiment || "unknown"
  }
  const getSentimentColor = (chatId: string) => {
    const analysis = analyses?.get(normalizeChatId(chatId));
    const positivityScore = analysis?.positivity_score || 0;
    if (positivityScore > 30) {
        return "text-green-600 dark:text-green-400"
    } else if (positivityScore < -30) {
      return "text-red-600 dark:text-red-400"
    } else {
      return "text-muted-foreground"
    }
  }

  if (loading) {
    return (
      <div className="w-80 bg-card border-r border-border flex items-center justify-center">
        <p className="text-muted-foreground">Loading conversations...</p>
      </div>
    )
  }

  return (
    <div className="w-80 bg-card border-r border-border flex flex-col font-sans">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h1 className="text-2xl font-semibold text-foreground mb-4">Messages</h1>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted border-muted"
            />
          </div>
          <button className="p-2 hover:bg-muted rounded-lg transition-colors">
            <Bell className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No conversations found</p>
          </div>
        ) : (
          (filteredConversations).map((conversation) => {
            const displayName = conversation.senderName || conversation.sender
            const sentiment = getSentiment(conversation.chatId);
            const conversationKey = conversation.chatId || conversation.sender
            const sentimentColor = getSentimentColor(conversation.chatId);
            return (
              <button
                key={conversationKey}
                onClick={() => onSelectConversation(conversationKey)}
                className={cn(
                  "w-full p-4 border-b border-border text-left transition-colors hover:bg-muted/50",
                  selectedConversation === conversationKey && "bg-muted",
                )}
              >
                <div className="flex gap-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-linear-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
                    <span className="font-semibold text-sm text-primary">{getInitials(displayName)}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-semibold text-foreground truncate">{displayName}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTimestamp(conversation.lastMessage.date)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground truncate flex-1">
                        {conversation.lastMessage.isFromMe ? 'You: ' : ''}{conversation.lastMessage.text || '(No message)'}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      )}
                    </div>

                    {/* Sentiment Indicator */}
                    <div className="flex gap-1 mt-2">
                      <MessageSquare className={cn("w-3 h-3", sentimentColor)} />
                      <span className={cn("text-xs capitalize", sentimentColor)}>
                        {sentiment}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

