import { NextResponse } from 'next/server'
import type { Message } from '@photon-ai/imessage-kit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

let sdkInstance: any = null

async function getSDK() {
  if (!sdkInstance) {
    const { IMessageSDK } = await import('@photon-ai/imessage-kit')
    sdkInstance = new IMessageSDK({
      debug: false,
      maxConcurrent: 5
    })
  }
  return sdkInstance
}

export async function GET() {
  const sdk = await getSDK()
  
  try {
    // Get recent messages (limit to 1000 to get a good sample)
    const result = await sdk.getMessages({
      excludeOwnMessages: false,
      limit: 1000
    })
    
    // Convert readonly array to regular array
    const messagesArray: Message[] = Array.from(result.messages as readonly Message[])
    
    // Group messages by sender (chatId)
    const conversationsMap = new Map<string, {
      chatId: string
      sender: string
      senderName: string | null
      lastMessage: Message
      unreadCount: number
    }>()
    
    for (const message of messagesArray) {
      const key = message.chatId || message.sender
      
      if (!conversationsMap.has(key)) {
        conversationsMap.set(key, {
          chatId: message.chatId,
          sender: message.sender,
          senderName: message.senderName,
          lastMessage: message,
          unreadCount: 0
        })
      }
      
      const conversation = conversationsMap.get(key)!
      
      // Update if this message is more recent
      if (message.date > conversation.lastMessage.date) {
        conversation.lastMessage = message
        conversation.senderName = message.senderName || conversation.senderName
      }
      
      // Count unread messages
      if (!message.isRead && !message.isFromMe) {
        conversation.unreadCount++
      }
    }
    
    // Convert to array and sort by last message date
    const conversations = Array.from(conversationsMap.values())
      .sort((a, b) => b.lastMessage.date.getTime() - a.lastMessage.date.getTime())
      .slice(0, 10) // Top 10
      .map(conv => ({
        chatId: conv.chatId,
        sender: conv.sender,
        senderName: conv.senderName,
        lastMessage: {
          text: conv.lastMessage.text,
          date: conv.lastMessage.date.toISOString(),
          isFromMe: conv.lastMessage.isFromMe
        },
        unreadCount: conv.unreadCount
      }))
    
    return NextResponse.json({ conversations })
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}

