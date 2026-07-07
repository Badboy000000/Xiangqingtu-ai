import * as fs from 'fs';
import * as path from 'path';
import { chatCompletion } from '../adapters/llm.adapter';
import { loadPrompt } from '../prompts/prompt-loader';
import type { Node1Output, Node2Output } from '../types';
import type { ChatMessage } from '../adapters/llm.adapter';
import { config } from '../config';

/**
 * 保存调试日志到 Markdown 文件
 */
function saveDebugLog(filename: string, content: string) {
  const debugDir = path.join(config.upload.dir, 'debug-logs');
  if (!fs.existsSync(debugDir)) {
    fs.mkdirSync(debugDir, { recursive: true });
  }
  const filePath = path.join(debugDir, filename);
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`[DEBUG] Saved to ${filePath}`);
}

/**
 * 节点2: 交叉印证 + 统一决策
 * 
 * 接收 Node1 的所有视觉分析报告（自然语言），交叉印证后输出统一设计结论。
 * 输出为纯 Markdown 报告（fullReport），不做任何结构化提取。
 * 
 * 核心原则：Node2 是"创意总监"，输出的完整报告是下游唯一权威来源。
 */
export async function generateDesignPlan(
  node1Output: Node1Output,
  screenCount: number = 8,
): Promise<Node2Output> {
  // ── 构建 user content：完整传入所有视觉分析报告 ──
  const reportsSection = node1Output.visionReports.map((r, i) => {
    const header = r.imageIndex >= 0
      ? `### 参考图${r.imageIndex}的分析报告`
      : `### 纯文本分析报告（无参考图）`;
    return `${header}\n\n${r.analysis}`;
  }).join('\n\n---\n\n');

  const productInfo = node1Output.productInfo;
  const userContent = `## 商品信息
- 产品名称: ${productInfo.name}
- 品类: ${productInfo.category || '待识别'}
- 平台: ${productInfo.platform === 'domestic' ? '国内电商' : '海外电商'}
- 语种: ${productInfo.language || 'zh-CN'}
- 材质: ${productInfo.material || '未指定'}
- 产品规格参数: ${productInfo.productSpecs || '未指定'}
- 卖点: ${productInfo.sellingPoints}
- 目标人群: ${productInfo.targetAudience}
- 价格区间: ${productInfo.priceRange}
- 参考风格: ${productInfo.referenceStyle || '未指定'}
- 设计要求: ${productInfo.designRequirements}

## 多份视觉分析报告（交叉印证）

${reportsSection}

请交叉印证以上报告，统一文案，决定参考图分配策略，输出${screenCount}屏最终方案。`;

  // [DEBUG] Save Node2 input
  const systemPrompt = loadPrompt('node2-system', { screenCount });
  saveDebugLog('node2-input.md',
    `# Node2 LLM Input\n\n## System Prompt\n\`\`\`markdown\n${systemPrompt}\n\`\`\`\n\n## User Content\n\`\`\`markdown\n${userContent}\n\`\`\``
  );

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ];

  // ── 调用 LLM 获取自然语言报告 ──
  console.log(`[Node2] Calling LLM for cross-validation report (${screenCount} screens)...`);
  const fullReport = await chatCompletion(messages, { temperature: 0.7 });

  // [DEBUG] Save Node2 output
  saveDebugLog('node2-output.md',
    `# Node2 LLM Output\n\n\`\`\`markdown\n${fullReport}\n\`\`\``
  );

  console.log(`[Node2] Report generated: ${fullReport.length} chars`);

  // ── 校验屏数是否匹配 ──
  const validatedReport = await validateAndFixScreenCount(fullReport, screenCount, messages);

  return { fullReport: validatedReport };
}

/**
 * 从报告中解析实际生成的屏数
 * 匹配 "#### 第N屏" 或 "#### 第N屏：xxx" 格式
 */
function parseActualScreenCount(report: string): number {
  const matches = [...report.matchAll(/####\s*第(\d+)屏(?:[：:\uff1a\-]|$)/g)];
  if (matches.length === 0) return 0;
  return Math.max(...matches.map(m => parseInt(m[1])));
}

/**
 * 找出缺失的屏号列表
 */
function findMissingScreens(report: string, expectedCount: number): number[] {
  const matches = [...report.matchAll(/####\s*第(\d+)屏(?:[：:\uff1a\-]|$)/g)];
  const foundScreens = new Set(matches.map(m => parseInt(m[1])));
  
  const missing: number[] = [];
  for (let i = 1; i <= expectedCount; i++) {
    if (!foundScreens.has(i)) {
      missing.push(i);
    }
  }
  return missing;
}

/**
 * 校验屏数并自动补全缺失的屏
 * 如果屏数不匹配，调用 LLM 补充缺失的屏
 */
async function validateAndFixScreenCount(
  report: string,
  expectedCount: number,
  originalMessages: ChatMessage[],
): Promise<string> {
  const actualCount = parseActualScreenCount(report);
  
  if (actualCount === expectedCount) {
    console.log(`[Node2] ✅ Screen count validated: ${actualCount} screens`);
    return report;
  }
  
  const missingScreens = findMissingScreens(report, expectedCount);
  console.log(`[Node2] ⚠️ Screen count mismatch: expected ${expectedCount}, found ${actualCount}`);
  console.log(`[Node2] Missing screens: [${missingScreens.join(', ')}]`);
  
  // 构建补充请求
  const missingListText = missingScreens.map(n => `第${n}屏`).join('、');
  const fixPrompt = `
⚠️ **检测到输出不完整**

你刚才生成的设计方案缺少以下屏的内容：${missingListText}

请**只补充缺失的屏**，不要重复已经生成的内容。

已生成的内容（供参考，不要重复）：
---
${report}
---

请补充以下内容：
${missingScreens.map(n => `
#### 第${n}屏：[主题名]
- **主题**：（4-8字主题名）
- **画面描述**：（50-80字）
- **文案定稿**：主标题/副标题/标签
- **产品角度**：
- **参考图分配**：[图x, 图y]（理由）
`).join('\n')}

保持与已有内容风格一致，直接输出补充的部分即可。
`;

  console.log(`[Node2] Calling LLM to fix missing screens...`);
  
  const fixMessages: ChatMessage[] = [
    ...originalMessages,
    { role: 'assistant', content: report },
    { role: 'user', content: fixPrompt },
  ];
  
  const supplement = await chatCompletion(fixMessages, { temperature: 0.7 });
  
  // 将补充内容追加到原报告
  const fixedReport = `${report}\n\n${supplement}`;
  
  // 再次校验
  const newActualCount = parseActualScreenCount(fixedReport);
  if (newActualCount !== expectedCount) {
    console.warn(`[Node2] ⚠️ After fix, still have ${newActualCount} screens (expected ${expectedCount})`);
    // 即使仍有问题，也返回修复后的结果，让后续流程继续
  } else {
    console.log(`[Node2] ✅ Fixed successfully: now has ${newActualCount} screens`);
  }
  
  // [DEBUG] Save fixed output
  saveDebugLog('node2-output-fixed.md',
    `# Node2 Fixed Output\n\n\`\`\`markdown\n${fixedReport}\n\`\`\``
  );
  
  return fixedReport;
}
