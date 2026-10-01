import { io } from 'socket.io-client';
import { API_URL, getAccessToken, refreshAccessToken } from '../api/client.js';

let socket = null;

const socketOrigin = () => {
  if (import.meta.env.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL;
  try {
    return API_URL.startsWith('http') ? new URL(API_URL).origin : undefined; // same-origin via Vite proxy
  } catch {
    return undefined;
  }
};

/**
 * Real-time channel used only for notification delivery.
 * Returns null when realtime is switched off (VITE_SOCKET_URL=off) — needed on serverless
 * hosts like Vercel, which can't hold a WebSocket, so the client would otherwise retry
 * forever against an endpoint that will never answer. Notifications still arrive on refetch.
 */
export function connectSocket() {
  if (import.meta.env.VITE_SOCKET_URL === 'off') return null;
  if (socket) return socket;
  socket = io(socketOrigin(), {
    transports: ['websocket', 'polling'],
    withCredentials: true,
    auth: (cb) => cb({ token: getAccessToken() }),
    reconnectionDelayMax: 15000,
  });
  socket.on('connect_error', async (err) => {
    if (err.message === 'unauthorized') {
      try {
        await refreshAccessToken();
      } catch {
        disconnectSocket();
      }
    }
  });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
