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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, Heart, Users, MessageSquare, Target, Calendar } from "lucide-react"

const COMMUNICATION_STYLE = [
  { category: "Empathy", value: 85 },
  { category: "Directness", value: 65 },
  { category: "Humor", value: 78 },
  { category: "Responsiveness", value: 92 },
  { category: "Initiative", value: 72 },
  { category: "Conflict Resolution", value: 58 },
]

interface AnalyticsData {
  messagesSent: number
  avgSentiment: number
  activeContacts: number
  activityData: Array<{ day: string; messages: number }>
  sentimentData: Array<{ name: string; value: number; fill: string }>
  topContacts: Array<{ name: string; messages: number; sentiment: string; frequency: string }>
}

export function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("week")
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    messagesSent: 0,
    avgSentiment: 0,
    activeContacts: 0,
    activityData: [],
    sentimentData: [],
    topContacts: []
  })

  useEffect(() => {
    fetchAnalytics()
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

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "text-green-600"
      case "negative":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-card border-b border-border px-8 py-6 z-10">
        <h1 className="text-3xl font-semibold text-foreground mb-2">Communication Dashboard</h1>
        <p className="text-muted-foreground">Insights into your social patterns and communication style</p>
      </div>

      {/* Main Content */}
      <div className="p-8 space-y-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-900/30">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Messages Sent</p>
                <p className="text-3xl font-bold text-foreground mt-2">{analytics.messagesSent}</p>
                <p className="text-xs text-muted-foreground mt-2">Last 7 days</p>
              </div>
              <MessageSquare className="w-8 h-8 text-blue-600/20" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-900/30">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Avg Sentiment</p>
                <p className="text-3xl font-bold text-foreground mt-2">{analytics.avgSentiment}%</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                  {analytics.avgSentiment > 50 ? 'Mostly positive' : 'Mixed sentiment'}
                </p>
              </div>
              <Heart className="w-8 h-8 text-green-600/20" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-900/30">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Active Contacts</p>
                <p className="text-3xl font-bold text-foreground mt-2">{analytics.activeContacts}</p>
                <p className="text-xs text-muted-foreground mt-2">Last 7 days</p>
              </div>
              <Users className="w-8 h-8 text-purple-600/20" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-900/30">
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
              <TrendingUp className="w-8 h-8 text-amber-600/20" />
            </div>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-2 gap-6">
          {/* Activity Chart */}
          <Card className="p-6 bg-card border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">Weekly Activity</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" stroke="var(--color-muted-foreground)" />
                <YAxis stroke="var(--color-muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    border: "none",
                    borderRadius: "8px",
                    borderColor: "var(--color-border)",
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
              <PieChart>
                <Pie
                  data={analytics.sentimentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={100}
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
        </div>

        {/* Communication Style & Top Contacts */}
        <div className="grid grid-cols-2 gap-6">
          {/* Communication Style Radar */}
          <Card className="p-6 bg-card border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">Communication Style</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={COMMUNICATION_STYLE}>
                <PolarGrid stroke="var(--color-border)" />
                <PolarAngleAxis dataKey="category" stroke="var(--color-muted-foreground)" />
                <PolarRadiusAxis stroke="var(--color-muted-foreground)" />
                <Radar
                  name="Score"
                  dataKey="value"
                  stroke="var(--color-primary)"
                  fill="var(--color-primary)"
                  fillOpacity={0.6}
                />
              </RadarChart>
            </ResponsiveContainer>
          </Card>

          {/* Top Contacts */}
          <Card className="p-6 bg-card border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">Top Contacts</h3>
            <div className="space-y-4">
              {analytics.topContacts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No contact data available</p>
              ) : (
                analytics.topContacts.map((contact, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-foreground text-sm">{contact.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {contact.messages} messages • {contact.frequency}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold capitalize ${getSentimentColor(contact.sentiment)}`}>
                      {contact.sentiment}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

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

