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
  textDirection: string;         // 图位文案方向
  productAngle: string;          // 产品角度/景别
  // ── 新架构字段 ──
  visualDescription: string;      // 视觉描述（50-80字画面描述自然语言）
  referenceImageIndices: number[] | null; // 该屏参考图索引数组
  createdAt?: Date;
  updatedAt?: Date;
}

interface DesignModuleCreationAttributes extends Optional<DesignModuleAttributes, 'id' | 'createdAt' | 'updatedAt' | 'visualDescription' | 'referenceImageIndices'> {}

export class DesignModule extends Model<DesignModuleAttributes, DesignModuleCreationAttributes> implements DesignModuleAttributes {
  declare id: string;
  declare projectId: string;
  declare moduleIndex: number;
  declare theme: string;
  declare textDirection: string;
  declare productAngle: string;
  declare visualDescription: string;
  declare referenceImageIndices: number[] | null;
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
    visualDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'visual_description',
      comment: '视觉描述（50-80字画面描述自然语言，Node2输出，直接用于Node3生成Prompt）',
    },
    referenceImageIndices: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'ref_image_indices',
      comment: '该屏参考图索引数组（0-based，如[0,1,2]，Node2输出，Node4用于参考图智能分配）',
    },
  },
  {
    sequelize,
    tableName: 'design_modules',
    comment: '设计模块表 — 节点2输出的每个详情页分屏方案（新架构自然语言模式）',
  },
);
