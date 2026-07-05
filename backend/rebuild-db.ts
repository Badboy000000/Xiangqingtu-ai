/**
 * 数据库重建脚本
 * 
 * 用途：当需要重新创建所有表结构时使用（会清空所有数据）
 * 使用方式：npx tsx rebuild-db.ts
 * 
 * ⚠️ 警告：此操作不可逆，将删除所有现有数据！
 */

import { sequelize } from './src/config/database';
// ⚠️ 必须先导入所有模型，否则 sequelize.sync() 不知道要创建哪些表
import './src/models';
import * as fs from 'fs';
import * as path from 'path';

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

async function rebuildDatabase() {
  console.log('');
  console.log(`${c.yellow}${c.bold}╔══════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.yellow}${c.bold}║  🗄️  数据库重建工具                          ║${c.reset}`);
  console.log(`${c.yellow}${c.bold}══════════════════════════════════════════════╝${c.reset}`);
  console.log('');

  try {
    // 连接数据库
    await sequelize.authenticate();
    console.log(`${c.green}✓${c.reset} 数据库连接成功`);

    // 确认操作
    console.log('');
    console.log(`${c.red}${c.bold}⚠️  警告：此操作将清空所有数据！${c.reset}`);
    console.log(`   数据库: ${sequelize.config.database}`);
    console.log(`   主机: ${sequelize.config.host}:${sequelize.config.port}`);
    console.log('');

    const confirm = process.env.CONFIRM_REBUILD;
    if (confirm !== 'yes') {
      console.log(`${c.yellow}提示：如需执行重建，请设置环境变量 CONFIRM_REBUILD=yes${c.reset}`);
      console.log(`${c.yellow}      例如: CONFIRM_REBUILD=yes npx tsx rebuild-db.ts${c.reset}`);
      console.log('');
      return;
    }

    // 执行强制同步
    console.log(`${c.cyan}正在重建表结构...${c.reset}`);
    await sequelize.sync({ force: true });

    const tables = Object.values(sequelize.models)
      .map(m => m.getTableName())
      .join(', ');

    console.log('');
    console.log(`${c.green}${c.bold}✓ 表结构重建完成${c.reset}`);
    console.log(`  已创建的表: ${tables}`);
    console.log('');
    console.log(`${c.green}所有数据已清空，可以重新开始${c.reset}`);
    console.log('');

  } catch (err: any) {
    console.log('');
    console.log(`${c.red}${c.bold}✘ 重建失败${c.reset}`);
    console.log(`${c.red}${err.message || err}${c.reset}`);
    console.log('');
    process.exit(1);
  }
}

rebuildDatabase();
