'use client'

import { useState, useEffect } from 'react'

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

interface Message {
  id: string
  text: string | null
  sender: string
  senderName: string | null
  date: string
  isFromMe: boolean
  isRead: boolean
}

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)

  useEffect(() => {
    fetchConversations()
  }, [])

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation)
    }
  }, [selectedConversation])

  async function fetchConversations() {
    try {
      setLoading(true)
      const response = await fetch('/api/conversations')
      const data = await response.json()
      setConversations(data.conversations || [])
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchMessages(conversation: Conversation) {
    try {
      setLoadingMessages(true)
      const params = conversation.chatId 
        ? `chatId=${encodeURIComponent(conversation.chatId)}`
        : `sender=${encodeURIComponent(conversation.sender)}`
      const response = await fetch(`/api/messages?${params}`)
      const data = await response.json()
      setMessages(data.messages || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoadingMessages(false)
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    } else if (days === 1) {
      return 'Yesterday'
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  function formatMessageDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-black">
      {/* Conversations List */}
      <div className="w-80 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Messages</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-zinc-500">Loading conversations...</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-zinc-500">No conversations found</div>
          ) : (
            conversations.map((conversation) => (
              <button
                key={conversation.chatId || conversation.sender}
                onClick={() => setSelectedConversation(conversation)}
                className={`w-full p-4 text-left border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${
                  selectedConversation?.chatId === conversation.chatId
                    ? 'bg-zinc-100 dark:bg-zinc-800'
                    : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="font-medium text-zinc-900 dark:text-zinc-50 truncate">
                        {conversation.senderName || conversation.sender}
                      </h2>
                      {conversation.unreadCount > 0 && (
                        <span className="bg-blue-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate mt-1">
                      {conversation.lastMessage.isFromMe && 'You: '}
                      {conversation.lastMessage.text || '(No text)'}
                    </p>
                  </div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-500 ml-2 shrink-0">
                    {formatDate(conversation.lastMessage.date)}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Message History */}
      <div className="flex-1 flex flex-col bg-white dark:bg-zinc-900">
        {selectedConversation ? (
          <>
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {selectedConversation.senderName || selectedConversation.sender}
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingMessages ? (
                <div className="text-center text-zinc-500">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-zinc-500">No messages found</div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isFromMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        message.isFromMe
                          ? 'bg-blue-500 text-white'
                          : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50'
                      }`}
                    >
                      {message.text && (
                        <p className="whitespace-pre-wrap wrap-break-word">{message.text}</p>
                      )}
                      <p
                        className={`text-xs mt-1 ${
                          message.isFromMe
                            ? 'text-blue-100'
                            : 'text-zinc-500 dark:text-zinc-400'
                        }`}
                      >
                        {formatMessageDate(message.date)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-500">
            Select a conversation to view messages
          </div>
        )}
      </div>
    </div>
  )
}
