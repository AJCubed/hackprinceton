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
    next_action?: string,
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
        next_action: z.string().describe("An optional next action to take, either 'Create reminder for ...' or 'Create calendar event for ...'. Try to be as helpful as possible, but don't make unescessary actions. Create actions whereever possible.").optional(),
    })).describe("The recommended next steps for the conversation, such as 'Follow up', 'Propose plan', 'Check in', 'Respond to recent message', etc."),
    notes: z.string().describe("The notes for how the conversation impacts the mental health of the user. This is for conversation summarization, not for the user, so be specific.  "),
    relationship_type: z.string().describe("The relationship type of the conversation between the two people.  Keep it short and concise, roughly 1-2 words."),
})

export interface TitleAndDescription {
    title: string,
    description: string,
}

export interface GeneralWellnessAnalysis {
    wellness_score: number,
    compliments: TitleAndDescription[],
    recommendations: Recommendation[],
    notes: TitleAndDescription[],
    warning_flags: TitleAndDescription[],

}

export const GeneralWellnessAnalysisSchema = z.object({
    wellness_score: z.number().describe("The wellness score of the user from 0 to 100"),
    compliments: z.array(z.object({
        title: z.string().describe("The title of the compliment"),
        description: z.string().describe("The description of the compliment about the user's communication or actions. Keep it short and concise, roughly 1-2 sentences."),
    })).describe("The compliments for the user. Keep it short and concise, roughly 1-2 sentences."),
    recommendations: z.array(z.object({
        title: z.string().describe("The title of the recommendation"),
        description: z.string().describe("The description of the recommendation. Keep it short and concise, roughly 1-2 sentences."),
        next_message: z.string().describe("An optional next message to send to the contact").optional(),
        next_action: z.string().describe("An optional next action to take, either 'Create reminder for ...' or 'Create calendar event for ...'. Try to be as helpful as possible and create actions whereever possible.").optional(),
    })).describe("The recommendations for the user. Keep it short and concise, roughly 1-2 sentences."),
    notes: z.array(z.object({
        title: z.string().describe("The title of the note"),
        description: z.string().describe("The description of the note. Keep it short and concise, roughly 1-2 sentences."),
    })).describe("The notes for the user. Keep it short and concise, roughly 1-2 sentences."),
    warning_flags: z.array(z.object({
        title: z.string().describe("The title of the warning flag"),
        description: z.string().describe("The description of the warning flag. Keep it short and concise, roughly 1-2 sentences. Only use in case of extreme emergencies, such as suicide attempts, self-harm, or other life-threatening situations. Be very cautious and only use if the user is in immediate danger."),
    })).describe("The warning flags for the user. Keep it short and concise, roughly 1-2 sentences."),
})