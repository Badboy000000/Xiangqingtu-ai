import type { SSEMessage, SSEMessageType } from '../types/sse';

export interface SSEClientOptions {
  onMessage?: (message: SSEMessage) => void;
  onError?: (error: Event) => void;
  onClose?: () => void;
  onOpen?: () => void;
}

/**
 * SSE客户端封装
 * 提供易用的EventSource API包装，支持自动重连和错误处理
 */
export class SSEClient {
  private eventSource: EventSource | null = null;
  private url: string;
  private options: SSEClientOptions;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // 初始重连延迟（毫秒）
  private isManualClose = false;

  constructor(url: string, options: SSEClientOptions = {}) {
    this.url = url;
    this.options = options;
  }

  /**
   * 连接SSE服务器
   */
  connect(): void {
    if (this.eventSource) {
      console.warn('[SSEClient] Already connected');
      return;
    }

    this.isManualClose = false;
    this.reconnectAttempts = 0;

    try {
      this.eventSource = new EventSource(this.url);

      this.eventSource.onopen = () => {
        console.log('[SSEClient] Connection opened');
        this.reconnectAttempts = 0;
        this.options.onOpen?.();
      };

      this.eventSource.onmessage = (event) => {
        try {
          const message: SSEMessage = JSON.parse(event.data);
          console.log('[SSEClient] Received message:', message.type);
          this.options.onMessage?.(message);
        } catch (err) {
          console.error('[SSEClient] Failed to parse message:', err);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('[SSEClient] Error occurred:', error);
        
        // 如果是手动关闭，不重连
        if (this.isManualClose) {
          return;
        }

        this.options.onError?.(error);

        // 尝试重连
        this.handleReconnect();
      };

    } catch (err) {
      console.error('[SSEClient] Failed to create EventSource:', err);
      this.options.onError?.(err as any);
    }
  }

  /**
   * 处理重连逻辑（指数退避）
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[SSEClient] Max reconnect attempts reached');
      this.close();
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`[SSEClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      if (!this.isManualClose) {
        this.reconnect();
      }
    }, delay);
  }

  /**
   * 重新连接
   */
  private reconnect(): void {
    this.close(false); // 非手动关闭
    this.connect();
  }

  /**
   * 关闭连接
   * @param manual 是否为手动关闭（默认true）
   */
  close(manual = true): void {
    this.isManualClose = manual;
    
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      console.log('[SSEClient] Connection closed');
      this.options.onClose?.();
    }
  }

  /**
   * 检查连接状态
   */
  get isConnected(): boolean {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN;
  }

  /**
   * 获取连接状态
   * CONNECTING = 0, OPEN = 1, CLOSED = 2
   */
  get readyState(): number {
    return this.eventSource?.readyState ?? EventSource.CLOSED;
  }
}

/**
 * 创建SSE客户端实例
 * @param url SSE端点URL
 * @param options 回调选项
 * @returns SSEClient实例
 */
export function createSSEClient(url: string, options: SSEClientOptions = {}): SSEClient {
  return new SSEClient(url, options);
}

/**
 * 便捷函数：一次性使用SSE连接
 * @param url SSE端点URL
 * @param onMessage 消息回调
 * @param onComplete 完成回调（收到workflow_complete或error时触发）
 * @param onError 错误回调
 */
export function useSSEOnce(
  url: string,
  onMessage: (message: SSEMessage) => void,
  onComplete?: () => void,
  onError?: (error: any) => void
): SSEClient {
  const client = createSSEClient(url, {
    onMessage: (message) => {
      onMessage(message);
      
      // 自动在收到完成或错误消息时关闭连接
      if (message.type === 'workflow_complete' || message.type === 'error') {
        client.close();
        if (message.type === 'workflow_complete') {
          onComplete?.();
        } else if (message.type === 'error') {
          onError?.(message.data);
        }
      }
    },
    onError: (error) => {
      onError?.(error);
      client.close();
    },
  });

  client.connect();
  return client;
}
