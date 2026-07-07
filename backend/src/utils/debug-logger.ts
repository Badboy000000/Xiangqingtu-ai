import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config';

/**
 * 按项目ID分类的调试日志工具
 *
 * 目录结构：uploads/debug-logs/{projectId}/{filename}
 * 用途：保存每个工作流节点的大模型输入输出，便于后期按项目ID溯源定位问题
 */

/**
 * 获取指定项目的调试日志目录路径（不创建目录）
 */
export function getDebugLogDir(projectId: string): string {
  return path.join(config.upload.dir, 'debug-logs', projectId);
}

/**
 * 保存调试日志到 Markdown 文件，按项目ID分目录存储
 *
 * @param projectId - 项目ID，用于创建子目录分类
 * @param filename  - 文件名（如 node1-image-analysis-0-input.md）
 * @param content   - 文件内容（Markdown 格式）
 */
export function saveDebugLog(projectId: string, filename: string, content: string): void {
  const debugDir = getDebugLogDir(projectId);
  if (!fs.existsSync(debugDir)) {
    fs.mkdirSync(debugDir, { recursive: true });
  }
  const filePath = path.join(debugDir, filename);
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`[DEBUG] Saved to ${filePath}`);
}

/**
 * 列出指定项目的所有调试日志文件
 *
 * @param projectId - 项目ID
 * @returns 文件名列表，目录不存在时返回空数组
 */
export function listDebugLogs(projectId: string): string[] {
  const debugDir = getDebugLogDir(projectId);
  if (!fs.existsSync(debugDir)) return [];
  return fs.readdirSync(debugDir).filter(f => f.endsWith('.md'));
}
