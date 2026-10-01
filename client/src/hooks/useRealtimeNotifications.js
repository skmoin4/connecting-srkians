import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { connectSocket, disconnectSocket } from '../services/socket.js';

/** Subscribes to real-time notifications while signed in. */
export function useRealtimeNotifications() {
  const { isAuthenticated } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectSocket();
      return undefined;
    }
    const socket = connectSocket();
    if (!socket) return undefined;
    const onNew = (n) => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.info(n.message || '', { title: n.title });
    };
    socket.on('notification:new', onNew);
    return () => {
      socket.off('notification:new', onNew);
    };
  }, [isAuthenticated, qc, toast]);
}
