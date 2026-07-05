import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config';
import { generateWithSeedream, generateWithGPTImage2, waitForGPTImage2 } from '../adapters/image.adapter';
import { chatCompletionJSON } from '../adapters/llm.adapter';
import { NODE4_SYSTEM_PROMPT } from '../prompts/system-prompts';
import type { ImageGenResult } from '../adapters/image.adapter';
import type { ChatMessage } from '../adapters/llm.adapter';
import type { Node3Output, Node4Output } from '../types';

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
 * 节点4前置步骤: 生成联合生图指令
 * 基于分屏提示词和参考图，通过 LLM 生成联合生图指令
 */
export async function generateJointInstructions(params: {
  node3Output: Node3Output;
  referenceImages?: string[];
}): Promise<Node4Output> {
  const { node3Output, referenceImages } = params;

  const userContent = `## 全局生图母提示词
${node3Output.globalMotherPrompt}

## 分屏生图提示词
${node3Output.screenPrompts.map(sp => `
### 第${sp.screenIndex}屏 - ${sp.label}
- 生成目标: ${sp.generationGoal}
- 核心视觉: ${sp.coreVisual}
- 构图策略: ${sp.compositionStrategy}
- 主体/道具: ${sp.subjectProps}
- 背景/风格: ${sp.bgStyle}
- 文字载体与层级: ${sp.textCarrierLevel}
- 产品角度/景别: ${sp.productAngle}
- 一致性约束: ${sp.consistencyConstraints}
- 平台规则: ${sp.platformRules}
- Prompt: ${sp.prompt}
`).join('\n')}

${referenceImages && referenceImages.length > 0 ? `## 参考图
${referenceImages.map((url, i) => `参考图${i + 1}: ${url}`).join('\n')}` : '## 参考图\n无参考图'}

请生成联合生图总指令和每屏的联合生图结果。`;

  const messages: ChatMessage[] = [
    { role: 'system', content: NODE4_SYSTEM_PROMPT },
    { role: 'user', content: userContent },
  ];

  return chatCompletionJSON<Node4Output>(messages, { temperature: 0.5 });
}

/**
 * 节点4: 单屏生图（Seedream 5.0）
 */
export async function generateScreenImage(params: {
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
    throw new Error('图像生成返回空结果');
  }

  // 下载图片到本地项目子目录
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
 * 备选方案: GPT Image 2 生图
 */
export async function generateScreenImageFallback(params: {
  prompt: string;
  screenIndex: number;
  projectId: string;
  screenLabel: string;
  versionNumber: number;
}): Promise<{ imageUrl: string; originalUrl: string }> {
  const requestId = await generateWithGPTImage2({
    prompt: params.prompt,
    size: '1024x1536',
  });

  const results = await waitForGPTImage2(requestId);
  if (!results.length) {
    throw new Error('GPT Image 2 生成返回空结果');
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
 * 智能生图：Seedream 优先，内容审核不通过时自动切换 GPT Image 2
 * - Seedream 便宜快速，但内容审核严格（品牌名/功效词易触发 400）
 * - GPT Image 2 对正常商业内容更宽松，作为兜底方案
 */
export async function generateScreenImageSmart(params: {
  prompt: string;
  referenceImages?: string[];
  screenIndex: number;
  projectId: string;
  screenLabel: string;
  versionNumber: number;
}): Promise<{ imageUrl: string; originalUrl: string }> {
  try {
    console.log(`[Node4] 屏${params.screenIndex} 尝试 Seedream 5.0 生图...`);
    const result = await generateScreenImage(params);
    console.log(`[Node4] 屏${params.screenIndex} Seedream 生图成功`);
    return result;
  } catch (err: any) {
    const errMsg = err.message || '';
    // 检测 Seedream 内容安全审核 (400 + InputTextSensitiveContentDetected)
    const isSensitiveError = errMsg.includes('400') && errMsg.includes('InputTextSensitiveContentDetected');
    if (!isSensitiveError) {
      // 非审核相关错误，直接抛出
      throw err;
    }

    console.warn(
      `[Node4] 屏${params.screenIndex} Seedream 触发内容安全审核，自动切换 GPT Image 2 重试...`
    );

    const result = await generateScreenImageFallback({
      prompt: params.prompt,
      screenIndex: params.screenIndex,
      projectId: params.projectId,
      screenLabel: params.screenLabel,
      versionNumber: params.versionNumber,
    });
    console.log(`[Node4] 屏${params.screenIndex} GPT Image 2 生图成功`);
    return result;
  }
}
