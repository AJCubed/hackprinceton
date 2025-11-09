"use server";


import { generateObject } from 'ai';
import { z } from 'zod';
import { ConversationAnalysis, ConversationAnalysisSchema, Message } from './types';
import { anthropic } from '@ai-sdk/anthropic';



export async function analyzeConversation(conversation: Message[]): Promise<ConversationAnalysis> {
  // combine messages into a single prompt
  const prompt = "Analyze the following conversation and provide a summary of the conversation in accordance with the schema provided. The recent conversation is as follows: \n" + conversation.map(message => `${message.sender}: ${message.text}`).join('\n');

  const {object, warnings, response} = await generateObject({
    model: anthropic('claude-haiku-4-5'),
    schema: ConversationAnalysisSchema,
    prompt,
  });

  console.log("Conversation Ojbect:", object);
  console.log("Conversation Warnings:", warnings);
  console.log("Conversation Response:", response);

  return object;
}

