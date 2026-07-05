import { config } from '../config';
import * as fs from 'fs';
import * as path from 'path';

export interface ImageGenResult {
  url: string;
  size?: string;
}

/**
 * 将本地图片转为 base64 data URL (用于 Seedream image 参数)
 */
function imageToBase64Url(filePath: string): string {
  if (filePath.startsWith('http')) return filePath;

  // 解析 /uploads/ 相对路径为绝对路径
  let absolutePath = filePath;
  if (filePath.startsWith('/uploads/')) {
    const uploadsDir = path.resolve(__dirname, '..', '..', config.upload.dir);
    absolutePath = path.join(uploadsDir, filePath.substring('/uploads/'.length));
  }

  const ext = path.extname(absolutePath).toLowerCase().replace('.', '');
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg',
    png: 'image/png', webp: 'image/webp',
  };
  const mime = mimeMap[ext] || 'image/png';
  const data = fs.readFileSync(absolutePath);
  return `data:${mime};base64,${data.toString('base64')}`;
}

// ─── Seedream 5.0 (火山引擎) ─────────────────────────────

/**
 * Seedream 5.0 文生图 / 图生图
 */
export async function generateWithSeedream(params: {
  prompt: string;
  referenceImages?: string[];  // 本地路径或 URL
  size?: string;               // 如 "1600x2848" (9:16)
  outputFormat?: 'png' | 'jpeg';
  watermark?: boolean;
}): Promise<ImageGenResult[]> {
  const body: Record<string, unknown> = {
    model: 'doubao-seedream-5-0-260128',
    prompt: params.prompt,
    size: params.size || '1600x2848',
    output_format: params.outputFormat || 'png',
    response_format: 'url',
    watermark: params.watermark ?? false,
  };

  // 参考图
  if (params.referenceImages && params.referenceImages.length > 0) {
    const images = params.referenceImages.map(img => imageToBase64Url(img));
    body.image = images.length === 1 ? images[0] : images;
  }

  const response = await fetch(`${config.ark.baseUrl}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.ark.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Seedream 生成失败: ${response.status} - ${errText}`);
  }

  const data = await response.json() as { data: Array<{ url: string; size?: string }> };
  return data.data.map((item: { url: string; size?: string }) => ({
    url: item.url,
    size: item.size,
  }));
}

// ─── GPT Image 2 (胜算云 Tasks API) ──────────────────────

/**
 * GPT Image 2 - 提交生成任务
 */
export async function generateWithGPTImage2(params: {
  prompt: string;
  size?: string;
  n?: number;
}): Promise<string> {
  const response = await fetch(`${config.ssy.baseUrl}/tasks/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.ssy.apiKey}`,
    },
    body: JSON.stringify({
      model: 'openai/gpt-image-2',
      prompt: params.prompt,
      size: params.size || '1024x1536',
      n: params.n || 1,
      quality: 'auto',
      background: 'auto',
      moderation: 'auto',
      output_compression: 100,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`GPT Image 2 任务提交失败: ${response.status} - ${errText}`);
  }

  const data = await response.json() as { request_id?: string; id?: string };
  return data.request_id || data.id || '';
}

/**
 * GPT Image 2 - 查询任务结果
 */
export async function queryGPTImage2Task(requestId: string): Promise<ImageGenResult[] | null> {
  const response = await fetch(`${config.ssy.baseUrl}/tasks/generations/${requestId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${config.ssy.apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`GPT Image 2 任务查询失败: ${response.status}`);
  }

  const data = await response.json() as {
    status?: string;
    data?: Array<{ url: string }>;
  };

  if (data.status === 'completed' && data.data) {
    return data.data.map((item: { url: string }) => ({ url: item.url }));
  }

  return null; // 未完成
}

/**
 * GPT Image 2 - 轮询等待结果
 */
export async function waitForGPTImage2(
  requestId: string,
  maxAttempts = 30,
  intervalMs = 5000,
): Promise<ImageGenResult[]> {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await queryGPTImage2Task(requestId);
    if (result) return result;
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  throw new Error('GPT Image 2 生成超时');
}
