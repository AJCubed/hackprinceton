import Database from 'better-sqlite3'
import { homedir } from 'os'
import { existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { upsertConversationContact } from '@/lib/db'

// Contact info structure with all available fields
export interface ContactInfo {
  name: string
  birthday?: string // ISO date string
  organization?: string
  jobTitle?: string
  note?: string
}

// In-memory cache for contacts. Keys are normalized identifiers (digits for phone, lowercase for email).
let contactMap: Map<string, ContactInfo> | null = null
let contactMapLoaded = false

function isEmail(identifier: string): boolean {
  return identifier.includes('@')
}

// Find all AddressBook database paths (including Sources)
function getAddressBookPaths(): string[] {
  const home = homedir()
  const paths: string[] = []
  
  // Main database (legacy/local contacts)
  const mainDb = join(home, 'Library/Application Support/AddressBook/AddressBook-v22.abcddb')
  if (existsSync(mainDb)) {
    paths.push(mainDb)
  }
  
  // Check Sources directory for iCloud and other synced accounts
  const sourcesDir = join(home, 'Library/Application Support/AddressBook/Sources')
  if (existsSync(sourcesDir)) {
    try {
      const sources = readdirSync(sourcesDir)
      for (const source of sources) {
        const sourceDb = join(sourcesDir, source, 'AddressBook-v22.abcddb')
        if (existsSync(sourceDb)) {
          paths.push(sourceDb)
        }
      }
    } catch (error) {
      console.error('[Contacts] Error reading Sources directory:', error)
    }
  }
  
  return paths
}

export function isContactsLoaded(): boolean {
  return contactMapLoaded && !!contactMap
}

// Load contacts synchronously on first call (fast with SQLite)
export async function ensureContactsLoaded(): Promise<void> {
  if (!contactMapLoaded) {
    await loadContactsMap()
  }
}

export async function loadContactsMap(): Promise<Map<string, ContactInfo>> {
  if (contactMapLoaded && contactMap) {
    console.log('[Contacts] Already loaded, returning cached map')
    return contactMap
  }

  console.log('[Contacts] Starting to load contacts from SQLite...')
  const map = new Map<string, ContactInfo>()

  try {
    const dbPaths = getAddressBookPaths()
    if (dbPaths.length === 0) {
      console.error('[Contacts] Could not find any AddressBook databases')
      contactMap = new Map()
      contactMapLoaded = true
      return contactMap
    }

    console.log('[Contacts] Found', dbPaths.length, 'database(s):', dbPaths)

    // Process each database (main + all Sources)
    for (const dbPath of dbPaths) {
      console.log('[Contacts] Opening database:', dbPath)
      const db = new Database(dbPath, { readonly: true })

      // Query all contacts with their details
      console.log('[Contacts] Querying contact records...')
      const contacts = db.prepare(`
        SELECT 
          ZCONTACT.Z_PK as contactId,
          ZCONTACT.ZFIRSTNAME as firstName,
          ZCONTACT.ZLASTNAME as lastName,
          ZCONTACT.ZORGANIZATION as organization,
          ZCONTACT.ZJOBTITLE as jobTitle,
          ZCONTACT.ZBIRTHDAY as birthday,
          ZNOTE.ZTEXT as note
        FROM ZABCDRECORD as ZCONTACT
        LEFT JOIN ZABCDNOTE as ZNOTE ON ZNOTE.Z_PK = ZCONTACT.ZNOTE
        WHERE ZCONTACT.ZFIRSTNAME IS NOT NULL OR ZCONTACT.ZLASTNAME IS NOT NULL
      `).all()

      console.log('[Contacts] Found', contacts.length, 'contacts in this database')

      // Build contact info map by ID
      const contactInfoById = new Map<number, ContactInfo>()
      for (const contact of contacts as any[]) {
        const firstName = contact.firstName || ''
        const lastName = contact.lastName || ''
        const fullName = `${firstName} ${lastName}`.trim() || 'Unknown'
        
        const info: ContactInfo = {
          name: fullName,
          organization: contact.organization || undefined,
          jobTitle: contact.jobTitle || undefined,
          note: contact.note || undefined
        }
        
        // Parse birthday if present (stored as NSDate reference)
        if (contact.birthday) {
          try {
            // Convert Core Data timestamp to JavaScript Date
            const birthday = new Date((contact.birthday + 978307200) * 1000)
            info.birthday = birthday.toISOString().split('T')[0]
          } catch {
            // Ignore birthday parse errors
          }
        }
        
        contactInfoById.set(contact.contactId, info)
      }

      // Query phone numbers
      console.log('[Contacts] Querying phone numbers...')
      const phones = db.prepare(`
        SELECT ZOWNER as contactId, ZFULLNUMBER as phoneNumber
        FROM ZABCDPHONENUMBER
        WHERE ZFULLNUMBER IS NOT NULL
      `).all()

      for (const phone of phones as any[]) {
        const info = contactInfoById.get(phone.contactId)
        if (!info) continue
        
        const phoneStr = String(phone.phoneNumber)
        const digits = phoneStr.replace(/\D/g, '')
        
        if (digits.length >= 7) {
          // Store full number (don't overwrite if already exists from another source)
          if (!map.has(digits)) map.set(digits, info)
          // Store last 10 digits
          if (digits.length >= 10) {
            const last10 = digits.slice(-10)
            if (!map.has(last10)) map.set(last10, info)
          }
          // Store last 7 digits
          const last7 = digits.slice(-7)
          if (!map.has(last7)) map.set(last7, info)
        }
      }

      console.log('[Contacts] Querying email addresses...')
      const emails = db.prepare(`
        SELECT ZOWNER as contactId, ZADDRESS as emailAddress
        FROM ZABCDEMAILADDRESS
        WHERE ZADDRESS IS NOT NULL
      `).all()

      for (const email of emails as any[]) {
        const info = contactInfoById.get(email.contactId)
        if (!info) continue
        
        const emailLower = String(email.emailAddress).toLowerCase()
        if (!map.has(emailLower)) {
          map.set(emailLower, info)
        }
      }

      db.close()
    } // end for loop

    contactMap = map
    contactMapLoaded = true
    console.log('[Contacts] Successfully loaded', map.size, 'unique contact mappings with full info')
    
    // Sync contacts to database (non-blocking)
    syncContactsToDatabase(map).catch(err => {
      console.error('[Contacts] Error syncing to database:', err)
    })
    
    return map
  } catch (error) {
    console.error('[Contacts] Error loading contacts:', error)
    contactMap = new Map()
    contactMapLoaded = true
    return contactMap
  }
}

// Sync loaded contacts to the database
async function syncContactsToDatabase(map: Map<string, ContactInfo>): Promise<void> {
  console.log('[Contacts] Starting database sync...')
  
  // Group by unique sender (multiple keys can point to the same contact)
  const seenContacts = new Set<string>()
  const uniqueContacts = new Map<string, ContactInfo>()
  
  for (const [identifier, info] of map.entries()) {
    const contactKey = `${info.name}-${info.birthday || ''}-${info.organization || ''}`
    
    if (!seenContacts.has(contactKey)) {
      seenContacts.add(contactKey)
      uniqueContacts.set(identifier, info)
    }
  }
  
  let syncCount = 0
  for (const [identifier, info] of uniqueContacts.entries()) {
    try {
      // Use identifier as both chatId and sender for now
      // This will be updated when actual conversations are loaded
      upsertConversationContact({
        chatId: identifier,
        sender: identifier,
        senderName: info.name,
        birthday: info.birthday || null,
        organization: info.organization || null,
        jobTitle: info.jobTitle || null,
      })
      syncCount++
    } catch (error) {
      // Log but don't fail - database sync is non-critical
      console.error('[Contacts] Error syncing contact:', identifier, error)
    }
  }
  
  console.log('[Contacts] Successfully synced', syncCount, 'contacts to database')
}

export async function lookupContactName(identifier: string): Promise<string | null> {
  const info = await lookupContact(identifier)
  return info?.name || null
}

export async function lookupContact(identifier: string): Promise<ContactInfo | null> {
  // Do not block if contacts aren't loaded yet; caller can render a loading indicator.
  if (!contactMapLoaded || !contactMap) {
    return null
  }
  const map = contactMap
  if (isEmail(identifier)) {
    return map.get(identifier.toLowerCase()) || null
  }
  const digits = identifier.replace(/\D/g, '')
  if (!digits) return null
  return (
    map.get(digits) ||
    map.get(digits.slice(-10)) ||
    map.get(digits.slice(-7)) ||
    null
  )
}


