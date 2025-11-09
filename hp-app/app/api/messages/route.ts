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
    // Calculate date from two weeks ago
    const twoWeeksAgo = new Date()
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
    
    const filter: any = {
      excludeOwnMessages: false,
      limit: 100,
      since: twoWeeksAgo,
      
    }
    
    if (chatId) {
      filter.chatId = chatId
    } else if (sender) {
      filter.sender = sender
    }
    
    // Get messages from SDK
    const result = await sdk.getMessages(filter)
    
    // Get stored sent messages from our database
    // The conversationId (chatId or sender) is the person we're talking to
    // Stored messages have sender = the recipient (person we sent to)
    const { getSentMessages } = await import('@/lib/db')
    const { normalizeChatId } = await import('@/lib/utils')
    
    // Determine the conversation identifier
    const conversationIdentifier = chatId || sender
    if (!conversationIdentifier) {
      return NextResponse.json({ messages: [] })
    }
    
    const normalizedIdentifier = normalizeChatId(conversationIdentifier)
    const storedSentMessages = await getSentMessages(
      chatId || undefined,
      normalizedIdentifier, // Use normalized identifier as sender for matching
      twoWeeksAgo
    )
    
    // Convert readonly array to regular array for sorting
    const messagesArray: Message[] = Array.from(result.messages as readonly Message[])
    
    // Convert SDK messages to our format
    const sdkMessages = messagesArray.map((msg: Message) => ({
      id: msg.id,
      text: msg.text,
      sender: msg.sender,
      senderName: msg.senderName,
      date: msg.date.toISOString(),
      dateObj: msg.date,
      isFromMe: msg.isFromMe,
      isRead: msg.isRead
    }))
    
    // Create a map of SDK messages by date (for deduplication)
    // If SDK message has null text and isFromMe, we'll try to replace it with stored version
    const messagesMap = new Map<string, typeof sdkMessages[0]>()
    
    // First, add all SDK messages
    for (const msg of sdkMessages) {
      messagesMap.set(msg.id, msg)
      
      // If SDK message has null text and is from me, try to find a stored version
      if (msg.text === null && msg.isFromMe) {
        // Look for a stored message within 5 seconds of this message
        const msgDate = new Date(msg.date)
        const matchingStored = storedSentMessages.find(stored => {
          const storedDate = new Date(stored.date)
          const timeDiff = Math.abs(msgDate.getTime() - storedDate.getTime())
          // Match by time (within 5 seconds) and sender
          return timeDiff < 5000 && normalizeChatId(stored.sender) === normalizeChatId(msg.sender)
        })
        
        if (matchingStored) {
          // Replace null text with stored text
          msg.text = matchingStored.text
          console.log(`[Messages] Replaced null text for message ${msg.id} with stored text: "${matchingStored.text.substring(0, 50)}..."`)
        }
      }
    }
    
    // Add stored sent messages that don't have a corresponding SDK message
    // (messages sent recently that haven't appeared in SDK yet, or messages SDK missed)
    for (const stored of storedSentMessages) {
      const storedDate = new Date(stored.date)
      
      // Check if we already have this message (within 5 seconds)
      // Match by: isFromMe, similar timestamp, and sender matches conversation
      const hasMatch = Array.from(messagesMap.values()).some(msg => {
        const msgDate = new Date(msg.date)
        const timeDiff = Math.abs(msgDate.getTime() - storedDate.getTime())
        // Match if: same time window, from us, and sender matches the conversation
        return timeDiff < 5000 && msg.isFromMe && normalizeChatId(msg.sender) === normalizeChatId(stored.sender)
      })
      
      if (!hasMatch) {
        // Add as a new message
        messagesMap.set(stored.id, {
          id: stored.id,
          text: stored.text,
          sender: stored.sender,
          senderName: null,
          date: stored.date,
          dateObj: storedDate,
          isFromMe: stored.isFromMe,
          isRead: stored.isRead
        })
      }
    }
    
    // Convert to array, sort by date
    const messages = Array.from(messagesMap.values())
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
      .map(({ dateObj, ...msg }) => msg) // Remove dateObj before returning
    
    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}


export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const recipient = searchParams.get('recipient')
  const message = searchParams.get('message')

  if (!recipient || !message) {
    return NextResponse.json(
      { error: 'recipient and message parameters are required' },
      { status: 400 }
    )
  }

  const sdk = await getSDK()
  
  try {
    // Send the message via SDK
    await sdk.send(recipient, message)
    
    // Store the sent message in our database
    // Try to determine if recipient is a chatId or sender
    // For now, we'll treat it as a sender (phone/email)
    // but also check if we can find the chatId from recent messages
    const { storeSentMessage } = await import('@/lib/db')
    const { normalizeChatId } = await import('@/lib/utils')
    
    let chatId: string | undefined = undefined
    
    // Try to find the chatId by querying recent messages with this sender
    try {
      const recentMessages = await sdk.getMessages({
        sender: recipient,
        limit: 1,
        excludeOwnMessages: false
      })
      
      if (recentMessages.messages.length > 0) {
        chatId = recentMessages.messages[0].chatId
      }
    } catch (e) {
      // If we can't find chatId, that's okay - we'll match by sender
      console.log('Could not determine chatId, will match by sender only')
    }
    
    await storeSentMessage({
      chatId: chatId,
      sender: normalizeChatId(recipient), // Normalize the recipient
      text: message,
      date: new Date()
    })
    
    return NextResponse.json({ message: 'Message sent successfully' })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}

