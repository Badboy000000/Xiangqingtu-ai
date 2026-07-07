/**
 * SSE消息类型定义
 */

export type SSEMessageType = 
  | 'workflow_start'
  | 'progress'
  | 'node1_complete'
  | 'node2_stream'
  | 'node2_complete'
  | 'node3_screen'
  | 'node3_complete'
  | 'node4_prepare'
  | 'node4_screen'
  | 'node4_screen_error'
  | 'workflow_complete'
  | 'error';

export interface SSEMessage {
  type: SSEMessageType;
  data: any;
  timestamp: number;
}

// 各类型消息的具体数据结构

export interface ProgressData {
  step: string;      // 'node1' | 'node2' | 'node3' | 'node4'
  progress: number;  // 0-100
  message: string;   // 进度描述
}

export interface VisionReport {
  imageIndex: number;    // 图片索引（-1 表示无图纯文本分析）
  imageUrl: string;
  analysis: string;      // 自然语言视觉分析报告
}

export interface Node1CompleteData {
  // 节点1返回的视觉分析报告数组 + 原始表单数据
  visionReports: VisionReport[];
  productInfo: {
    name: string;
    platform: string;
    sellingPoints: string;
    targetAudience: string;
    priceRange: string;
    designRequirements: string;
    referenceImageUrls: string[];
    category?: string;
    language?: string;
    screenCount?: number;
  };
  [key: string]: any;
}

export interface Node2StreamData {
  chunk: string;     // 文本片段
  progress: number;  // 该节点内的进度 0-100
}

export interface Node2CompleteData {
  fullReport: string;        // 完整自然语言报告
}

export interface Node3ScreenData {
  screenIndex: number;
  screen: {
    screenIndex: number;
    label: string;
    prompt: string;
  };
  total: number;
}

export interface Node3CompleteData {
  globalMotherPrompt: string;
  screenPrompts: Array<any>;
}

export interface Node4PrepareData {
  globalJointInstruction: string;
  screenResults: Array<{
    screenIndex: number;
    moduleName: string;
    generationInstruction: string;
    consistencyAnchor: string;
  }>;
}

export interface Node4ScreenData {
  screenIndex: number;
  imageUrl: string;
  total: number;
}

export interface Node4ScreenErrorData {
  screenIndex: number;
  error: string;
}

export interface WorkflowStartData {
  projectId: string;
}

export interface WorkflowCompleteData {
  projectId: string;
}

export interface ErrorData {
  message: string;
  stack?: string;
}
