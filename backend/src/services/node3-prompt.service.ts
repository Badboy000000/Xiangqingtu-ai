import { chatCompletion, chatCompletionStreamJSON, chatCompletionJSON } from '../adapters/llm.adapter';
import { loadPrompt } from '../prompts/prompt-loader';
import type { ScreenPrompt } from '../types';
import type { ChatMessage } from '../adapters/llm.adapter';
import { saveDebugLog } from '../utils/debug-logger';

/**
 * 生成单屏生图提示词（五层骨架，每屏独立调用）
 * 
 * 核心设计：Node3 只接收 Node2 的完整报告作为上下文。
 * Node2 的报告已经是"创意总监"的最终决策，包含了商品信息、风格方向、
 * 每屏方案、参考图分配等所有需要的信息。不再回看原始报告或表单数据。
 * 
 * 信息流：Node1(原始素材) → Node2(精炼决策) → Node3(忠实执行)
 */
export async function generateSingleScreenPrompt(params: {
  node2FullReport: string;       // Node2 完整统一决策报告（唯一权威来源）
  screenIndex: number;           // 当前屏序号（0-based）
  totalScreens: number;
  projectId?: string;            // 项目ID，用于按项目分类存储调试日志
  onProgress?: (chunk: string, totalLength: number) => void;
}): Promise<ScreenPrompt> {
  const { node2FullReport, screenIndex, totalScreens, projectId, onProgress } = params;

  const systemPrompt = loadPrompt('node3-system');

  // ── 构建 userContent：Node2 报告 + 本屏任务定位 ──
  const userContent = `## 统一设计决策报告

${node2FullReport}

## 本屏任务

请为**第${screenIndex + 1}屏**（共${totalScreens}屏）生成完整的五层骨架生图提示词。

从上方报告中定位"第${screenIndex + 1}屏"对应的方案段落，严格按照该屏的画面描述、文案定稿、产品角度和参考图分配来生成 prompt。

输出 JSON 格式（单个对象，不是数组）。`;

  // [DEBUG] Save Node3 screen input
  if (projectId) {
    saveDebugLog(projectId, `node3-screen-${screenIndex + 1}-input.md`,
      `# Node3 Screen ${screenIndex + 1} LLM Input\n\n## System Prompt\n\`\`\`markdown\n${systemPrompt}\n\`\`\`\n\n## User Content\n\`\`\`markdown\n${userContent}\n\`\`\``
    );
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ];

  // 主路径：非流式 JSON 模式（稳定可靠，并行架构下速度依然快）
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

  // 防御性解包：模型可能仍输出旧包装格式
  const wrapped = result as any;
  if (wrapped.screenPrompts && Array.isArray(wrapped.screenPrompts) && wrapped.screenPrompts.length > 0) {
    console.warn(`[Node3] Screen ${screenIndex}: model returned wrapped format, unwrapping screenPrompts[0]`);
    result = wrapped.screenPrompts[0] as ScreenPrompt;
  }

  // [DEBUG] Save Node3 screen output
  if (projectId) {
    saveDebugLog(projectId, `node3-screen-${screenIndex + 1}-output.md`,
      `# Node3 Screen ${screenIndex + 1} LLM Output\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``
    );
  }

  // 语义校验：prompt 必须非空且达到最低长度
  if (!result.prompt || result.prompt.trim().length < 80) {
    console.warn(`[Node3] Screen ${screenIndex}: prompt 空或过短 (${result.prompt?.length || 0} chars)，单次重试...`);
    const retryMessages: ChatMessage[] = [
      ...messages,
      { role: 'assistant', content: JSON.stringify(result) },
      { role: 'user', content: '上一次输出的 prompt 字段不完整或为空。请重新生成 JSON，确保 prompt 包含完整五层骨架（100~180词），必须完成文字渲染部分。' },
    ];
    result = await chatCompletionJSON<ScreenPrompt>(retryMessages, {
      temperature: TEMPERATURE,
      maxTokens: MAX_TOKENS,
    });
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
