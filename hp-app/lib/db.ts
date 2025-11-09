"use server";

import Database from 'better-sqlite3'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { ConversationAnalysis, GeneralWellnessAnalysis } from './types'
import { normalizeChatId } from './utils'

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
function getDatabase(): Database.Database {
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
      ai_analysis TEXT,
      user_notes TEXT,
      
      -- Timestamps
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS wellness_evals (
      -- Primary key: date in YYYY-MM-DD format
      date TEXT PRIMARY KEY,
      
      -- Wellness score for easy access (0-100)
      wellness_score INTEGER NOT NULL,
      
      -- Full analysis as JSON
      analysis TEXT NOT NULL,
      
      -- Timestamp
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_sender ON conversations(sender);
    CREATE INDEX IF NOT EXISTS idx_updated_at ON conversations(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_wellness_date ON wellness_evals(date DESC);
    CREATE INDEX IF NOT EXISTS idx_wellness_score ON wellness_evals(wellness_score);
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
  aiAnalysis: ConversationAnalysis | null
  userNotes: string | null // turn into object later when llm taking in notes
  createdAt: string
  updatedAt: string
}

export interface WellnessEvalRecord {
  date: string // YYYY-MM-DD format
  wellnessScore: number
  analysis: GeneralWellnessAnalysis
  createdAt: string
  updatedAt: string
}

// Upsert conversation contact info
export async function upsertConversationContact(data: {
  chatId: string
  sender: string
  senderName?: string | null
  birthday?: string | null
  organization?: string | null
  jobTitle?: string | null
}): Promise<void> {
  const database = getDatabase()

  try {
    const normalizedChatId = normalizeChatId(data.chatId)
    const normalizedSender = normalizeChatId(data.sender)
    
    console.log('[DB] Upserting conversation contact')
    console.log('[DB] Original chatId:', data.chatId, '-> Normalized:', normalizedChatId)
    
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

    const result = stmt.run(
      normalizedChatId,
      normalizedSender,
      data.senderName || null,
      data.birthday || null,
      data.organization || null,
      data.jobTitle || null
    )
    
    console.log('[DB] Upsert result:', { changes: result.changes, lastInsertRowid: result.lastInsertRowid })
  } catch (error) {
    console.error('[DB] Error upserting conversation contact:', error)
    throw error
  }
}

// Get conversation by chat ID
export async function getConversation(chatId: string): Promise<ConversationRecord | null> {
  const database = getDatabase()

  try {
    const normalizedChatId = normalizeChatId(chatId)
    console.log('[DB] Getting conversation')
    console.log('[DB] Original chatId:', chatId, '-> Normalized:', normalizedChatId)
    
    const stmt = database.prepare(`
      SELECT 
        chat_id as chatId,
        sender,
        sender_name as senderName,
        birthday,
        organization,
        job_title as jobTitle,
        ai_analysis as aiAnalysis,
        user_notes as userNotes,
        created_at as createdAt,
        updated_at as updatedAt
      FROM conversations
      WHERE chat_id = ?
    `)

    const row = stmt.get(normalizedChatId) as any
    
    console.log('[DB] Query result:', row ? 'Found record' : 'No record found')
    if (row) {
      console.log('[DB] Record details:', {
        chatId: row.chatId,
        senderName: row.senderName,
        hasAiAnalysis: !!row.aiAnalysis,
        // aiAnalysisLength: row.aiAnalysis?.length || 0,
        // hasUserNotes: !!row.userNotes
      })
    }

    if (!row) return null

    return {
      ...row,
      aiAnalysis: row.aiAnalysis ? JSON.parse(row.aiAnalysis) : null,
      userNotes: row.userNotes ? JSON.parse(row.userNotes) : null,
    }
  } catch (error) {
    console.error('[DB] Error getting conversation:', error)
    return null
  }
}

//get AI Analysis
export async function getConversationAnalysis(chatId: string): Promise<ConversationAnalysis | null> {
  const database = getDatabase()
  const normalizedChatId = normalizeChatId(chatId)
  const stmt = database.prepare('SELECT ai_analysis FROM conversations WHERE chat_id = ?')
  const row = stmt.get(normalizedChatId) as any
  console.log('[DB] Conversation analysis:', row)
  return row ? JSON.parse(row.ai_analysis) : null
}

//get multiple conversation analyses
export async function getConversationAnalyses(chatIds: string[]): Promise<Map<string, ConversationAnalysis>> {
  const database = getDatabase()
  
  if (chatIds.length === 0) {
    return new Map()
  }
  
  const normalizedChatIds = chatIds.map(chatId => normalizeChatId(chatId))
  
  // Create placeholders for each chat ID (?, ?, ?, ...)
  const placeholders = normalizedChatIds.map(() => '?').join(', ')
  const stmt = database.prepare(`SELECT chat_id, ai_analysis FROM conversations WHERE chat_id IN (${placeholders})`)
  
  const rows = stmt.all(...normalizedChatIds) as any[]
  
  return new Map(rows.map(row => [row.chat_id, row.ai_analysis ? JSON.parse(row.ai_analysis) : null]))
}

// Update AI analysis
export async function updateAIAnalysis(chatId: string, aiAnalysis: ConversationAnalysis): Promise<void> {
  const database = getDatabase()

  try {
    const normalizedChatId = normalizeChatId(chatId)
    console.log('[DB] Updating AI analysis')
    console.log('[DB] Original chatId:', chatId, '-> Normalized:', normalizedChatId)
    console.log('[DB] Analysis data:', JSON.stringify(aiAnalysis, null, 2))
    
    // First, check if the conversation exists
    const checkStmt = database.prepare('SELECT chat_id FROM conversations WHERE chat_id = ?')
    const exists = checkStmt.get(normalizedChatId)
    
    console.log('[DB] Conversation exists?', !!exists)
    
    // Update existing record
    const updateStmt = database.prepare(`
    UPDATE conversations
    SET ai_analysis = ?, updated_at = datetime('now')
    WHERE chat_id = ?
    `)
    const result = updateStmt.run(JSON.stringify(aiAnalysis), normalizedChatId)
    console.log('[DB] Update result:', { changes: result.changes })
    
    // Verify the save
    const verifyStmt = database.prepare('SELECT ai_analysis FROM conversations WHERE chat_id = ?')
    const saved = verifyStmt.get(normalizedChatId) as any
    console.log('[DB] Verification - analysis saved?', !!saved?.ai_analysis)
    console.log('[DB] Verification - analysis length:', saved?.ai_analysis?.length || 0)
    
  } catch (error) {
    console.error('[DB] Error updating AI analysis:', error)
    throw error // Re-throw to see the full error
  }
}

// Update user notes
export async function updateUserNotes(chatId: string, userNotes: string): Promise<void> {
  const database = getDatabase()

  try {
    const normalizedChatId = normalizeChatId(chatId)
    console.log('[DB] Updating user notes')
    console.log('[DB] Original chatId:', chatId, '-> Normalized:', normalizedChatId)
    
    const stmt = database.prepare(`
      UPDATE conversations
      SET user_notes = ?, updated_at = datetime('now')
      WHERE chat_id = ?
    `)

    const result = stmt.run(userNotes, normalizedChatId)
    console.log('[DB] User notes update result:', { changes: result.changes })
  } catch (error) {
    console.error('[DB] Error updating user notes:', error)
    throw error
  }
}

// Get all conversations (for admin/debugging)
export async function getAllConversations(limit = 100): Promise<ConversationRecord[]> {
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
        ai_analysis as aiAnalysis,
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
      aiAnalysis: row.aiAnalysis ? JSON.parse(row.aiAnalysis) : null,
      userNotes: row.userNotes ? JSON.parse(row.userNotes) : null,
    }))
  } catch (error) {
    console.error('[DB] Error getting all conversations:', error)
    return []
  }
}

// Upsert wellness evaluation for current date
export async function upsertWellnessEvaluation(analysis: GeneralWellnessAnalysis): Promise<void> {
  const database = getDatabase()

  try {
    // Get current date in YYYY-MM-DD format
    const today = new Date()
    const dateStr = today.toISOString().split('T')[0] // YYYY-MM-DD format
    
    console.log('[DB] Upserting wellness evaluation for date:', dateStr)
    console.log('[DB] Wellness score:', analysis.wellness_score)
    
    const stmt = database.prepare(`
      INSERT INTO wellness_evals (
        date, wellness_score, analysis, updated_at
      ) VALUES (
        ?, ?, ?, datetime('now')
      )
      ON CONFLICT(date) DO UPDATE SET
        wellness_score = excluded.wellness_score,
        analysis = excluded.analysis,
        updated_at = datetime('now')
    `)

    const result = stmt.run(
      dateStr,
      analysis.wellness_score,
      JSON.stringify(analysis)
    )
    
    console.log('[DB] Wellness evaluation upsert result:', { changes: result.changes, lastInsertRowid: result.lastInsertRowid })
  } catch (error) {
    console.error('[DB] Error upserting wellness evaluation:', error)
    throw error
  }
}

// Get wellness evaluation by date (YYYY-MM-DD format)
export async function getWellnessEvaluation(date: string): Promise<WellnessEvalRecord | null> {
  const database = getDatabase()

  try {
    console.log('[DB] Getting wellness evaluation for date:', date)
    
    const stmt = database.prepare(`
      SELECT 
        date,
        wellness_score as wellnessScore,
        analysis,
        created_at as createdAt,
        updated_at as updatedAt
      FROM wellness_evals
      WHERE date = ?
    `)

    const row = stmt.get(date) as any
    
    console.log('[DB] Wellness evaluation query result:', row ? 'Found record' : 'No record found')
    
    if (!row) return null

    return {
      date: row.date,
      wellnessScore: row.wellnessScore,
      analysis: JSON.parse(row.analysis),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  } catch (error) {
    console.error('[DB] Error getting wellness evaluation:', error)
    return null
  }
}

// Get wellness evaluation for today
export async function getTodayWellnessEvaluation(): Promise<WellnessEvalRecord | null> {
  const today = new Date()
  const dateStr = today.toISOString().split('T')[0] // YYYY-MM-DD format
  return getWellnessEvaluation(dateStr)
}

// Close database connection (for cleanup)
function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
    console.log('[DB] Database connection closed')
  }
}
