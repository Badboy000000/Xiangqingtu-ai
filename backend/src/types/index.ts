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
}

export interface Node1Output {
  basicInfo: {
    name: string;
    category: string;           // 品类/平台/语种
    crowdSceneStyle: string;    // 人群/场景/参考风格
    platform: string;
    language: string;
  };
  productCore: {
    coreContent: string;            // 核心内容（购买理由、卖点含义、痛点、收益、场景、使用方式）
    productFacts: string[];         // 商品事实（规格/材质/尺寸/容量/配件/认证/包装等）
    visualEvidence: string[];       // 视觉依据（外观/结构/材质纹理/颜色/按钮接口/配件组合）
    brandVisualGene: string;        // 品牌视觉基因（主色辅色/字形气质/图形元素/圆角直角倾向等）
    packagingAppearance: string;    // 包装外观（包装形态/标签/开合/配件清单/容量尺寸参照）
    actionPropSuggestions: string[]; // 动作/道具建议
    complianceBoundary: string[];   // 合规边界
    infoGaps: string[];             // 信息缺口
  };
}

export interface GlobalVisualSystem {
  bgColor: string;            // 背景底色（HEX）
  mainColor: string;          // 主色（色名与来源）
  accentColor: string;        // 辅色
  highlightColor: string;     // 点缀色
  colorRatio: string;         // 色彩比例（主/辅/点缀占比）
  artStyle: string;           // 画风（生活方式/信息图/质感产品图/场景图等）
  lighting: string;           // 光影（自然光/柔光/侧光/顶光等）
  rendering: string;          // 渲染（写实/轻信息图/半写实/商业摄影感等）
  titleFont: string;          // 标题字形气质
  bodyFont: string;           // 正文字形气质
  titlePlacement: string;     // 标题呈现方式
  fontColorCount: string;     // 字色数量
  cardStyle: string;          // 卡片/标签/icon/引线统一风格
  cornerLineStyle: string;    // 圆角/线条/阴影统一规则
  whitespace: string;         // 留白逻辑与安全区
  hierarchy: string;          // 层级关系（标题/卖点/辅助说明/参数）
  categoryAtmosphere: string; // 品类氛围
}

/** 节点2 LLM 完整输出（含 modules 数组） */
export interface Node2Output {
  overallStyle: string;
  globalVisualSystem: GlobalVisualSystem;
  complianceRules: string[];
  modules: ModulePlan[];
}

/** 节点2 全局部分（存入 projects.design_plan_result，modules 拆到 design_modules 表） */
export interface Node2OutputGlobal {
  overallStyle: string;
  globalVisualSystem: GlobalVisualSystem;
  complianceRules: string[];
}

export interface ModulePlan {
  index: number;
  theme: string;                       // 模块名（如：首屏品牌主视觉）
  actualImageType: string;             // 实际图位类型
  coreVisual: string;                  // 核心视觉
  bgStyle: string;                     // 背景/风格
  visualStrategy: string;              // 画面策略
  characterPropSuggestions: string;    // 人物/道具建议
  platformRules: string;               // 平台规则
  textDirection: string;               // 图位文案方向
  productAngle: string;                // 产品角度/景别
  coordination: string;                // 协同要求
}

export interface Node3Output {
  globalMotherPrompt: string;
  screenPrompts: ScreenPrompt[];
}

export interface ScreenPrompt {
  screenIndex: number;
  label: string;
  prompt: string;                    // 完整生图提示词（兼容旧逻辑）
  generationGoal: string;            // 生成目标
  coreVisual: string;                // 核心视觉
  compositionStrategy: string;       // 构图策略
  subjectProps: string;              // 主体/道具
  bgStyle: string;                   // 背景/风格
  textCarrierLevel: string;          // 文字载体与层级
  productAngle: string;              // 产品角度/景别
  consistencyConstraints: string;    // 一致性约束
  platformRules: string;             // 平台规则
  outputRequirements: string;        // 输出要求
  styleConstraints?: string;         // 兼容旧字段
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
