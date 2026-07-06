import { chatCompletionJSON } from '../adapters/llm.adapter';
import { analyzeImages } from '../adapters/vision.adapter';
import { loadPrompt } from '../prompts/prompt-loader';
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
      loadPrompt('node1-vision'),
    );
  }

  // Step 2: 整理信息
  const sellingPointsFormatted = productInfo.sellingPoints
    ? productInfo.sellingPoints.split('\n').filter(s => s.trim()).map(s => `  - ${s.trim()}`).join('\n')
    : '  - 未指定';

  const userContent = `## 商品信息
- 产品名称: ${productInfo.name}
- 平台: ${productInfo.platform === 'domestic' ? '国内电商（淘宝/天猫/京东/拼多多/抖音电商/快手电商）' : '海外电商（Amazon等）'}
- 语种: ${productInfo.language || '中文'}
- 品类: ${productInfo.category || '待识别'}
- 材质: ${productInfo.material || '未指定'}
- 产品规格参数: ${productInfo.productSpecs || '未指定'}
- 核心卖点:
${sellingPointsFormatted}
- 目标人群: ${productInfo.targetAudience}
- 价格区间: ${productInfo.priceRange}
- 参考风格: ${productInfo.referenceStyle || '未指定'}
- 设计元素要求: ${productInfo.designRequirements}

${visionAnalysis ? `## 参考图视觉分析\n${visionAnalysis}` : ''}

请根据以上信息，整理输出标准化的商品核心信息。`;

  const messages: ChatMessage[] = [
    { role: 'system', content: loadPrompt('node1-system') },
    { role: 'user', content: userContent },
  ];

  return chatCompletionJSON<Node1Output>(messages, { temperature: 0.5 });
}
