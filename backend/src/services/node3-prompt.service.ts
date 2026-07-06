import { chatCompletionJSON, chatCompletion } from '../adapters/llm.adapter';
import { loadPrompt } from '../prompts/prompt-loader';
import type { Node2Output, Node3Output } from '../types';
import type { ChatMessage } from '../adapters/llm.adapter';

/**
 * 节点3: 分屏生图提示词生成
 * 基于节点2的设计规划，生成全局母 prompt + 每屏 prompt
 */
export async function generateScreenPrompts(
  node2Output: Node2Output,
): Promise<Node3Output> {
  const gvs = node2Output.globalVisualSystem;
  const userContent = `## 详情页设计规划

### 整体风格
${node2Output.overallStyle}

### 全局视觉系统
- 背景底色: ${gvs.bgColor}
- 主色: ${gvs.mainColor}
- 辅色: ${gvs.accentColor}
- 点缀色: ${gvs.highlightColor}
- 色彩比例: ${gvs.colorRatio}
- 画风: ${gvs.artStyle}
- 光影: ${gvs.lighting}
- 渲染: ${gvs.rendering}
- 标题字形: ${gvs.titleFont}
- 正文字形: ${gvs.bodyFont}
- 标题呈现: ${gvs.titlePlacement}
- 字色数量: ${gvs.fontColorCount}
- 卡片/标签风格: ${gvs.cardStyle}
- 圆角/线条/阴影: ${gvs.cornerLineStyle}
- 留白与安全区: ${gvs.whitespace}
- 层级关系: ${gvs.hierarchy}
- 品类氛围: ${gvs.categoryAtmosphere}

### 合规规则
${node2Output.complianceRules.join('；')}

### 模块规划
${node2Output.modules.map(m => `
#### 第 ${m.index} 屏 - ${m.theme}
- 实际图位类型: ${m.actualImageType}
- 核心视觉: ${m.coreVisual}
- 背景/风格: ${m.bgStyle}
- 画面策略: ${m.visualStrategy}
- 人物/道具建议: ${m.characterPropSuggestions}
- 平台规则: ${m.platformRules}
- 图位文案方向: ${m.textDirection}
- 产品角度/景别: ${m.productAngle}
- 协同要求: ${m.coordination}
`).join('\n')}

请为每一屏生成可直接用于图像模型的生图提示词。`;

  const messages: ChatMessage[] = [
    { role: 'system', content: loadPrompt('node3-system') },
    { role: 'user', content: userContent },
  ];

  return chatCompletionJSON<Node3Output>(messages, { temperature: 0.7 });
}

/**
 * 屏级修改 - 根据用户反馈重写单屏 prompt
 */
export async function reviseScreenPrompt(
  label: string,
  currentPrompt: string,
  feedback: string,
): Promise<string> {
  const systemContent = loadPrompt('screen-revise', {
    label,
    prompt: currentPrompt,
    feedback,
  });

  const messages: ChatMessage[] = [
    { role: 'system', content: systemContent },
    { role: 'user', content: `请根据反馈修改这个屏的生图 prompt，只输出修改后的完整 prompt。` },
  ];

  return chatCompletion(messages, { temperature: 0.6 });
}
