import { NextRequest, NextResponse } from 'next/server'

interface AnalyticsEvent {
  event: string
  properties?: Record<string, any>
  timestamp: number
  sessionId: string
  userId?: string
}

// In-memory storage for demo (replace with database in production)
const analyticsData: AnalyticsEvent[] = []
const sessionMetrics = new Map<string, any>()

export async function POST(request: NextRequest) {
  try {
    const { events } = await request.json()
    
    // Store events
    analyticsData.push(...events)
    
    // Update session metrics
    events.forEach((event: AnalyticsEvent) => {
      const sessionId = event.sessionId
      if (!sessionMetrics.has(sessionId)) {
        sessionMetrics.set(sessionId, {
          sessionId,
          userId: event.userId,
          startTime: event.timestamp,
          lastActivity: event.timestamp,
          eventCount: 0,
          events: []
        })
      }
      
      const session = sessionMetrics.get(sessionId)
      session.lastActivity = event.timestamp
      session.eventCount++
      session.events.push(event.event)
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json({ error: 'Failed to process analytics' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  
  try {
    switch (type) {
      case 'dashboard':
        return NextResponse.json(getDashboardMetrics())
      case 'events':
        const limit = parseInt(searchParams.get('limit') || '100')
        return NextResponse.json(analyticsData.slice(-limit))
      case 'sessions':
        return NextResponse.json(Array.from(sessionMetrics.values()))
      default:
        return NextResponse.json(getOverallStats())
    }
  } catch (error) {
    console.error('Analytics GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}

function getDashboardMetrics() {
  const now = Date.now()
  const last24h = now - (24 * 60 * 60 * 1000)
  const last1h = now - (60 * 60 * 1000)
  
  const recentEvents = analyticsData.filter(e => e.timestamp > last24h)
  const activeEvents = analyticsData.filter(e => e.timestamp > last1h)
  
  const quizEvents = recentEvents.filter(e => e.properties?.category === 'quiz_lifecycle')
  const engagementEvents = recentEvents.filter(e => e.properties?.category === 'quiz_engagement')
  
  return {
    realTime: {
      activeUsers: new Set(activeEvents.map(e => e.sessionId)).size,
      activeQuizzes: new Set(activeEvents.filter(e => e.event === 'quiz_started').map(e => e.properties?.roomCode)).size,
      eventsPerMinute: Math.round(activeEvents.length / 60)
    },
    daily: {
      totalUsers: new Set(recentEvents.map(e => e.sessionId)).size,
      quizzesCreated: quizEvents.filter(e => e.event === 'quiz_created').length,
      quizzesCompleted: quizEvents.filter(e => e.event === 'quiz_completed').length,
      questionsAnswered: engagementEvents.filter(e => e.event === 'question_answered').length,
      averageAccuracy: calculateAverageAccuracy(engagementEvents)
    },
    performance: {
      averageResponseTime: calculateAverageResponseTime(engagementEvents),
      connectionIssues: recentEvents.filter(e => e.event === 'connection_event' && e.properties?.connectionEvent === 'disconnected').length,
      errors: recentEvents.filter(e => e.event === 'error').length
    }
  }
}

function getOverallStats() {
  const totalEvents = analyticsData.length
  const totalSessions = sessionMetrics.size
  const quizEvents = analyticsData.filter(e => e.properties?.category === 'quiz_lifecycle')
  
  return {
    totalEvents,
    totalSessions,
    totalQuizzes: quizEvents.filter(e => e.event === 'quiz_created').length,
    totalParticipants: new Set(analyticsData.map(e => e.sessionId)).size,
    uptime: process.uptime()
  }
}

function calculateAverageAccuracy(events: AnalyticsEvent[]): number {
  const answerEvents = events.filter(e => e.event === 'question_answered')
  if (answerEvents.length === 0) return 0
  
  const correctAnswers = answerEvents.filter(e => e.properties?.isCorrect).length
  return Math.round((correctAnswers / answerEvents.length) * 100)
}

function calculateAverageResponseTime(events: AnalyticsEvent[]): number {
  const answerEvents = events.filter(e => e.event === 'question_answered' && e.properties?.responseTime)
  if (answerEvents.length === 0) return 0
  
  const totalTime = answerEvents.reduce((sum, e) => sum + (e.properties?.responseTime || 0), 0)
  return Math.round(totalTime / answerEvents.length * 100) / 100
}
