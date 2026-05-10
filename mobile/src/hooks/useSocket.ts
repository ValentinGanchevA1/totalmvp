// src/hooks/useSocket.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppDispatch } from './redux';
import { addMessage } from '../features/chat/chatSlice';
import { updateNearbyUser, setUserOnline } from '../features/map/mapSlice';
import { addReceivedWave } from '../features/interactions/interactionsSlice';
import { logger } from '../utils/logger';

// Use your local IP for physical device, 10.0.2.2 for emulator
const DEV_SOCKET_URL = 'http://10.0.2.2:3001';
const SOCKET_URL = __DEV__ ? DEV_SOCKET_URL : 'https://api.g88.app';

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const dispatch = useAppDispatch();

  const connect = useCallback(async () => {
    const token = await AsyncStorage.getItem('accessToken');
    if (!token) {
      logger.log('No token found, skipping socket connection');
      return;
    }

    // Disconnect existing socket if any
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    socketRef.current = io(`${SOCKET_URL}/chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
    });

    // Connection events
    socketRef.current.on('connect', () => {
      logger.log('✅ Socket connected:', socketRef.current?.id);
      setIsConnected(true);
      setError(null);
      setReconnectAttempts(0);
    });

    socketRef.current.on('disconnect', (reason) => {
      logger.log('❌ Socket disconnected:', reason);
      setIsConnected(false);

      if (reason === 'io server disconnect') {
        // Server disconnected, reconnect manually
        socketRef.current?.connect();
      }
    });

    socketRef.current.on('connect_error', (err) => {
      logger.error('❌ Socket connection error:', err.message);
      setError(err.message);
      setIsConnected(false);
    });

    socketRef.current.on('reconnect', (attemptNumber) => {
      logger.log(`🔄 Socket reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
      setError(null);
      setReconnectAttempts(0);
    });

    socketRef.current.on('reconnect_attempt', (attemptNumber) => {
      logger.log(`🔄 Socket reconnection attempt ${attemptNumber}`);
      setReconnectAttempts(attemptNumber);
    });

    socketRef.current.on('reconnect_error', (err) => {
      logger.error('❌ Socket reconnection error:', err.message);
      setError(err.message);
    });

    socketRef.current.on('reconnect_failed', () => {
      logger.error('❌ Socket reconnection failed completely');
      setError('Failed to reconnect to server');
    });

    // Message events
    socketRef.current.on('message:receive', (message) => {
      logger.log('📩 Received message:', message);
      dispatch(addMessage(message));
    });

    socketRef.current.on('nearby:update', (data) => {
      logger.log('📍 Nearby user update:', data);
      dispatch(updateNearbyUser(data));
    });

    socketRef.current.on('user:online', ({ userId }) => {
      logger.log('🟢 User online:', userId);
      dispatch(setUserOnline(userId));
    });

    socketRef.current.on('wave:receive', (wave) => {
      logger.log('👋 Received wave:', wave);
      dispatch(addReceivedWave(wave));
    });

    // Error handling
    socketRef.current.on('error', (socketError) => {
      logger.error('Socket error:', socketError);
      setError(socketError.message || 'Unknown socket error');
    });

  }, [dispatch]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setError(null);
      setReconnectAttempts(0);
      logger.log('Socket disconnected manually');
    }
  }, []);

  const sendMessage = useCallback((recipientId: string, content: string, type = 'text') => {
    if (!socketRef.current || !isConnected) {
      logger.error('Cannot send message: Socket not connected');
      return false;
    }

    socketRef.current.emit('message:send', { recipientId, content, type });
    return true;
  }, [isConnected]);

  const updateLocation = useCallback((lat: number, lng: number) => {
    if (!socketRef.current || !isConnected) {
      logger.warn('Cannot update location: Socket not connected');
      return false;
    }

    socketRef.current.emit('location:update', { lat, lng });
    return true;
  }, [isConnected]);

  const reconnect = useCallback(() => {
    logger.log('Manual reconnection triggered');
    disconnect();
    setTimeout(() => connect(), 1000);
  }, [connect, disconnect]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    sendMessage,
    updateLocation,
    reconnect,
    isConnected,
    error,
    reconnectAttempts,
    socket: socketRef.current,
  };
};
