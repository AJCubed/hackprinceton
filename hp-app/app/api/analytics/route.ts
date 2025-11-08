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
    // Get messages from the last week
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    
    const result = await sdk.getMessages({
      excludeOwnMessages: false,
      limit: 1000,
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
    
    // Simple sentiment analysis
    const sentimentCounts = { positive: 0, neutral: 0, negative: 0 }
    const positiveWords = ['love', 'great', 'amazing', 'awesome', 'good', 'thanks', 'thank you', '😂', '😊', '❤️', '!']
    const negativeWords = ['sorry', 'unfortunately', 'problem', 'issue', 'bad', 'not sure', 'no', "can't"]
    
    messagesArray.forEach(msg => {
      // Handle null text values
      const text = (msg.text || '').toLowerCase()
      
      // Skip empty messages for sentiment analysis
      if (!text.trim()) {
        sentimentCounts.neutral++
        return
      }
      
      const hasPositive = positiveWords.some(word => text.includes(word))
      const hasNegative = negativeWords.some(word => text.includes(word))
      
      if (hasPositive && !hasNegative) {
        sentimentCounts.positive++
      } else if (hasNegative && !hasPositive) {
        sentimentCounts.negative++
      } else {
        sentimentCounts.neutral++
      }
    })
    
    const total = sentimentCounts.positive + sentimentCounts.neutral + sentimentCounts.negative
    const sentimentData = [
      { name: 'Positive', value: total > 0 ? Math.round((sentimentCounts.positive / total) * 100) : 0, fill: '#10b981' },
      { name: 'Neutral', value: total > 0 ? Math.round((sentimentCounts.neutral / total) * 100) : 0, fill: '#6b7280' },
      { name: 'Negative', value: total > 0 ? Math.round((sentimentCounts.negative / total) * 100) : 0, fill: '#ef4444' }
    ]
    
    // Get unique contacts
    const uniqueContacts = new Set(messagesArray.map(m => m.sender))
    
    // Top contacts by message count
    const contactCounts: { [key: string]: { count: number, name: string, sentiment: string } } = {}
    
    messagesArray.forEach(msg => {
      if (!contactCounts[msg.sender]) {
        contactCounts[msg.sender] = {
          count: 0,
          name: msg.senderName || msg.sender,
          sentiment: 'neutral'
        }
      }
      contactCounts[msg.sender].count++
    })
    
    const topContacts = Object.entries(contactCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 4)
      .map(([sender, data]) => ({
        name: data.name,
        messages: data.count,
        sentiment: 'neutral',
        frequency: data.count > 20 ? 'Daily' : data.count > 10 ? '3x/week' : 'Weekly'
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

