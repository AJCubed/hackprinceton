import {z} from 'zod';

export interface Message {
    id: string
    text: string | null
    sender: string
    senderName: string | null
    date: string
    isFromMe: boolean
    isRead: boolean
}


export interface Recommendation {
    title: string,
    description: string,
    next_message?: string,
}
export interface ConversationAnalysis {
    sentiment: string,
    positivity_score: number,
    recommendations: Recommendation[],
    notes: string,
    relationship_type: string,
}

// TODO PROMPT_ENGINEER
export const ConversationAnalysisSchema = z.object({
    sentiment: z.string().describe("The sentiment of the conversation in a single word, such as friendly, cautious, professional..."),
    positivity_score: z.number().describe("The positivity score of the conversation from -100 to 100"),
    recommendations: z.array(z.object({
        title: z.string().describe("The title of the recommendation"),
        description: z.string().describe("The description of the recommendation. Keep it short and concise, roughly 1-2 sentences."),
        next_message: z.string().describe("An optional next message to send to the contact").optional(),
    })).describe("The recommended next steps for the conversation, such as 'Follow up', 'Propose plan', 'Check in', 'Respond to recent message', etc."),
    notes: z.string().describe("The notes for how the conversation impacts the mental health of the user.  "),
    relationship_type: z.string().describe("The relationship type of the conversation between the two people.  Keep it short and concise, roughly 1-2 words."),
})

