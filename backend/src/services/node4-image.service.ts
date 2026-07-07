import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config';
import {
  generateWithSeedream,
  generateWithGPTImage2,
  generateWithQwenImage,
  PLATFORM_SIZE_MAP,
  validateAndCropImage,
} from '../adapters/image.adapter';
import type { ImageGenResult } from '../adapters/image.adapter';

/**
 * 下载远程图片到本地 uploads/{projectId} 目录，按规范命名
 */
async function downloadImage(params: {
  url: string;
  projectId: string;
  screenLabel: string;
  versionNumber: number;
}): Promise<string> {
  const { url, projectId, screenLabel: rawLabel, versionNumber } = params;
  // 净化 screenLabel：移除文件系统非法字符
  const screenLabel = rawLabel.replace(/[\\/:*?"<>|]/g, '').trim() || `屏${params.versionNumber}`;
  const projectDir = path.join(config.upload.dir, projectId);
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }

  const ext = url.includes('.png') ? 'png' : 'jpg';
  // 文件名始终带版本号，确保唯一性，不会覆盖旧版本
  let filename: string;
  if (versionNumber === 1) {
    filename = `${projectId}_${screenLabel}_V1.0_生成图.${ext}`;
  } else {
    filename = `${projectId}_${screenLabel}_V${versionNumber}.0_修改图.${ext}`;
  }
  const filePath = path.join(projectDir, filename);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`图片下载失败: ${url}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  return `/uploads/${projectId}/${filename}`;
}

/**
 * 节点4: 单屏生图（主方案：阿里百炼 qwen-image-2.0）
 */
export async function generateScreenImage(params: {
  prompt: string;
  referenceImages?: string[];
  screenIndex: number;
  projectId: string;
  screenLabel: string;
  versionNumber: number;
  platform?: 'domestic' | 'overseas';
}): Promise<{ imageUrl: string; originalUrl: string }> {
  const platform = params.platform || 'domestic';
  const { apiSize, targetWidth, targetHeight } = PLATFORM_SIZE_MAP[platform];

  const results: ImageGenResult[] = await generateWithQwenImage({
    prompt: params.prompt,
    referenceImages: params.referenceImages,
    size: apiSize,
    watermark: false,
  });

  if (!results.length || !results[0].url) {
    throw new Error('图像生成返回空结果');
  }

  // 下载图片到本地项目子目录
  const localPath = await downloadImage({
    url: results[0].url,
    projectId: params.projectId,
    screenLabel: params.screenLabel,
    versionNumber: params.versionNumber,
  });

  // 校验尺寸并裁剪到平台标准尺寸
  await validateAndCropImage(localPath, targetWidth, targetHeight);

  return {
    imageUrl: localPath,
    originalUrl: results[0].url,
  };
}

/**
 * 备选方案 A: Seedream 5.0 生图（火山引擎，已停用，保留备用）
 */
export async function generateScreenImageSeedream(params: {
  prompt: string;
  referenceImages?: string[];
  screenIndex: number;
  projectId: string;
  screenLabel: string;
  versionNumber: number;
}): Promise<{ imageUrl: string; originalUrl: string }> {
  const results: ImageGenResult[] = await generateWithSeedream({
    prompt: params.prompt,
    referenceImages: params.referenceImages,
    size: '1600x2848', // 9:16 ratio ≈ 750:1500
    outputFormat: 'png',
    watermark: false,
  });

  if (!results.length || !results[0].url) {
    throw new Error('Seedream 图像生成返回空结果');
  }

  const localPath = await downloadImage({
    url: results[0].url,
    projectId: params.projectId,
    screenLabel: params.screenLabel,
    versionNumber: params.versionNumber,
  });

  return {
    imageUrl: localPath,
    originalUrl: results[0].url,
  };
}

/**
 * 备选方案: GPT Image 2 生图（柴犬平台同步 API）
 */
export async function generateScreenImageFallback(params: {
  prompt: string;
  screenIndex: number;
  projectId: string;
  screenLabel: string;
  versionNumber: number;
  platform?: 'domestic' | 'overseas';
}): Promise<{ imageUrl: string; originalUrl: string }> {
  const platform = params.platform || 'domestic';
  const { targetWidth, targetHeight } = PLATFORM_SIZE_MAP[platform];

  // GPT Image 2 使用与平台标准一致的尺寸
  const gptSize = platform === 'overseas' ? '1464x600' : '790x1400';

  const results = await generateWithGPTImage2({
    prompt: params.prompt,
    size: gptSize,
  });

  if (!results.length) {
    throw new Error('GPT Image 2 生成返回空结果');
  }

  const localPath = await downloadImage({
    url: results[0].url,
    projectId: params.projectId,
    screenLabel: params.screenLabel,
    versionNumber: params.versionNumber,
  });

  // 校验尺寸并裁剪到平台标准尺寸
  await validateAndCropImage(localPath, targetWidth, targetHeight);

  return {
    imageUrl: localPath,
    originalUrl: results[0].url,
  };
}

/**
 * 智能生图：qwen-image 优先，失败时自动降级 GPT Image 2
 */
export async function generateScreenImageSmart(params: {
  prompt: string;
  referenceImages?: string[];
  screenIndex: number;
  projectId: string;
  screenLabel: string;
  versionNumber: number;
  platform?: 'domestic' | 'overseas';
}): Promise<{ imageUrl: string; originalUrl: string }> {
  try {
    console.log(`[Node4] 屏${params.screenIndex} 尝试阿里百炼 qwen-image 生图...`);
    const result = await generateScreenImage(params);
    console.log(`[Node4] 屏${params.screenIndex} qwen-image 生图成功`);
    return result;
  } catch (err: any) {
    const errMsg = err.message || '';
    console.warn(`[Node4] 屏${params.screenIndex} qwen-image 失败: ${errMsg}`);

    // 尝试 GPT Image 2 兜底
    try {
      console.warn(`[Node4] 屏${params.screenIndex} 自动切换 GPT Image 2 重试...`);
      const result = await generateScreenImageFallback({
        prompt: params.prompt,
        screenIndex: params.screenIndex,
        projectId: params.projectId,
        screenLabel: params.screenLabel,
        versionNumber: params.versionNumber,
        platform: params.platform,
      });
      console.log(`[Node4] 屏${params.screenIndex} GPT Image 2 生图成功`);
      return result;
    } catch (fallbackErr: any) {
      console.error(`[Node4] 屏${params.screenIndex} GPT Image 2 也失败: ${fallbackErr.message}`);
      throw new Error(`所有生图方案均失败: qwen-image: ${errMsg}, GPT Image 2: ${fallbackErr.message}`);
    }
  }
}
