import { AppState, AppStateStatus } from 'react-native';
import { PI_WS_PORT, WS_RECONNECT_BASE_MS, WS_RECONNECT_MAX_MS } from '../utils/constants';

export interface TTSMessage {
  text: string;
  type: string;
  timestamp: number;
  name?: string;
  confidence?: number;
}

type MessageHandler = (msg: TTSMessage) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private handler: MessageHandler | null = null;
  private wsUrl = '';
  private retryDelay = WS_RECONNECT_BASE_MS;
  private stopped = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private appStateSubscription: any = null;

  // ─── Public API ─────────────────────────────────────────────────────────────

  init(piIP: string, handler: MessageHandler): void {
    this.handler = handler;
    this.wsUrl = `ws://${piIP}:${PI_WS_PORT}`;
    this.stopped = false;
    this.retryDelay = WS_RECONNECT_BASE_MS;
    this.connect();
    this.listenAppState();
  }

  updateIP(piIP: string): void {
    this.wsUrl = `ws://${piIP}:${PI_WS_PORT}`;
    this.retryDelay = WS_RECONNECT_BASE_MS;
    this.ws?.close();
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.connect(); // reconnect immediately to new IP
  }

  destroy(): void {
    this.stopped = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.appStateSubscription?.remove();
    this.ws?.close();
    this.ws = null;
  }

  // ─── AppState ────────────────────────────────────────────────────────────────

  private listenAppState(): void {
    this.appStateSubscription?.remove();
    this.appStateSubscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        // App foregrounded — reconnect if needed
        if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
          this.retryDelay = WS_RECONNECT_BASE_MS;
          this.connect();
        }
      } else {
        // App backgrounded — stop retrying to save battery
        if (this.retryTimer) clearTimeout(this.retryTimer);
        this.ws?.close();
        this.ws = null;
      }
    });
  }

  // ─── Connection ─────────────────────────────────────────────────────────────

  private connect(): void {
    if (this.stopped || !this.wsUrl) return;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return; // already connected

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log('[WS] Connected to Pi TTS server');
        this.retryDelay = WS_RECONNECT_BASE_MS;
      };

      this.ws.onmessage = (e: WebSocketMessageEvent) => {
        try {
          const msg: TTSMessage = JSON.parse(e.data);
          if (msg.text && typeof msg.text === 'string') {
            this.handler?.(msg);
          }
        } catch (err) {
          console.warn('[WS] Failed to parse message:', e.data);
        }
      };

      this.ws.onclose = () => {
        console.log('[WS] Disconnected from Pi TTS server');
        this.ws = null;
        if (!this.stopped) this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.ws?.close();
      };
    } catch (err) {
      if (!this.stopped) this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => this.connect(), this.retryDelay);
    this.retryDelay = Math.min(this.retryDelay * 2, WS_RECONNECT_MAX_MS);
  }
}

export default new WebSocketService();
