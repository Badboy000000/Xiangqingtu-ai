import OpenAI from 'openai';
import { config } from '../config';

const client = new OpenAI({
  baseURL: config.ssy.baseUrl,
  apiKey: config.ssy.apiKey,
});

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

/**
 * 调用 GPT-5.5 chat completions（非流式）
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  const completion = await client.chat.completions.create({
    model: 'openai/gpt-5.5',
    messages: messages as OpenAI.ChatCompletionMessageParam[],
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens,
    stream: false,
  });

  return completion.choices[0]?.message?.content || '';
}

/**
 * 调用 GPT-5.5 chat completions（流式）
 */
export async function chatCompletionStream(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number },
): Promise<AsyncIterable<string>> {
  const stream = await client.chat.completions.create({
    model: 'openai/gpt-5.5',
    messages: messages as OpenAI.ChatCompletionMessageParam[],
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens,
    stream: true,
  });

  return (async function* () {
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
  })();
}

/**
 * 调用 GPT-5.5 并期望 JSON 结构化输出
 */
export async function chatCompletionJSON<T>(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number },
): Promise<T> {
  const content = await chatCompletion(messages, options);

  // 尝试从 markdown code block 中提取 JSON
  let jsonStr = content;
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    throw new Error(`LLM JSON 解析失败: ${content.substring(0, 200)}`);
  }
}
