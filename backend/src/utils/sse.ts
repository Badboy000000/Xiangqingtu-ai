import { Response } from 'express';

/**
 * SSE消息类型定义
 */
export interface SSEMessage {
  type: string;
  data: any;
  timestamp: number;
}

/**
 * SSE响应包装器
 * 提供便捷的SSE消息发送方法
 */
export class SSEResponse {
  private res: Response;
  private heartbeatInterval?: NodeJS.Timeout;
  private isClosed = false;

  constructor(res: Response) {
    this.res = res;
    this.setupHeaders();
    this.startHeartbeat();
  }

  /**
   * 设置SSE响应头
   */
  private setupHeaders(): void {
    this.res.setHeader('Content-Type', 'text/event-stream');
    this.res.setHeader('Cache-Control', 'no-cache');
    this.res.setHeader('Connection', 'keep-alive');
    // 禁用缓冲，确保消息立即发送
    this.res.flushHeaders();
  }

  /**
   * 启动心跳机制，防止连接超时
   * 每15秒发送一次心跳
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (!this.isClosed) {
        this.res.write(': heartbeat\n\n');
      }
    }, 15000);
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  /**
   * 发送SSE消息
   * @param message SSE消息对象
   */
  send(message: SSEMessage): void {
    if (this.isClosed) return;

    // 将 JSON 编码为单行：先 stringify，再把所有换行/回车转义
    // 这确保 SSE 的 data: 行永远不会被截断
    const raw = JSON.stringify(message);
    // 移除所有可能破坏 SSE 协议的字符（回车、换行）
    const safeJson = raw.replace(/[\r\n]/g, '');
    this.res.write(`data: ${safeJson}\n\n`);
  }

  /**
   * 发送事件（带事件名）
   * @param eventName 事件名称
   * @param data 数据
   */
  sendEvent(eventName: string, data: any): void {
    if (this.isClosed) return;

    const eventData = JSON.stringify({
      type: eventName,
      data,
      timestamp: Date.now(),
    });
    
    this.res.write(`event: ${eventName}\n`);
    this.res.write(`data: ${eventData}\n\n`);
  }

  /**
   * 发送进度更新
   * @param step 当前步骤
   * @param progress 进度百分比 (0-100)
   * @param message 进度消息
   */
  sendProgress(step: string, progress: number, message: string): void {
    this.send({
      type: 'progress',
      data: { step, progress, message },
      timestamp: Date.now(),
    });
  }

  /**
   * 发送错误
   * @param error 错误信息
   */
  sendError(error: string | Error): void {
    this.send({
      type: 'error',
      data: {
        message: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      },
      timestamp: Date.now(),
    });
  }

  /**
   * 关闭SSE连接
   */
  close(): void {
    this.isClosed = true;
    this.stopHeartbeat();
    this.res.end();
  }

  /**
   * 检查连接是否已关闭
   */
  get closed(): boolean {
    return this.isClosed;
  }
}

/**
 * 创建SSE响应包装器
 * @param res Express响应对象
 * @returns SSE响应包装器实例
 */
export function createSSEResponse(res: Response): SSEResponse {
  return new SSEResponse(res);
}
