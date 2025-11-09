import { NextResponse } from 'next/server'
import type { Message } from '@photon-ai/imessage-kit'
import { lookupContact, ensureContactsLoaded } from '../contacts'

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
    // Ensure contacts are loaded for name lookup
    await ensureContactsLoaded()
    
    // Get messages from the last week
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    
    const result = await sdk.getMessages({
      excludeOwnMessages: false,
      limit: 3000,
      since: weekAgo
    })
    
    const messagesArray: Message[] = Array.from(result.messages as readonly Message[])
    
    // Calculate analytics
    const sentMessages = messagesArray.filter(m => m.isFromMe).length
    const receivedMessages = messagesArray.filter(m => !m.isFromMe).length
    
    // Count messages by day
    const messagesByDay: { [key: string]: number } = {}
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    
    messagesArray.forEach(msg => {
      const day = days[msg.date.getDay()]
      messagesByDay[day] = (messagesByDay[day] || 0) + 1
    })
    
    const activityData = days.map(day => ({
      day,
      messages: messagesByDay[day] || 0
    }))
    
    // Simple sentiment analysis per contact
    const contactSentiments: { [key: string]: { positive: number, neutral: number, negative: number } } = {}
    const positiveWords = ['love', 'great', 'amazing', 'awesome', 'good', 'thanks', 'thank you', '😂', '😊', '❤️', '!']
    const negativeWords = ['sorry', 'unfortunately', 'problem', 'issue', 'bad', 'not sure', 'no', "can't"]
    
    messagesArray.forEach(msg => {
      // Handle null text values
      const text = (msg.text || '').toLowerCase()
      
      if (!contactSentiments[msg.sender]) {
        contactSentiments[msg.sender] = { positive: 0, neutral: 0, negative: 0 }
      }
      
      // Skip empty messages for sentiment analysis
      if (!text.trim()) {
        contactSentiments[msg.sender].neutral++
        return
      }
      
      const hasPositive = positiveWords.some(word => text.includes(word))
      const hasNegative = negativeWords.some(word => text.includes(word))
      
      if (hasPositive && !hasNegative) {
        contactSentiments[msg.sender].positive++
      } else if (hasNegative && !hasPositive) {
        contactSentiments[msg.sender].negative++
      } else {
        contactSentiments[msg.sender].neutral++
      }
    })
    
    // Overall sentiment analysis
    const sentimentCounts = { positive: 0, neutral: 0, negative: 0 }
    Object.values(contactSentiments).forEach(sent => {
      sentimentCounts.positive += sent.positive
      sentimentCounts.neutral += sent.neutral
      sentimentCounts.negative += sent.negative
    })
    
    const total = sentimentCounts.positive + sentimentCounts.neutral + sentimentCounts.negative
    const sentimentData = [
      { name: 'Positive', value: total > 0 ? Math.round((sentimentCounts.positive / total) * 100) : 0, fill: '#10b981' },
      { name: 'Neutral', value: total > 0 ? Math.round((sentimentCounts.neutral / total) * 100) : 0, fill: '#6b7280' },
      { name: 'Negative', value: total > 0 ? Math.round((sentimentCounts.negative / total) * 100) : 0, fill: '#ef4444' }
    ]
    
    // Group messages by chatId (conversation identifier)
    // For 1-on-1 chats, chatId is typically the contact's identifier
    const chatGroups: { [chatId: string]: Message[] } = {}
    messagesArray.forEach(msg => {
      // Use chatId if available, otherwise fall back to sender
      const chatId = (msg as any).chatId || msg.sender
      if (!chatGroups[chatId]) {
        chatGroups[chatId] = []
      }
      chatGroups[chatId].push(msg)
    })
    
    // Get unique contacts (from chatIds, excluding group chats if needed)
    const uniqueContacts = new Set(
      Object.keys(chatGroups).filter(chatId => {
        // Exclude group chats if we can detect them
        const chatMessages = chatGroups[chatId]
        return chatMessages.some(m => !m.isFromMe) // Has at least one message from contact
      })
    )
    
    // Top contacts by message count with proper name lookup
    const contactCounts: { [key: string]: { count: number, name: string, sentiment: string, chatId: string } } = {}
    
    // Process each chat/conversation (with async contact lookups)
    const chatEntries = Object.entries(chatGroups)
    const contactLookups = await Promise.all(
      chatEntries.map(async ([chatId, chatMessages]) => {
        // Skip if this is only our own messages (no contact involved)
        if (chatMessages.every(m => m.isFromMe)) {
          return null
        }
        
        // Get the contact identifier (sender of messages not from me)
        const receivedMessages = chatMessages.filter(m => !m.isFromMe)
        if (receivedMessages.length === 0) return null
        
        const contactSender = receivedMessages[0].sender
        
        // Look up contact name from the chatId or sender
        const contactInfoChatId = await lookupContact(chatId)
        const contactInfoSender = await lookupContact(contactSender)
        const contactInfo = contactInfoChatId || contactInfoSender
        const contactName = contactInfo?.name || receivedMessages[0].senderName || chatId || contactSender
        
        // Determine sentiment for this contact (aggregate all messages in the chat)
        const allSentiments = { positive: 0, neutral: 0, negative: 0 }
        chatMessages.forEach(msg => {
          const sent = contactSentiments[msg.sender] || { positive: 0, neutral: 0, negative: 0 }
          allSentiments.positive += sent.positive
          allSentiments.neutral += sent.neutral
          allSentiments.negative += sent.negative
        })
        
        const totalSent = allSentiments.positive + allSentiments.neutral + allSentiments.negative
        let sentiment = 'neutral'
        if (totalSent > 0) {
          const positiveRatio = allSentiments.positive / totalSent
          const negativeRatio = allSentiments.negative / totalSent
          if (positiveRatio > 0.6) {
            sentiment = 'positive'
          } else if (negativeRatio > 0.4) {
            sentiment = 'negative'
          }
        }
        
        return {
          chatId,
          count: chatMessages.length, // Total messages in conversation
          name: contactName,
          sentiment
        }
      })
    )
    
    // Build contactCounts from lookups
    contactLookups.forEach(result => {
      if (result) {
        contactCounts[result.chatId] = result
      }
    })
    
    const topContacts = Object.entries(contactCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([sender, data]) => ({
        chatId: data.chatId,
        name: data.name,
        messages: data.count,
        sentiment: data.sentiment,
        frequency: data.count > 20 ? 'Daily' : data.count > 10 ? '3x/week' : data.count > 5 ? 'Weekly' : 'Occasional'
      }))
    
    const avgSentiment = sentimentData[0].value // Positive percentage
    
    return NextResponse.json({
      messagesSent: sentMessages,
      avgSentiment,
      activeContacts: uniqueContacts.size,
      activityData,
      sentimentData,
      topContacts
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}

