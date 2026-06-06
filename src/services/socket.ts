// src/services/socket.ts
import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect(): Socket {
    if (!this.socket || !this.socket.connected) {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      
      this.socket = io(backendUrl, {
        transports: ['websocket'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: Infinity, // Keep trying to connect
        reconnectionDelay: 1000,        // Start at 1s
        reconnectionDelayMax: 5000,     // Max delay of 5s
        timeout: 20000,                 // 20s connection timeout
      });

      this.socket.on('connect', () => {
        console.log('Connected to UTWatch backend');
        this.socket?.emit('request_initial_state');
      });

      this.socket.on('reconnect', (attemptNumber) => {
        console.log(`Reconnected to UTWatch backend after ${attemptNumber} attempts`);
      });

      this.socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
      });

      this.socket.on('disconnect', (reason) => {
        console.warn('Socket disconnected:', reason);
      });

      // Force reconnect on network recovery
      window.addEventListener('online', () => {
        console.log('Network online, forcing socket reconnection...');
        this.socket?.connect();
      });
    }
    return this.socket;
  }

  getSocket() {
    return this.socket;
  }

  disconnect() {
    if (this.socket) this.socket.disconnect();
    this.socket = null;
  }
}

export default new SocketService();
