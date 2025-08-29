import { io, Socket } from 'socket.io-client';

class SocketManager {
  private socket: Socket | null = null;
  private static instance: SocketManager;

  private constructor() {}

  static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  connect(): Socket {
    if (!this.socket) {
      const serverUrl = process.env.NODE_ENV === 'production' 
        ? 'https://quizlive-production.up.railway.app' 
        : 'http://localhost:3001';
      
      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        forceNew: true,
      });

      this.socket.on('connect', () => {
        console.log('Connected to QuizLive server');
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from QuizLive server');
      });

      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
      });

      this.socket.on('reconnect', (attemptNumber) => {
        console.log('Reconnected to server after', attemptNumber, 'attempts');
      });

      this.socket.on('reconnect_error', (error) => {
        console.error('Reconnection failed:', error);
      });
    }

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export default SocketManager;
