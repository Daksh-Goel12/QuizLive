'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, Trophy, Clock, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useSocket } from '@/hooks/useSocket'
import ConnectionStatus from '@/components/ConnectionStatus'
import analytics from '@/lib/analytics'

interface Question {
  id: string
  text: string
  options: string[]
  correctAnswer: number
  timeLimit: number
  points: number
}

interface LeaderboardEntry {
  id: string
  name: string
  score: number
  rank: number
  isCurrentUser: boolean
}

export default function JoinPage() {
  const { socket, isConnected, joinRoom, submitAnswer } = useSocket()
  const [step, setStep] = useState<'join' | 'waiting' | 'quiz' | 'results'>('join')
  const [roomCode, setRoomCode] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [score, setScore] = useState(0)
  const [questionNumber, setQuestionNumber] = useState(1)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(30)
  const [timeLeft, setTimeLeft] = useState(30)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [questionStartTime, setQuestionStartTime] = useState<number>(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!socket) return

    // Listen for quiz events
    socket?.on('quiz-started', (data) => {
      setStep('quiz')
      setCurrentQuestion(data.question || data.currentQuestion)
      setTotalQuestions(data.totalQuestions)
      setQuestionNumber(1)
      setTimeLeft(data.timeLimit || data.currentQuestion?.timeLimit || 30)
      setQuestionStartTime(Date.now())
      setSelectedAnswer(null)
      setShowAnswer(false)
      setCorrectAnswerIndex(null)
    })

    socket.on('next-question', (data) => {
      setCurrentQuestion(data.question)
      setTimeLeft(data.timeLimit || data.question?.timeLimit || 30)
      setQuestionNumber(data.questionNumber)
      setSelectedAnswer(null)
      setShowAnswer(false)
      setCorrectAnswerIndex(null)
      setQuestionStartTime(Date.now())
    })

    socket.on('quiz-finished', (data) => {
      setStep('results')
      setLeaderboard(data.finalLeaderboard)
      toast.success('Quiz completed!')
    })

    socket.on('end-quiz', (data) => {
      setStep('results')
      setLeaderboard(data.leaderboard)
      toast.success('Quiz ended!')
    })

    socket.on('leaderboard-update', (data) => {
      setLeaderboard(data)
    })

    return () => {
      socket.off('quiz-started')
      socket.off('next-question')
      socket.off('quiz-finished')
      socket.off('end-quiz')
      socket.off('leaderboard-update')
    }
  }, [socket])

  useEffect(() => {
    if (step === 'quiz' && currentQuestion && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && step === 'quiz' && currentQuestion && selectedAnswer === null) {
      // Time's up - auto submit
      handleTimeUp()
    }
  }, [timeLeft, step, currentQuestion, selectedAnswer])

  const handleJoinRoom = async () => {
    if (!roomCode.trim() || !playerName.trim()) {
      toast.error('Please enter both room code and your name')
      return
    }
    
    const result = await joinRoom(roomCode, playerName)
    if (result.success) {
      setStep('waiting')
      analytics.trackQuizJoined(roomCode, playerName)
      toast.success('Joined quiz room successfully!')
    } else {
      toast.error(result.error || 'Failed to join room')
    }
  }

  const selectAnswer = async (answerIndex: number) => {
    if (selectedAnswer !== null || showAnswer) return
    
    setSelectedAnswer(answerIndex)
    const responseTime = Math.floor((Date.now() - questionStartTime) / 1000)
    
    const result = await submitAnswer(roomCode, answerIndex, responseTime)
    if (result.success) {
      setShowAnswer(true)
      setIsCorrect(result.isCorrect)
      setCorrectAnswerIndex(result.correctAnswer)
      
      analytics.trackQuestionAnswered(roomCode, questionNumber - 1, result.isCorrect, responseTime)
      
      if (result.isCorrect) {
        setScore(score + result.points)
        toast.success(`Correct! +${result.points} points`)
      } else {
        const correctOption = currentQuestion?.options[result.correctAnswer]
        toast.error(`Incorrect! The correct answer was: ${correctOption || 'N/A'}`)
      }
    } else {
      toast.error(result.error || 'Failed to submit answer')
    }
  }

  const handleAnswerSelect = (answerIndex: number) => {
    selectAnswer(answerIndex)
  }

  const handleTimeUp = () => {
    // Auto-submit when time runs out
    handleAnswerSelect(-1) // -1 indicates no answer selected
  }

  const handleLeaveRoom = () => {
    setStep('join')
    setRoomCode('')
    setPlayerName('')
    setQuestionNumber(1)
    setScore(0)
    setSelectedAnswer(null)
    setShowAnswer(false)
    setCurrentQuestion(null)
  }

  const restartQuiz = () => {
    setStep('join')
    setRoomCode('')
    setPlayerName('')
    setQuestionNumber(1)
    setScore(0)
    setSelectedAnswer(null)
    setShowAnswer(false)
    setCurrentQuestion(null)
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <ConnectionStatus isConnected={isConnected} />
      <div className="w-full max-w-4xl mx-auto">
        {/* Join Step */}
        {step === 'join' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center min-h-[60vh]"
          >
            <div className="notion-card p-8 max-w-md w-full">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Join Quiz Room</h2>
                <p className="text-gray-600">Enter your details to participate</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="w-full notion-input"
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Room Code</label>
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    className="w-full notion-input font-mono tracking-wider"
                    placeholder="Enter room code"
                  />
                </div>
              </div>
              
              <button
                onClick={handleJoinRoom}
                disabled={!playerName.trim() || !roomCode.trim() || !isConnected}
                className="w-full mt-6 notion-button bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {!isConnected ? (
                  'Connecting...'
                ) : (
                  'Join Quiz'
                )}
              </button>
            </div>
          </motion.div>
        )}
        
        {/* Waiting Step */}
        {step === 'waiting' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center min-h-[60vh]"
          >
            <div className="notion-card p-8 max-w-md w-full text-center">
              <div className="animate-pulse mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Waiting for Quiz</h2>
              <p className="text-gray-600 mb-6">You're in! The host will start the quiz soon.</p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Room Code:</span>
                  <code className="font-mono font-bold text-blue-600">{roomCode}</code>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Your Score:</span>
                  <span className="font-bold text-gray-900">{score} points</span>
                </div>
              </div>
              
              <button
                onClick={handleLeaveRoom}
                className="notion-button text-red-600 hover:bg-red-50 px-6 py-2"
              >
                Leave Room
              </button>
            </div>
          </motion.div>
        )}

        {/* Quiz Step */}
        {step === 'quiz' && currentQuestion && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto"
          >
            <div className="notion-card p-8">
              {/* Quiz Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm font-semibold">
                    Question {questionNumber}
                  </div>
                  <div className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-sm font-medium">
                    {currentQuestion.points} points
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 text-orange-600">
                    <Clock className="w-5 h-5" />
                    <span className="font-bold text-lg">{timeLeft}s</span>
                  </div>
                  <div className="text-gray-900 font-bold text-xl">
                    Score: {score}
                  </div>
                </div>
              </div>
              
              <h2 className="text-2xl font-semibold text-gray-900 mb-8">{currentQuestion.text}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={selectedAnswer !== null}
                    className={`p-4 rounded-lg text-left transition-all border-2 ${
                      selectedAnswer === null
                        ? 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-900'
                        : selectedAnswer === index
                          ? (correctAnswerIndex !== null && correctAnswerIndex === index)
                            ? 'bg-green-50 border-green-200 text-green-800'
                            : 'bg-red-50 border-red-200 text-red-800'
                          : (correctAnswerIndex !== null && correctAnswerIndex === index)
                            ? 'bg-green-50 border-green-200 text-green-800'
                            : 'bg-gray-50 border-gray-200 text-gray-500'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        selectedAnswer === null
                          ? 'bg-gray-100 text-gray-600'
                          : selectedAnswer === index
                            ? (correctAnswerIndex !== null && correctAnswerIndex === index)
                              ? 'bg-green-500 text-white'
                              : 'bg-red-500 text-white'
                            : (correctAnswerIndex !== null && correctAnswerIndex === index)
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-200 text-gray-400'
                      }`}>
                        {String.fromCharCode(65 + index)}
                      </div>
                      <span className="font-medium">{option}</span>
                    </div>
                  </button>
                ))}
              </div>
              
              {selectedAnswer !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center"
                >
                  <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-100">
                    <div className={`text-sm font-medium mb-2 ${
                      (correctAnswerIndex !== null && selectedAnswer === correctAnswerIndex) ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(correctAnswerIndex !== null && selectedAnswer === correctAnswerIndex) ? '✓ Correct!' : '✗ Incorrect'}
                    </div>
                    <div className="text-gray-700">
                      <span className="font-medium">Correct answer:</span> {correctAnswerIndex !== null ? String.fromCharCode(65 + correctAnswerIndex) : 'N/A'}. {correctAnswerIndex !== null && currentQuestion.options[correctAnswerIndex]}
                    </div>
                  </div>
                  
                  <div className="text-gray-500 text-sm">
                    Waiting for next question...
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* Results Step */}
        {step === 'results' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center min-h-[60vh]"
          >
            <div className="notion-card p-8 max-w-2xl w-full">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Quiz Complete!</h2>
                <p className="text-gray-600">Final results and leaderboard</p>
              </div>
            
              <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-100">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-2">{score}</div>
                  <div className="text-gray-600">Your Final Score</div>
                </div>
              </div>
            
              {leaderboard && leaderboard.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Final Leaderboard</h3>
                  <div className="space-y-2">
                    {leaderboard.map((player, index) => (
                      <div
                        key={player.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          player.name === playerName
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0 ? 'bg-yellow-500 text-white' :
                            index === 1 ? 'bg-gray-400 text-white' :
                            index === 2 ? 'bg-orange-500 text-white' :
                            'bg-gray-200 text-gray-600'
                          }`}>
                            {player.rank || index + 1}
                          </div>
                          <span className={`font-medium ${
                            player.name === playerName ? 'text-blue-900' : 'text-gray-900'
                          }`}>
                            {player.name}
                          </span>
                        </div>
                        <div className={`font-bold ${
                          player.name === playerName ? 'text-blue-900' : 'text-gray-900'
                        }`}>
                          {player.score} pts
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex space-x-4">
                <button
                  onClick={handleLeaveRoom}
                  className="flex-1 notion-button bg-blue-500 hover:bg-blue-600 text-white"
                >
                  Leave Room
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
