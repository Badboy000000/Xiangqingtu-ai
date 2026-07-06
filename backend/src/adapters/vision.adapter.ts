import OpenAI from 'openai';
import { config } from '../config';
import { LLM_MODEL_NAME } from './llm.adapter';
import * as path from 'path';
import sharp from 'sharp';

// 阿里百炼 qwen3.5-plus（当前启用）
const client = new OpenAI({
  baseURL: config.bailian.baseUrl,
  apiKey: config.bailian.apiKey,
});

// 火山引擎 ARK doubao-seed-2.0（已停用，保留备用）
// const client = new OpenAI({
//   baseURL: config.ark.baseUrl,
//   apiKey: config.ark.apiKey,
// });

/** 图片压缩阈值：超过此尺寸会自动压缩后发送 */
const MAX_IMAGE_DIMENSION = 1024; // 最长边 1024px
const JPEG_QUALITY = 80;

/**
 * 将本地图片文件压缩后转为 base64 data URL
 * 使用 sharp 缩放 + 降低质量，避免请求体过大触发 nginx 413
 */
async function imageToBase64Url(filePath: string): Promise<string> {
  // 如果是相对路径（以 /uploads/ 开头），转换为绝对路径
  let absolutePath = filePath;
  if (filePath.startsWith('/uploads/')) {
    const uploadsDir = path.resolve(__dirname, '..', '..', config.upload.dir);
    absolutePath = path.join(uploadsDir, filePath.substring('/uploads/'.length));
  }

  let pipeline = sharp(absolutePath)
    .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
      fit: 'inside',
      withoutEnlargement: true,
    });

  // 统一输出为 JPEG 以减小体积
  pipeline = pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });

  const buffer = await pipeline.toBuffer();
  const base64 = buffer.toString('base64');
  return `data:image/jpeg;base64,${base64}`;
}

/**
 * 多模态图片理解 - 分析参考图
 */
export async function analyzeImages(
  imagePaths: string[],
  prompt: string,
): Promise<string> {
  const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

  // 添加图片（并行压缩）
  const imageDataUrls = await Promise.all(
    imagePaths.map((imgPath) =>
      imgPath.startsWith('http') ? imgPath : imageToBase64Url(imgPath),
    ),
  );
  for (const imageUrl of imageDataUrls) {
    content.push({
      type: 'image_url',
      image_url: { url: imageUrl },
    });
  }

  // 添加文本提示
  content.push({ type: 'text', text: prompt });

  const completion = await client.chat.completions.create({
    model: LLM_MODEL_NAME, // qwen3.5-plus
    messages: [
      {
        role: 'user',
        content: content as OpenAI.ChatCompletionContentPart[],
      },
    ],
    temperature: 0.5,
    stream: false,
    // 关闭 qwen3.5 思考模式，避免 reasoning_content 干扰输出
    enable_thinking: false,
  } as any);

  return completion.choices[0]?.message?.content || '';
}

/**
 * 多模态图片理解 - 返回 JSON 结构化输出
 */
export async function analyzeImagesJSON<T>(
  imagePaths: string[],
  prompt: string,
): Promise<T> {
  const content = await analyzeImages(imagePaths, prompt);

  let jsonStr = content;
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    throw new Error(`Vision JSON 解析失败: ${content.substring(0, 200)}`);
  }
}
