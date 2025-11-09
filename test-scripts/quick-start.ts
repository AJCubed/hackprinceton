import { IMessageSDK } from '@photon-ai/imessage-kit'

// Initialize SDK (works in both Node.js and Bun)
const sdk = new IMessageSDK({
    debug: true,
    maxConcurrent: 5
})

// Get unread messages
const unreadMessages = await sdk.getUnreadMessages()
for (const { sender, messages } of unreadMessages) {
    console.log(`${sender}: ${messages.length} unread messages`)
}

// Get messages (excludes your own by default)
const result = await sdk.getMessages()

// Filter messages
const filtered = await sdk.getMessages({
    sender: '+1234567890',
    unreadOnly: true,
    limit: 20,
    since: new Date('2025-10-20')
})

// Include your own messages
const all = await sdk.getMessages({ excludeOwnMessages: false })

// Get unread messages grouped by sender
const unread = await sdk.getUnreadMessages()

console.log("Unread messages:", unread)
console.log("Filtered messages:", filtered)
console.log("All messages:", all)   
