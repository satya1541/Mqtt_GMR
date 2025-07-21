import { useEffect, useState, useRef } from 'react';

interface DeviceData {
  device_id: string;
  alc_val: number;
  Alert: string;
  Index: number;
  MAC: string;
  OwnerId: string;
}

interface WebSocketMessage {
  topic: string;
  data: DeviceData;
  timestamp: string;
}

export function useWebSocket(url?: string) {
  const [deviceData, setDeviceData] = useState<Record<string, DeviceData>>({});
  const [chartData, setChartData] = useState<Record<string, { labels: string[]; values: number[] }>>({});
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = () => {
    try {
      // For Replit, use the same base URL but replace the port with the WebSocket external port
      // According to .replit config, internal port 5001 should be mapped to an external port
      const isHttps = window.location.protocol === 'https:';
      const wsProtocol = isHttps ? 'wss:' : 'ws:';
      
      // Use the same hostname but with the external port that maps to WebSocket server (5001)
      // Based on Replit port mapping, this should be accessible via a different external port
      const hostname = window.location.hostname;
      const currentPort = window.location.port;
      
      // Try the WebSocket server's external port (likely different from current Next.js port)
      const wsUrl = url || `${wsProtocol}//${hostname.replace('.replit.dev', '-5001.replit.dev')}`;
      
      console.log('🔌 Attempting WebSocket connection to:', wsUrl);
      console.log('Current location:', window.location.href);
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          const { topic, data } = message;

          const time = new Date(message.timestamp).toLocaleTimeString();

          setDeviceData(prev => ({
            ...prev,
            [topic]: data,
          }));

          setChartData(prev => ({
            ...prev,
            [topic]: {
              labels: [...(prev[topic]?.labels || []), time].slice(-30),
              values: [...(prev[topic]?.values || []), data.Index].slice(-30),
            },
          }));
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        setIsConnected(false);

        // Reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Attempting to reconnect...');
          connect();
        }, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', {
          error,
          readyState: wsRef.current?.readyState,
          url: wsRef.current?.url,
          timestamp: new Date().toISOString()
        });
        setIsConnected(false);
      };
    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
    }
  };

  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return { deviceData, chartData, isConnected };
}