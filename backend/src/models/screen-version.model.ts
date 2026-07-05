import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * 分屏版本历史表 (screen_versions)
 * 每次单屏生图（含重生成）产生一条版本记录，追踪 prompt 变更与图片产出历史。
 */
interface ScreenVersionAttributes {
  id: string;
  screenId: string;            // 关联分屏
  versionNumber: number;       // 版本号 (1, 2, 3...)
  prompt: string;              // 该版本使用的生图提示词
  imageUrl: string | null;     // 该版本的生图结果路径
  createdAt?: Date;
}

interface ScreenVersionCreationAttributes extends Optional<ScreenVersionAttributes, 'id' | 'createdAt'> {}

export class ScreenVersion extends Model<ScreenVersionAttributes, ScreenVersionCreationAttributes> implements ScreenVersionAttributes {
  declare id: string;
  declare screenId: string;
  declare versionNumber: number;
  declare prompt: string;
  declare imageUrl: string | null;
  declare createdAt: Date;
}

ScreenVersion.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: '版本记录唯一ID',
    },
    screenId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'screen_id',
      comment: '关联分屏ID（screens.id）',
    },
    versionNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'version_number',
      comment: '版本号，从1开始递增',
    },
    prompt: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
      comment: '该版本使用的完整生图提示词',
    },
    imageUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'image_url',
      comment: '该版本的生图结果本地路径（如 /uploads/screen_xxx_1.png）',
    },
  },
  {
    sequelize,
    tableName: 'screen_versions',
    comment: '分屏版本历史表 — 每次生图（含重生成）的 prompt 与图片产出记录',
    updatedAt: false,  // 版本记录只创建不更新
  },
);
