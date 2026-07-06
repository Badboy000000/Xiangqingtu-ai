import { chatCompletion, chatCompletionStreamJSON, chatCompletionJSON } from '../adapters/llm.adapter';
import { loadPrompt } from '../prompts/prompt-loader';
import type { Node2Output, ScreenPrompt, GlobalVisualSystem } from '../types';
import type { ChatMessage } from '../adapters/llm.adapter';

/**
 * 生成全局母提示词（轻量调用，~5秒）
 * 基于整体风格 + 全局视觉系统，生成约束所有屏的统一风格描述
 */
export async function generateMotherPrompt(
  node2Output: Node2Output,
): Promise<string> {
  const gvs = node2Output.globalVisualSystem;
  const userContent = `## 整体风格
${node2Output.overallStyle}

## 全局视觉系统
- 背景底色: ${gvs.bgColor}
- 主色/辅色/点缀色: ${gvs.mainColor} / ${gvs.accentColor} / ${gvs.highlightColor}
- 色彩比例: ${gvs.colorRatio}
- 画风: ${gvs.artStyle}
- 光影: ${gvs.lighting}
- 渲染: ${gvs.rendering}

请生成一段全局风格母提示词（50词以内），用于约束所有分屏生图的统一视觉基调。只输出提示词文本，不要输出JSON。`;

  const messages: ChatMessage[] = [
    { role: 'system', content: '你是电商视觉风格师，用精炼语言概括全局视觉约束。直接输出文本，不要任何格式包装。' },
    { role: 'user', content: userContent },
  ];

  const result = await chatCompletion(messages, { temperature: 0.5, timeoutMs: 60_000 });
  return result.trim();
}

/**
 * 生成单屏生图提示词（流式 + JSON 模式，每屏独立调用）
 * 输入单屏模块信息 + 母提示词，输出该屏完整 ScreenPrompt
 */
export async function generateSingleScreenPrompt(params: {
  module: {
    index: number;
    theme: string;
    actualImageType: string;
    coreVisual: string;
    bgStyle: string;
    visualStrategy: string;
    characterPropSuggestions: string;
    platformRules: string;
    textDirection: string;
    productAngle: string;
    coordination: string;
  };
  motherPrompt: string;
  overallStyle: string;
  globalVisualSystem: GlobalVisualSystem;
  screenIndex: number;
  totalScreens: number;
  onProgress?: (chunk: string, totalLength: number) => void;
}): Promise<ScreenPrompt> {
  const { module: m, motherPrompt, overallStyle, globalVisualSystem: gvs, screenIndex, totalScreens, onProgress } = params;

  const systemPrompt = loadPrompt('node3-system');

  const userContent = `## 全局风格锚点
${motherPrompt}

## 整体风格
${overallStyle}

## 全局视觉系统（关键参数）
- 光影: ${gvs.lighting}
- 画风: ${gvs.artStyle}
- 主色/辅色: ${gvs.mainColor} / ${gvs.accentColor}

## 本屏设计规划（第 ${screenIndex + 1}/${totalScreens} 屏）
- 主题: ${m.theme}
- 核心视觉: ${m.coreVisual}
- 背景/风格: ${m.bgStyle}
- 画面策略: ${m.visualStrategy}
- 图位文案方向: ${m.textDirection}
- 产品角度/景别: ${m.productAngle}

请为这一屏生成完整的生图提示词，输出 JSON 格式（单个对象，不是数组）。`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ];

  // 主路径：非流式 JSON 模式（稳定可靠，并行架构下速度依然快）
  // 备选：流式 JSON（进度可视化更强，但百炼 API stream+json 组合偶有解析问题）
  // maxTokens=2048 防止退化输出跑飞；temperature=0.5 提高结构化输出稳定性
  const MAX_TOKENS = 2048;
  const TEMPERATURE = 0.5;
  let result: ScreenPrompt;
  try {
    result = await chatCompletionJSON<ScreenPrompt>(messages, {
      temperature: TEMPERATURE,
      maxTokens: MAX_TOKENS,
    });
  } catch (syncErr: any) {
    console.warn(`[Node3] Screen ${screenIndex} sync JSON failed, trying stream fallback...`, syncErr.message);
    result = await chatCompletionStreamJSON<ScreenPrompt>(messages, {
      temperature: TEMPERATURE,
      maxTokens: MAX_TOKENS,
      onProgress,
    });
  }

  // 防御性解包：模型可能仍输出旧包装格式 { globalMotherPrompt, screenPrompts: [...] }
  const wrapped = result as any;
  if (wrapped.screenPrompts && Array.isArray(wrapped.screenPrompts) && wrapped.screenPrompts.length > 0) {
    console.warn(`[Node3] Screen ${screenIndex}: model returned wrapped format, unwrapping screenPrompts[0]`);
    result = wrapped.screenPrompts[0] as ScreenPrompt;
  }

  // 语义校验：prompt 必须非空且达到最低长度（100词≈150+字符，低于80必为截断）
  if (!result.prompt || result.prompt.trim().length < 80) {
    console.warn(`[Node3] Screen ${screenIndex}: prompt 空或过短 (${result.prompt?.length || 0} chars)，单次重试...`);
    const retryMessages: ChatMessage[] = [
      ...messages,
      { role: 'assistant', content: JSON.stringify(result) },
      { role: 'user', content: '上一次输出的 prompt 字段不完整或为空。请重新生成 JSON，确保 prompt 包含完整五段结构（100~180词），必须完成文字渲染部分。' },
    ];
    result = await chatCompletionJSON<ScreenPrompt>(retryMessages, {
      temperature: TEMPERATURE,
      maxTokens: MAX_TOKENS,
    });
    // 重试结果同样需要防御性解包
    const retryWrapped = result as any;
    if (retryWrapped.screenPrompts && Array.isArray(retryWrapped.screenPrompts) && retryWrapped.screenPrompts.length > 0) {
      result = retryWrapped.screenPrompts[0] as ScreenPrompt;
    }
  }

  // 确保 screenIndex 字段与预期一致
  result.screenIndex = screenIndex;

  return result;
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

/**
 * 全量生成所有屏提示词（旧接口，保留向后兼容）
 * @deprecated 使用 generateMotherPrompt + generateSingleScreenPrompt 替代
 */
export async function generateScreenPrompts(
  node2Output: Node2Output,
): Promise<{ globalMotherPrompt: string; screenPrompts: ScreenPrompt[] }> {
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

  return chatCompletionJSON(messages, { temperature: 0.7 });
}
