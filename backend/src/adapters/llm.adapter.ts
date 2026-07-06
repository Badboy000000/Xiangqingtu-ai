import OpenAI from 'openai';
import { config } from '../config';

/** 当前 LLM 模型名称（供启动日志等外部引用） */
export const LLM_MODEL_NAME = 'qwen3.5-plus';
/** 当前 LLM 服务平台标签 */
export const LLM_PROVIDER_LABEL = '阿里百炼';

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

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

/**
 * 调用 qwen3.5-plus chat completions（非流式）
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean },
): Promise<string> {
  const params: Record<string, any> = {
    model: LLM_MODEL_NAME, // qwen3.5-plus
    messages: messages as OpenAI.ChatCompletionMessageParam[],
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens,
    stream: false,
    // 关闭 qwen3.5 思考模式，避免 reasoning_content 干扰输出
    enable_thinking: false,
  };

  // JSON mode: 强制模型输出合法 JSON
  if (options?.jsonMode) {
    params.response_format = { type: 'json_object' };
  }

  const completion = await client.chat.completions.create(params as any);

  return completion.choices[0]?.message?.content || '';
}

/**
 * 调用 qwen3.5-plus chat completions（流式）
 */
export async function chatCompletionStream(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number },
): Promise<AsyncIterable<string>> {
  const stream = await client.chat.completions.create({
    model: LLM_MODEL_NAME, // qwen3.5-plus
    messages: messages as OpenAI.ChatCompletionMessageParam[],
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens,
    stream: true,
    // 关闭 qwen3.5 思考模式，避免 reasoning_content 干扰输出
    enable_thinking: false,
  } as OpenAI.ChatCompletionCreateParamsStreaming);

  return (async function* () {
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
  })();
}

/**
 * 调用 qwen3.5-plus 并期望 JSON 结构化输出
 * 自动重试最多 2 次（应对模型偶尔不遵循指令）
 */
export async function chatCompletionJSON<T>(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number },
): Promise<T> {
  const MAX_RETRIES = 2;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const content = await chatCompletion(messages, { ...options, jsonMode: true });

    // 尝试从 markdown code block 中提取 JSON
    let jsonStr = content;
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    try {
      return JSON.parse(jsonStr) as T;
    } catch {
      if (attempt < MAX_RETRIES) {
        console.warn(`[LLM] JSON 解析失败 (第${attempt + 1}次)，自动重试...`);
        continue;
      }
      throw new Error(`LLM JSON 解析失败 (已重试${MAX_RETRIES}次): ${content.substring(0, 200)}`);
    }
  }

  // TypeScript 不会到这里，但保险起见
  throw new Error('LLM JSON 解析失败: 超出最大重试次数');
}
