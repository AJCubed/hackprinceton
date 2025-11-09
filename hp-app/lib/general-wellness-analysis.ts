"use server";

import { generateObject } from 'ai';
import { z } from 'zod';
import { ConversationAnalysis, ConversationAnalysisSchema, GeneralWellnessAnalysis, GeneralWellnessAnalysisSchema, Message } from './types';
import { anthropic } from '@ai-sdk/anthropic';
import { getAllConversations, getConversation, updateAIAnalysis, upsertWellnessEvaluation } from './db';
import { normalizeChatId } from './utils';

export async function analyzeGeneralWellness(): Promise<GeneralWellnessAnalysis> {
  
    //get all conversation analyses
    const analyses = (await getAllConversations()).map(conv => conv.aiAnalysis).filter(analysis => analysis !== null);

    //build context prompt
    const contextPrompt = analyses.map(analysis => `
    Sentiment: ${analysis.sentiment}
    Positivity Score: ${analysis.positivity_score}
    Relationship Type: ${analysis.relationship_type}
    Notes: ${analysis.notes}
    `).join('\n');
    
    //build prompt
    const prompt = `Analyze the following Conversation Analyses and provide a general communication and mental wellness analysis in accordance with the schema provided. Keep your analysis as positive as possible. Keep criticism constructive. don't reach medical conclusions and don't make recommendations for medical treatment. The current date is ${new Date().toISOString()}. ${contextPrompt}`;

  const {object, warnings, response} = await generateObject({
    model: anthropic('claude-haiku-4-5'),
    schema: GeneralWellnessAnalysisSchema,
    prompt,
  });

  console.log('Wellness Analysis:', object);

  try {
    await upsertWellnessEvaluation(object);
    console.log('Successfully saved Wellness Evaluation to database');
  } catch (error) {
    console.error('Error saving Wellness Evaluation to database:', error);
  }

  return object;
}

