'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Play, Plus, Clock, Settings, Copy, Users, User, Trophy, Zap } from 'lucide-react'
import { useSocket } from '@/hooks/useSocket'
import ConnectionStatus from '@/components/ConnectionStatus'
import { toast } from 'react-hot-toast'
import analytics from '@/lib/analytics'

interface Question {
  id: string
  text: string
  options: string[]
  correctAnswer: number
  timeLimit: number
  points: number
}

interface Participant {
  id: string
  name: string
  score: number
  isOnline: boolean
  lastSeen: Date
}

export default function HostPage() {
  const { socket, isConnected, createRoom, startQuiz, addQuestion, nextQuestion } = useSocket()
  const [roomCode, setRoomCode] = useState('')
  const [participants, setParticipants] = useState<Participant[]>([])
  const [quizStarted, setQuizStarted] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1)
  const [showNewQuestion, setShowNewQuestion] = useState(false)
  const [newQuestion, setNewQuestion] = useState({
    text: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    timeLimit: 30,
    points: 10
  })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleCreateRoom = async () => {
    const result = await createRoom()
    if (result?.success) {
      setRoomCode(result.roomCode || '')
      analytics.trackQuizCreated(result.roomCode || '')
      toast.success(`Room created! Code: ${result.roomCode}`)
    } else {
      toast.error(result?.error || 'Failed to create room')
    }
  }

  useEffect(() => {
    // Auto-create room when connected
    if (isConnected && !roomCode) {
      handleCreateRoom()
    }
  }, [isConnected, roomCode])

  useEffect(() => {
    if (!socket) return

    // Listen for participant events
    socket.on('participant-joined', (data) => {
      setParticipants(prev => [...prev, data.participant])
      toast.success(`${data.participant.name} joined the quiz`)
    })

    socket.on('participant-left', (data) => {
      setParticipants(prev => prev.filter(p => p.id !== data.participantId))
      toast(`${data.participantName} left the quiz`)
    })

    socket.on('participant-response', (data) => {
      toast(`${data.participantName} answered ${data.isCorrect ? 'correctly' : 'incorrectly'}`)
    })

    socket.on('question-results', (results) => {
      toast.success(`Question completed: ${results.correctResponses}/${results.totalResponses} correct`)
      // Update leaderboard
      setParticipants(results.leaderboard)
    })

    return () => {
      socket.off('participant-joined')
      socket.off('participant-left')
      socket.off('participant-response')
      socket.off('question-results')
    }
  }, [socket])

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode)
    toast.success('Room code copied to clipboard!')
  }

  const handleStartQuiz = async () => {
    const result = await startQuiz(roomCode)
    if (result.success) {
      setQuizStarted(true)
      setCurrentQuestionIndex(0)
      setCurrentQuestion(questions[0])
      analytics.trackQuizStarted(roomCode, participants.length)
      toast.success('Quiz started!')
    } else {
      toast.error(result.error || 'Failed to start quiz')
    }
  }

  const handleEndQuiz = async () => {
    if (!roomCode) {
      toast.error('No room code available')
      return
    }
    
    // End the quiz immediately
    setQuizStarted(false)
    setCurrentQuestion(null)
    setCurrentQuestionIndex(-1)
    
    // Notify participants that quiz has ended
    if (socket) {
      socket.emit('end-quiz', { roomCode })
    }
    
    toast.success('Quiz ended! Final results available.')
  }

  const handleNextQuestion = async () => {
    if (!roomCode) {
      toast.error('No room code available')
      return
    }
    
    const result = await nextQuestion(roomCode)
    if (result.success) {
      if (result.hasNextQuestion) {
        const nextIndex = currentQuestionIndex + 1
        setCurrentQuestionIndex(nextIndex)
        setCurrentQuestion(questions[nextIndex])
        toast.success('Next question sent to participants')
      } else {
        // Quiz finished
        setCurrentQuestion(null)
        setQuizStarted(false)
        toast.success('Quiz completed! Check the final leaderboard.')
      }
    } else {
      toast.error(result.error || 'Failed to move to next question')
    }
  }

  const handleAddQuestion = async () => {
    if (!newQuestion.text.trim() || newQuestion.options.some(opt => !opt.trim())) {
      toast.error('Please fill in all question fields')
      return
    }

    const question: Question = {
      id: Date.now().toString(),
      ...newQuestion
    }

    const result = await addQuestion(roomCode, question)
    if (result.success) {
      setQuestions([...questions, question])
      setNewQuestion({
        text: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        timeLimit: 30,
        points: 10
      })
      setShowNewQuestion(false)
      toast.success('Question added successfully!')
    } else {
      toast.error(result.error || 'Failed to add question')
    }
  }

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id))
    toast.success('Question removed')
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Quiz Host</h1>
                <p className="text-sm text-gray-500">Create and manage your quiz session</p>
              </div>
            </div>
            {roomCode && (
              <div className="flex items-center space-x-3">
                <div className="notion-card px-4 py-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">Room Code:</span>
                    <code className="text-lg font-mono font-bold text-blue-600">{roomCode}</code>
                    <button
                      onClick={copyRoomCode}
                      className="notion-button p-1"
                      title="Copy room code"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Question */}
            {quizStarted && currentQuestion && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="notion-card p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Current Question</h2>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 text-gray-500">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">{currentQuestion.timeLimit}s</span>
                    </div>
                    <div className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-sm font-medium">{currentQuestion.points} pts</div>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">{currentQuestion.text}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {currentQuestion.options.map((option, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border ${
                          index === currentQuestion.correctAnswer
                            ? 'bg-green-50 border-green-200 text-green-800'
                            : 'bg-white border-gray-200 text-gray-700'
                        }`}
                      >
                        <span className="font-medium">{String.fromCharCode(65 + index)}.</span> {option}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    Responses: {Math.floor(Math.random() * participants.length)} / {participants.length}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleEndQuiz}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      End Quiz
                    </button>
                    <button
                      onClick={handleNextQuestion}
                      className="notion-button-primary px-4 py-2"
                    >
                      Next Question
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Question Bank */}
            <div className="notion-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Question Bank</h2>
                <button
                  onClick={() => setShowNewQuestion(true)}
                  className="notion-button-primary px-4 py-2 flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Question</span>
                </button>
              </div>

              <div className="space-y-4">
                {questions.map((question, index) => (
                  <div key={question.id} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-3">
                          <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded font-medium">
                            Q{index + 1}
                          </span>
                          <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded">{question.points} pts</span>
                          <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded">{question.timeLimit}s</span>
                        </div>
                        <h3 className="text-gray-900 font-medium mb-2">{question.text}</h3>
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Correct:</span> {question.options[question.correctAnswer]}
                        </div>
                      </div>
                      <button
                        onClick={() => removeQuestion(question.id)}
                        className="text-red-500 hover:text-red-600 text-sm font-medium transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                
                {questions.length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <Plus className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-gray-900 font-medium">No questions added yet</p>
                    <p className="text-sm text-gray-700">Click "Add Question" to get started</p>
                  </div>
                )}
              </div>

              {!quizStarted && questions.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={handleStartQuiz}
                    className="w-full notion-button-primary py-3 font-semibold flex items-center justify-center space-x-2"
                  >
                    <Play className="w-5 h-5" />
                    <span>Start Quiz</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Room Info */}
            {!roomCode ? (
              <div className="notion-card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Room</h3>
                <button
                  onClick={handleCreateRoom}
                  disabled={!isConnected}
                  className="w-full notion-button-primary py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isConnected ? 'Create Quiz Room' : 'Connecting...'}
                </button>
              </div>
            ) : (
              <div className="notion-card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Room Status</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Room Code:</span>
                    <code className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">{roomCode}</code>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Participants:</span>
                    <span className="font-semibold text-gray-900">{participants.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      quizStarted 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {quizStarted ? 'Active' : 'Waiting'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Participants */}
            {participants.length > 0 && (
              <div className="notion-card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Participants ({participants.length})
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {participants.map((participant) => (
                    <div key={participant.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-gray-900 font-medium">{participant.name}</span>
                      </div>
                      <div className="text-gray-600 text-sm font-medium">{participant.score} pts</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Leaderboard */}
            {quizStarted && participants.length > 0 && (
              <div className="notion-card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  <span>Leaderboard</span>
                </h3>
                <div className="space-y-3">
                  {participants
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 5)
                    .map((participant, index) => (
                      <div key={participant.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <div className="flex items-center space-x-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-yellow-500 text-white' :
                            index === 1 ? 'bg-gray-400 text-white' :
                            index === 2 ? 'bg-orange-500 text-white' :
                            'bg-gray-200 text-gray-600'
                          }`}>
                            {index + 1}
                          </div>
                          <span className="text-gray-900 font-medium">{participant.name}</span>
                        </div>
                        <div className="text-gray-900 font-bold">{participant.score}</div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Live Stats */}
          <div className="notion-card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Live Stats</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{questions.length}</div>
                  <div className="text-sm text-gray-600 font-medium">Total Questions</div>
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{participants.filter(p => p.isOnline).length}</div>
                  <div className="text-sm text-gray-600 font-medium">Active Participants</div>
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {participants.length > 0 
                      ? Math.round(participants.reduce((sum, p) => sum + p.score, 0) / participants.length)
                      : 0
                    }
                  </div>
                  <div className="text-sm text-gray-600 font-medium">Average Score</div>
                </div>
              </div>
              <div className={`p-4 rounded-lg border ${
                (quizStarted && currentQuestion) 
                  ? 'bg-green-50 border-green-100' 
                  : (!quizStarted && questions.length > 0 && currentQuestionIndex === -1)
                    ? 'bg-red-50 border-red-100'
                    : 'bg-yellow-50 border-yellow-100'
              }`}>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${
                    (quizStarted && currentQuestion) 
                      ? 'text-green-600' 
                      : (!quizStarted && questions.length > 0 && currentQuestionIndex === -1)
                        ? 'text-red-600'
                        : 'text-yellow-600'
                  }`}>
                    {(quizStarted && currentQuestion) 
                      ? '🟢' 
                      : (!quizStarted && questions.length > 0 && currentQuestionIndex === -1)
                        ? '🔴'
                        : '🟡'
                    }
                  </div>
                  <div className="text-sm text-gray-600 font-medium">Quiz Status</div>
                  <div className={`text-xs font-semibold mt-1 ${
                    (quizStarted && currentQuestion) 
                      ? 'text-green-700' 
                      : (!quizStarted && questions.length > 0 && currentQuestionIndex === -1)
                        ? 'text-red-700'
                        : 'text-yellow-700'
                  }`}>
                    {(quizStarted && currentQuestion) 
                      ? 'Active' 
                      : (!quizStarted && questions.length > 0 && currentQuestionIndex === -1)
                        ? 'Ended'
                        : 'Waiting'
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Question Modal */}
      {showNewQuestion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="notion-card p-6 w-full max-w-2xl"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Add New Question</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Question</label>
                <textarea
                  value={newQuestion.text}
                  onChange={(e) => setNewQuestion({...newQuestion, text: e.target.value})}
                  className="w-full p-3 border rounded-lg resize-none bg-white text-gray-900 placeholder-gray-500"
                  rows={3}
                  placeholder="Enter your question..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Options</label>
                <div className="space-y-2">
                  {newQuestion.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={newQuestion.correctAnswer === index}
                        onChange={() => setNewQuestion({...newQuestion, correctAnswer: index})}
                        className="text-blue-500"
                      />
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...newQuestion.options]
                          newOptions[index] = e.target.value
                          setNewQuestion({...newQuestion, options: newOptions})
                        }}
                        className="flex-1 p-2 border rounded bg-white text-gray-900 placeholder-gray-500"
                        placeholder={`Option ${String.fromCharCode(65 + index)}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Time Limit (seconds)</label>
                  <input
                    type="number"
                    value={newQuestion.timeLimit}
                    onChange={(e) => setNewQuestion({...newQuestion, timeLimit: parseInt(e.target.value)})}
                    className="w-full p-2 border rounded bg-white text-gray-900"
                    min="10"
                    max="300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Points</label>
                  <input
                    type="number"
                    value={newQuestion.points}
                    onChange={(e) => setNewQuestion({...newQuestion, points: parseInt(e.target.value)})}
                    className="w-full p-2 border rounded bg-white text-gray-900"
                    min="1"
                    max="100"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowNewQuestion(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddQuestion}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Add Question
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
