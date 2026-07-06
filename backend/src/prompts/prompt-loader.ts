import fs from 'fs';
import path from 'path';

/**
 * 提示词加载器
 * 从 files/ 目录读取 .md 提示词文件（九基石 Agent 架构法）
 * 支持 YAML 元数据解析、变量替换和启动缓存
 */

const PROMPTS_DIR = resolvePromptsDir();

/**
 * 解析提示词目录路径
 * 开发环境(tsx): src/prompts/files/
 * 生产环境(tsc): dist/prompts/files/ → 回退到 src/prompts/files/
 */
function resolvePromptsDir(): string {
  const localDir = path.join(__dirname, 'files');
  if (fs.existsSync(localDir)) return localDir;
  // 生产环境：从 dist/prompts/ 回退到 src/prompts/files/
  const srcDir = path.join(__dirname, '..', '..', 'src', 'prompts', 'files');
  if (fs.existsSync(srcDir)) return srcDir;
  throw new Error(`[PromptLoader] 找不到提示词目录，已尝试: ${localDir}, ${srcDir}`);
}

// 启动时一次性加载并缓存所有提示词
const promptCache = new Map<string, string>();

/**
 * 初始化：启动时预加载所有 .md 文件到内存
 */
export function initPrompts(): void {
  const files = fs.readdirSync(PROMPTS_DIR).filter(f => f.endsWith('.md'));
  for (const file of files) {
    const name = path.basename(file, '.md');
    const content = fs.readFileSync(path.join(PROMPTS_DIR, file), 'utf-8').trimEnd();
    promptCache.set(name, content);
  }
  console.log(`[PromptLoader] 已加载 ${promptCache.size} 个提示词: ${[...promptCache.keys()].join(', ')}`);

  // 同时解析所有元数据
  for (const name of promptCache.keys()) {
    const content = promptCache.get(name)!;
    const { meta } = parseFrontmatter(content);
    metaCache.set(name, meta);
  }
}

// ─── YAML Frontmatter 解析 ──────────────────────────────────

interface PromptMeta {
  name?: string;
  description?: string;
  emoji?: string;
  vibe?: string;
  color?: string;
  [key: string]: string | undefined;
}

const metaCache = new Map<string, PromptMeta>();

/**
 * 从 .md 文件内容中提取 YAML Frontmatter 元数据
 */
function parseFrontmatter(content: string): { meta: PromptMeta; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };

  const meta: PromptMeta = {};
  const yamlBlock = match[1];
  for (const line of yamlBlock.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (key && value) meta[key] = value;
    }
  }
  return { meta, body: match[2].trimStart() };
}

/**
 * 获取提示词的元数据（name/description/emoji/vibe 等）
 * @param name 提示词文件名（不含 .md 后缀）
 */
export function loadPromptMeta(name: string): PromptMeta {
  const cached = metaCache.get(name);
  if (cached) return cached;

  const content = promptCache.get(name);
  if (!content) throw new Error(`[PromptLoader] 提示词 ${name} 未加载，请先调用 initPrompts()`);

  const { meta } = parseFrontmatter(content);
  metaCache.set(name, meta);
  return meta;
}

/**
 * 获取所有已加载提示词的元数据摘要
 */
export function listPrompts(): Array<{ id: string; meta: PromptMeta }> {
  return [...promptCache.keys()].map(id => ({
    id,
    meta: loadPromptMeta(id),
  }));
}

// ─── 核心加载与变量替换 ──────────────────────────────────

/**
 * 获取提示词，支持变量替换
 * 返回完整内容（含 YAML Frontmatter），供 LLM 作为系统提示词使用
 * @param name 提示词文件名（不含 .md 后缀），如 'node1-system'
 * @param vars 可选的变量映射，将 {key} 替换为 value
 */
export function loadPrompt(name: string, vars?: Record<string, string | number>): string {
  let content = promptCache.get(name);

  if (!content) {
    // 缓存未命中时尝试从磁盘读取（支持热更新场景）
    const filePath = path.join(PROMPTS_DIR, `${name}.md`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`[PromptLoader] 提示词文件不存在: ${filePath}`);
    }
    content = fs.readFileSync(filePath, 'utf-8').trimEnd();
    promptCache.set(name, content);
    console.log(`[PromptLoader] 动态加载并缓存: ${name}`);
  }

  // 变量替换：将 {key} 替换为对应值
  if (vars) {
    for (const [key, value] of Object.entries(vars)) {
      content = content!.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    }
  }

  return content!;
}
