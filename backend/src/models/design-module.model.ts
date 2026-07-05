import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * 设计模块表 (design_modules)
 * 来源：节点2「详情页设计规划」输出的 modules 数组。
 * 每个项目生成 N 个模块（通常 8 个），每个模块对应详情页的一个图位段落。
 */
interface DesignModuleAttributes {
  id: string;
  projectId: string;             // 关联项目
  moduleIndex: number;           // 模块序号 (1-8)
  theme: string;                 // 模块主题（如：首屏品牌主视觉）
  actualImageType: string;       // 实际图位类型
  coreVisual: string;            // 核心视觉描述
  bgStyle: string;               // 背景/风格
  visualStrategy: string;        // 画面策略
  characterPropSuggestions: string; // 人物/道具建议
  platformRules: string;         // 平台规则
  textDirection: string;         // 图位文案方向
  productAngle: string;          // 产品角度/景别
  coordination: string;          // 协同要求
  createdAt?: Date;
  updatedAt?: Date;
}

interface DesignModuleCreationAttributes extends Optional<DesignModuleAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class DesignModule extends Model<DesignModuleAttributes, DesignModuleCreationAttributes> implements DesignModuleAttributes {
  declare id: string;
  declare projectId: string;
  declare moduleIndex: number;
  declare theme: string;
  declare actualImageType: string;
  declare coreVisual: string;
  declare bgStyle: string;
  declare visualStrategy: string;
  declare characterPropSuggestions: string;
  declare platformRules: string;
  declare textDirection: string;
  declare productAngle: string;
  declare coordination: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

DesignModule.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: '模块唯一ID',
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'project_id',
      comment: '关联项目ID（projects.id）',
    },
    moduleIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'module_index',
      comment: '模块序号，从1开始（如1=首屏, 2=核心卖点...）',
    },
    theme: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '模块主题（如：首屏品牌主视觉/核心卖点图/场景使用图）',
    },
    actualImageType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: '',
      field: 'actual_image_type',
      comment: '实际图位类型（如：海报图/信息图/场景图）',
    },
    coreVisual: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'core_visual',
      comment: '核心视觉描述（画面主体与视觉焦点）',
    },
    bgStyle: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'bg_style',
      comment: '背景风格描述',
    },
    visualStrategy: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'visual_strategy',
      comment: '画面策略（构图/层次/引导线等）',
    },
    characterPropSuggestions: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'character_prop_suggestions',
      comment: '人物/道具建议',
    },
    platformRules: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'platform_rules',
      comment: '平台规则约束（如天猫/京东的图片规范）',
    },
    textDirection: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'text_direction',
      comment: '图位文案方向（标题/卖点/辅助说明的排布）',
    },
    productAngle: {
      type: DataTypes.STRING(200),
      allowNull: false,
      defaultValue: '',
      field: 'product_angle',
      comment: '产品角度/景别（如：正面45度特写/俯拍全景）',
    },
    coordination: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '与其他模块的协同要求',
    },
  },
  {
    sequelize,
    tableName: 'design_modules',
    comment: '设计模块表 — 节点2输出的每个详情页图位模块规划',
  },
);
