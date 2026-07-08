import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config';
import {
  generateWithSeedream,
  generateWithGPTImage2,
  generateWithQwenImage,
  generateWithQwenImageEdit,
  PLATFORM_SIZE_MAP,
  validateAndCropImage,
} from '../adapters/image.adapter';
import type { ImageGenResult } from '../adapters/image.adapter';
import { saveDebugLog } from '../utils/debug-logger';

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
 * 节点4: 单屏生图（兜底方案：阿里百炼 wan2.7-image-pro）
 * 首次生图主链路已切换至 GPT Image 2，此函数仅用作 smart 分发失败时的降级
 */
export async function generateScreenImage(params: {
  prompt: string;
  referenceImages?: string[];
  referenceIndices?: number[];  // 每张参考图的原始 0-based 索引
  screenIndex: number;
  projectId: string;
  screenLabel: string;
  versionNumber: number;
  platform?: 'domestic' | 'overseas';
}): Promise<{ imageUrl: string; originalUrl: string }> {
  const platform = params.platform || 'domestic';
  const { apiSize, targetWidth, targetHeight } = PLATFORM_SIZE_MAP[platform];

  // [DEBUG] Save Node4 screen input to file
  const node4InputContent = `# Node4 Screen ${params.screenIndex + 1} Input (wan2.7)\n\n## Prompt\n\`\`\`\n${params.prompt}\n\`\`\`\n\n## Reference Images\n${params.referenceImages?.map((url, i) => `${i + 1}. ${url}${params.referenceIndices?.[i] !== undefined ? ` (原索引${params.referenceIndices[i]})` : ''}`).join('\n') || 'None'}\n\n## Metadata\n- projectId: ${params.projectId}\n- screenLabel: ${params.screenLabel}\n- versionNumber: ${params.versionNumber}\n- platform: ${platform}\n- apiSize: ${apiSize}\n- model: wan2.7-image-pro`;
  saveDebugLog(params.projectId, `node4-screen-${params.screenIndex + 1}-input.md`, node4InputContent);

  const results: ImageGenResult[] = await generateWithQwenImage({
    prompt: params.prompt,
    referenceImages: params.referenceImages,
    referenceIndices: params.referenceIndices,
    size: apiSize,
    watermark: false,
  });

  if (!results.length || !results[0].url) {
    throw new Error('图像生成返回空结果');
  }

  // [DEBUG] Save Node4 screen output to file
  const node4OutputContent = `# Node4 Screen ${params.screenIndex + 1} Output (wan2.7)\n\n## Generated Image URL\n\`\`\`\n${results[0].url}\n\`\`\``;
  saveDebugLog(params.projectId, `node4-screen-${params.screenIndex + 1}-output.md`, node4OutputContent);

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
 * 备选方案: GPT Image 2 生图（柴犬平台同步 API，当前首次生图主链路）
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

  // [DEBUG] Save GPT Image 2 input
  const gptInputContent = `# Node4 Screen ${params.screenIndex + 1} Input (GPT Image 2)\n\n## Prompt\n\`\`\`\n${params.prompt}\n\`\`\`\n\n## Metadata\n- projectId: ${params.projectId}\n- screenLabel: ${params.screenLabel}\n- versionNumber: ${params.versionNumber}\n- platform: ${platform}\n- apiSize: ${gptSize}\n- model: GPT Image 2`;
  saveDebugLog(params.projectId, `node4-screen-${params.screenIndex + 1}-input.md`, gptInputContent);

  const results = await generateWithGPTImage2({
    prompt: params.prompt,
    size: gptSize,
  });

  if (!results.length) {
    throw new Error('GPT Image 2 生成返回空结果');
  }

  // [DEBUG] Save GPT Image 2 output
  const gptOutputContent = `# Node4 Screen ${params.screenIndex + 1} Output (GPT Image 2)\n\n## Generated Image URL\n\`\`\`\n${results[0].url}\n\`\`\``;
  saveDebugLog(params.projectId, `node4-screen-${params.screenIndex + 1}-output.md`, gptOutputContent);

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
 * 智能生图：GPT Image 2 优先，失败时自动降级 wan2.7-image-pro
 * 注：referenceImages 只对 wan2.7 降级路径生效，GPT Image 2 走纯文生图
 */
export async function generateScreenImageSmart(params: {
  prompt: string;
  referenceImages?: string[];
  referenceIndices?: number[];  // 每张参考图的原始 0-based 索引
  screenIndex: number;
  projectId: string;
  screenLabel: string;
  versionNumber: number;
  platform?: 'domestic' | 'overseas';
}): Promise<{ imageUrl: string; originalUrl: string }> {
  try {
    console.log(`[Node4] 屏${params.screenIndex} 尝试 GPT Image 2 生图...`);
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
  } catch (err: any) {
    const errMsg = err.message || '';
    console.warn(`[Node4] 屏${params.screenIndex} GPT Image 2 失败: ${errMsg}`);

    // 兜底：wan2.7-image-pro
    try {
      console.warn(`[Node4] 屏${params.screenIndex} 自动切换 wan2.7 重试...`);
      const result = await generateScreenImage(params);
      console.log(`[Node4] 屏${params.screenIndex} wan2.7 生图成功`);
      return result;
    } catch (fallbackErr: any) {
      console.error(`[Node4] 屏${params.screenIndex} wan2.7 也失败: ${fallbackErr.message}`);
      throw new Error(`所有生图方案均失败: GPT Image 2: ${errMsg}, wan2.7: ${fallbackErr.message}`);
    }
  }
}

/**
 * 图片编辑：基于已生成图 + 修改描述，调用 qwen-image-edit-plus 生成新版本
 * 不做兜底 —— wan2.7/gpt-image-2 都没有语义"编辑"能力，兜底会给出违背用户期望的结果
 */
export async function editScreenImage(params: {
  baseImageUrl: string;   // 上一版本的图片路径（本地 /uploads/ 相对路径或 URL）
  editPrompt: string;     // 用户描述的修改意图
  screenIndex: number;
  projectId: string;
  screenLabel: string;
  versionNumber: number;
  platform?: 'domestic' | 'overseas';
}): Promise<{ imageUrl: string; originalUrl: string }> {
  const platform = params.platform || 'domestic';
  const { apiSize, targetWidth, targetHeight } = PLATFORM_SIZE_MAP[platform];

  // [DEBUG]
  const editInputContent = `# Node4 Edit Screen ${params.screenIndex + 1} Input\n\n## Base Image\n\`\`\`\n${params.baseImageUrl}\n\`\`\`\n\n## Edit Prompt\n\`\`\`\n${params.editPrompt}\n\`\`\`\n\n## Metadata\n- projectId: ${params.projectId}\n- screenLabel: ${params.screenLabel}\n- versionNumber: ${params.versionNumber}\n- platform: ${platform}\n- apiSize: ${apiSize}`;
  saveDebugLog(params.projectId, `node4-edit-screen-${params.screenIndex + 1}-input.md`, editInputContent);

  console.log(`[Node4-Edit] 屏${params.screenIndex} 调用 qwen-image-edit-plus...`);
  const results: ImageGenResult[] = await generateWithQwenImageEdit({
    baseImage: params.baseImageUrl,
    editPrompt: params.editPrompt,
    size: apiSize,
    watermark: false,
  });

  if (!results.length || !results[0].url) {
    throw new Error('图片编辑返回空结果');
  }

  const editOutputContent = `# Node4 Edit Screen ${params.screenIndex + 1} Output\n\n## Generated Image URL\n\`\`\`\n${results[0].url}\n\`\`\``;
  saveDebugLog(params.projectId, `node4-edit-screen-${params.screenIndex + 1}-output.md`, editOutputContent);

  const localPath = await downloadImage({
    url: results[0].url,
    projectId: params.projectId,
    screenLabel: params.screenLabel,
    versionNumber: params.versionNumber,
  });

  await validateAndCropImage(localPath, targetWidth, targetHeight);
  console.log(`[Node4-Edit] 屏${params.screenIndex} 编辑完成 → ${localPath}`);

  return {
    imageUrl: localPath,
    originalUrl: results[0].url,
  };
}
