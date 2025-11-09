import { NextResponse } from 'next/server'
import type { Message } from '@photon-ai/imessage-kit'
import { lookupContact, ensureContactsLoaded } from '../contacts'
import { getConversationAnalyses } from '@/lib/db'
import { normalizeChatId } from '@/lib/utils'
import type { ConversationAnalysis } from '@/lib/types'

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
    
    // Fetch all conversation analyses at once
    const chatIds = Array.from(uniqueContacts)
    const analyses = await getConversationAnalyses(chatIds)
    
    // Helper function to convert positivity_score to sentiment category
    const getSentimentFromScore = (positivityScore: number | null | undefined): string => {
      if (positivityScore === null || positivityScore === undefined) {
        return 'neutral'
      }
      if (positivityScore > 30) {
        return 'positive'
      } else if (positivityScore < -30) {
        return 'negative'
      }
      return 'neutral'
    }
    
    // Top contacts by message count with proper name lookup
    const contactCounts: { [key: string]: { count: number, name: string, sentiment: string, chatId: string, positivityScore: number | null } } = {}
    
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
        
        // Get conversation analysis
        const normalizedChatId = normalizeChatId(chatId)
        const analysis = analyses.get(normalizedChatId)
        const positivityScore = analysis?.positivity_score ?? null
        const sentiment = getSentimentFromScore(positivityScore)
        
        return {
          chatId,
          count: chatMessages.length, // Total messages in conversation
          name: contactName,
          sentiment,
          positivityScore
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
    
    // Calculate overall sentiment distribution from all analyses
    const sentimentCounts = { positive: 0, neutral: 0, negative: 0 }
    const processedChatIds = new Set<string>()
    
    // Count sentiments from analyses we have (including null analyses as neutral)
    analyses.forEach((analysis, normalizedChatId) => {
      processedChatIds.add(normalizedChatId)
      if (analysis && analysis.positivity_score !== null && analysis.positivity_score !== undefined) {
        const sentiment = getSentimentFromScore(analysis.positivity_score)
        sentimentCounts[sentiment as keyof typeof sentimentCounts]++
      } else {
        // Analysis is null or missing positivity_score - count as neutral
        sentimentCounts.neutral++
      }
    })
    
    // Count contacts without any analysis entry as neutral
    chatIds.forEach(chatId => {
      const normalizedId = normalizeChatId(chatId)
      if (!processedChatIds.has(normalizedId)) {
        sentimentCounts.neutral++
      }
    })
    
    const total = sentimentCounts.positive + sentimentCounts.neutral + sentimentCounts.negative
    const sentimentData = [
      { name: 'Positive', value: total > 0 ? Math.round((sentimentCounts.positive / total) * 100) : 0, fill: '#10b981' },
      { name: 'Neutral', value: total > 0 ? Math.round((sentimentCounts.neutral / total) * 100) : 0, fill: '#6b7280' },
      { name: 'Negative', value: total > 0 ? Math.round((sentimentCounts.negative / total) * 100) : 0, fill: '#ef4444' }
    ]
    
    // Calculate average sentiment from positivity scores
    let totalPositivityScore = 0
    let scoreCount = 0
    analyses.forEach((analysis) => {
      if (analysis && analysis.positivity_score !== null && analysis.positivity_score !== undefined) {
        totalPositivityScore += analysis.positivity_score
        scoreCount++
      }
    })
    
    // Convert average positivity score (-100 to 100) to percentage (0 to 100)
    // Add 100 to shift from -100..100 to 0..200, then divide by 2 to get 0..100
    const avgPositivityScore = scoreCount > 0 ? totalPositivityScore / scoreCount : 0
    const avgSentiment = Math.max(0, Math.min(100, Math.round((avgPositivityScore + 100) / 2)))
    
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

