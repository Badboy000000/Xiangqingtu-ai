import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import type { ExportFormat, ExportQuality } from '../types';

interface ExportRecordAttributes {
  id: string;
  projectId: string;
  format: ExportFormat;
  quality: ExportQuality;
  width: number;
  outputUrl: string;
  screenCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ExportRecordCreationAttributes extends Optional<ExportRecordAttributes, 'id'> {}

export class ExportRecord extends Model<ExportRecordAttributes, ExportRecordCreationAttributes> implements ExportRecordAttributes {
  declare id: string;
  declare projectId: string;
  declare format: ExportFormat;
  declare quality: ExportQuality;
  declare width: number;
  declare outputUrl: string;
  declare screenCount: number;
  declare createdAt: Date;
  declare updatedAt: Date;
}

ExportRecord.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: '导出记录唯一ID',
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'project_id',
      comment: '关联项目ID（projects.id）',
    },
    format: {
      type: DataTypes.STRING(10),
      allowNull: false,
      comment: '导出图片格式: JPG | PNG | WebP',
    },
    quality: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: '导出质量: standard(70%) | hd(85%) | print(100%)',
    },
    width: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '导出长图宽度（像素，通常 750）',
    },
    outputUrl: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'output_url',
      comment: '导出长图本地路径（如 /uploads/export_xxx.jpg）',
    },
    screenCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'screen_count',
      comment: '本次导出拼接的已确认屏数量',
    },
  },
  {
    sequelize,
    tableName: 'export_records',
    comment: '导出记录表 — 每次导出长图的参数与产物记录',
  },
);
