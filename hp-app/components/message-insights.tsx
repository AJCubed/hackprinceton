"use client"

import { TrendingUp, Users, Clock, Zap } from "lucide-react"
import { Card } from "@/components/ui/card"

interface MessageInsightsProps {
  conversationId: string
}

export function MessageInsights({ conversationId }: MessageInsightsProps) {
  return (
    <div className="flex flex-col overflow-y-auto h-full p-4 gap-4">
      {/* Header */}
      <div className="mb-2">
        <h3 className="font-semibold text-foreground text-sm">Insights & Recommendations</h3>
        <p className="text-xs text-muted-foreground">AI-powered analysis</p>
      </div>

      {/* Sentiment Analysis */}
      <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-900/30">
        <div className="flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-green-900 dark:text-green-300">Positive Sentiment</p>
            <p className="text-xs text-green-700 dark:text-green-400 mt-1">
              Sarah's tone is warm and engaged. This is a healthy, reciprocal conversation.
            </p>
          </div>
        </div>
      </Card>

      {/* Relationship Characterization */}
      <Card className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-900/30">
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-purple-900 dark:text-purple-300">Close Friend</p>
            <p className="text-xs text-purple-700 dark:text-purple-400 mt-1">
              Characterized by casual warmth, frequent check-ins, and mutual initiative to meet up.
            </p>
          </div>
        </div>
      </Card>

      {/* Communication Pattern */}
      <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-900/30">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-blue-900 dark:text-blue-300">Balanced Exchange</p>
            <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
              Both parties are equally engaged. Response time is quick and consistent.
            </p>
          </div>
        </div>
      </Card>

      {/* Recommendations */}
      <div className="mt-2">
        <p className="text-xs font-semibold text-foreground mb-3">Recommendations</p>
        <div className="space-y-2">
          <div className="p-3 bg-muted/50 rounded-lg border border-border">
            <div className="flex items-start gap-2">
              <Zap className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">Respond now</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sarah is waiting for your reply with positive energy.
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-muted/50 rounded-lg border border-border">
            <div className="flex items-start gap-2">
              <Zap className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">Schedule meetup</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Great time to confirm weekend plans with a specific time.
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-muted/50 rounded-lg border border-border">
            <div className="flex items-start gap-2">
              <Zap className="w-4 h-4 text-fuchsia-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">Add to calendar</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Birthday approaching (Nov 28). Consider wishing her in advance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

