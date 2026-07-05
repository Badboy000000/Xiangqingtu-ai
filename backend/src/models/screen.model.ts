import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import type { ScreenStatus } from '../types';

/**
 * 分屏主表 (screens)
 * 每行代表详情页中的一个分屏，合并了节点3的分屏提示词（13字段）和节点4的生图指令与结果（7字段）。
 * 每屏拥有唯一 UUID，支持变屏数（不限于8屏），与项目ID强关联。
 */
interface ScreenAttributes {
  id: string;
  projectId: string;
  screenIndex: number;
  label: string;
  theme: string;
  status: ScreenStatus;
  // ── 节点3: 分屏提示词字段 ──
  prompt: string | null;
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
  // ── 节点4: 联合生图指令字段 ──
  moduleName: string;
  generationInstruction: string;
  consistencyAnchor: string;
  // ── 生图结果 ──
  imageUrl: string | null;
  originalImageUrl: string | null;
  revisionFeedback: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ScreenCreationAttributes extends Optional<ScreenAttributes,
  'id' | 'prompt' | 'status' | 'generationGoal' | 'coreVisual' | 'compositionStrategy' |
  'subjectProps' | 'bgStyle' | 'textCarrierLevel' | 'productAngle' | 'consistencyConstraints' |
  'platformRules' | 'outputRequirements' | 'moduleName' | 'generationInstruction' |
  'consistencyAnchor' | 'imageUrl' | 'originalImageUrl' | 'revisionFeedback' | 'theme'
> {}

export class Screen extends Model<ScreenAttributes, ScreenCreationAttributes> implements ScreenAttributes {
  declare id: string;
  declare projectId: string;
  declare screenIndex: number;
  declare label: string;
  declare theme: string;
  declare status: ScreenStatus;
  declare prompt: string | null;
  declare generationGoal: string;
  declare coreVisual: string;
  declare compositionStrategy: string;
  declare subjectProps: string;
  declare bgStyle: string;
  declare textCarrierLevel: string;
  declare productAngle: string;
  declare consistencyConstraints: string;
  declare platformRules: string;
  declare outputRequirements: string;
  declare moduleName: string;
  declare generationInstruction: string;
  declare consistencyAnchor: string;
  declare imageUrl: string | null;
  declare originalImageUrl: string | null;
  declare revisionFeedback: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Screen.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: '分屏唯一ID（用于精确定位单屏修改）',
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'project_id',
      comment: '关联项目ID（projects.id）',
    },
    screenIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'screen_index',
      comment: '屏序号，从1开始',
    },
    label: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '屏标签（如：品牌主视觉/核心卖点图）',
    },
    theme: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: '',
      comment: '模块主题（从节点2的 design_modules 关联获取）',
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'waiting',
      comment: '屏状态: waiting→prompt_ready→generating→generated→reviewing→approved | needs_revision | failed',
    },
    // ── 节点3: 分屏提示词字段 ──
    prompt: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      comment: '完整生图提示词（英文，送入 Seedream/GPT Image 2）',
    },
    generationGoal: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'generation_goal',
      comment: '生成目标（这张图要传达什么信息）',
    },
    coreVisual: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'core_visual',
      comment: '核心视觉（画面主体与焦点）',
    },
    compositionStrategy: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'composition_strategy',
      comment: '构图策略（三分法/居中/对角线等）',
    },
    subjectProps: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'subject_props',
      comment: '主体/道具（画面中出现的物品和道具）',
    },
    bgStyle: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'bg_style',
      comment: '背景风格',
    },
    textCarrierLevel: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'text_carrier_level',
      comment: '文字载体与层级（标题/卖点/辅助说明的排布方式）',
    },
    productAngle: {
      type: DataTypes.STRING(200),
      allowNull: false,
      defaultValue: '',
      field: 'product_angle',
      comment: '产品角度/景别（正面45度/俯拍/特写等）',
    },
    consistencyConstraints: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'consistency_constraints',
      comment: '一致性约束（跨屏视觉统一要求）',
    },
    platformRules: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'platform_rules',
      comment: '平台规则（图片尺寸/文字占比/合规要求）',
    },
    outputRequirements: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'output_requirements',
      comment: '输出要求（分辨率/格式/画质）',
    },
    // ── 节点4: 联合生图指令字段 ──
    moduleName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: '',
      field: 'module_name',
      comment: '模块名称（来自节点4 screenResults）',
    },
    generationInstruction: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      field: 'generation_instruction',
      comment: '联合生图指令（节点4为每屏生成的综合指令，融合母提示词+分屏prompt+参考图）',
    },
    consistencyAnchor: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'consistency_anchor',
      comment: '一致性锚点（保持跨屏一致的具体视觉锚点描述）',
    },
    // ── 生图结果 ──
    imageUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'image_url',
      comment: '当前版本的生图结果本地路径（如 /uploads/screen_xxx_1.png）',
    },
    originalImageUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'original_image_url',
      comment: '火山引擎/胜算云返回的原始图片URL（下载前的远程地址）',
    },
    revisionFeedback: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'revision_feedback',
      comment: '最近一次用户的修改反馈文本',
    },
  },
  {
    sequelize,
    tableName: 'screens',
    comment: '分屏主表 — 每个详情页分屏的提示词、生图指令与结果（合并节点3+节点4字段）',
  },
);
