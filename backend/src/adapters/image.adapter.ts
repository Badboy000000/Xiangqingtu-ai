import { config } from '../config';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

export interface ImageGenResult {
  url: string;
  size?: string;
}

/**
 * 将本地图片压缩后转为 base64 data URL (用于生图模型的 image 参数)
 * - 最长边缩至 1024px（保持比例）
 * - 输出 JPEG quality=80
 * 原始 10-17MB 参考图可压缩至 ~100-300KB，避免 413 错误
 */
async function imageToCompressedBase64Url(filePath: string): Promise<string> {
  if (filePath.startsWith('http')) return filePath;

  // 解析 /uploads/ 相对路径为绝对路径
  let absolutePath = filePath;
  if (filePath.startsWith('/uploads/')) {
    const uploadsDir = path.resolve(__dirname, '..', '..', config.upload.dir);
    absolutePath = path.join(uploadsDir, filePath.substring('/uploads/'.length));
  }

  const compressedBuffer = await sharp(absolutePath)
    .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();

  return `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;
}

/** 当前图像生成模型名称（供启动日志等外部引用） */
export const IMAGE_MODEL_NAME = process.env.BAILIAN_IMAGE_MODEL || 'qwen-image-2.0-2026-03-03';
/** 当前图像生成服务平台标签 */
export const IMAGE_PROVIDER_LABEL = '阿里百炼';

// ─── 阿里百炼 qwen-image (同步 API) ────────────────────

/**
 * 阿里百炼 qwen-image-2.0 系列 文生图 / 图生图（同步调用）
 *
 * API 协议与 OpenAI 不同：
 *   - 端点：POST {baseUrl}/generation
 *   - 请求体：{ model, input: { messages: [{ role, content }] }, parameters: { size, n, watermark } }
 *   - 响应体：{ output: { choices: [{ message: { content: [{ image, type }] } }] } }
 *
 * @see https://help.aliyun.com/zh/model-studio/qwen-image-edit-guide
 */
export async function generateWithQwenImage(params: {
  prompt: string;
  referenceImages?: string[];  // 本地路径或 URL（最多 9 张）
  size?: string;               // 如 "1024*1792" (9:16) 或 "2K"
  n?: number;                  // 生成张数，最多 6
  watermark?: boolean;
}): Promise<ImageGenResult[]> {
  // 构建 content 数组：参考图在前，文本在后（百炼要求多图时按数组顺序定义）
  const content: Array<Record<string, string>> = [];

  // 参考图（压缩后再 base64 编码，避免请求体过大）
  if (params.referenceImages && params.referenceImages.length > 0) {
    const images = await Promise.all(
      params.referenceImages.map(img => imageToCompressedBase64Url(img))
    );
    images.forEach((img) => {
      content.push({ image: img });
    });
  }

  // 文本提示词
  content.push({ text: params.prompt });

  const body = {
    model: config.bailianImage.model,
    input: {
      messages: [
        {
          role: 'user',
          content,
        },
      ],
    },
    parameters: {
      size: params.size || '1024*1792',   // 9:16 ratio ≈ 750:1500
      n: params.n || 1,
      watermark: params.watermark ?? false,
    },
  };

  const response = await fetch(`${config.bailianImage.baseUrl}/generation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.bailianImage.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`阿里百炼 qwen-image 生成失败: ${response.status} - ${errText}`);
  }

  const data = await response.json() as {
    output: {
      choices: Array<{
        finish_reason: string;
        message: {
          role: string;
          content: Array<{ image?: string; type?: string; text?: string }>;
        };
      }>;
    };
    request_id?: string;
    code?: string;
    message?: string;
  };

  // 百炼同步调用可能返回业务错误（无 choices）
  if (data.code) {
    throw new Error(`阿里百炼 qwen-image 业务错误: ${data.code} - ${data.message}`);
  }

  const imageUrls: string[] = [];
  for (const choice of data.output.choices) {
    for (const item of choice.message.content) {
      // 百炼实际响应中可能没有 type 字段，直接检查 image 是否存在
      if (item.image) {
        imageUrls.push(item.image);
      }
    }
  }

  return imageUrls.map(url => ({ url }));
}

// ──────────────────────────────────────────────────────
// 以下为 Seedream (火山引擎) 方案（已停用，保留备用）
// 若需切换回 Seedream，在 service 层切换调用即可
// ──────────────────────────────────────────────────────

/**
 * Seedream 5.0 文生图 / 图生图（已停用，保留备用）
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

  // 参考图（压缩后再 base64 编码，避免请求体过大触发 413）
  if (params.referenceImages && params.referenceImages.length > 0) {
    const images = await Promise.all(
      params.referenceImages.map(img => imageToCompressedBase64Url(img))
    );
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

// ─── GPT Image 2 (柴犬平台 同步 API) ──────────────────────

/**
 * GPT Image 2 同步生图（柴犬平台）
 * 直接返回结果，无需轮询
 */
export async function generateWithGPTImage2(params: {
  prompt: string;
  size?: string;
  n?: number;
}): Promise<ImageGenResult[]> {
  const response = await fetch(`${config.chaiquan.baseUrl}/v1/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.chaiquan.apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-image-2',
      prompt: params.prompt,
      size: params.size || '1024x1536',
      n: params.n || 1,
      quality: 'auto',
      response_format: 'url',
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`GPT Image 2 生图失败: ${response.status} - ${errText}`);
  }

  const data = await response.json() as {
    data: Array<{ url: string; revised_prompt?: string }>;
  };
  return data.data.map(item => ({ url: item.url }));
}

// ──────────────────────────────────────────────────────
// 以下为胜算云异步轮询方案（已停用，保留备用）
// 若需切换回胜算云，取消下方注释并替换上方 generateWithGPTImage2
// ──────────────────────────────────────────────────────

/*
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

export async function queryGPTImage2Task(requestId: string): Promise<ImageGenResult[] | null> {
  const response = await fetch(`${config.ssy.baseUrl}/tasks/generations/${requestId}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${config.ssy.apiKey}` },
  });
  if (!response.ok) throw new Error(`GPT Image 2 任务查询失败: ${response.status}`);
  const data = await response.json() as { status?: string; data?: Array<{ url: string }> };
  if (data.status === 'completed' && data.data) {
    return data.data.map((item: { url: string }) => ({ url: item.url }));
  }
  return null;
}

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
*/
