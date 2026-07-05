import { User } from './user.model';
import { Project } from './project.model';
import { DesignModule } from './design-module.model';
import { Screen } from './screen.model';
import { ScreenVersion } from './screen-version.model';
import { ScreenRevision } from './screen-revision.model';
import { ExportRecord } from './export-record.model';

// ── 用户 → 项目 ──
User.hasMany(Project, { foreignKey: 'userId', as: 'projects' });
Project.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// ── 项目 → 设计模块（节点2） ──
Project.hasMany(DesignModule, { foreignKey: 'projectId', as: 'designModules' });
DesignModule.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

// ── 项目 → 分屏（节点3+4） ──
Project.hasMany(Screen, { foreignKey: 'projectId', as: 'screens' });
Screen.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

// ── 分屏 → 版本历史 ──
Screen.hasMany(ScreenVersion, { foreignKey: 'screenId', as: 'versions' });
ScreenVersion.belongsTo(Screen, { foreignKey: 'screenId', as: 'screen' });

// ── 分屏 → 修改记录 ──
Screen.hasMany(ScreenRevision, { foreignKey: 'screenId', as: 'revisions' });
ScreenRevision.belongsTo(Screen, { foreignKey: 'screenId', as: 'screen' });

// ── 项目 → 导出记录 ──
Project.hasMany(ExportRecord, { foreignKey: 'projectId', as: 'exportRecords' });
ExportRecord.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

export { User, Project, DesignModule, Screen, ScreenVersion, ScreenRevision, ExportRecord };
