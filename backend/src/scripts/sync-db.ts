/**
 * 数据库迁移脚本
 * 
 * 检测并添加缺失的列，不会清空数据
 * 使用方式：npx tsx src/scripts/sync-db.ts
 */

import { sequelize } from '../config/database';
// 导入所有模型
import '../models';

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

interface ColumnDef {
  table: string;
  column: string;
  sqlType: string;
  nullable: boolean;
  defaultValue?: string;
}

// 定义所有需要检查的列
const REQUIRED_COLUMNS: ColumnDef[] = [
  // projects 表 - 四节点输出列
  { table: 'projects', column: 'info_analysis_result', sqlType: 'JSON', nullable: true },
  { table: 'projects', column: 'design_plan_result', sqlType: 'JSON', nullable: true },
  { table: 'projects', column: 'prompt_gen_mother_prompt', sqlType: 'LONGTEXT', nullable: true },
  { table: 'projects', column: 'joint_gen_instruction', sqlType: 'LONGTEXT', nullable: true },
  { table: 'projects', column: 'screen_count', sqlType: 'INT', nullable: false, defaultValue: '8' },
  { table: 'projects', column: 'selling_points', sqlType: 'TEXT', nullable: true },
  { table: 'projects', column: 'target_audience', sqlType: 'VARCHAR(500)', nullable: false, defaultValue: "''" },
  { table: 'projects', column: 'price_range', sqlType: 'VARCHAR(100)', nullable: false, defaultValue: "''" },
  { table: 'projects', column: 'design_requirements', sqlType: 'TEXT', nullable: true },
  { table: 'projects', column: 'category', sqlType: 'VARCHAR(100)', nullable: false, defaultValue: "''" },
  { table: 'projects', column: 'reference_style', sqlType: 'VARCHAR(255)', nullable: false, defaultValue: "''" },
  { table: 'projects', column: 'reference_image_urls', sqlType: 'JSON', nullable: true },
  { table: 'projects', column: 'language', sqlType: 'VARCHAR(20)', nullable: false, defaultValue: "'zh-CN'" },
  { table: 'projects', column: 'material', sqlType: 'VARCHAR(255)', nullable: true },
  { table: 'projects', column: 'product_specs', sqlType: 'TEXT', nullable: true },
  { table: 'projects', column: 'deleted_at', sqlType: 'DATETIME', nullable: true },
  // design_modules 表 - 新增字段（视觉描述 + 参考图分配）
  { table: 'design_modules', column: 'visual_description', sqlType: 'TEXT', nullable: true },
  { table: 'design_modules', column: 'ref_image_indices', sqlType: 'JSON', nullable: true },
];

async function getExistingColumns(tableName: string): Promise<Set<string>> {
  const [rows]: any = await sequelize.query(`DESCRIBE \`${tableName}\``);
  return new Set(rows.map((r: any) => r.Field));
}

async function migrate() {
  console.log('');
  console.log(`${c.cyan}${c.bold}╔══════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.cyan}${c.bold}║  🔧  数据库迁移工具                          ║${c.reset}`);
  console.log(`${c.cyan}${c.bold}╚══════════════════════════════════════════════╝${c.reset}`);
  console.log('');

  try {
    await sequelize.authenticate();
    console.log(`${c.green}✓${c.reset} 数据库连接成功`);

    // 检查表是否存在
    const [tables]: any = await sequelize.query('SHOW TABLES');
    const tableNames = new Set(tables.map((t: any) => Object.values(t)[0]));
    
    if (!tableNames.has('projects')) {
      console.log(`${c.yellow}⚠${c.reset} projects 表不存在，请先运行 ${c.bold}FORCE_DB_SYNC=true npm run dev${c.reset} 或 ${c.bold}npm run db:rebuild${c.reset}`);
      return;
    }

    let addedCount = 0;
    let skippedCount = 0;

    // 按表分组检查
    const tablesToCheck = new Set(REQUIRED_COLUMNS.map(c => c.table));
    
    for (const tableName of tablesToCheck) {
      if (!tableNames.has(tableName)) {
        console.log(`${c.yellow}⚠${c.reset} 表 ${c.bold}${tableName}${c.reset} 不存在，跳过`);
        continue;
      }

      const existingCols = await getExistingColumns(tableName);
      console.log(`\n${c.gray}── 检查表: ${tableName} (现有 ${existingCols.size} 列) ──${c.reset}`);

      const colsForTable = REQUIRED_COLUMNS.filter(c => c.table === tableName);
      
      for (const col of colsForTable) {
        if (existingCols.has(col.column)) {
          skippedCount++;
          continue;
        }

        // 列不存在，添加它
        const nullableStr = col.nullable ? 'NULL' : 'NOT NULL';
        const defaultStr = col.defaultValue ? ` DEFAULT ${col.defaultValue}` : (col.nullable ? ' DEFAULT NULL' : '');
        const sql = `ALTER TABLE \`${col.table}\` ADD COLUMN \`${col.column}\` ${col.sqlType} ${nullableStr}${defaultStr}`;
        
        console.log(`  ${c.yellow}+${c.reset} 添加列 ${c.bold}${col.column}${c.reset} (${col.sqlType})`);
        
        try {
          await sequelize.query(sql);
          addedCount++;
          console.log(`    ${c.green}✓ 添加成功${c.reset}`);
        } catch (err: any) {
          console.log(`    ${c.red}✗ 添加失败: ${err.message}${c.reset}`);
        }
      }
    }

    console.log('');
    console.log(`${c.gray}──────────────────────────────────────────────${c.reset}`);
    console.log(`  ${c.green}✓${c.reset} 迁移完成: ${c.bold}${addedCount}${c.reset} 列新增, ${c.bold}${skippedCount}${c.reset} 列已存在`);
    
    if (addedCount > 0) {
      console.log(`\n  ${c.green}数据库结构已更新，可以正常使用系统了${c.reset}`);
    } else {
      console.log(`\n  ${c.green}数据库结构完整，无需修改${c.reset}`);
    }
    console.log('');

  } catch (err: any) {
    console.log('');
    console.log(`${c.red}${c.bold}✘ 迁移失败${c.reset}`);
    console.log(`${c.red}${err.message || err}${c.reset}`);
    console.log('');
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

migrate();
