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

export interface Node1CompleteData {
  // 节点1返回的商品信息分析结果
  basicInfo: {
    name: string;
    category: string;
    crowdSceneStyle: string;
  };
  productCore: {
    coreContent: string;
    productFacts: string[];
    visualEvidence: string[];
    brandVisualGene: string;
    packagingAppearance: string;
    actionPropSuggestions: string[];
    complianceBoundary: string[];
    infoGaps: string[];
  };
  [key: string]: any;
}

export interface Node2StreamData {
  chunk: string;     // 文本片段
  progress: number;  // 该节点内的进度 0-100
}

export interface Node2CompleteData {
  overallStyle: string;
  globalVisualSystem: any;
  complianceRules: string[];
  modules: Array<{
    index: number;
    theme: string;
    actualImageType: string;
    coreVisual: string;
    bgStyle: string;
    visualStrategy: string;
    characterPropSuggestions: string;
    platformRules: string;
    textDirection: string;
    productAngle: string;
    coordination: string;
  }>;
}

export interface Node3ScreenData {
  screenIndex: number;
  screen: {
    screenIndex: number;
    label: string;
    prompt: string;
    generationGoal: string;
    coreVisual: string;
    compositionStrategy: string;
    subjectProps: string;
    bgStyle: string;
    textCarrierLevel: string;
    productAngle: string;
    consistencyConstraints: string;
    platformRules: string;
    outputRequirements: string;
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
