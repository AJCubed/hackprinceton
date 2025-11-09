import { NextResponse } from 'next/server'
import { updateUserNotes } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Update user notes for a conversation
export async function POST(request: Request) {
  try {
    const { chatId, notes } = await request.json()
    
    if (!chatId) {
      return NextResponse.json(
        { error: 'chatId is required' },
        { status: 400 }
      )
    }
    
    if (typeof notes !== 'string') {
      return NextResponse.json(
        { error: 'notes must be a string' },
        { status: 400 }
      )
    }

    updateUserNotes(chatId, notes)
    
    return NextResponse.json({ 
      success: true,
      message: 'User notes updated successfully'
    })
  } catch (error) {
    console.error('[User Notes API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update user notes' },
      { status: 500 }
    )
  }
}

