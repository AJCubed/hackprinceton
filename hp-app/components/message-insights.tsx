"use client"

import { useState, useEffect } from "react"
import { TrendingUp, Users, Clock, Zap, Frown, Meh, Smile, Send, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getConversationAnalysis } from "@/lib/db"
import { ConversationAnalysis } from "@/lib/types"
import { getDedalusResponse } from "@/lib/dedalus-communication"

interface MessageInsightsProps {
  conversationId: string
  onSuggestMessage?: (message: string) => void
}

export function MessageInsights({ conversationId, onSuggestMessage }: MessageInsightsProps) {
  const [analysis, setAnalysis] = useState<ConversationAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [completedActions, setCompletedActions] = useState<Map<number, string>>(new Map())
  const [processingActions, setProcessingActions] = useState<Set<number>>(new Set())




  useEffect(() => {
    async function fetchAnalysis() {
      setLoading(true)
      try {
        const data = await getConversationAnalysis(conversationId)
        setAnalysis(data)
      } catch (error) {
        console.error('Error fetching analysis:', error)
        setAnalysis(null)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalysis()
  }, [conversationId])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <p className="text-sm text-muted-foreground">Loading analysis...</p>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <p className="text-sm text-muted-foreground">No AI analysis available yet</p>
        <p className="text-xs text-muted-foreground mt-2">Analysis will appear after the conversation is processed</p>
      </div>
    )
  }

  async function handleCompleteAction(index: number, action: string) {
    try {
      console.log('Action:', action)
      // Mark as processing
      setProcessingActions(prev => new Set(prev).add(index))
      
      // Get response from Dedalus
      const description = await getDedalusResponse(action)
      
      // Update completed actions with the response
      setCompletedActions(prev => {
        const newMap = new Map(prev)
        newMap.set(index, description)
        return newMap
      })
    } catch (error) {
      console.error('Error completing action:', error)
    } finally {
      // Remove from processing
      setProcessingActions(prev => {
        const newSet = new Set(prev)
        newSet.delete(index)
        return newSet
      })
    }
  }
  
  const { sentiment, positivity_score, recommendations, notes, relationship_type } = analysis
  
  // Determine sentiment styling based on positivity score
  const getSentimentStyle = (score: number) => {
    if (score > 30) {
      return {
        gradient: "from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20",
        border: "border-green-200 dark:border-green-900/30",
        icon: Smile,
        iconColor: "text-green-600 dark:text-green-400",
        textColor: "text-green-900 dark:text-green-300",
        subtextColor: "text-green-700 dark:text-green-400",
        label: "Positive"
      }
    } else if (score < -30) {
      return {
        gradient: "from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20",
        border: "border-red-200 dark:border-red-900/30",
        icon: Frown,
        iconColor: "text-red-600 dark:text-red-400",
        textColor: "text-red-900 dark:text-red-300",
        subtextColor: "text-red-700 dark:text-red-400",
        label: "Negative"
      }
    } else {
      return {
        gradient: "from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20",
        border: "border-amber-200 dark:border-amber-900/30",
        icon: Meh,
        iconColor: "text-amber-600 dark:text-amber-400",
        textColor: "text-amber-900 dark:text-amber-300",
        subtextColor: "text-amber-700 dark:text-amber-400",
        label: "Neutral"
      }
    }
  }
  
  const sentimentStyle = getSentimentStyle(positivity_score)
  const SentimentIcon = sentimentStyle.icon
  
  return (
    <div className="flex flex-col overflow-y-auto h-full p-4 gap-4">
      {/* Header */}
      <div className="mb-2">
        <h3 className="font-semibold text-foreground text-sm">Insights & Recommendations</h3>
        <p className="text-xs text-muted-foreground">AI-powered analysis</p>
      </div>

      {/* Sentiment Analysis */}
      <Card className={`p-4 bg-gradient-to-br ${sentimentStyle.gradient} ${sentimentStyle.border}`}>
        <div className="flex items-start gap-3">
          <SentimentIcon className={`w-5 h-5 ${sentimentStyle.iconColor} flex-shrink-0 mt-0.5`} />
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold ${sentimentStyle.textColor}`}>
              {sentimentStyle.label} Sentiment ({positivity_score > 0 ? '+' : ''}{positivity_score})
            </p>
            <p className={`text-xs ${sentimentStyle.subtextColor} mt-1 capitalize`}>
              {sentiment}
            </p>
          </div>
        </div>
      </Card>

      {/* Relationship Characterization */}
      <Card className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-900/30">
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-purple-900 dark:text-purple-300">
              Relationship Type
            </p>
            <p className="text-xs text-purple-700 dark:text-purple-400 mt-1 capitalize">
              {relationship_type}
            </p>
          </div>
        </div>
      </Card>

      {/* Recommendations */}
      <div className="mt-2">
        <p className="text-xs font-semibold text-foreground mb-3">Recommendations</p>
        <div className="space-y-2">
          {recommendations && recommendations.length > 0 ? (
            recommendations.map((rec, index) => {
              // Cycle through different colors for visual variety
              const colors = [
                "text-amber-500",
                "text-sky-500",
                "text-fuchsia-500",
                "text-green-500",
                "text-violet-500",
                "text-orange-500"
              ]
              const color = colors[index % colors.length]
              
              return (
                <div key={index} className="p-3 bg-muted/50 rounded-lg border border-border">
                  <div className="flex items-start gap-2">
                    <Zap className={`w-4 h-4 ${color} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">{rec.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {rec.description}
                      </p>
                      {rec.next_message && (
                        <div className="mt-2 space-y-2">
                          <div className="p-2 bg-background/50 rounded border border-border/50">
                            <p className="text-xs text-muted-foreground italic">
                              Suggested: "{rec.next_message}"
                            </p>
                          </div>
                          {onSuggestMessage && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full gap-2 text-xs h-7"
                              onClick={() => onSuggestMessage(rec.next_message!)}
                            >
                              <Send className="w-3 h-3" />
                              Use this message
                            </Button>
                          )}
                        </div>
                      )}

                      {rec.next_action && (
                        <div className="mt-2 space-y-2">
                          {completedActions.has(index) ? (
                            // Show completion summary
                            <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-900/30">
                              <p className="text-xs font-semibold text-green-900 dark:text-green-300 mb-1">
                                ✓ Action Completed
                              </p>
                              <p className="text-xs text-green-700 dark:text-green-400">
                                {completedActions.get(index)}
                              </p>
                            </div>
                          ) : (
                            <>
                              <div className="p-2 bg-background/50 rounded border border-border/50">
                                <p className="text-xs text-muted-foreground">
                                  {rec.next_action}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="default"
                                className="w-full gap-2 text-xs h-7"
                                onClick={() => handleCompleteAction(index, rec.next_action!)}
                                disabled={processingActions.has(index)}
                              >
                                {processingActions.has(index) ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <Zap className="w-3 h-3" />
                                    Complete action
                                  </>
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <p className="text-xs text-muted-foreground">No recommendations available</p>
          )}
        </div>
      </div>
    </div>
  )
}

