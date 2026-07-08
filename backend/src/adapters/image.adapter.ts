import { config } from '../config';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

// ─── 平台尺寸映射 ──────────────────────────────────────────
export const PLATFORM_SIZE_MAP = {
  domestic: { apiSize: '790*1400', targetWidth: 790, targetHeight: 1400 },
  overseas: { apiSize: '1464*600', targetWidth: 1464, targetHeight: 600 },
} as const;

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

/** 首次生图主模型名称（供启动日志等外部引用） */
export const IMAGE_MODEL_NAME = 'gpt-image-2';
/** 首次生图服务平台标签 */
export const IMAGE_PROVIDER_LABEL = '柴犬 · ChatGPT-img';
/** 图片编辑模型名称（用于「修改图」场景） */
export const IMAGE_EDIT_MODEL_NAME = process.env.BAILIAN_IMAGE_EDIT_MODEL || 'qwen-image-edit-plus';
/** 图片编辑服务平台标签 */
export const IMAGE_EDIT_PROVIDER_LABEL = '阿里百炼';
/** 首次生图兜底模型名称（主模型失败时降级使用） */
export const IMAGE_FALLBACK_MODEL_NAME = process.env.BAILIAN_IMAGE_MODEL || 'wan2.7-image-pro';

// ─── 图片尺寸校验与裁剪 ──────────────────────────────────────

/**
 * 带重试的文件写入（应对 Windows 上文件句柄延迟释放）
 * writeFileSync 可安全覆盖已存在文件，但若仍有残留句柄则需短暂等待后重试
 */
async function writeBufferWithRetry(
  filePath: string,
  data: Buffer,
  maxRetries = 3,
): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      fs.writeFileSync(filePath, data);
      return;
    } catch (err: any) {
      const isRetryable = err.code === 'EPERM' || err.code === 'EBUSY' || err.code === 'ENOENT';
      if (attempt < maxRetries && isRetryable) {
        console.warn(`[文件写入] 第${attempt}次写入失败(${err.code})，${100 * attempt}ms后重试...`);
        await new Promise(resolve => setTimeout(resolve, 100 * attempt));
        continue;
      }
      throw err;
    }
  }
}

/**
 * 校验生成图片尺寸，不匹配时裁剪到目标尺寸
 * @param localPath 本地图片路径（绝对路径或 /uploads/ 开头的相对路径）
 * @param targetWidth 目标宽度
 * @param targetHeight 目标高度
 * @returns 处理后的本地路径（原路径或裁剪后覆盖写入的同一路径）
 */
export async function validateAndCropImage(
  localPath: string,
  targetWidth: number,
  targetHeight: number,
): Promise<string> {
  // 解析 /uploads/ 相对路径为绝对路径
  let absolutePath = localPath;
  if (localPath.startsWith('/uploads/')) {
    const uploadsDir = path.resolve(__dirname, '..', '..', config.upload.dir);
    absolutePath = path.join(uploadsDir, localPath.substring('/uploads/'.length));
  }

  const metadata = await sharp(absolutePath).metadata();
  const { width, height } = metadata;

  if (width === targetWidth && height === targetHeight) {
    console.log(`[尺寸校验] 图片尺寸已匹配 ${targetWidth}x${targetHeight}，跳过裁剪`);
    return localPath;
  }

  console.log(`[尺寸校验] 实际尺寸 ${width}x${height}，目标 ${targetWidth}x${targetHeight}，执行裁剪`);

  // 使用 toBuffer + writeFileSync 替代 toFile(.tmp) + renameSync
  // Windows 上 renameSync 覆盖已存在文件时，若句柄未完全释放会抛 EPERM/ENOENT
  // 改为先将裁剪结果读入内存 Buffer，再用 writeFileSync 原地覆盖写入
  const processedBuffer = await sharp(absolutePath)
    .resize(targetWidth, targetHeight, { fit: 'cover', position: 'centre' })
    .toBuffer();

  await writeBufferWithRetry(absolutePath, processedBuffer);

  console.log(`[尺寸校验] 裁剪完成 → ${targetWidth}x${targetHeight}`);
  return localPath;
}

// ─── 百炼 API 限流控制 ───────────────────────────────────────

/**
 * 百炼图像模型限流映射
 * 根据模型名称返回最小调用间隔（毫秒）
 * - pro / max 系列（如 wan2.7-image-pro）：2次/分钟 → 间隔 30 秒
 * - qwen-image / qwen-image-2.0 / plus / edit-plus：2次/秒 → 间隔 500ms
 * - qwen-mt-image：1次/秒 → 间隔 1000ms
 */
function getModelRateLimitMs(model: string): number {
  if (model.includes('mt-image')) return 1_000;
  if (model.includes('pro') || model.includes('max')) return 30_000;
  return 500;
}

// 限流队列：通过 Promise 链序列化并发调用，确保多 worker 不会同时绕过限流检查
let rateLimitChain: Promise<void> = Promise.resolve();
let lastApiCallTime = 0;

/**
 * 限流等待：确保两次 API 调用间隔满足模型限流要求
 * 使用 Promise 链序列化并发 worker，避免多 worker 同时读取 lastApiCallTime 后一起放行
 */
async function enforceRateLimit(model: string): Promise<void> {
  const minInterval = getModelRateLimitMs(model);
  const prev = rateLimitChain;
  let release!: () => void;
  rateLimitChain = new Promise<void>(r => { release = r; });

  try {
    await prev;
    const now = Date.now();
    const elapsed = now - lastApiCallTime;
    if (elapsed < minInterval) {
      const waitMs = minInterval - elapsed;
      console.log(`[限流] ${model} 最小间隔 ${minInterval}ms，等待 ${waitMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
    lastApiCallTime = Date.now();
  } finally {
    release();
  }
}

// ─── 阿里百炼 wan2.7-image-pro (同步 API) ────────────────────

/**
 * 构建参考图顺序绑定声明
 * 在图片数组和文本提示词之间注入一条显式映射声明，
 * 让模型明确知道 content[0] = 图1、content[1] = 图2 ...
 *
 * 示例输出："以下参考图按顺序依次为：图1(原索引0)，图2(原索引2)。后续指令中用"图N"引用对应图片。"
 */
function buildOrderDeclaration(imageCount: number, referenceIndices?: number[]): string | null {
  if (imageCount === 0) return null;

  const labels = Array.from({ length: imageCount }, (_, i) => {
    const seqNum = i + 1; // 顺序编号从 1 开始
    const origIdx = referenceIndices?.[i];
    const originNote = origIdx !== undefined ? `(原索引${origIdx})` : '';
    return `图${seqNum}${originNote}`;
  });

  return `以下参考图按顺序依次为：${labels.join('，')}。后续指令中用"图N"引用对应图片。`;
}

/**
 * 阿里百炼 wan2.7-image-pro 文生图 / 图生图（同步调用）
 *
 * API 协议与 OpenAI 不同：
 *   - 端点：POST {baseUrl}/generation
 *   - 请求体：{ model, input: { messages: [{ role, content }] }, parameters: { size, n, watermark } }
 *   - 响应体：{ output: { choices: [{ message: { content: [{ image, type }] } }] } }
 *
 * @see https://help.aliyun.com/zh/model-studio/wan-image-generation-api-reference
 */
export async function generateWithQwenImage(params: {
  prompt: string;
  referenceImages?: string[];  // 本地路径或 URL（最多 9 张）
  referenceIndices?: number[]; // 每张参考图的原始 0-based 索引，用于构建顺序声明
  size?: string;               // 如 "1024*1792" (9:16) 或 "2K"
  n?: number;                  // 生成张数，最多 6
  watermark?: boolean;
}): Promise<ImageGenResult[]> {
  // 构建 content 数组：参考图在前，文本在后
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

  // 将顺序绑定声明与提示词合并为单个 text 项
  // wan2.7 API 要求最后一条消息只能有1个文本内容项
  const declaration = (params.referenceImages && params.referenceImages.length > 0)
    ? buildOrderDeclaration(params.referenceImages.length, params.referenceIndices)
    : null;
  const combinedText = declaration
    ? `${declaration}\n\n${params.prompt}`
    : params.prompt;
  content.push({ text: combinedText });

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

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // 限流等待：确保两次 API 调用间隔满足模型限流要求
    await enforceRateLimit(config.bailianImage.model);

    const response = await fetch(`${config.bailianImage.baseUrl}/generation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.bailianImage.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    // 429 限流：指数退避后重试
    if (response.status === 429) {
      const waitMs = 5000 * attempt;
      console.warn(`[百炼] 第${attempt}次调用触发限流(429)，${waitMs}ms后重试...`);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, waitMs));
        continue;
      }
      throw new Error(`阿里百炼 qwen-image 限流(429)，已重试${maxRetries}次仍失败`);
    }

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

  throw new Error('阿里百炼 qwen-image 调用失败：重试次数用尽');
}

// ─── 阿里百炼 qwen-image-edit-plus (图片编辑，同步 API) ────────

/**
 * 阿里百炼 qwen-image-edit-plus 图片编辑（同步调用）
 *
 * 与 wan2.7 共用端点和请求格式，区别在于：
 * - 必须传入 baseImage 作为待编辑的原图（放在 content 数组首位）
 * - editPrompt 描述"如何修改"，而非"生成什么"
 * - 限流更宽松（2次/秒），落入默认 500ms 分支
 *
 * @see https://help.aliyun.com/zh/model-studio/qwen-image-edit
 */
export async function generateWithQwenImageEdit(params: {
  baseImage: string;             // 待编辑的原图（本地路径或 URL）
  editPrompt: string;            // 修改描述
  extraReferences?: string[];    // 可选：额外参考图（如风格图）
  size?: string;                 // 目标尺寸
  n?: number;
  watermark?: boolean;
}): Promise<ImageGenResult[]> {
  // content: [原图, ...额外参考图, 修改指令]
  const content: Array<Record<string, string>> = [];

  const baseImageEncoded = await imageToCompressedBase64Url(params.baseImage);
  content.push({ image: baseImageEncoded });

  if (params.extraReferences?.length) {
    const extras = await Promise.all(
      params.extraReferences.map(img => imageToCompressedBase64Url(img))
    );
    extras.forEach(img => content.push({ image: img }));
  }

  content.push({ text: params.editPrompt });

  const body = {
    model: config.bailianImage.editModel,
    input: {
      messages: [
        {
          role: 'user',
          content,
        },
      ],
    },
    parameters: {
      size: params.size || '1024*1792',
      n: params.n || 1,
      watermark: params.watermark ?? false,
    },
  };

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    await enforceRateLimit(config.bailianImage.editModel);

    const response = await fetch(`${config.bailianImage.baseUrl}/generation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.bailianImage.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (response.status === 429) {
      const waitMs = 2000 * attempt;
      console.warn(`[百炼编辑] 第${attempt}次调用触发限流(429)，${waitMs}ms后重试...`);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, waitMs));
        continue;
      }
      throw new Error(`阿里百炼 qwen-image-edit 限流(429)，已重试${maxRetries}次仍失败`);
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`阿里百炼 qwen-image-edit 编辑失败: ${response.status} - ${errText}`);
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

    if (data.code) {
      throw new Error(`阿里百炼 qwen-image-edit 业务错误: ${data.code} - ${data.message}`);
    }

    const imageUrls: string[] = [];
    for (const choice of data.output.choices) {
      for (const item of choice.message.content) {
        if (item.image) imageUrls.push(item.image);
      }
    }

    return imageUrls.map(url => ({ url }));
  }

  throw new Error('阿里百炼 qwen-image-edit 调用失败：重试次数用尽');
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

// ─── GPT Image 2 (Lino 平台 同步 API) ──────────────────────

/**
 * GPT Image 2 同步生图（Lino 平台）
 * 直接返回结果，无需轮询
 * 注：Lino 的 gpt-image-2 返回 b64_json（无 url 字段），本函数会拼成 data URL
 *     统一交给下游 downloadImage 处理（Node 22 fetch 原生支持 data: 协议）
 */
export async function generateWithGPTImage2(params: {
  prompt: string;
  size?: string;
  n?: number;
}): Promise<ImageGenResult[]> {
  const response = await fetch(`${config.lino.baseUrl}/v1/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${config.lino.apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-image-2',
      prompt: params.prompt,
      size: params.size || '1024x1536',
      n: params.n || 1,
      quality: 'auto',
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`GPT Image 2 生图失败: ${response.status} - ${errText}`);
  }

  const data = await response.json() as {
    data: Array<{ url?: string; b64_json?: string; revised_prompt?: string }>;
  };
  return data.data.map(item => ({
    url: item.url || (item.b64_json ? `data:image/png;base64,${item.b64_json}` : ''),
  }));
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
