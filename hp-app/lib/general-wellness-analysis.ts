"use server";

import { generateObject } from 'ai';
import { z } from 'zod';
import { ConversationAnalysis, ConversationAnalysisSchema, Message } from './types';
import { anthropic } from '@ai-sdk/anthropic';
import { getConversation, updateAIAnalysis } from './db';
import { normalizeChatId } from './utils';

export async function analyzeGeneralWellness(): Promise<ConversationAnalysis> {
  // Read existing data from database
  const normalizedChatId = normalizeChatId(chatId);
  const existingData = getConversation(normalizedChatId);
  
  // Build context from existing data
  let contextPrompt = '';
  if (existingData) {
    if (existingData.aiAnalysis) {
      contextPrompt += '\n\nPrevious Analysis:\n';
      contextPrompt += `- Sentiment: ${existingData.aiAnalysis.sentiment}\n`;
      contextPrompt += `- Positivity Score: ${existingData.aiAnalysis.positivity_score}\n`;
      contextPrompt += `- Relationship Type: ${existingData.aiAnalysis.relationship_type}\n`;
      contextPrompt += `- Previous Notes: ${existingData.aiAnalysis.notes}\n`;
    }
    
    if (existingData.userNotes) {
      contextPrompt += '\n\nUser Notes: ' + existingData.userNotes + '\n';
    }
    
    if (existingData.birthday || existingData.organization || existingData.jobTitle) {
      contextPrompt += '\n\nContact Info:\n';
      if (existingData.senderName) contextPrompt += `- Name: ${existingData.senderName}\n`;
      if (existingData.birthday) contextPrompt += `- Birthday: ${existingData.birthday}\n`;
      if (existingData.organization) contextPrompt += `- Organization: ${existingData.organization}\n`;
      if (existingData.jobTitle) contextPrompt += `- Job Title: ${existingData.jobTitle}\n`;
    }
  }

  // Combine messages into a single prompt
  const conversationText = conversation
    .map(message => `${message.isFromMe ? 'You' : message.senderName || message.sender}: ${message.text || '(media/attachment)'} ${message.date}`)
    .join('\n');

  const prompt = `Analyze the following conversation and provide insights in accordance with the schema provided.
  ${contextPrompt}
  --------------------------------
  Recent Conversation:
  ${conversationText}

  Please provide an updated analysis considering both the recent messages and any previous context. The current date is ${new Date().toISOString()}.`;

  const {object, warnings, response} = await generateObject({
    model: anthropic('claude-haiku-4-5'),
    schema: ConversationAnalysisSchema,
    prompt,
  });

  

  // Write analysis results back to database
  try {
    updateAIAnalysis(normalizedChatId, object);
    console.log('[Analysis] Successfully saved analysis to database for chat:', normalizedChatId);
  } catch (error) {
    console.error('[Analysis] Error saving to database:', error);
    // Don't fail the analysis if DB write fails
  }

  return object;
}

