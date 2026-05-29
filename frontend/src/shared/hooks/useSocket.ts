import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../../store/auth.store.js';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:4000';

export function useSocket(events: Record<string, (...args: any[]) => void>) {
  const socketRef = useRef<Socket | null>(null);
  const token = useAuthStore((state) => state.tokens?.accessToken);

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Initialize socket connection with token authentication
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socketRef.current = socket;

    // Register event listeners
    Object.entries(events).forEach(([eventName, handler]) => {
      socket.on(eventName, handler);
    });

    socket.on('connect', () => {
      console.log('🔌 WebSocket connected successfully');
    });

    socket.on('connect_error', (err) => {
      console.error('❌ WebSocket connection error:', err.message);
    });

    return () => {
      // Cleanup event listeners and disconnect
      Object.keys(events).forEach((eventName) => {
        socket.off(eventName);
      });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, JSON.stringify(Object.keys(events))]);

  return socketRef.current;
}
export default useSocket;
