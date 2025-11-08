import { NextResponse } from 'next/server'
import { lookupContact } from '../contacts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const identifier = searchParams.get('identifier')
    
    if (!identifier) {
      return NextResponse.json({ error: 'Missing identifier parameter' }, { status: 400 })
    }
    
    const contactInfo = await lookupContact(identifier)
    
    if (!contactInfo) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }
    
    return NextResponse.json(contactInfo)
  } catch (error) {
    console.error('Error fetching contact info:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

