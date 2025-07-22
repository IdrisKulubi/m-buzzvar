import { useEffect, useRef, useState, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import NetInfo from "@react-native-community/netinfo";

interface WebSocketMessage {
  type: string;
  channel?: string;
  data?: any;
  timestamp?: number;
  error?: string;
  clientId?: string;
}

interface RealtimeClientOptions {
  url: string;
  userId?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}



export class RealtimeClientMobile {
  private ws: WebSocket | null = null;
  private url: string;
  private userId?: string;
  private reconnectInterval: number;
  private maxReconnectAttempts: number;
  private heartbeatInterval: number;
  private reconnectAttempts = 0;
  private subscriptions = new Map<string, Set<(data: any) => void>>();
  private isConnected = false;
  private shouldReconnect = true;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private appStateSubscription: any = null;
  private netInfoUnsubscribe: (() => void) | null = null;

  constructor(options: RealtimeClientOptions) {
    this.url = options.url;
    this.userId = options.userId;
    this.reconnectInterval = options.reconnectInterval || 3000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    this.heartbeatInterval = options.heartbeatInterval || 30000;

    this.setupAppStateListener();
    this.setupNetworkListener();
  }

  private setupAppStateListener() {
    this.appStateSubscription = AppState.addEventListener(
      "change",
      this.handleAppStateChange
    );
  }

  private setupNetworkListener() {
    this.netInfoUnsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && !this.isConnected && this.shouldReconnect) {
        this.connect();
      }
    });
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (
      nextAppState === "active" &&
      this.shouldReconnect &&
      !this.isConnected
    ) {
      this.connect();
    } else if (nextAppState === "background" || nextAppState === "inactive") {
      this.pauseHeartbeat();
    }
  };

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log("WebSocket connected");
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();

          // Send authentication if userId is provided
          if (this.userId) {
            this.send({
              type: "auth",
              data: { userId: this.userId },
            });
          }

          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error("Failed to parse WebSocket message:", error);
          }
        };

        this.ws.onclose = (event) => {
          console.log("WebSocket closed:", event.code, event.reason);
          this.isConnected = false;
          this.stopHeartbeat();

          if (
            this.shouldReconnect &&
            this.reconnectAttempts < this.maxReconnectAttempts
          ) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(message: WebSocketMessage) {
    switch (message.type) {
      case "pong":
        // Heartbeat response
        break;
      case "broadcast":
        if (message.channel) {
          this.notifySubscribers(message.channel, message.data);
        }
        break;
      case "error":
        console.error("WebSocket server error:", message.error);
        break;
      default:
        console.log("Unknown message type:", message.type);
    }
  }

  private notifySubscribers(channel: string, data: any) {
    const callbacks = this.subscriptions.get(channel);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error("Error in subscription callback:", error);
        }
      });
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = Math.min(
      this.reconnectInterval * Math.pow(2, this.reconnectAttempts),
      30000
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
      this.connect().catch((error) => {
        console.error("Reconnection failed:", error);
      });
    }, delay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: "ping" });
      }
    }, this.heartbeatInterval);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private pauseHeartbeat() {
    this.stopHeartbeat();
  }

  send(message: WebSocketMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          ...message,
          timestamp: Date.now(),
          clientId: this.userId,
        })
      );
    } else {
      console.warn("WebSocket not connected, message not sent:", message);
    }
  }

  subscribe(channel: string, callback: (data: any) => void) {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());

      // Send subscription message to server
      this.send({
        type: "subscribe",
        channel,
      });
    }

    this.subscriptions.get(channel)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscriptions.get(channel);
      if (callbacks) {
        callbacks.delete(callback);

        if (callbacks.size === 0) {
          this.subscriptions.delete(channel);
          this.send({
            type: "unsubscribe",
            channel,
          });
        }
      }
    };
  }

  unsubscribe(channel: string, callback?: (data: any) => void) {
    if (callback) {
      const callbacks = this.subscriptions.get(channel);
      if (callbacks) {
        callbacks.delete(callback);

        if (callbacks.size === 0) {
          this.subscriptions.delete(channel);
          this.send({
            type: "unsubscribe",
            channel,
          });
        }
      }
    } else {
      // Unsubscribe from entire channel
      this.subscriptions.delete(channel);
      this.send({
        type: "unsubscribe",
        channel,
      });
    }
  }

  disconnect() {
    this.shouldReconnect = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
  }

  destroy() {
    this.disconnect();

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }

    this.subscriptions.clear();
  }

  getConnectionState() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      readyState: this.ws?.readyState,
    };
  }
}

// React Hook for using the WebSocket client
export function useRealtimeClient(options: RealtimeClientOptions) {
  const clientRef = useRef<RealtimeClientMobile | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState({
    isConnected: false,
    reconnectAttempts: 0,
    readyState: undefined as number | undefined,
  });

  useEffect(() => {
    clientRef.current = new RealtimeClientMobile(options);

    const checkConnection = () => {
      if (clientRef.current) {
        const state = clientRef.current.getConnectionState();
        setIsConnected(state.isConnected);
        setConnectionState(state);
      }
    };

    const interval = setInterval(checkConnection, 1000);

    // Initial connection
    clientRef.current.connect().catch((error) => {
      console.error("Initial connection failed:", error);
    });

    return () => {
      clearInterval(interval);
      if (clientRef.current) {
        clientRef.current.destroy();
      }
    };
  }, [options, options.url, options.userId]);

  const subscribe = useCallback(
    (channel: string, callback: (data: any) => void) => {
      return clientRef.current?.subscribe(channel, callback);
    },
    []
  );

  const unsubscribe = useCallback(
    (channel: string, callback?: (data: any) => void) => {
      clientRef.current?.unsubscribe(channel, callback);
    },
    []
  );

  const send = useCallback(
    (message: Omit<WebSocketMessage, "timestamp" | "clientId">) => {
      clientRef.current?.send(message as WebSocketMessage);
    },
    []
  );

  const connect = useCallback(() => {
    return clientRef.current?.connect();
  }, []);

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
  }, []);

  return {
    isConnected,
    connectionState,
    subscribe,
    unsubscribe,
    send,
    connect,
    disconnect,
    client: clientRef.current,
  };
}
