import { NextResponse } from 'next/server'
import type { Message as IMessageKitMessage } from '@photon-ai/imessage-kit'
import { analyzeConversation } from '@/lib/conversation-analysis'
import { Message } from '@/lib/types'

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

export async function POST(request: Request) {
  try {
    const { chatId } = await request.json()
    
    if (!chatId) {
      return NextResponse.json(
        { error: 'chatId is required' },
        { status: 400 }
      )
    }

    const sdk = await getSDK()
    
    // Get messages for this conversation
    const result = await sdk.getMessages({
      chatId,
      excludeOwnMessages: false,
      limit: 50 // Analyze last 50 messages
    })
    
    const messagesArray: IMessageKitMessage[] = Array.from(result.messages as readonly IMessageKitMessage[])
    
    // Convert to our Message format
    const messages: Message[] = messagesArray.map(msg => ({
      id: msg.id,
      text: msg.text,
      sender: msg.sender,
      senderName: msg.senderName,
      date: msg.date.toISOString(),
      isFromMe: msg.isFromMe,
      isRead: msg.isRead
    }))
    
    // Analyze the conversation (this will read from DB and write results back)
    const analysis = await analyzeConversation(chatId, messages)
    
    return NextResponse.json({ 
      success: true,
      analysis 
    })
  } catch (error) {
    console.error('[Analyze API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze conversation' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve existing analysis from database
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const chatId = searchParams.get('chatId')
    
    if (!chatId) {
      return NextResponse.json(
        { error: 'chatId is required' },
        { status: 400 }
      )
    }

    const { getConversation } = await import('@/lib/db')
    const conversation = getConversation(chatId)
    
    if (!conversation || !conversation.aiAnalysis) {
      return NextResponse.json(
        { error: 'No analysis found for this conversation' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      analysis: conversation.aiAnalysis,
      userNotes: conversation.userNotes,
      contactInfo: {
        name: conversation.senderName,
        birthday: conversation.birthday,
        organization: conversation.organization,
        jobTitle: conversation.jobTitle
      }
    })
  } catch (error) {
    console.error('[Analyze API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve analysis' },
      { status: 500 }
    )
  }
}

