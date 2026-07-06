import { chatCompletionJSON } from '../adapters/llm.adapter';
import { loadPrompt } from '../prompts/prompt-loader';
import type { Node1Output, Node2Output } from '../types';
import type { ChatMessage } from '../adapters/llm.adapter';

/**
 * 节点2: 详情页设计规划
 * 基于节点1输出的商品画像，生成详情页设计规划（动态模块数）
 */
export async function generateDesignPlan(
  node1Output: Node1Output,
  screenCount: number = 8,
): Promise<Node2Output> {
  const userContent = `## 标准化商品信息

### 基础信息
- 商品名称: ${node1Output.basicInfo.name}
- 品类: ${node1Output.basicInfo.category}
- 平台: ${node1Output.basicInfo.platform}
- 画面文字语种: ${node1Output.basicInfo.language}
- 人群/场景/参考风格: ${node1Output.basicInfo.crowdSceneStyle}

### 商品核心
- 用户卖点（必须使用，禁止改写）: ${node1Output.productCore.sellingPoints.join('；')}
- 核心内容: ${node1Output.productCore.coreContent}
- 商品事实: ${node1Output.productCore.productFacts.join('；')}
- 视觉依据: ${node1Output.productCore.visualEvidence.join('；')}
- 品牌视觉基因: ${node1Output.productCore.brandVisualGene}
- 包装外观: ${node1Output.productCore.packagingAppearance}
- 动作/道具建议: ${node1Output.productCore.actionPropSuggestions.join('；')}
- 合规边界: ${node1Output.productCore.complianceBoundary.join('；')}
- 信息缺口: ${node1Output.productCore.infoGaps.join('；')}

请生成完整的详情页设计规划，包含全局视觉系统和 ${screenCount} 个模块。`;

  const messages: ChatMessage[] = [
    { role: 'system', content: loadPrompt('node2-system', { screenCount }) },
    { role: 'user', content: userContent },
  ];

  return chatCompletionJSON<Node2Output>(messages, { temperature: 0.7 });
}
