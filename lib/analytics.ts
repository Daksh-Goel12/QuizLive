'use client'

interface AnalyticsEvent {
  event: string
  properties?: Record<string, any>
  timestamp: number
  sessionId: string
  userId?: string
}

class Analytics {
  private events: AnalyticsEvent[] = []
  private sessionId: string
  private userId?: string
  private isEnabled: boolean = true

  constructor() {
    this.sessionId = this.generateSessionId()
    
    // Send analytics batch every 30 seconds
    if (typeof window !== 'undefined') {
      setInterval(() => this.flush(), 30000)
      
      // Send on page unload
      window.addEventListener('beforeunload', () => this.flush())
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  setUserId(userId: string) {
    this.userId = userId
  }

  track(event: string, properties?: Record<string, any>) {
    if (!this.isEnabled) return

    const analyticsEvent: AnalyticsEvent = {
      event,
      properties: {
        ...properties,
        url: typeof window !== 'undefined' ? window.location.href : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      },
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
    }

    this.events.push(analyticsEvent)

    // Auto-flush if we have too many events
    if (this.events.length >= 50) {
      this.flush()
    }
  }

  async flush() {
    if (this.events.length === 0) return

    const eventsToSend = [...this.events]
    this.events = []

    try {
      // Send to your analytics endpoint
      await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events: eventsToSend }),
      })
    } catch (error) {
      console.error('Failed to send analytics:', error)
      // Re-add events back to queue on failure
      this.events.unshift(...eventsToSend)
    }
  }

  // Quiz-specific tracking methods
  trackQuizCreated(roomCode: string, questionCount: number) {
    this.track('quiz_created', {
      roomCode,
      questionCount,
      category: 'quiz_lifecycle'
    })
  }

  trackQuizJoined(roomCode: string, participantName: string) {
    this.track('quiz_joined', {
      roomCode,
      participantName,
      category: 'quiz_lifecycle'
    })
  }

  trackQuizStarted(roomCode: string, participantCount: number) {
    this.track('quiz_started', {
      roomCode,
      participantCount,
      category: 'quiz_lifecycle'
    })
  }

  trackQuestionAnswered(roomCode: string, questionIndex: number, isCorrect: boolean, responseTime: number) {
    this.track('question_answered', {
      roomCode,
      questionIndex,
      isCorrect,
      responseTime,
      category: 'quiz_engagement'
    })
  }

  trackQuizCompleted(roomCode: string, finalScore: number, totalQuestions: number, completionTime: number) {
    this.track('quiz_completed', {
      roomCode,
      finalScore,
      totalQuestions,
      completionTime,
      accuracy: (finalScore / totalQuestions) * 100,
      category: 'quiz_lifecycle'
    })
  }

  trackConnectionEvent(event: 'connected' | 'disconnected' | 'reconnected') {
    this.track('connection_event', {
      connectionEvent: event,
      category: 'technical'
    })
  }

  trackError(error: string, context?: Record<string, any>) {
    this.track('error', {
      error,
      context,
      category: 'technical'
    })
  }

  // Real-time metrics for dashboard
  getSessionMetrics() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      eventsCount: this.events.length,
      sessionDuration: Date.now() - parseInt(this.sessionId.split('_')[1])
    }
  }
}

// Singleton instance
const analytics = new Analytics()
export default analytics
