import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { verifyAccessToken } from '../services/token.service.js';
import { logger } from '../utils/logger.js';

let io = null;

/**
 * Socket.io is used only for real-time notification delivery (new notification + unread count).
 * Each authenticated socket joins a private `user:<id>` room.
 */
export function initSockets(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.clientUrl.split(',').map((s) => s.trim()), credentials: true },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('unauthorized'));
      socket.userId = verifyAccessToken(token).sub;
      return next();
    } catch {
      return next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);
  });

  logger.info('Socket.io ready (notifications)');
  return io;
}

export function emitToUsers(userIds, event, payload) {
  if (!io) return;
  for (const id of userIds) io.to(`user:${id}`).emit(event, payload);
}
