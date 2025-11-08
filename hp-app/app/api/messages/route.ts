import { NextRequest, NextResponse } from 'next/server'
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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const chatId = searchParams.get('chatId')
  const sender = searchParams.get('sender')
  
  if (!chatId && !sender) {
    return NextResponse.json(
      { error: 'chatId or sender parameter is required' },
      { status: 400 }
    )
  }
  
  const sdk = await getSDK()
  
  try {
    const filter: any = {
      excludeOwnMessages: false,
      limit: 100
    }
    
    if (chatId) {
      filter.chatId = chatId
    } else if (sender) {
      filter.sender = sender
    }
    
    const result = await sdk.getMessages(filter)
    
    // Convert readonly array to regular array for sorting
    const messagesArray: Message[] = Array.from(result.messages as readonly Message[])
    
    const messages = messagesArray
      .sort((a: Message, b: Message) => a.date.getTime() - b.date.getTime())
      .map((msg: Message) => ({
        id: msg.id,
        text: msg.text,
        sender: msg.sender,
        senderName: msg.senderName,
        date: msg.date.toISOString(),
        isFromMe: msg.isFromMe,
        isRead: msg.isRead
      }))
    
    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

