'use client'

import { useEffect, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import SocketManager from '@/lib/socket';

export interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  createRoom: () => Promise<{ success: boolean; roomCode?: string; error?: string }>;
  joinRoom: (roomCode: string, playerName: string) => Promise<{ success: boolean; error?: string }>;
  startQuiz: (roomCode: string) => Promise<{ success: boolean; error?: string }>;
  addQuestion: (roomCode: string, question: any) => Promise<{ success: boolean; error?: string }>;
  submitAnswer: (roomCode: string, answerIndex: number, responseTime: number) => Promise<any>;
  nextQuestion: (roomCode: string) => Promise<{ success: boolean; hasNextQuestion?: boolean; error?: string }>;
}

export const useSocket = (): UseSocketReturn => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketManager = SocketManager.getInstance();
    const socketInstance = socketManager.connect();
    
    setSocket(socketInstance);

    const handleConnect = () => {
      console.log('Socket connected in useSocket hook');
      setIsConnected(true);
    };
    const handleDisconnect = () => {
      console.log('Socket disconnected in useSocket hook');
      setIsConnected(false);
    };

    // Set initial connection state
    setIsConnected(socketInstance.connected);

    socketInstance.on('connect', handleConnect);
    socketInstance.on('disconnect', handleDisconnect);

    return () => {
      socketInstance.off('connect', handleConnect);
      socketInstance.off('disconnect', handleDisconnect);
    };
  }, []);

  const createRoom = useCallback((): Promise<{ success: boolean; roomCode?: string; error?: string }> => {
    return new Promise((resolve) => {
      if (!socket) {
        resolve({ success: false, error: 'Socket not connected' });
        return;
      }

      socket.emit('create-room', (response: any) => {
        resolve(response);
      });
    });
  }, [socket]);

  const joinRoom = useCallback((roomCode: string, playerName: string): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      if (!socket) {
        resolve({ success: false, error: 'Socket not connected' });
        return;
      }

      socket.emit('join-room', { roomCode, playerName }, (response: any) => {
        resolve(response);
      });
    });
  }, [socket]);

  const startQuiz = useCallback((roomCode: string): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      if (!socket) {
        resolve({ success: false, error: 'Socket not connected' });
        return;
      }

      socket.emit('start-quiz', { roomCode }, (response: any) => {
        resolve(response);
      });
    });
  }, [socket]);

  const addQuestion = useCallback((roomCode: string, question: any): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      if (!socket) {
        resolve({ success: false, error: 'Socket not connected' });
        return;
      }

      socket.emit('add-question', { roomCode, question }, (response: any) => {
        resolve(response);
      });
    });
  }, [socket]);

  const submitAnswer = useCallback((roomCode: string, answerIndex: number, responseTime: number): Promise<any> => {
    return new Promise((resolve) => {
      if (!socket) {
        resolve({ success: false, error: 'Socket not connected' });
        return;
      }

      socket.emit('submit-answer', { roomCode, answerIndex, responseTime }, (response: any) => {
        resolve(response);
      });
    });
  }, [socket]);

  const nextQuestion = useCallback((roomCode: string): Promise<{ success: boolean; hasNextQuestion?: boolean; error?: string }> => {
    return new Promise((resolve) => {
      if (!socket) {
        resolve({ success: false, error: 'Socket not connected' });
        return;
      }

      socket.emit('next-question', { roomCode }, (response: any) => {
        resolve(response);
      });
    });
  }, [socket]);

  return {
    socket,
    isConnected,
    createRoom,
    joinRoom,
    startQuiz,
    addQuestion,
    submitAnswer,
    nextQuestion
  };
};
