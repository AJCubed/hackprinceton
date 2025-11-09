"use client"

import { useState, useEffect } from "react"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, Heart, Users, MessageSquare, Target, Calendar, ArrowRight, Sparkles, AlertTriangle, Lightbulb, Star, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { GeneralWellnessAnalysis } from "@/lib/types"
import { analyzeGeneralWellness } from "@/lib/general-wellness-analysis"

interface AnalyticsData {
  messagesSent: number
  avgSentiment: number
  activeContacts: number
  activityData: Array<{ day: string; messages: number }>
  sentimentData: Array<{ name: string; value: number; fill: string }>
  topContacts: Array<{ chatId: string; name: string; messages: number; sentiment: string; frequency: string }>
}

interface DashboardProps {
  onContactClick?: (chatId: string) => void
}

export function Dashboard({ onContactClick }: DashboardProps = {} as DashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("week")
  const [loading, setLoading] = useState(true);
  const [wellnessAnalysis, setWellnessAnalysis] = useState<GeneralWellnessAnalysis | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    messagesSent: 0,
    avgSentiment: 0,
    activeContacts: 0,
    activityData: [],
    sentimentData: [],
    topContacts: []
  })
  const [hoveredContact, setHoveredContact] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalytics()
    beginWellnessAnalysis();
  }, [])

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics')
      const data = await response.json()
      setAnalytics(data)
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const beginWellnessAnalysis = async () => {
    const analysis = await analyzeGeneralWellness();
    setWellnessAnalysis(analysis);
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "text-green-600 dark:text-green-400"
      case "negative":
        return "text-red-600 dark:text-red-400"
      default:
        return "text-gray-600 dark:text-gray-400"
    }
  }

  const getInitials = (name: string) => {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-card border-b border-border px-8 py-6 z-10">
        <h1 className="text-s font-mono tracking-widest text-muted-foreground uppercase mb-1">
          MANDALA MESSAGING
        </h1>
        <h1 className="text-3xl font-semibold text-foreground mb-2">Wellness Dashboard</h1>
        <p className="text-muted-foreground">Insights into your social patterns and communication style</p>
      </div>

      {/* Main Content */}
      <div className="p-8 space-y-8">

         {/* Key Metrics */}
         <div className="grid grid-cols-4 gap-4">
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-900/30 transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-default">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Messages Sent</p>
                <p className="text-3xl font-bold text-foreground mt-2">{analytics.messagesSent}</p>
                <p className="text-xs text-muted-foreground mt-2">Last 7 days</p>
              </div>
              <MessageSquare className="w-8 h-8 text-blue-600/20 transition-transform duration-200 hover:scale-110" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-900/30 transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-default">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Avg Sentiment</p>
                <p className="text-3xl font-bold text-foreground mt-2">{analytics.avgSentiment}%</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                  {analytics.avgSentiment > 50 ? 'Mostly positive' : 'Mixed sentiment'}
                </p>
              </div>
              <Heart className="w-8 h-8 text-green-600/20 transition-transform duration-200 hover:scale-110" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-900/30 transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-default">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Active Contacts</p>
                <p className="text-3xl font-bold text-foreground mt-2">{analytics.activeContacts}</p>
                <p className="text-xs text-muted-foreground mt-2">Last 7 days</p>
              </div>
              <Users className="w-8 h-8 text-purple-600/20 transition-transform duration-200 hover:scale-110" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-900/30 transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-default">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Activity Score</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {Math.min(100, Math.round(analytics.messagesSent / 2))}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {analytics.messagesSent > 100 ? 'High activity' : 'Moderate activity'}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-amber-600/20 transition-transform duration-200 hover:scale-110" />
            </div>
          </Card>
        </div>

        {/* Wellness Score - Prominent at top */}
        <Card className="p-8 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/20 dark:via-purple-950/20 dark:to-pink-950/20 border-indigo-200 dark:border-indigo-900/30">
          <h2 className="text-2xl font-bold text-center text-foreground mb-6">Overall Wellness Score</h2>
          {wellnessAnalysis ? (
            <div className="flex flex-col items-center justify-center">
              <div className="relative w-56 h-56">
                {/* Circular Progress */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="112"
                    cy="112"
                    r="100"
                    stroke="currentColor"
                    strokeWidth="16"
                    fill="none"
                    className="text-gray-200 dark:text-gray-700"
                  />
                  <circle
                    cx="112"
                    cy="112"
                    r="100"
                    stroke="currentColor"
                    strokeWidth="16"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 100}`}
                    strokeDashoffset={`${2 * Math.PI * 100 * (1 - wellnessAnalysis.wellness_score / 100)}`}
                    className={cn(
                      "transition-all duration-1000",
                      wellnessAnalysis.wellness_score >= 70 ? "text-green-500" :
                      wellnessAnalysis.wellness_score >= 40 ? "text-amber-500" :
                      "text-red-500"
                    )}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-6xl font-bold text-foreground">{wellnessAnalysis.wellness_score}</span>
                  <span className="text-sm text-muted-foreground mt-1">out of 100</span>
                </div>
              </div>
              <p className={cn(
                "text-lg font-bold mt-6",
                wellnessAnalysis.wellness_score >= 70 ? "text-green-600 dark:text-green-400" :
                wellnessAnalysis.wellness_score >= 40 ? "text-amber-600 dark:text-amber-400" :
                "text-red-600 dark:text-red-400"
              )}>
                {wellnessAnalysis.wellness_score >= 70 ? "Excellent Health" :
                 wellnessAnalysis.wellness_score >= 40 ? "Good Health" : "Needs Attention"}
              </p>
              <p className="text-sm text-muted-foreground mt-2 text-center max-w-md">
                Your overall communication wellness based on recent message patterns and relationships
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="text-muted-foreground">Analyzing your wellness...</p>
            </div>
          )}
        </Card>

       
        {/* Charts & Top Contacts Section */}
        <div className="grid grid-cols-3 gap-6">
          {/* Activity Chart */}
          <Card className="p-6 bg-card border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">Weekly Activity</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" stroke="var(--color-muted-foreground)" />
                <YAxis stroke="var(--color-muted-foreground)" />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border-2 border-border bg-popover p-3 shadow-2xl backdrop-blur-sm">
                          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-popover-foreground">
                            {label}
                          </p>
                          <p className="text-sm font-semibold text-popover-foreground">
                            {payload[0].value} messages
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                  cursor={{ 
                    fill: "rgba(0, 0, 0, 0.06)", 
                    stroke: "hsl(var(--border))", 
                    strokeWidth: 2,
                    strokeDasharray: "4 4",
                  }}
                />
                <Bar dataKey="messages" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Sentiment Distribution */}
          <Card className="p-6 bg-card border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">Sentiment Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                <Pie
                  data={analytics.sentimentData}
                  cx="50%"
                  cy="50%"
                  labelLine={{ strokeWidth: 2, stroke: "hsl(var(--muted-foreground))", strokeOpacity: 0.5 }}
                  label={({ name, value, cx, cy, midAngle, innerRadius, outerRadius }: any) => {
                    const RADIAN = Math.PI / 180
                    const radius = innerRadius + (outerRadius - innerRadius) * 1.3
                    const baseX = cx + radius * Math.cos(-midAngle * RADIAN)
                    const baseY = cy + radius * Math.sin(-midAngle * RADIAN)
                    
                    // Add vertical offset based on sentiment to prevent overlap
                    // Positive moves up, Negative moves down, Neutral stays centered
                    let verticalOffset = 0
                    if (name === 'Positive') {
                      verticalOffset = -10 // Move up
                    } else if (name === 'Negative') {
                      verticalOffset = 10 // Move down
                    } else if (name === 'Neutral') {
                      // Neutral can stay centered or shift slightly based on angle
                      const angleDeg = (midAngle + 90) % 360
                      if (angleDeg > 45 && angleDeg < 135) {
                        verticalOffset = -6 // Top half, shift up slightly
                      } else if (angleDeg > 225 && angleDeg < 315) {
                        verticalOffset = 6 // Bottom half, shift down slightly
                      }
                    }
                    
                    const x = baseX
                    const y = baseY + verticalOffset
                    
                    // Find the matching entry to get its fill color
                    const entry = analytics.sentimentData.find((d: any) => d.name === name)
                    const labelColor = entry?.fill || "var(--color-foreground)"
                    
                    return (
                      <text
                        x={x}
                        y={y}
                        fill={labelColor}
                        textAnchor={x > cx ? 'start' : 'end'}
                        dominantBaseline="central"
                        className="text-xs font-medium"
                        style={{ padding: '4px' }}
                      >
                        {`${name}: ${value}%`}
                      </text>
                    )
                  }}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Top Contacts */}
          <Card className="p-6 bg-card border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">Top Contacts</h3>
            <div className="space-y-3">
              {analytics.topContacts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No contact data available</p>
              ) : (
                analytics.topContacts.map((contact, idx) => (
                  <button
                    key={contact.chatId || idx}
                    onClick={() => onContactClick?.(contact.chatId)}
                    onMouseEnter={() => setHoveredContact(contact.chatId)}
                    onMouseLeave={() => setHoveredContact(null)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 bg-muted/50 rounded-lg transition-all duration-200 text-left",
                      "hover:bg-muted hover:shadow-md cursor-pointer group",
                      hoveredContact === contact.chatId && "ring-2 ring-primary/20"
                    )}
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110">
                      <span className="font-semibold text-xs text-primary">{getInitials(contact.name)}</span>
                    </div>

                    {/* Contact Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-foreground text-sm truncate">{contact.name}</p>
                        {hoveredContact === contact.chatId && (
                          <ArrowRight className="w-4 h-4 text-primary flex-shrink-0 transition-transform duration-200" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {contact.messages} messages • {contact.frequency}
                      </p>
                    </div>

                    {/* Sentiment Badge */}
                    <span className={cn(
                      "text-xs font-semibold capitalize px-2 py-1 rounded flex-shrink-0",
                      contact.sentiment === 'positive' && "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
                      contact.sentiment === 'negative' && "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
                      contact.sentiment === 'neutral' && "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                    )}>
                      {contact.sentiment}
                    </span>
                  </button>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* AI Analysis Section */}
        <>
          {/* Section Header */}
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-2xl font-bold text-foreground">AI-Powered Wellness Analysis</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Personalized insights based on your communication patterns
              </p>
            </div>
          </div>

          {/* Wellness Insights */}
          {wellnessAnalysis ? (
            <div className="grid grid-cols-3 gap-6">
            {/* Compliments */}
            <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-900/30">
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-5 h-5 text-green-600 dark:text-green-400" />
                <h3 className="text-lg font-semibold text-foreground">Strengths</h3>
              </div>
              <div className="space-y-3">
                {wellnessAnalysis.compliments.length > 0 ? (
                  wellnessAnalysis.compliments.map((compliment, idx) => (
                    <div key={idx} className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                      <p className="text-sm font-semibold text-green-900 dark:text-green-300 mb-1">
                        {compliment.title}
                      </p>
                      <p className="text-xs text-green-700 dark:text-green-400">
                        {compliment.description}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No compliments available yet</p>
                )}
              </div>
            </Card>

            {/* Recommendations */}
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-900/30">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-semibold text-foreground">Recommendations</h3>
              </div>
              <div className="space-y-3">
                {wellnessAnalysis.recommendations.length > 0 ? (
                  wellnessAnalysis.recommendations.map((rec, idx) => (
                    <div key={idx} className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">
                        {rec.title}
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-400">
                        {rec.description}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No recommendations available yet</p>
                )}
              </div>
            </Card>

            {/* Notes */}
            <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-900/30">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h3 className="text-lg font-semibold text-foreground">Insights</h3>
              </div>
              <div className="space-y-3">
                {wellnessAnalysis.notes.length > 0 ? (
                  wellnessAnalysis.notes.map((note, idx) => (
                    <div key={idx} className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                      <p className="text-sm font-semibold text-amber-900 dark:text-amber-300 mb-1">
                        {note.title}
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        {note.description}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No insights available yet</p>
                )}
              </div>
            </Card>
            </div>
          ) : (
            // Loading State
            <div className="grid grid-cols-3 gap-6">
              {/* Strengths Loading */}
              <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-900/30">
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <h3 className="text-lg font-semibold text-foreground">Strengths</h3>
                </div>
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <Loader2 className="w-8 h-8 text-green-600 dark:text-green-400 animate-spin" />
                  <p className="text-sm text-muted-foreground">Analyzing...</p>
                </div>
              </Card>

              {/* Recommendations Loading */}
              <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-900/30">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-lg font-semibold text-foreground">Recommendations</h3>
                </div>
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
                  <p className="text-sm text-muted-foreground">Analyzing...</p>
                </div>
              </Card>

              {/* Insights Loading */}
              <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-900/30">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <h3 className="text-lg font-semibold text-foreground">Insights</h3>
                </div>
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <Loader2 className="w-8 h-8 text-amber-600 dark:text-amber-400 animate-spin" />
                  <p className="text-sm text-muted-foreground">Analyzing...</p>
                </div>
              </Card>
            </div>
          )}

          {/* Warning Flags (if any) */}
          {wellnessAnalysis && wellnessAnalysis.warning_flags.length > 0 && (
          <Card className="p-6 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20 border-red-200 dark:border-red-900/30">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <h3 className="text-lg font-semibold text-foreground">Areas of Concern</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {wellnessAnalysis.warning_flags.map((flag, idx) => (
                <div key={idx} className="p-4 bg-white/50 dark:bg-black/20 rounded-lg">
                  <p className="text-sm font-semibold text-red-900 dark:text-red-300 mb-1">
                    {flag.title}
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-400">
                    {flag.description}
                  </p>
                </div>
              ))}
            </div>
          </Card>
            )}
        </>

        {/* Goals Section */}
        <Card className="p-8 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-900/30">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Communication Goals
              </h3>
              <p className="text-sm text-muted-foreground mt-1">Set personal communication objectives</p>
            </div>
            <Button className="gap-2">
              <Calendar className="w-4 h-4" />
              Add Goal
            </Button>
          </div>

          <div className="space-y-3">
            <div className="p-4 bg-white/50 dark:bg-black/20 rounded-lg border border-purple-200 dark:border-purple-900/30">
              <div className="flex items-start justify-between mb-2">
                <p className="font-semibold text-foreground">Reach out to 5 old friends</p>
                <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded">
                  3/5
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: "60%" }} />
              </div>
              <p className="text-xs text-muted-foreground mt-2">2 more to go</p>
            </div>

            <div className="p-4 bg-white/50 dark:bg-black/20 rounded-lg border border-purple-200 dark:border-purple-900/30">
              <div className="flex items-start justify-between mb-2">
                <p className="font-semibold text-foreground">Reduce response time</p>
                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded">
                  In Progress
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Average: 2.4 minutes (target: 3 min)</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">✓ You're doing great!</p>
            </div>

            <div className="p-4 bg-white/50 dark:bg-black/20 rounded-lg border border-purple-200 dark:border-purple-900/30">
              <div className="flex items-start justify-between mb-2">
                <p className="font-semibold text-foreground">Improve conflict resolution</p>
                <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 px-2 py-1 rounded">
                  Upcoming
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Focus on calm, empathetic responses in difficult conversations
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

