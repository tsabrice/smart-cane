import { PI_WS_PORT, WS_RECONNECT_BASE_MS, WS_RECONNECT_MAX_MS } from '../utils/constants';

export interface TTSMessage {
  text: string;
  type: string;       // e.g. 'face_announcement', 'obstacle_alert', 'sos_warning'
  timestamp: number;  // Unix seconds from Pi
  name?: string;      // present on face_announcement
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

  // ─── Public API ─────────────────────────────────────────────────────────────

  init(piIP: string, handler: MessageHandler): void {
    this.handler = handler;
    this.wsUrl = `ws://${piIP}:${PI_WS_PORT}`;
    this.stopped = false;
    this.retryDelay = WS_RECONNECT_BASE_MS;
    this.connect();
  }

  updateIP(piIP: string): void {
    this.wsUrl = `ws://${piIP}:${PI_WS_PORT}`;
    // Reconnect to new IP
    this.ws?.close();
  }

  destroy(): void {
    this.stopped = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.ws?.close();
    this.ws = null;
  }

  // ─── Connection ─────────────────────────────────────────────────────────────

  private connect(): void {
    if (this.stopped || !this.wsUrl) return;

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log('[WS] Connected to Pi TTS server');
        this.retryDelay = WS_RECONNECT_BASE_MS; // reset backoff on success
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
        // onerror is always followed by onclose — let onclose handle retry
        this.ws?.close();
      };
    } catch (err) {
      // WebSocket constructor can throw if URL is malformed
      if (!this.stopped) this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => {
      this.connect();
    }, this.retryDelay);
    // Exponential backoff: 1s → 2s → 4s … 30s cap
    this.retryDelay = Math.min(this.retryDelay * 2, WS_RECONNECT_MAX_MS);
  }
}

export default new WebSocketService();
