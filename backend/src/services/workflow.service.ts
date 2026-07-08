import { Project, Screen, ScreenVersion, ScreenRevision, ExportRecord } from '../models';
import { v4 as uuidv4 } from 'uuid';
import { analyzeProductInfo } from './node1-info.service';
import { generateDesignPlan } from './node2-plan.service';
import { generateSingleScreenPrompt } from './node3-prompt.service';
import { generateScreenImageSmart, editScreenImage } from './node4-image.service';
import { composeLongImage } from './export.service';
import { reviseScreenPrompt } from './node3-prompt.service';
import { AppError } from '../middleware/error-handler';
import type { ProductInfo, ExportFormat, ExportQuality, Node1Output, Node2Output } from '../types';

/**
 * LLM 输出安全转字符串工具：确保任何字段值都能安全写入 STRING/TEXT 列
 * - 字符串 → 原样返回
 * - null/undefined → fallback 默认值
 * - 其他类型 → String() 或 JSON.stringify
 */
function safeStr(value: unknown, fallback: string = ''): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

/**
 * 节点1: 信息整理
 * 输出存入 projects.info_analysis_result
 */
export async function runNode1(projectId: string): Promise<Node1Output> {
  const project = await Project.findByPk(projectId);
  if (!project) {
    throw new AppError('项目不存在', 404);
  }

  // 从独立列组装 ProductInfo 供 LLM 使用
  const productInfo: ProductInfo = {
    name: project.name,
    platform: project.platform as 'domestic' | 'overseas',
    sellingPoints: project.sellingPoints,
    targetAudience: project.targetAudience,
    priceRange: project.priceRange,
    designRequirements: project.designRequirements,
    referenceImageUrls: project.referenceImageUrls || [],
    category: project.category,
    referenceStyle: project.referenceStyle,
    language: project.language,
    screenCount: project.screenCount,
    material: project.material,
    productSpecs: project.productSpecs,
  };

  await project.update({ status: 'analyzing' });

  try {
    const infoAnalysisResult = await analyzeProductInfo(productInfo, projectId);

    console.log(`[Node1] Result: ${infoAnalysisResult.visionReports.length} vision reports`);

    await project.update({
      infoAnalysisResult,
      status: 'uploaded',
    });
    return infoAnalysisResult;
  } catch (err: unknown) {
    await project.update({ status: 'failed' });
    throw err;
  }
}

/**
 * 节点2: 设计规划
 * 完整 Markdown 报告存入 projects.design_plan_result
 * 不做任何结构化提取，报告本身即为下游唯一权威来源
 */
export async function runNode2(projectId: string): Promise<Node2Output> {
  const project = await Project.findByPk(projectId);
  if (!project) throw new AppError('项目不存在', 404);
  if (!project.infoAnalysisResult) {
    throw new AppError('请先完成节点1（信息整理）', 400);
  }

  await project.update({ status: 'planning' });

  try {
    const node2Output = await generateDesignPlan(project.infoAnalysisResult, project.screenCount, projectId);

    console.log(`[Node2] Report generated: ${node2Output.fullReport.length} chars`);

    // 完整报告存入 projects 表，不做任何结构化提取
    const designPlanResult = { fullReport: node2Output.fullReport };
    await project.update({ designPlanResult, status: 'uploaded' });

    return node2Output;
  } catch (err: unknown) {
    await project.update({ status: 'failed' });
    throw err;
  }
}

/**
 * 节点3 回调接口：供 controller 层接收逐屏实时推送
 */
export interface Node3Callbacks {
  onScreenComplete?: (screenIndex: number, screenPrompt: any) => void;
  onScreenProgress?: (screenIndex: number, chars: number) => void;
}

/**
 * 节点3: 分屏 Prompt 生成（并行流式版）
 * 
 * 信息流：Node1(原始素材) → Node2(精炼决策) → Node3(忠实执行)
 * Node3 只接收 Node2 的完整报告，不再回看原始报告或表单数据
 * 
 * 从报告中解析屏数（"#### 第N屏"），逐屏并发生成提示词
 * 每屏提示词写入 screens 表
 */
export async function runNode3(projectId: string, callbacks?: Node3Callbacks) {
  const project = await Project.findByPk(projectId);
  if (!project) throw new AppError('项目不存在', 404);
  if (!project.designPlanResult) {
    throw new AppError('请先完成节点2（设计规划）', 400);
  }

  try {
    // ── 从 Node2 报告获取完整决策（唯一权威来源） ──
    const node2FullReport: string = project.designPlanResult.fullReport || '';

    // 屏数直接来自前端表单（项目创建时确定的值），不从报告中解析
    const totalScreens = project.screenCount;

    console.log(`[Node3] Report: ${node2FullReport.length} chars, ${totalScreens} screens (from form)`);

    // ── 逐屏并发生成每屏提示词 ──
    const screenIndices = Array.from({ length: totalScreens }, (_, i) => i);
    console.log(`[Node3] Generating ${totalScreens} screen prompts in parallel...`);

    const screenResults = await Promise.all(
      screenIndices.map(async (i) => {
        console.log(`[Node3] Screen ${i} starting...`);
        try {
          const sp = await generateSingleScreenPrompt({
            node2FullReport,
            screenIndex: i,
            totalScreens,
            projectId,
            onProgress: (chunk, totalLen) => {
              callbacks?.onScreenProgress?.(i, totalLen);
            },
          });
          console.log(`[Node3] Screen ${i} completed: ${sp.label}`);

          // 写入 screens 表（只保存 prompt + label）
          const screenData = {
            label: safeStr(sp.label, `屏${i + 1}`),
            theme: safeStr(sp.label, `屏${i + 1}`),
            prompt: safeStr(sp.prompt),
          };

          const [screen] = await Screen.findOrCreate({
            where: { projectId, screenIndex: i },
            defaults: {
              id: uuidv4(),
              projectId,
              screenIndex: i,
              ...screenData,
              status: 'prompt_ready',
            },
          });

          if (screen.status === 'waiting' || !screen.prompt) {
            await screen.update({ ...screenData, status: 'prompt_ready' });
          }

          // 触发逐屏完成回调（用于 SSE 实时推送）
          callbacks?.onScreenComplete?.(i, sp);

          return sp;
        } catch (err: any) {
          console.error(`[Node3] Screen ${i} failed:`, err.message);
          // 单屏失败不阻断整体流程
          return {
            screenIndex: i,
            label: `屏${i + 1}`,
            prompt: '',
            _error: err.message,
          } as any;
        }
      })
    );

    const successCount = screenResults.filter((r: any) => r.prompt && !r._error).length;
    console.log(`[Node3] All screen prompts done: ${successCount}/${totalScreens} succeeded`);

    return {
      globalMotherPrompt: node2FullReport.substring(0, 500),
      screenPrompts: screenResults,
    };
  } catch (err: unknown) {
    await project.update({ status: 'failed' });
    throw err;
  }
}

/**
 * 根据前端传入的 0-based 索引查找屏记录
 * 兼容历史数据（1-based）和新数据（0-based）
 */
async function findScreenByIndex(projectId: string, index: number): Promise<Screen | null> {
  // 先尝试精确匹配 screenIndex
  let screen = await Screen.findOne({ where: { projectId, screenIndex: index } });
  if (screen) return screen;

  // 回退：按 screenIndex 排序后取第 index 个（兼容 1-based 历史数据）
  const allScreens = await Screen.findAll({
    where: { projectId },
    order: [['screenIndex', 'ASC']],
  });
  return allScreens[index] || null;
}

/**
 * 从 Node2 报告中解析指定屏的参考图索引
 * 定位"第N屏"段落，提取 [图0, 图1, 2] 格式的索引数组
 */
function parseRefImageIndices(report: string, screenIndex: number): number[] {
  // 找到第N屏段落的起始位置
  const screenPattern = new RegExp(`####\\s*第${screenIndex + 1}屏`, 'g');
  const screenMatch = screenPattern.exec(report);
  if (!screenMatch) return [];

  // 找到下一个屏段落（作为结束边界）
  const nextScreenPattern = /####\s*第\d+屏/g;
  nextScreenPattern.lastIndex = screenMatch.index + 10;
  const nextMatch = nextScreenPattern.exec(report);
  const endPos = nextMatch ? nextMatch.index : report.length;

  // 提取该屏段落文本
  const sectionText = report.substring(screenMatch.index, endPos);

  // 匹配 [图0, 图1, 2] 或 [0, 1, 2] 格式
  const bracketMatch = sectionText.match(/\[([^\]]+)\]/);
  if (!bracketMatch) return [];

  const indices: number[] = [];
  const numRegex = /(?:图)?(\d+)/g;
  let numMatch: RegExpExecArray | null;
  while ((numMatch = numRegex.exec(bracketMatch[1])) !== null) {
    indices.push(parseInt(numMatch[1]));
  }
  return indices;
}

/**
 * 获取单屏的参考图分配（智能分配）
 * 优先从 Node2 报告中解析该屏的参考图索引，回退到全量参考图
 * 返回 urls 和对应的原始索引（用于构建顺序绑定声明）
 */
async function getScreenReferenceImages(
  projectId: string,
  screenIndex: number,
  allReferenceImageUrls: string[] | null,
  node2Report?: string,
): Promise<{ urls: string[]; indices: number[] } | undefined> {
  if (!allReferenceImageUrls?.length) return undefined;

  // 从 Node2 报告中解析该屏的参考图索引
  if (node2Report) {
    try {
      const refIndices = parseRefImageIndices(node2Report, screenIndex);
      if (refIndices.length > 0) {
        const selected = refIndices
          .map((i: number) => allReferenceImageUrls[i])
          .filter(Boolean);
        const validIndices = refIndices
          .filter((i: number) => allReferenceImageUrls[i] != null);
        if (selected.length > 0) {
          console.log(`[Node4] 屏${screenIndex} 智能分配参考图: ${refIndices.join(',')} → ${selected.length}张`);
          return { urls: selected, indices: validIndices };
        }
      }
    } catch (err: any) {
      console.warn(`[Node4] 屏${screenIndex} 参考图解析失败，回退全量: ${err.message}`);
    }
  }

  // 回退：全量参考图（索引为 0,1,2,...）
  console.log(`[Node4] 屏${screenIndex} 使用全量参考图: ${allReferenceImageUrls.length}张`);
  return {
    urls: allReferenceImageUrls,
    indices: allReferenceImageUrls.map((_, i) => i),
  };
}

/**
 * 节点4: 单屏生图
 * 生图结果写入 screens 表，版本记录写入 screen_versions 表
 */
export async function runNode4(projectId: string, screenIndex: number) {
  const project = await Project.findByPk(projectId);
  if (!project) throw new AppError('项目不存在', 404);

  const screen = await findScreenByIndex(projectId, screenIndex);
  if (!screen) throw new AppError(`屏 ${screenIndex} 不存在`, 400);
  if (!screen.prompt) {
    throw new AppError(`屏 ${screenIndex} 缺少 prompt`, 400);
  }

  await screen.update({ status: 'generating' });

  try {
    // 先计算版本号，用于文件命名
    const existingVersions = await ScreenVersion.count({ where: { screenId: screen.id } });
    const versionNumber = existingVersions + 1;

    // 从 Node2 报告中解析参考图索引和 URL
    const node2Report = project.designPlanResult?.fullReport || '';
    const refResult = await getScreenReferenceImages(projectId, screenIndex, project.referenceImageUrls, node2Report);

    const result = await generateScreenImageSmart({
      prompt: screen.prompt,
      referenceImages: refResult?.urls,
      referenceIndices: refResult?.indices,
      screenIndex,
      projectId,
      screenLabel: screen.label,
      versionNumber,
      platform: project.platform as 'domestic' | 'overseas',
    });

    // 版本记录写入独立表
    await ScreenVersion.create({
      id: uuidv4(),
      screenId: screen.id,
      versionNumber,
      prompt: screen.prompt,
      imageUrl: result.imageUrl,
    });

    await screen.update({
      imageUrl: result.imageUrl,
      originalImageUrl: result.originalUrl,
      status: 'generated',
    });

    await project.update({ status: 'reviewing' });

    // 返回版本历史
    const versions = await ScreenVersion.findAll({
      where: { screenId: screen.id },
      order: [['versionNumber', 'ASC']],
    });

    return { imageUrl: result.imageUrl, versions };
  } catch (err: unknown) {
    await screen.update({ status: 'failed' });
    throw err;
  }
}

/**
 * 屏级图片编辑
 * 拿当前屏的最新图作为 base，调用 qwen-image-edit-plus 生成新版本
 * - 追加 ScreenVersion（版本号 +1，文件名带 "修改图" 标识）
 * - 追加 ScreenRevision 记录（feedback = editPrompt，标记来源为「图改」）
 */
export async function editScreen(
  projectId: string,
  screenIndex: number,
  editPrompt: string,
) {
  if (!editPrompt || !editPrompt.trim()) {
    throw new AppError('修改描述不能为空', 400);
  }

  const project = await Project.findByPk(projectId);
  if (!project) throw new AppError('项目不存在', 404);

  const screen = await findScreenByIndex(projectId, screenIndex);
  if (!screen) throw new AppError(`屏 ${screenIndex} 不存在`, 400);
  if (!screen.imageUrl) {
    throw new AppError(`屏 ${screenIndex} 尚未生成图片，无法编辑`, 400);
  }

  await screen.update({ status: 'generating' });

  try {
    const existingVersions = await ScreenVersion.count({ where: { screenId: screen.id } });
    const versionNumber = existingVersions + 1;

    const result = await editScreenImage({
      baseImageUrl: screen.imageUrl,
      editPrompt: editPrompt.trim(),
      screenIndex,
      projectId,
      screenLabel: screen.label,
      versionNumber,
      platform: project.platform as 'domestic' | 'overseas',
    });

    // 版本记录：prompt 字段记录本次编辑意图，便于日后追溯
    await ScreenVersion.create({
      id: uuidv4(),
      screenId: screen.id,
      versionNumber,
      prompt: `[图改] ${editPrompt.trim()}`,
      imageUrl: result.imageUrl,
    });

    // 修改历史：feedback = editPrompt，oldPrompt/newPrompt 保持不变（区别于 reviseScreen 的 prompt 修订）
    await ScreenRevision.create({
      id: uuidv4(),
      screenId: screen.id,
      feedback: editPrompt.trim(),
      oldPrompt: screen.prompt || '',
      newPrompt: screen.prompt || '',
    });

    await screen.update({
      imageUrl: result.imageUrl,
      originalImageUrl: result.originalUrl,
      status: 'generated',
    });

    const versions = await ScreenVersion.findAll({
      where: { screenId: screen.id },
      order: [['versionNumber', 'ASC']],
    });

    return { imageUrl: result.imageUrl, versions };
  } catch (err: unknown) {
    await screen.update({ status: 'failed' });
    throw err;
  }
}

/**
 * 屏级确认
 */
export async function approveScreen(projectId: string, screenIndex: number) {
  const screen = await findScreenByIndex(projectId, screenIndex);
  if (!screen) throw new AppError('屏不存在', 404);

  await screen.update({ status: 'approved' });

  // 检查是否所有屏都已确认
  const allScreens = await Screen.findAll({ where: { projectId } });
  const allApproved = allScreens.every(s => s.status === 'approved');
  if (allApproved) {
    await Project.update({ status: 'composing' }, { where: { id: projectId } });
  }

  return { approved: true, allApproved };
}

/**
 * 屏级修改（含 prompt 修订）
 * 修改记录写入 screen_revisions 表
 */
export async function reviseScreen(
  projectId: string,
  screenIndex: number,
  feedback?: string,
  newPrompt?: string,
) {
  const screen = await findScreenByIndex(projectId, screenIndex);
  if (!screen) throw new AppError('屏不存在', 404);

  const oldPrompt = screen.prompt || '';
  let updatedPrompt = newPrompt || oldPrompt;

  // 如果有反馈，调用 LLM 修改 prompt
  if (feedback && !newPrompt) {
    updatedPrompt = await reviseScreenPrompt(screen.label, oldPrompt, feedback);
  }

  // 修改记录写入独立表
  await ScreenRevision.create({
    id: uuidv4(),
    screenId: screen.id,
    feedback: feedback || '',
    oldPrompt,
    newPrompt: updatedPrompt,
  });

  await screen.update({
    prompt: updatedPrompt,
    status: 'needs_revision',
    revisionFeedback: feedback || '',
  });

  return { prompt: updatedPrompt };
}

/**
 * 导出长图
 * ExportRecord 在 service 层创建，确保原子性
 */
export async function runExport(
  projectId: string,
  format: ExportFormat,
  quality: ExportQuality,
  width: number,
) {
  const screens = await Screen.findAll({
    where: { projectId, status: 'approved' },
    order: [['screenIndex', 'ASC']],
  });

  if (screens.length === 0) {
    throw new AppError('没有已确认的屏可以导出', 400);
  }

  const imagePaths = screens
    .map(s => s.imageUrl)
    .filter((url): url is string => !!url);

  const outputUrl = await composeLongImage({
    projectId,
    imagePaths,
    format,
    quality,
    width,
  });

  await Project.update({ status: 'completed' }, { where: { id: projectId } });

  // 导出记录在 service 层创建（原子性保障）
  await ExportRecord.create({
    id: uuidv4(),
    projectId,
    format,
    quality,
    width,
    outputUrl,
    screenCount: screens.length,
  });

  return { outputUrl, screenCount: screens.length };
}
