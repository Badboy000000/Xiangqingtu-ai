// ─── Project ──────────────────────────────────────────────
export type ProjectStatus =
  | 'created'
  | 'uploaded'
  | 'analyzing'
  | 'planning'
  | 'generating'
  | 'reviewing'
  | 'composing'
  | 'completed'
  | 'failed';

export interface ProductInfo {
  name: string;
  platform: 'domestic' | 'overseas';
  sellingPoints: string;
  targetAudience: string;
  priceRange: string;
  designRequirements: string;
  referenceImageUrls: string[]; // stored paths
  category?: string;          // 品类（如：家居日用/厨房餐厨）
  referenceStyle?: string;    // 参考风格
  language?: string;          // 语种
  screenCount?: number;       // 分屏数量（默认8，可自定义4-12）
  material?: string;          // 材质
  productSpecs?: string;      // 产品规格参数
}

// ─── Node1 新类型：逐图视觉分析报告 ─────────────────────

/** 单张参考图的视觉分析报告（自然语言） */
export interface VisionReport {
  imageIndex: number;          // 图片索引（-1 表示无图纯文本分析）
  imageUrl: string;            // 图片路径
  analysis: string;            // 自然语言视觉分析报告（含产品特征+设计方案）
}

/** Node1 输出：逐图视觉分析报告数组 + 原始表单数据透传 */
export interface Node1Output {
  visionReports: VisionReport[];
  productInfo: ProductInfo;    // 原始表单数据透传
}

// ─── Node2 新类型：统一设计结论 ─────────────────────────

/**
 * Node2 输出：纯自然语言报告
 * 不再做结构化提取，完整 Markdown 报告存入 DB，直接传给 Node3
 */
export interface Node2Output {
  fullReport: string;          // 完整自然语言报告（存入 DB，传给 Node3）
}

// ─── Node3 类型 ──────────────────────────────────────────

export interface Node3Output {
  globalMotherPrompt: string;
  screenPrompts: ScreenPrompt[];
}

export interface ScreenPrompt {
  screenIndex: number;
  label: string;
  prompt: string;                    // 完整生图提示词（唯一关键字段）
}

// ─── Screen ───────────────────────────────────────────────
export type ScreenStatus =
  | 'waiting'
  | 'prompt_ready'
  | 'generating'
  | 'generated'
  | 'reviewing'
  | 'approved'
  | 'needs_revision'
  | 'locked'
  | 'failed';

export interface ScreenVersion {
  version: number;
  prompt: string;
  imageUrl: string | null;
  createdAt: Date;
}

// ─── Export ───────────────────────────────────────────────
export type ExportFormat = 'JPG' | 'PNG' | 'WebP';
export type ExportQuality = 'standard' | 'hd' | 'print';

// ─── API Request/Response ─────────────────────────────────
export interface CreateProjectRequest {
  name: string;
  platform: 'domestic' | 'overseas';
  sellingPoints: string;
  targetAudience: string;
  priceRange: string;
  designRequirements: string;
  category?: string;
  referenceStyle?: string;
  language?: string;
  screenCount?: number;       // 分屏数量（默认8，可自定义4-12）
  material?: string;          // 材质
  productSpecs?: string;      // 产品规格参数
}

export interface ReviseScreenRequest {
  prompt?: string;
  feedback?: string;
}

export interface ExportRequest {
  format: ExportFormat;
  quality: ExportQuality;
  width: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
