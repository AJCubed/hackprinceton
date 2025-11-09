import Database from 'better-sqlite3'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

// Database path - stored in the app directory
const DB_DIR = join(process.cwd(), 'data')
const DB_PATH = join(DB_DIR, 'conversations.db')

let db: Database.Database | null = null

// Ensure data directory exists
function ensureDataDir() {
  if (!existsSync(DB_DIR)) {
    mkdirSync(DB_DIR, { recursive: true })
  }
}

// Get database instance (singleton)
export function getDatabase(): Database.Database {
  if (!db) {
    ensureDataDir()
    db = new Database(DB_PATH)
    initializeSchema()
  }
  return db
}

// Initialize database schema
function initializeSchema() {
  if (!db) return

  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      -- Primary identifiers
      chat_id TEXT PRIMARY KEY,
      sender TEXT NOT NULL,
      sender_name TEXT,
      
      -- Contact info (from Apple Contacts)
      birthday TEXT,
      organization TEXT,
      job_title TEXT,
      
      -- Flexible JSON storage
      ai_summary TEXT,
      user_notes TEXT,
      
      -- Timestamps
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_sender ON conversations(sender);
    CREATE INDEX IF NOT EXISTS idx_updated_at ON conversations(updated_at DESC);
  `)

  console.log('[DB] Database initialized at:', DB_PATH)
}

// TypeScript interfaces
export interface ConversationRecord {
  chatId: string
  sender: string
  senderName: string | null
  birthday: string | null
  organization: string | null
  jobTitle: string | null
  aiSummary: AISummary | null
  userNotes: UserNotes | null
  createdAt: string
  updatedAt: string
}

export interface AISummary {
  conversationSummary?: string
  sentiment?: {
    overall: 'positive' | 'neutral' | 'negative'
    score: number
  }
  keyTopics?: string[]
  actionItems?: string[]
  entities?: {
    people?: string[]
    places?: string[]
    dates?: string[]
    organizations?: string[]
  }
  importantDates?: Array<{
    date: string
    context: string
  }>
  relationships?: {
    type?: 'colleague' | 'client' | 'friend' | 'family' | 'other'
    strength?: number
  }
  lastAnalyzedAt?: string
}

export interface UserNotes {
  tags?: string[]
  category?: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  isPinned?: boolean
  isMuted?: boolean
  isArchived?: boolean
  isStarred?: boolean
  customNotes?: string
  reminder?: {
    date: string
    text: string
  }
  folder?: string
  customFields?: Record<string, any>
}

// Upsert conversation contact info
export function upsertConversationContact(data: {
  chatId: string
  sender: string
  senderName?: string | null
  birthday?: string | null
  organization?: string | null
  jobTitle?: string | null
}): void {
  const database = getDatabase()

  try {
    const stmt = database.prepare(`
      INSERT INTO conversations (
        chat_id, sender, sender_name, birthday, organization, job_title, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, datetime('now')
      )
      ON CONFLICT(chat_id) DO UPDATE SET
        sender_name = COALESCE(excluded.sender_name, sender_name),
        birthday = COALESCE(excluded.birthday, birthday),
        organization = COALESCE(excluded.organization, organization),
        job_title = COALESCE(excluded.job_title, job_title),
        updated_at = datetime('now')
    `)

    stmt.run(
      data.chatId,
      data.sender,
      data.senderName || null,
      data.birthday || null,
      data.organization || null,
      data.jobTitle || null
    )
  } catch (error) {
    console.error('[DB] Error upserting conversation contact:', error)
  }
}

// Get conversation by chat ID
export function getConversation(chatId: string): ConversationRecord | null {
  const database = getDatabase()

  try {
    const stmt = database.prepare(`
      SELECT 
        chat_id as chatId,
        sender,
        sender_name as senderName,
        birthday,
        organization,
        job_title as jobTitle,
        ai_summary as aiSummary,
        user_notes as userNotes,
        created_at as createdAt,
        updated_at as updatedAt
      FROM conversations
      WHERE chat_id = ?
    `)

    const row = stmt.get(chatId) as any

    if (!row) return null

    return {
      ...row,
      aiSummary: row.aiSummary ? JSON.parse(row.aiSummary) : null,
      userNotes: row.userNotes ? JSON.parse(row.userNotes) : null,
    }
  } catch (error) {
    console.error('[DB] Error getting conversation:', error)
    return null
  }
}

// Update AI summary
export function updateAISummary(chatId: string, aiSummary: AISummary): void {
  const database = getDatabase()

  try {
    const stmt = database.prepare(`
      UPDATE conversations
      SET ai_summary = ?, updated_at = datetime('now')
      WHERE chat_id = ?
    `)

    stmt.run(JSON.stringify(aiSummary), chatId)
  } catch (error) {
    console.error('[DB] Error updating AI summary:', error)
  }
}

// Update user notes
export function updateUserNotes(chatId: string, userNotes: UserNotes): void {
  const database = getDatabase()

  try {
    const stmt = database.prepare(`
      UPDATE conversations
      SET user_notes = ?, updated_at = datetime('now')
      WHERE chat_id = ?
    `)

    stmt.run(JSON.stringify(userNotes), chatId)
  } catch (error) {
    console.error('[DB] Error updating user notes:', error)
  }
}

// Get all conversations (for admin/debugging)
export function getAllConversations(limit = 100): ConversationRecord[] {
  const database = getDatabase()

  try {
    const stmt = database.prepare(`
      SELECT 
        chat_id as chatId,
        sender,
        sender_name as senderName,
        birthday,
        organization,
        job_title as jobTitle,
        ai_summary as aiSummary,
        user_notes as userNotes,
        created_at as createdAt,
        updated_at as updatedAt
      FROM conversations
      ORDER BY updated_at DESC
      LIMIT ?
    `)

    const rows = stmt.all(limit) as any[]

    return rows.map(row => ({
      ...row,
      aiSummary: row.aiSummary ? JSON.parse(row.aiSummary) : null,
      userNotes: row.userNotes ? JSON.parse(row.userNotes) : null,
    }))
  } catch (error) {
    console.error('[DB] Error getting all conversations:', error)
    return []
  }
}

// Close database connection (for cleanup)
export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
    console.log('[DB] Database connection closed')
  }
}

