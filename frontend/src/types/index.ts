/** 产品信息表单数据 */
export interface ProductInfo {
  name: string;
  platform: "domestic" | "overseas";
  sellingPoints: string;
  targetAudience: string;
  priceRange: string;
  designRequirements: string;
  referenceImages: File[];
  category?: string;
  referenceStyle?: string;
  language?: string;
  screenCount?: number;       // 分屏数量（默认8，可自定义4-12）
}

/** 单屏设计方案 */
export interface ScreenDesign {
  label: string;
  prompt: string;
  imageUrl: string;
}

/** 详情页整体设计规划 */
export interface DesignPlan {
  overallStyle: string;
  screens: ScreenDesign[];
}

/** 导出配置 */
export interface ExportConfig {
  format: "JPG" | "PNG" | "WebP";
  quality: "standard" | "hd" | "print";
  sizeKey: "750" | "1080" | "1200" | "custom";
  customWidth: string;
}
