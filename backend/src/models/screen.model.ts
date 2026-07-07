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
  // ── 节点3: 生图提示词（新架构只保留 prompt 单字段）──
  prompt: string | null;
  // ── 生图结果 ──
  imageUrl: string | null;
  originalImageUrl: string | null;
  revisionFeedback: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ScreenCreationAttributes extends Optional<ScreenAttributes,
  'id' | 'prompt' | 'status' | 'imageUrl' | 'originalImageUrl' | 'revisionFeedback' | 'theme'
> {}

export class Screen extends Model<ScreenAttributes, ScreenCreationAttributes> implements ScreenAttributes {
  declare id: string;
  declare projectId: string;
  declare screenIndex: number;
  declare label: string;
  declare theme: string;
  declare status: ScreenStatus;
  declare prompt: string | null;
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
    // ── 节点3: 生图提示词（新架构只保留 prompt 单字段）──
    prompt: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      comment: '完整生图提示词（英文，送入 Seedream/GPT Image 2）',
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
    comment: '分屏主表 — 每个详情页分屏的生图提示词与结果（新架构自然语言模式）',
  },
);
