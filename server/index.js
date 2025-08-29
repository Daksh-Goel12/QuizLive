const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

// Performance monitoring
const performanceMetrics = {
  connections: 0,
  maxConnections: 0,
  totalRooms: 0,
  activeRooms: 0,
  messagesPerSecond: 0,
  messageCount: 0,
  startTime: Date.now()
};

// Track messages per second
setInterval(() => {
  performanceMetrics.messagesPerSecond = performanceMetrics.messageCount;
  performanceMetrics.messageCount = 0;
}, 1000);
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "https://quizlive.vercel.app", "https://YOUR_VERCEL_URL.vercel.app"],
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// In-memory storage (replace with database in production)
const rooms = new Map();
const participants = new Map();

// Room structure
class QuizRoom {
  constructor(code, hostId) {
    this.code = code;
    this.hostId = hostId;
    this.participants = new Map();
    this.questions = [];
    this.currentQuestionIndex = -1;
    this.currentQuestion = null;
    this.isActive = false;
    this.startTime = null;
    this.questionStartTime = null;
    this.responses = new Map();
    this.leaderboard = [];
    this.createdAt = new Date();
  }

  addParticipant(socketId, name) {
    const participant = {
      id: socketId,
      name,
      score: 0,
      responses: [],
      joinedAt: new Date(),
      isOnline: true
    };
    this.participants.set(socketId, participant);
    return participant;
  }

  removeParticipant(socketId) {
    this.participants.delete(socketId);
  }

  updateLeaderboard() {
    this.leaderboard = Array.from(this.participants.values())
      .sort((a, b) => b.score - a.score)
      .map((participant, index) => ({
        ...participant,
        rank: index + 1
      }));
  }

  addQuestion(question) {
    const newQuestion = {
      id: uuidv4(),
      ...question,
      createdAt: new Date()
    };
    this.questions.push(newQuestion);
    return newQuestion;
  }

  startNextQuestion() {
    this.currentQuestionIndex++;
    if (this.currentQuestionIndex < this.questions.length) {
      this.currentQuestion = this.questions[this.currentQuestionIndex];
      this.questionStartTime = new Date();
      this.responses.clear();
      return this.currentQuestion;
    }
    return null;
  }

  submitResponse(participantId, answerIndex, responseTime) {
    const participant = this.participants.get(participantId);
    if (!participant || this.responses.has(participantId)) return null;

    const response = {
      participantId,
      answerIndex,
      responseTime,
      submittedAt: new Date()
    };

    this.responses.set(participantId, response);

    // Calculate score
    if (answerIndex === this.currentQuestion.correctAnswer) {
      const timeBonus = Math.max(0, this.currentQuestion.timeLimit - responseTime);
      const points = this.currentQuestion.points + Math.floor(timeBonus / 2);
      participant.score += points;
      response.points = points;
      response.isCorrect = true;
    } else {
      response.points = 0;
      response.isCorrect = false;
    }

    participant.responses.push(response);
    this.updateLeaderboard();
    return response;
  }
}

// Generate room code
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Performance metrics endpoint
app.get('/metrics', (req, res) => {
  const currentTime = Date.now();
  performanceMetrics.activeRooms = rooms.size;
  performanceMetrics.totalRooms = performanceMetrics.totalRooms || rooms.size;
  
  res.json({
    ...performanceMetrics,
    uptime: Math.floor((currentTime - performanceMetrics.startTime) / 1000),
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage()
  });
});

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    activeRooms: rooms.size,
    totalParticipants: participants.size
  });
});

app.get('/api/stats', (req, res) => {
  const stats = {
    totalRooms: rooms.size,
    activeParticipants: participants.size,
    totalQuestions: Array.from(rooms.values()).reduce((sum, room) => sum + room.questions.length, 0),
    averageParticipantsPerRoom: rooms.size > 0 ? participants.size / rooms.size : 0
  };
  res.json(stats);
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Host creates a room
  socket.on('create-room', (callback) => {
    const roomCode = generateRoomCode();
    const room = new QuizRoom(roomCode, socket.id);
    rooms.set(roomCode, room);
    
    socket.join(roomCode);
    console.log(`Room created: ${roomCode} by ${socket.id}`);
    
    callback({ success: true, roomCode });
  });

  // Participant joins a room
  socket.on('join-room', ({ roomCode, playerName }, callback) => {
    const room = rooms.get(roomCode);
    
    if (!room) {
      callback({ success: false, error: 'Room not found' });
      return;
    }

    if (room.isActive) {
      callback({ success: false, error: 'Quiz already in progress' });
      return;
    }

    const participant = room.addParticipant(socket.id, playerName);
    participants.set(socket.id, { roomCode, participant });
    
    socket.join(roomCode);
    
    // Notify all participants in the room
    io.to(roomCode).emit('participant-joined', {
      participant,
      totalParticipants: room.participants.size
    });

    console.log(`${playerName} joined room ${roomCode}`);
    callback({ success: true, participant });
  });

  // Host adds a question
  socket.on('add-question', ({ roomCode, question }, callback) => {
    const room = rooms.get(roomCode);
    
    if (!room || room.hostId !== socket.id) {
      callback({ success: false, error: 'Unauthorized or room not found' });
      return;
    }

    const newQuestion = room.addQuestion(question);
    
    // Notify host about the added question
    socket.emit('question-added', newQuestion);
    
    console.log(`Question added to room ${roomCode}`);
    callback({ success: true, question: newQuestion });
  });

  // Host starts the quiz
  socket.on('start-quiz', ({ roomCode }, callback) => {
    const room = rooms.get(roomCode);
    
    if (!room || room.hostId !== socket.id) {
      callback({ success: false, error: 'Unauthorized or room not found' });
      return;
    }

    if (room.questions.length === 0) {
      callback({ success: false, error: 'No questions added' });
      return;
    }

    room.isActive = true;
    room.startTime = new Date();
    
    // Start first question
    const firstQuestion = room.startNextQuestion();
    
    // Notify all participants
    io.to(roomCode).emit('quiz-started', {
      question: {
        ...firstQuestion,
        correctAnswer: undefined // Don't send correct answer to participants
      },
      questionNumber: 1,
      timeLimit: firstQuestion.timeLimit || 30,
      totalQuestions: room.questions.length
    });

    console.log(`Quiz started in room ${roomCode}`);
    callback({ success: true });
  });

  // Host moves to next question
  socket.on('next-question', ({ roomCode }, callback) => {
    const room = rooms.get(roomCode);
    
    if (!room || room.hostId !== socket.id) {
      callback({ success: false, error: 'Unauthorized or room not found' });
      return;
    }

    // Send current question results to host
    const results = {
      questionId: room.currentQuestion?.id,
      totalResponses: room.responses.size,
      correctResponses: Array.from(room.responses.values()).filter(r => r.isCorrect).length,
      responses: Array.from(room.responses.values()),
      leaderboard: room.leaderboard
    };

    socket.emit('question-results', results);

    // Move to next question
    const nextQuestion = room.startNextQuestion();
    
    if (nextQuestion) {
      // Send next question to participants
      io.to(roomCode).emit('next-question', {
        questionNumber: room.currentQuestionIndex + 1,
        totalQuestions: room.questions.length,
        timeLimit: nextQuestion.timeLimit || 30,
        question: {
          ...nextQuestion,
          correctAnswer: undefined
        }
      });
    } else {
      // Quiz finished
      room.isActive = false;
      io.to(roomCode).emit('quiz-finished', {
        finalLeaderboard: room.leaderboard,
        totalQuestions: room.questions.length
      });
    }

    callback({ success: true, hasNextQuestion: !!nextQuestion });
  });

  // Host ends quiz
  socket.on('end-quiz', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    room.quizStarted = false;
    room.currentQuestionIndex = -1;
    
    // Convert participants Map to Array and sort by score
    const finalLeaderboard = Array.from(room.participants.values())
      .sort((a, b) => b.score - a.score)
      .map((p, index) => ({
        ...p,
        rank: index + 1
      }));

    io.to(roomCode).emit('end-quiz', {
      leaderboard: finalLeaderboard
    });
  });

  // Participant submits answer
  socket.on('submit-answer', ({ roomCode, answerIndex, responseTime }, callback) => {
    const room = rooms.get(roomCode);
    const participantData = participants.get(socket.id);
    
    if (!room || !participantData || participantData.roomCode !== roomCode) {
      callback({ success: false, error: 'Invalid room or participant' });
      return;
    }

    if (!room.currentQuestion) {
      callback({ success: false, error: 'No active question' });
      return;
    }

    const response = room.submitResponse(socket.id, answerIndex, responseTime);
    
    if (!response) {
      callback({ success: false, error: 'Already submitted or invalid' });
      return;
    }

    // Update participant's score
    participantData.participant.score = room.participants.get(socket.id).score;

    // Notify host about the response
    io.to(room.hostId).emit('participant-response', {
      participantId: socket.id,
      participantName: participantData.participant.name,
      answerIndex,
      responseTime,
      isCorrect: response.isCorrect,
      points: response.points,
      totalResponses: room.responses.size,
      totalParticipants: room.participants.size
    });

    // Send updated leaderboard to all participants
    io.to(roomCode).emit('leaderboard-update', room.leaderboard);

    console.log(`Answer submitted by ${participantData.participant.name} in room ${roomCode}`);
    callback({ 
      success: true, 
      isCorrect: response.isCorrect,
      points: response.points,
      correctAnswer: room.currentQuestion.correctAnswer
    });
  });

  // Get room info
  socket.on('get-room-info', ({ roomCode }, callback) => {
    const room = rooms.get(roomCode);
    
    if (!room) {
      callback({ success: false, error: 'Room not found' });
      return;
    }

    const isHost = room.hostId === socket.id;
    const roomInfo = {
      code: room.code,
      isActive: room.isActive,
      participantCount: room.participants.size,
      questionCount: room.questions.length,
      currentQuestionIndex: room.currentQuestionIndex,
      isHost
    };

    if (isHost) {
      roomInfo.participants = Array.from(room.participants.values());
      roomInfo.questions = room.questions;
    }

    callback({ success: true, room: roomInfo });
  });

  // Handle connection
  socket.on('connect', () => {
    performanceMetrics.connections++;
    performanceMetrics.maxConnections = Math.max(performanceMetrics.maxConnections, performanceMetrics.connections);
    console.log('User connected:', socket.id);
    console.log('Current connections:', performanceMetrics.connections);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    performanceMetrics.connections--;
    console.log(`User disconnected: ${socket.id}`);
    console.log('Current connections:', performanceMetrics.connections);
    
    const participantData = participants.get(socket.id);
    if (participantData) {
      const room = rooms.get(participantData.roomCode);
      if (room) {
        room.removeParticipant(socket.id);
        
        // Notify others in the room
        io.to(participantData.roomCode).emit('participant-left', {
          participantId: socket.id,
          participantName: participantData.participant.name,
          totalParticipants: room.participants.size
        });

        // If host disconnected, end the quiz
        if (room.hostId === socket.id) {
          io.to(participantData.roomCode).emit('host-disconnected');
          rooms.delete(participantData.roomCode);
        }
      }
      participants.delete(socket.id);
    }
  });
});

// Cleanup inactive rooms every 5 minutes
setInterval(() => {
  const now = new Date();
  for (const [code, room] of rooms.entries()) {
    const inactiveTime = now - room.createdAt;
    // Remove rooms older than 2 hours or empty rooms older than 30 minutes
    if (inactiveTime > 2 * 60 * 60 * 1000 || 
        (room.participants.size === 0 && inactiveTime > 30 * 60 * 1000)) {
      rooms.delete(code);
      console.log(`Cleaned up inactive room: ${code}`);
    }
  }
}, 5 * 60 * 1000);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`QuizLive server running on port ${PORT}`);
  console.log(`Socket.io server ready for connections`);
});
