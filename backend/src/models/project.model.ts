import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import type { ProjectStatus } from '../types';

/**
 * 项目表 (projects)
 * 一个项目对应一个商品详情页生成任务，包含四节点工作流的全部过程数据。
 */
interface ProjectAttributes {
  id: string;
  userId: string;
  name: string;                    // 商品名称
  platform: string;                // 平台: domestic(国内) | overseas(海外)
  language: string;                // 语种: zh-CN | en-US ...
  status: ProjectStatus;           // 项目状态机
  screenCount: number;             // 分屏数量（默认8，用户可自定义4-12）
  // ── 商品信息（原 product_info JSON 拆为独立列）──
  sellingPoints: string;           // 商品卖点
  targetAudience: string;          // 目标人群
  priceRange: string;              // 价格区间
  designRequirements: string;      // 设计要求
  category: string;                // 品类（如：家居日用/厨房餐厨）
  referenceStyle: string;          // 参考风格描述
  referenceImageUrls: string[];    // 参考图本地路径数组
  material: string;                // 材质
  productSpecs: string;            // 产品规格参数
  // ── 四节点全局输出（复杂嵌套结构保留 JSON / LONGTEXT）──
  infoAnalysisResult: any;                              // 节点1: 视觉分析报告 + productInfo（新架构，any 兼容新旧格式）
  designPlanResult: any;                                  // 节点2: 设计规划结果（新架构: { fullReport, overallStyle }，any 兼容新旧格式）
  promptGenMotherPrompt: string | null;                // 节点3: 全局母提示词
  jointGenInstruction: string | null;                  // 节点4: 联合生图总指令
  createdAt?: Date;
  updatedAt?: Date;
}

interface ProjectCreationAttributes extends Optional<ProjectAttributes,
  'id' | 'status' | 'screenCount' | 'sellingPoints' | 'targetAudience' | 'priceRange' |
  'designRequirements' | 'category' | 'referenceStyle' | 'referenceImageUrls' | 'material' | 'productSpecs' |
  'infoAnalysisResult' | 'designPlanResult' | 'promptGenMotherPrompt' | 'jointGenInstruction' | 'language'
> {}

export class Project extends Model<ProjectAttributes, ProjectCreationAttributes> implements ProjectAttributes {
  declare id: string;
  declare userId: string;
  declare name: string;
  declare platform: string;
  declare language: string;
  declare status: ProjectStatus;
  declare screenCount: number;
  declare sellingPoints: string;
  declare targetAudience: string;
  declare priceRange: string;
  declare designRequirements: string;
  declare category: string;
  declare referenceStyle: string;
  declare referenceImageUrls: string[];
  declare material: string;
  declare productSpecs: string;
  declare infoAnalysisResult: any;
  declare designPlanResult: any;
  declare promptGenMotherPrompt: string | null;
  declare jointGenInstruction: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Project.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: '项目唯一ID',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      comment: '所属用户ID（关联 users.id）',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: '商品名称',
    },
    platform: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'domestic',
      comment: '目标平台: domestic(国内) | overseas(海外)',
    },
    language: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'zh-CN',
      comment: '详情页语种',
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'created',
      comment: '项目状态: created→uploaded→analyzing→planning→generating→reviewing→composing→completed | failed',
    },
    screenCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 8,
      field: 'screen_count',
      comment: '分屏数量（默认8，用户可自定义4-12）',
    },
    sellingPoints: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'selling_points',
      comment: '商品卖点（原始输入）',
    },
    targetAudience: {
      type: DataTypes.STRING(500),
      allowNull: false,
      defaultValue: '',
      field: 'target_audience',
      comment: '目标人群描述',
    },
    priceRange: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: '',
      field: 'price_range',
      comment: '价格区间（如：199-299元）',
    },
    designRequirements: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'design_requirements',
      comment: '设计要求描述',
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: '',
      comment: '商品品类（如：家居日用/厨房餐厨/个护健康）',
    },
    referenceStyle: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: '',
      field: 'reference_style',
      comment: '参考风格描述',
    },
    material: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'material',
      comment: '材质（如：304不锈钢、头层牛皮、纯棉等）',
    },
    productSpecs: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'product_specs',
      comment: '产品规格参数（如：尺寸、容量、功率、重量等）',
    },
    referenceImageUrls: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'reference_image_urls',
      comment: '参考图本地路径数组（如 ["/uploads/xxx.png"]）',
    },
    infoAnalysisResult: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'info_analysis_result',
      comment: '节点1信息整理结果: { visionReports, productInfo } 新架构自然语言报告',
    },
    designPlanResult: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'design_plan_result',
      comment: '节点2设计规划结果: { fullReport, overallStyle } 新架构自然语言统一结论',
    },
    promptGenMotherPrompt: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      field: 'prompt_gen_mother_prompt',
      comment: '节点3生成的全局母提示词（所有分屏共享的视觉一致性约束）',
    },
    jointGenInstruction: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      field: 'joint_gen_instruction',
      comment: '节点4联合生图总指令（跨屏一致性约束+参考图联合指令）',
    },
  },
  {
    sequelize,
    tableName: 'projects',
    comment: '项目表 — 一个商品详情页生成任务的完整生命周期',
  },
);

