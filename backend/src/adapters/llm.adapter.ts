import OpenAI from 'openai';
import { config } from '../config';

/** 当前 LLM 模型名称（供启动日志等外部引用） */
export const LLM_MODEL_NAME = 'qwen3.5-plus';
/** 当前 LLM 服务平台标签 */
export const LLM_PROVIDER_LABEL = '阿里百炼';

/** 默认 LLM 请求超时（毫秒） */
const DEFAULT_TIMEOUT_MS = 120_000;

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
 * 支持超时控制（默认 120s）和结构化日志
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean; timeoutMs?: number },
): Promise<string> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const jsonMode = options?.jsonMode ?? false;

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
  if (jsonMode) {
    params.response_format = { type: 'json_object' };
  }

  // 超时控制
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const start = Date.now();
  console.log(`[LLM] Calling ${LLM_MODEL_NAME} (mode=sync, json=${jsonMode})...`);

  try {
    const completion = await client.chat.completions.create(params as any, {
      signal: controller.signal,
    });
    const elapsed = Date.now() - start;
    const content = completion.choices[0]?.message?.content || '';
    console.log(`[LLM] ${LLM_MODEL_NAME} responded in ${elapsed}ms, output ${content.length} chars`);
    return content;
  } catch (err: any) {
    const elapsed = Date.now() - start;
    if (err.name === 'AbortError' || controller.signal.aborted) {
      console.error(`[LLM] ${LLM_MODEL_NAME} request timed out after ${elapsed}ms (limit=${timeoutMs}ms)`);
      throw new Error(`LLM 请求超时 (${timeoutMs}ms)，请稍后重试`);
    }
    console.error(`[LLM] ${LLM_MODEL_NAME} request failed after ${elapsed}ms:`, err.message);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 调用 qwen3.5-plus chat completions（流式）
 */
export async function chatCompletionStream(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number },
): Promise<AsyncIterable<string>> {
  const start = Date.now();
  console.log(`[LLM] Calling ${LLM_MODEL_NAME} (mode=stream)...`);

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
    let totalChars = 0;
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        totalChars += content.length;
        yield content;
      }
    }
    console.log(`[LLM] ${LLM_MODEL_NAME} stream completed in ${Date.now() - start}ms, output ${totalChars} chars`);
  })();
}

/**
 * 调用 qwen3.5-plus 并期望 JSON 结构化输出（非流式）
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

/**
 * 调用 qwen3.5-plus 流式 + JSON 模式，逐块收集内容并提供进度回调
 * 阿里百炼 OpenAI-compatible API 支持 stream + json_object 组合
 * 自动重试最多 2 次
 */
export async function chatCompletionStreamJSON<T>(
  messages: ChatMessage[],
  options?: {
    temperature?: number;
    maxTokens?: number;
    timeoutMs?: number;
    onProgress?: (chunk: string, totalLength: number) => void;
  },
): Promise<T> {
  const MAX_RETRIES = 2;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const start = Date.now();
    console.log(`[LLM] Calling ${LLM_MODEL_NAME} (mode=stream, json=true) attempt=${attempt + 1}...`);

    // 超时控制
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const stream = await client.chat.completions.create(
        {
          model: LLM_MODEL_NAME,
          messages: messages as OpenAI.ChatCompletionMessageParam[],
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens,
          stream: true,
          enable_thinking: false,
          response_format: { type: 'json_object' },
        } as OpenAI.ChatCompletionCreateParamsStreaming,
        { signal: controller.signal },
      ) as unknown as AsyncIterable<OpenAI.ChatCompletionChunk>;

      // 逐块收集
      let fullContent = '';
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          fullContent += delta;
          options?.onProgress?.(delta, fullContent.length);
        }
      }

      clearTimeout(timer);
      const elapsed = Date.now() - start;
      console.log(`[LLM] ${LLM_MODEL_NAME} stream+json completed in ${elapsed}ms, output ${fullContent.length} chars`);

      // 尝试从 markdown code block 中提取 JSON
      let jsonStr = fullContent;
      const codeBlockMatch = fullContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
      }

      try {
        return JSON.parse(jsonStr) as T;
      } catch {
        console.error(`[LLM] Stream JSON parse failed (attempt ${attempt + 1}). Raw content [${fullContent.length} chars]:`, fullContent.substring(0, 500));
        if (attempt < MAX_RETRIES) {
          console.warn(`[LLM] Stream JSON 解析失败 (第${attempt + 1}次)，自动重试...`);
          continue;
        }
        throw new Error(`LLM Stream JSON 解析失败 (已重试${MAX_RETRIES}次): ${fullContent.substring(0, 200)}`);
      }
    } catch (err: any) {
      clearTimeout(timer);
      const elapsed = Date.now() - start;

      if (err.name === 'AbortError' || controller.signal.aborted) {
        console.error(`[LLM] ${LLM_MODEL_NAME} stream request timed out after ${elapsed}ms (limit=${timeoutMs}ms)`);
        throw new Error(`LLM 流式请求超时 (${timeoutMs}ms)，请稍后重试`);
      }

      // JSON 解析失败时继续重试
      if (attempt < MAX_RETRIES && err.message?.includes('解析失败')) {
        console.warn(`[LLM] Stream JSON 解析失败 (第${attempt + 1}次)，自动重试...`);
        continue;
      }

      console.error(`[LLM] ${LLM_MODEL_NAME} stream request failed after ${elapsed}ms:`, err.message);
      throw err;
    }
  }

  // 所有流式重试耗尽 → 回退到非流式 JSON 调用（更稳定）
  console.warn('[LLM] Stream JSON all retries exhausted, falling back to sync JSON...');
  try {
    const content = await chatCompletion(messages, {
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
      jsonMode: true,
      timeoutMs: options?.timeoutMs,
    });
    let jsonStr = content;
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }
    return JSON.parse(jsonStr) as T;
  } catch (fallbackErr: any) {
    console.error('[LLM] Sync JSON fallback also failed:', fallbackErr.message);
    throw new Error(`LLM JSON 生成失败（流式+非流式均失败）: ${fallbackErr.message}`);
  }
}
