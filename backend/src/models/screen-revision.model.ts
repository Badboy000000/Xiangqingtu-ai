import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * 分屏修改记录表 (screen_revisions)
 * 每次用户对分屏提出反馈修改时产生一条记录，追踪修改前后的 prompt 和用户反馈。
 */
interface ScreenRevisionAttributes {
  id: string;
  screenId: string;            // 关联分屏
  feedback: string;            // 用户反馈文本
  oldPrompt: string;           // 修改前提示词
  newPrompt: string;           // 修改后提示词
  createdAt?: Date;
}

interface ScreenRevisionCreationAttributes extends Optional<ScreenRevisionAttributes, 'id' | 'createdAt'> {}

export class ScreenRevision extends Model<ScreenRevisionAttributes, ScreenRevisionCreationAttributes> implements ScreenRevisionAttributes {
  declare id: string;
  declare screenId: string;
  declare feedback: string;
  declare oldPrompt: string;
  declare newPrompt: string;
  declare createdAt: Date;
}

ScreenRevision.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: '修改记录唯一ID',
    },
    screenId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'screen_id',
      comment: '关联分屏ID（screens.id）',
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '用户的修改反馈文本（如：背景颜色太暗了，请改成明亮的白色背景）',
    },
    oldPrompt: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      field: 'old_prompt',
      comment: '修改前的生图提示词',
    },
    newPrompt: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      field: 'new_prompt',
      comment: '修改后的生图提示词（LLM 根据反馈重写或用户直接提供）',
    },
  },
  {
    sequelize,
    tableName: 'screen_revisions',
    comment: '分屏修改记录表 — 用户的修改反馈与 prompt 变更历史',
    updatedAt: false,  // 修改记录只创建不更新
  },
);
