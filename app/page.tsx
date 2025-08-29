'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Play, Users, Trophy, Zap, ArrowRight, Github, Star } from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    activeUsers: 0,
    questionsAnswered: 0,
    averageResponseTime: '0s'
  })

  useEffect(() => {
    // Set stats after component mounts to avoid hydration mismatch
    setStats({
      totalQuizzes: 15420,
      activeUsers: 2847,
      questionsAnswered: 892340,
      averageResponseTime: '2.3s'
    })
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">QuizLive</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">
                Features
              </Link>
              <Link href="#stats" className="text-gray-600 hover:text-gray-900 transition-colors">
                Stats
              </Link>
              <a
                href="https://github.com/yourusername/quizlive"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <Github className="w-5 h-5" />
                <span>GitHub</span>
              </a>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center mb-20">
          <div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight" style={{ color: '#111827' }}>
              Real-time quizzes
              <span className="block" style={{ color: '#3b82f6' }}>
                made simple
              </span>
            </h1>
            <p className="text-xl mb-12 max-w-2xl mx-auto leading-relaxed" style={{ color: '#6b7280' }}>
              Create engaging quizzes in seconds. Share room codes instantly. 
              Watch live results unfold with your participants.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link href="/host" className="px-8 py-4 text-base font-medium rounded-lg flex items-center space-x-2 group" style={{ backgroundColor: '#3b82f6', color: 'white', border: '1px solid #3b82f6' }}>
              <Play className="w-5 h-5" />
              <span>Host a Quiz</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/join" className="px-8 py-4 text-base font-medium rounded-lg flex items-center space-x-2" style={{ backgroundColor: 'white', color: '#111827', border: '1px solid #e5e7eb' }}>
              <Users className="w-5 h-5" />
              <span>Join Quiz</span>
            </Link>
          </div>

          {/* Live Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="notion-card p-6 text-center">
              <div className="text-3xl font-bold mb-2" style={{ color: '#3b82f6' }}>
                {stats.totalQuizzes.toLocaleString()}
              </div>
              <div className="text-sm font-medium" style={{ color: '#6b7280' }}>Total Quizzes</div>
            </div>
            <div className="notion-card p-6 text-center">
              <div className="text-3xl font-bold mb-2" style={{ color: '#10b981' }}>
                {stats.activeUsers.toLocaleString()}
              </div>
              <div className="text-sm font-medium" style={{ color: '#6b7280' }}>Active Users</div>
            </div>
            <div className="notion-card p-6 text-center">
              <div className="text-3xl font-bold mb-2" style={{ color: '#f59e0b' }}>
                {stats.questionsAnswered.toLocaleString()}
              </div>
              <div className="text-sm font-medium" style={{ color: '#6b7280' }}>Questions Answered</div>
            </div>
            <div className="notion-card p-6 text-center">
              <div className="text-3xl font-bold mb-2" style={{ color: '#ef4444' }}>
                {stats.averageResponseTime}
              </div>
              <div className="text-sm font-medium" style={{ color: '#6b7280' }}>Avg Response Time</div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-xl p-8 text-center border border-gray-200 shadow-sm">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-3" style={{ color: '#111827' }}>Real-time Updates</h3>
            <p style={{ color: '#6b7280' }}>
              Instant question delivery and live leaderboard updates with &lt;50ms latency
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 text-center border border-gray-200 shadow-sm">
            <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-3" style={{ color: '#111827' }}>Easy Room Sharing</h3>
            <p style={{ color: '#6b7280' }}>
              Share simple room codes with participants. No complex setup required.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 text-center border border-gray-200 shadow-sm">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-3" style={{ color: '#111827' }}>Live Leaderboard</h3>
            <p style={{ color: '#6b7280' }}>
              Track scores in real-time with dynamic rankings and instant feedback.
            </p>
          </div>
        </div>

        {/* Demo Section */}
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: '#111827' }}>
            See QuizLive in Action
          </h2>
          <p className="mb-8 max-w-2xl mx-auto" style={{ color: '#6b7280' }}>
            Watch how easy it is to create engaging quiz experiences with real-time interaction
          </p>
          
          <div className="bg-white rounded-xl p-8 max-w-4xl mx-auto border border-gray-200 shadow-sm">
            <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center mb-6">
              <div className="text-center">
                <Play className="w-16 h-16 mx-auto mb-4" style={{ color: '#9ca3af' }} />
                <p style={{ color: '#6b7280' }}>Demo Video Coming Soon</p>
              </div>
            </div>
            
            <div className="flex flex-wrap justify-center gap-4">
              <span className="bg-blue-50 px-3 py-1 rounded-full text-sm" style={{ color: '#1d4ed8' }}>
                Real-time Sync
              </span>
              <span className="bg-purple-50 px-3 py-1 rounded-full text-sm" style={{ color: '#7c3aed' }}>
                Live Questions
              </span>
              <span className="bg-green-50 px-3 py-1 rounded-full text-sm" style={{ color: '#059669' }}>
                Instant Leaderboard
              </span>
              <span className="bg-orange-50 px-3 py-1 rounded-full text-sm" style={{ color: '#ea580c' }}>
                Mobile Friendly
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-16 border-t border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold" style={{ color: '#111827' }}>QuizLive</span>
          </div>
          
          <div className="flex items-center space-x-6" style={{ color: '#6b7280' }}>
            <Link href="/privacy" className="hover:text-gray-900 transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-gray-900 transition-colors">
              Terms
            </Link>
            <a
              href="https://github.com/yourusername/quizlive"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 hover:text-gray-900 transition-colors"
            >
              <Github className="w-4 h-4" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
