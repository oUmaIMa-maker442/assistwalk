import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import { getUserId } from '../utils/auth';

export function useWebSocket(onAlert, setConnected) {
  const clientRef = useRef(null);

  useEffect(() => {
    const userId = getUserId();
    if (!userId) return;

    const client = new Client({
      // Utilise une WebSocket native (plus de SockJS)
      webSocketFactory: () => new WebSocket('ws://localhost:8081/ws/websocket'),
      reconnectDelay: 5000,
      onConnect: () => {
        console.log('[WS] Connecté au broker STOMP');
        setConnected?.(true);
        client.subscribe(`/topic/alerts/${userId}`, (message) => {
          const notification = JSON.parse(message.body);
          console.log('[WS] Alerte reçue', notification);
          onAlert(notification);
        });
      },
      onDisconnect: () => {
        console.log('[WS] Déconnecté');
        setConnected?.(false);
      },
      onStompError: (frame) => {
        console.error('[WS] Erreur STOMP', frame);
        setConnected?.(false);
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      if (clientRef.current?.active) clientRef.current.deactivate();
    };
  }, [onAlert, setConnected]);
}