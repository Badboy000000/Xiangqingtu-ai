import { chatCompletion } from '../adapters/llm.adapter';
import { analyzeImages } from '../adapters/vision.adapter';
import { loadPrompt } from '../prompts/prompt-loader';
import type { Node1Output, ProductInfo, VisionReport } from '../types';
import type { ChatMessage } from '../adapters/llm.adapter';
import { saveDebugLog } from '../utils/debug-logger';

/**
 * 节点1: 逐图多模态分析 + 无图降级
 * 
 * 有参考图时：逐图并行调用 vision API，每张图片独立产出一份完整的视觉分析报告
 * 无参考图时：退化为纯文本分析，基于表单数据生成设计方案
 * 
 * 返回 { visionReports, productInfo }
 */
export async function analyzeProductInfo(
  productInfo: ProductInfo,
  projectId: string,
): Promise<Node1Output> {
  const screenCount = productInfo.screenCount || 8;
  const visionReports: VisionReport[] = [];

  if (productInfo.referenceImageUrls && productInfo.referenceImageUrls.length > 0) {
    // ── 逐图多模态分析（并行） ──
    const visionPrompt = loadPrompt('node1-image-analysis', { screenCount });
  
    // 构建表单数据上下文（与无图模式格式一致），作为视觉分析的商业背景
    const userContext = buildProductInfoContext(productInfo);
  
    console.log(`[Node1] Starting per-image vision analysis: ${productInfo.referenceImageUrls.length} images, ${screenCount} screens`);
  
    const reports = await Promise.all(
      productInfo.referenceImageUrls.map(async (url, i) => {
        console.log(`[Node1] Analyzing image ${i}: ${url}`);
  
        // [DEBUG] Save per-image vision input
        saveDebugLog(projectId, `node1-image-analysis-${i}-input.md`,
          `# Node1 Vision Image ${i} Input\n\n## Image\n${url}\n\n## Product Context\n\`\`\`markdown\n${userContext}\n\`\`\`\n\n## Prompt\n\`\`\`markdown\n${visionPrompt}\n\`\`\``
        );
  
        // 逐图调用：每次传 1张图 + 表单数据 + 提示词
        const analysis = await analyzeImages([url], visionPrompt, userContext, projectId);

        // [DEBUG] Save per-image vision output
        saveDebugLog(projectId, `node1-image-analysis-${i}-output.md`,
          `# Node1 Vision Image ${i} Output\n\n\`\`\`markdown\n${analysis}\n\`\`\``
        );

        console.log(`[Node1] Image ${i} analysis done: ${analysis.length} chars`);
        return { imageIndex: i, imageUrl: url, analysis };
      })
    );

    visionReports.push(...reports);
    console.log(`[Node1] All ${reports.length} vision reports done. Total chars: ${reports.reduce((s, r) => s + r.analysis.length, 0)}`);
  } else {
    // ── 无参考图：纯文本降级分析 ──
    console.log(`[Node1] No reference images, falling back to text-only analysis`);

    const textAnalysis = await analyzeTextOnly(productInfo, screenCount, projectId);
    visionReports.push({ imageIndex: -1, imageUrl: '', analysis: textAnalysis });

    console.log(`[Node1] Text-only analysis done: ${textAnalysis.length} chars`);
  }

  return { visionReports, productInfo };
}

/**
 * 构建表单数据的文本上下文，供视觉分析师作为商业背景参考
 */
function buildProductInfoContext(productInfo: ProductInfo): string {
  const sellingPointsFormatted = productInfo.sellingPoints
    ? productInfo.sellingPoints.split('\n').filter(s => s.trim()).map(s => `  - ${s.trim()}`).join('\n')
    : '  - 未指定';

  return `## 商品信息
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

请结合以上商品信息，对这张参考图进行深度视觉分析。`;
}

/**
 * 无参考图时的纯文本降级分析
 * 使用 node1-text-fallback 提示词 + 表单数据 → LLM 生成自然语言分析报告
 */
async function analyzeTextOnly(
  productInfo: ProductInfo,
  screenCount: number,
  projectId: string,
): Promise<string> {
  const systemPrompt = loadPrompt('node1-text-fallback', { screenCount });

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

请根据以上信息，整理商品核心信息并规划 ${screenCount} 屏详情页设计方案。`;

  // [DEBUG] Save text-only input
  saveDebugLog(projectId, 'node1-text-input.md',
    `# Node1 Text-Only Input\n\n## System Prompt\n\`\`\`markdown\n${systemPrompt}\n\`\`\`\n\n## User Content\n\`\`\`markdown\n${userContent}\n\`\`\``
  );

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ];

  const result = await chatCompletion(messages, { temperature: 0.5 });

  // [DEBUG] Save text-only output
  saveDebugLog(projectId, 'node1-text-output.md',
    `# Node1 Text-Only Output\n\n\`\`\`markdown\n${result}\n\`\`\``
  );

  return result;
}
