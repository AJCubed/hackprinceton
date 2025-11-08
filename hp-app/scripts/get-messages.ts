import { IMessageSDK } from '@photon-ai/imessage-kit'
import { writeFileSync } from 'fs'

async function main() {
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
    const result = await sdk.getMessages({
        excludeOwnMessages: false,
        limit: 1000,
        since: new Date('2025-01-01'),
    })

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

    // write to file "output.json"
    writeFileSync('outputs/result.json', JSON.stringify(result, null, 2));
    writeFileSync('outputs/filtered.json', JSON.stringify(filtered, null, 2));
    writeFileSync('outputs/all.json', JSON.stringify(all, null, 2));
    writeFileSync('outputs/unread.json', JSON.stringify(unread, null, 2));
}

main().catch(console.error)