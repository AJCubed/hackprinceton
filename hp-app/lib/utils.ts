import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeChatId(chatId: string): string {
  // Remove + prefix and any non-digit characters for phone numbers
  if (chatId.startsWith('+') || /^\d+$/.test(chatId.replace(/[^\d]/g, ''))) {
    return chatId.replace(/\D/g, '') // Keep only digits
  }
  // For non-phone identifiers (emails, etc), return as-is
  return chatId
}