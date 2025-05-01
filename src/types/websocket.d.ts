import { WebSocket } from 'ws';

declare module 'ws' {
  interface WebSocket {
    userId?: string;
    isAlive?: boolean;
  }
}

export interface WebSocketWithData extends WebSocket {
  userId?: string;
  isAlive?: boolean;
} 