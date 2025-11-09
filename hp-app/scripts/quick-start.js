"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var imessage_kit_1 = require("@photon-ai/imessage-kit");
// Initialize SDK (works in both Node.js and Bun)
var sdk = new imessage_kit_1.IMessageSDK({
    debug: true,
    maxConcurrent: 5
});
// Get unread messages
var unreadMessages = await sdk.getUnreadMessages();
for (var _i = 0, unreadMessages_1 = unreadMessages; _i < unreadMessages_1.length; _i++) {
    var _a = unreadMessages_1[_i], sender = _a.sender, messages = _a.messages;
    console.log("".concat(sender, ": ").concat(messages.length, " unread messages"));
}
// Get messages (excludes your own by default)
var result = await sdk.getMessages();
// Filter messages
var filtered = await sdk.getMessages({
    sender: '+1234567890',
    unreadOnly: true,
    limit: 20,
    since: new Date('2025-10-20')
});
// Include your own messages
var all = await sdk.getMessages({ excludeOwnMessages: false });
// Get unread messages grouped by sender
var unread = await sdk.getUnreadMessages();
console.log("Unread messages:", unread);
console.log("Filtered messages:", filtered);
console.log("All messages:", all);
