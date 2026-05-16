// src/services/socket.ts
import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect(): Socket {
    if (!this.socket || !this.socket.connected) {
      this.socket = io('http://localhost:5000', {
        transports: ['websocket'],
        autoConnect: true,
      });
      this.socket.on('connect', () => {
        console.log('Connected to UTWatch backend');
        this.socket?.emit('request_initial_state');
      });
      this.socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
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