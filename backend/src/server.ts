import app from './app';
import { config } from './config';
import { sequelize } from './config/database';
// 导入模型以确保 Sequelize 注册所有表定义
import './models';
import * as fs from 'fs';
import * as path from 'path';
import { setFirstRequestCallback } from './middleware/request-logger';
import { initPrompts, listPrompts } from './prompts/prompt-loader';
import { LLM_MODEL_NAME, LLM_PROVIDER_LABEL } from './adapters/llm.adapter';
import { IMAGE_MODEL_NAME, IMAGE_PROVIDER_LABEL, IMAGE_EDIT_MODEL_NAME, IMAGE_EDIT_PROVIDER_LABEL, IMAGE_FALLBACK_MODEL_NAME } from './adapters/image.adapter';

// ── 确保 uploads 目录存在 ──────────────────────────────────
const uploadDir = path.resolve(config.upload.dir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ── 颜色工具 ───────────────────────────────────────────────
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

function banner() {
  console.log('');
  console.log(`  ${c.magenta}${c.bold}╔══════════════════════════════════════════════╗${c.reset}`);
  console.log(`  ${c.magenta}${c.bold}║                                              ║${c.reset}`);
  console.log(`  ${c.magenta}${c.bold}║${c.reset}  ${c.bold}${c.white}🛍  电商详情图生成系统${c.reset}                       ${c.magenta}${c.bold}║${c.reset}`);
  console.log(`  ${c.magenta}${c.bold}║                                              ║${c.reset}`);
  console.log(`  ${c.magenta}${c.bold}╚══════════════════════════════════════════════╝${c.reset}`);
  console.log('');
}

function statusLine(icon: string, label: string, value: string, color: string = c.green) {
  console.log(`  ${c.dim}│${c.reset}  ${icon} ${c.dim}${label}:${c.reset}  ${color}${c.bold}${value}${c.reset}`);
}

function divider() {
  console.log(`  ${c.dim}├──────────────────────────────────────────────┤${c.reset}`);
}

/**
 * 安全迁移：检测并添加缺失列，避免 alter:true 导致的索引超限问题
 */
async function safeMigrateColumns() {
  interface ColDef { table: string; column: string; sql: string; }
  const columns: ColDef[] = [
    { table: 'projects', column: 'info_analysis_result', sql: 'JSON NULL DEFAULT NULL' },
    { table: 'projects', column: 'design_plan_result', sql: 'JSON NULL DEFAULT NULL' },
    { table: 'projects', column: 'prompt_gen_mother_prompt', sql: 'LONGTEXT NULL DEFAULT NULL' },
    { table: 'projects', column: 'joint_gen_instruction', sql: 'LONGTEXT NULL DEFAULT NULL' },
    { table: 'projects', column: 'screen_count', sql: 'INT NOT NULL DEFAULT 8' },
    { table: 'projects', column: 'selling_points', sql: 'TEXT NULL' },
    { table: 'projects', column: 'target_audience', sql: "VARCHAR(500) NOT NULL DEFAULT ''" },
    { table: 'projects', column: 'price_range', sql: "VARCHAR(100) NOT NULL DEFAULT ''" },
    { table: 'projects', column: 'design_requirements', sql: 'TEXT NULL' },
    { table: 'projects', column: 'category', sql: "VARCHAR(100) NOT NULL DEFAULT ''" },
    { table: 'projects', column: 'reference_style', sql: "VARCHAR(255) NOT NULL DEFAULT ''" },
    { table: 'projects', column: 'reference_image_urls', sql: 'JSON NULL DEFAULT NULL' },
    { table: 'projects', column: 'language', sql: "VARCHAR(20) NOT NULL DEFAULT 'zh-CN'" },
    { table: 'projects', column: 'material', sql: 'VARCHAR(255) NULL' },
    { table: 'projects', column: 'product_specs', sql: 'TEXT NULL' },
  ];

  for (const col of columns) {
    try {
      const [rows]: any = await sequelize.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        { replacements: [config.db.name, col.table, col.column] }
      );
      if (rows.length === 0) {
        await sequelize.query(
          `ALTER TABLE \`${col.table}\` ADD COLUMN \`${col.column}\` ${col.sql}`
        );
        console.log(`  ${c.yellow}+${c.reset} 已添加缺失列: ${c.cyan}${col.table}.${col.column}${c.reset}`);
      }
    } catch (err: any) {
      console.log(`  ${c.red}✗${c.reset} 添加列 ${col.table}.${col.column} 失败: ${err.message}`);
    }
  }
}

async function start() {
  banner();

  try {
    // 连接数据库
    await sequelize.authenticate();
    statusLine('🗄️', 'MySQL', `${config.db.host}:${config.db.port}/${config.db.name}`);

    // 同步表结构
    if (config.nodeEnv === 'development') {
      const shouldForceSync = process.env.FORCE_DB_SYNC === 'true';
      
      if (shouldForceSync) {
        console.log(`  ${c.yellow}${c.bold}⚠️  强制同步模式${c.reset} - 将清空所有数据！`);
        await sequelize.sync({ force: true });
        statusLine('📋', '表结构', `${c.red}已重建（数据已清空）${c.reset}`);
      } else {
        // 安全模式：确保表存在（不丢数据），再检测并添加缺失的列
        await sequelize.sync();
        await safeMigrateColumns();
        statusLine('📋', '表结构', '已确保表存在并补全缺失列');
      }
    }

    divider();

    // 预加载提示词
    initPrompts();
    const prompts = listPrompts();
    for (const p of prompts) {
      const emoji = p.meta.emoji || '📝';
      const name = p.meta.name || p.id;
      statusLine(emoji, `提示词[${p.id}]`, name, c.cyan);
    }

    // AI 模型状态（动态从 adapter 获取）
    statusLine('🤖', 'LLM', `${LLM_MODEL_NAME} (${LLM_PROVIDER_LABEL})`, c.cyan);
    statusLine('🎨', '生图', `${IMAGE_MODEL_NAME} (${IMAGE_PROVIDER_LABEL}) · 兜底 ${IMAGE_FALLBACK_MODEL_NAME}`, c.cyan);
    statusLine('✏️ ', '图改', `${IMAGE_EDIT_MODEL_NAME} (${IMAGE_EDIT_PROVIDER_LABEL})`, c.cyan);
    statusLine('📁', '上传', path.resolve(config.upload.dir));

    divider();

    // 启动 HTTP 服务
    app.listen(config.port, () => {
      statusLine('🚀', '服务地址', `http://localhost:${config.port}`, c.green);
      statusLine('❤️ ', '健康检查', `http://localhost:${config.port}/api/health`);
      statusLine('🌐', '环境', config.nodeEnv, c.yellow);
      divider();
      console.log(`  ${c.green}${c.bold}✔ 后端服务已就绪${c.reset}  ${c.dim}前端: http://localhost:5173${c.reset}`);
      console.log('');

      // 当前端首次请求时打印首次通信日志（方便调试）
      setFirstRequestCallback(() => {
        console.log(`  ${c.dim}[首次 API 请求已接收 — 前后端通信正常]${c.reset}`);
      });
    });
  } catch (err: any) {
    console.log('');
    console.log(`  ${c.red}${c.bold}✘ 启动失败${c.reset}`);
    console.log('');

    if (err.original?.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log(`  ${c.yellow}原因:${c.reset}  MySQL 认证失败 — 请检查 ${c.bold}backend/.env${c.reset} 中的 ${c.cyan}DB_PASSWORD${c.reset}`);
      console.log(`  ${c.dim}提示: 确保 DB_USER / DB_PASSWORD 与 MySQL 账户一致${c.reset}`);
    } else if (err.original?.code === 'ECONNREFUSED') {
      console.log(`  ${c.yellow}原因:${c.reset}  无法连接 MySQL — 请确认 MySQL 服务已启动`);
      console.log(`  ${c.dim}提示: 运行 ${c.bold}net start mysql${c.reset} (Windows) 或 ${c.bold}sudo systemctl start mysql${c.reset} (Linux)`);
    } else if (err.original?.code === 'ER_BAD_DB_ERROR') {
      console.log(`  ${c.yellow}原因:${c.reset}  数据库 ${c.bold}${config.db.name}${c.reset} 不存在`);
      console.log(`  ${c.dim}提示: 请先创建数据库 ${c.bold}CREATE DATABASE ${config.db.name};${c.reset}`);
    } else {
      console.log(`  ${c.red}${err.message || err}${c.reset}`);
    }
    console.log('');
    process.exit(1);
  }
}

start();
