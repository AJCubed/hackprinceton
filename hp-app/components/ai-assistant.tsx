"use client"

import { useState } from "react"
import { Send, Lightbulb, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Message {
  id: string
  sender: "user" | "contact"
  text: string
  timestamp: string
}

interface AIAssistantProps {
  conversationContext: {
    name: string
    sentiment: string
    recentMessages: Message[]
  }
}

export function AIAssistant({ conversationContext }: AIAssistantProps) {
  const [assistantMessages, setAssistantMessages] = useState<Array<{ role: string; content: string }>>([
    {
      role: "assistant",
      content: `Hey! I'm analyzing your conversation with ${conversationContext.name}. I can help you craft the perfect response or explore your feelings about this relationship. What would you like to do?`,
    },
  ])
  const [inputValue, setInputValue] = useState("")

  const handleSend = () => {
    if (!inputValue.trim()) return

    const newUserMessage = {
      role: "user",
      content: inputValue,
    }

    // Mock AI response
    const mockResponse = {
      role: "assistant",
      content: `Based on the conversation with ${conversationContext.name}, here's what I'm thinking: You both seem really engaged and positive about catching up. A natural response would be to confirm a specific time and place. How about something like: "Perfect! Let's do Saturday afternoon at the coffee place downtown?" - it's specific, enthusiastic, and moves the conversation forward.`,
    }

    setAssistantMessages([...assistantMessages, newUserMessage, mockResponse])
    setInputValue("")
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <Lightbulb className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground text-sm">AI Assistant</h3>
        </div>
        <p className="text-xs text-muted-foreground">Conversation coach</p>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {assistantMessages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-xs px-4 py-2 rounded-lg ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-none"
                  : "bg-muted text-foreground rounded-bl-none"
              }`}
            >
              <p className="text-sm">{msg.content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Suggestions */}
      <div className="p-4 border-t border-border space-y-2">
        <p className="text-xs font-semibold text-foreground mb-2">Quick suggestions</p>
        <div className="space-y-2">
          <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs bg-transparent">
            <MessageCircle className="w-3 h-3" />
            Draft a response
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs bg-transparent">
            <Lightbulb className="w-3 h-3" />
            Explore feelings
          </Button>
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border gap-2 flex">
        <Input
          placeholder="Ask me anything..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSend()}
          className="bg-muted border-muted text-xs"
        />
        <Button size="icon" onClick={handleSend} size="sm">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

