import { IMessageSDK, type Message } from '@photon-ai/imessage-kit'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

const execAsync = promisify(exec)

// Contact lookup map: key = normalized identifier (phone/email), value = contact name
let contactMap: Map<string, string> | null = null

/**
 * Check if a string is an email address
 */
function isEmail(address: string): boolean {
    return address.includes('@')
}

/**
 * Load all contacts from macOS Contacts app into a map
 * This is done once and then lookups are instant
 */
async function loadContactsMap(): Promise<Map<string, string>> {
    if (contactMap !== null) {
        return contactMap
    }
    
    const map = new Map<string, string>()
    let tempFile: string | null = null
    
    try {
        // Build a script that extracts all contacts with their phones and emails
        // Use shell commands to avoid character encoding issues
        const script = `tell application "Contacts"
  set contactData to ""
  repeat with aPerson in people
    try
      set personName to name of aPerson as string
      -- Add phone numbers (extract digits using shell command)
      repeat with aPhone in phones of aPerson
        try
          set phoneValue to value of aPhone as string
          set phoneDigits to do shell script "echo " & quoted form of phoneValue & " | tr -d '[:alpha:][:punct:][:space:]'"
          if length of phoneDigits >= 7 then
            set contactData to contactData & phoneDigits & "|||" & personName & "\\r"
          end if
        on error
          -- Skip this phone if there's an error
        end try
      end repeat
      -- Add emails (use shell command for reliable lowercasing)
      repeat with anEmail in emails of aPerson
        try
          set emailValue to value of anEmail as string
          set emailLower to do shell script "echo " & quoted form of emailValue & " | tr '[:upper:]' '[:lower:]'"
          set contactData to contactData & emailLower & "|||" & personName & "\\r"
        on error
          -- Skip this email if there's an error
        end try
      end repeat
    on error
      -- Skip this person if there's an error
    end try
  end repeat
  return contactData
end tell`
        
        tempFile = join(tmpdir(), `contacts-bulk-${Date.now()}.applescript`)
        writeFileSync(tempFile, script)
        
        const { stdout } = await execAsync(`osascript "${tempFile}"`)
        const lines = stdout.trim().split(/\r|\n/).filter(line => line.includes('|||'))
        
        for (const line of lines) {
            const parts = line.split('|||')
            if (parts.length === 2) {
                const identifier = parts[0].trim()
                const name = parts[1].trim()
                if (identifier && name) {
                    // Store the mapping
                    map.set(identifier, name)
                    // For phone numbers, also store last 10 and 7 digits for matching
                    if (!isNaN(Number(identifier)) && identifier.length >= 7) {
                        if (identifier.length >= 10) {
                            const last10 = identifier.slice(-10)
                            if (!map.has(last10)) {
                                map.set(last10, name)
                            }
                        }
                        const last7 = identifier.slice(-7)
                        if (!map.has(last7)) {
                            map.set(last7, name)
                        }
                    }
                }
            }
        }
        
        contactMap = map
        return map
    } catch (error) {
        console.error('Error loading contacts:', error)
        contactMap = new Map() // Return empty map on error
        return contactMap
    } finally {
        if (tempFile) {
            try {
                unlinkSync(tempFile)
            } catch {
                // Ignore cleanup errors
            }
        }
    }
}

/**
 * Get contact name from phone number or email using pre-loaded contact map
 */
async function getContactName(identifier: string): Promise<string | null> {
    const map = await loadContactsMap()
    
    if (isEmail(identifier)) {
        // Lookup by lowercase email
        return map.get(identifier.toLowerCase()) || null
    } else {
        // Lookup by normalized phone number
        const normalized = identifier.replace(/\D/g, '')
        // Try full number first, then last 10 digits, then last 7 digits
        return map.get(normalized) || 
               map.get(normalized.slice(-10)) || 
               map.get(normalized.slice(-7)) || 
               null
    }
}

/**
 * Get display name for a sender - prioritizes Contacts lookup over message senderName
 */
async function getSenderDisplayName(sender: string, messages: Array<{ senderName: string | null }>): Promise<string> {
    // Always lookup in Contacts first (this is more reliable than message senderName)
    const contactName = await getContactName(sender)
    if (contactName) {
        return contactName
    }
    
    // Fallback to senderName from message if Contacts lookup failed
    const senderName = messages.find(msg => msg.senderName)?.senderName
    if (senderName) {
        return senderName
    }
    
    // Fallback to identifier
    return sender
}

async function main() {
    // Initialize SDK (works in both Node.js and Bun)
    const sdk = new IMessageSDK({
        debug: true,
        maxConcurrent: 5
    })

    try {
        // Preload contacts map (bulk load - done once)
        console.log('Loading contacts...')
        await loadContactsMap()
        console.log('Contacts loaded')
        
        // Get unread messages and filter to only include actually unread messages
        console.log('Fetching unread messages...')
        const unreadMessagesRaw = await sdk.getUnreadMessages()
        
        // Filter to only include messages where isRead is false
        const unreadMessages = unreadMessagesRaw
            .map(({ sender, messages }) => ({
                sender,
                messages: messages.filter(msg => !msg.isRead)
            }))
            .filter(({ messages }) => messages.length > 0)
        
        console.log(`Found ${unreadMessages.length} sender(s) with unread messages`)
        
        if (unreadMessages.length === 0) {
            console.log('No unread messages found.')
        } else {
            // Resolve contact names and display results (lookups are now instant)
            for (const { sender, messages } of unreadMessages) {
                const displayName = await getSenderDisplayName(sender, messages)
                if (displayName !== sender) {
                    console.log(`${displayName} (${sender}): ${messages.length} unread messages`)
                } else {
                    console.log(`${sender}: ${messages.length} unread messages`)
                }
            }
        }

        // Send message to the specified number
        const phoneNumber = '6692819325'
        console.log(`\nSending message to ${phoneNumber}...`)
        await sdk.send(phoneNumber, 'Hello World')
        console.log('Message sent successfully!')
    } catch (error) {
        console.error('Error:', error)
        process.exit(1)
    } finally {
        // Always close when done
        await sdk.close()
    }
}

main()

