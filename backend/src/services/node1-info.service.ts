import { chatCompletionJSON } from '../adapters/llm.adapter';
import { analyzeImages } from '../adapters/vision.adapter';
import { NODE1_SYSTEM_PROMPT, NODE1_VISION_PROMPT } from '../prompts/system-prompts';
import type { Node1Output, ProductInfo } from '../types';
import type { ChatMessage } from '../adapters/llm.adapter';

/**
 * 节点1: 信息整理补全
 * 1. 如有参考图 → 先调用 vision 分析图片
 * 2. 将用户信息 + 图片分析 → 调用 LLM 输出结构化商品画像
 */
export async function analyzeProductInfo(
  productInfo: ProductInfo,
): Promise<Node1Output> {
  let visionAnalysis = '';

  // Step 1: 分析参考图（如有）
  if (productInfo.referenceImageUrls && productInfo.referenceImageUrls.length > 0) {
    visionAnalysis = await analyzeImages(
      productInfo.referenceImageUrls,
      NODE1_VISION_PROMPT,
    );
  }

  // Step 2: 整理信息
  const userContent = `## 商品信息
- 产品名称: ${productInfo.name}
- 平台: ${productInfo.platform === 'domestic' ? '国内电商（淘宝/天猫/京东/拼多多/抖音电商/快手电商）' : '海外电商（Amazon等）'}
- 语种: ${productInfo.language || '中文'}
- 品类: ${productInfo.category || '待识别'}
- 核心卖点: ${productInfo.sellingPoints}
- 目标人群: ${productInfo.targetAudience}
- 价格区间: ${productInfo.priceRange}
- 参考风格: ${productInfo.referenceStyle || '未指定'}
- 设计元素要求: ${productInfo.designRequirements}

${visionAnalysis ? `## 参考图视觉分析\n${visionAnalysis}` : ''}

请根据以上信息，整理输出标准化的商品核心信息。`;

  const messages: ChatMessage[] = [
    { role: 'system', content: NODE1_SYSTEM_PROMPT },
    { role: 'user', content: userContent },
  ];

  return chatCompletionJSON<Node1Output>(messages, { temperature: 0.5 });
}
