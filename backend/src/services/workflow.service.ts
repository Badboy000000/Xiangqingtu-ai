import { Project, Screen, DesignModule, ScreenVersion, ScreenRevision, ExportRecord } from '../models';
import { v4 as uuidv4 } from 'uuid';
import { analyzeProductInfo } from './node1-info.service';
import { generateDesignPlan } from './node2-plan.service';
import { generateScreenPrompts, generateMotherPrompt, generateSingleScreenPrompt } from './node3-prompt.service';
import { generateScreenImageSmart } from './node4-image.service';
import { composeLongImage } from './export.service';
import { reviseScreenPrompt } from './node3-prompt.service';
import { AppError } from '../middleware/error-handler';
import type { ProductInfo, ExportFormat, ExportQuality, Node2OutputGlobal } from '../types';

/**
 * LLM 输出消毒工具：确保任何字段值都能安全写入 STRING/TEXT 列
 * - 字符串 → 原样返回
 * - 数组 → 智能拼接（字符串元素用 ; 分隔，对象元素 JSON.stringify）
 * - 对象 → JSON.stringify
 * - null/undefined → fallback 默认值
 * - 数字/布尔 → String()
 */
function safeStr(value: unknown, fallback: string = ''): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value
      .map(item =>
        typeof item === 'string' ? item :
        (item !== null && item !== undefined) ? JSON.stringify(item) : ''
      )
      .filter(Boolean)
      .join('; ');
  }
  if (typeof value === 'object') {
    // 常见结构化对象智能拼接（如 { title, sub, tags }）
    const obj = value as Record<string, unknown>;
    const parts: string[] = [];
    if (obj.title) parts.push(String(obj.title));
    if (obj.sub) parts.push(String(obj.sub));
    if (Array.isArray(obj.tags)) parts.push(obj.tags.join(', '));
    if (parts.length > 0) return parts.join(' | ');
    // 其他对象直接序列化
    return JSON.stringify(value);
  }
  return fallback;
}

/**
 * 节点1: 信息整理
 * 输出存入 projects.info_analysis_result
 */
export async function runNode1(projectId: string) {
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
    material: project.material,
    productSpecs: project.productSpecs,
  };

  await project.update({ status: 'analyzing' });

  try {
    let infoAnalysisResult = await analyzeProductInfo(productInfo);
    
    // 防御性处理：LLM 可能返回 {infoAnalysisResult: {...}} 包装格式
    // 需要解包为 {basicInfo: {...}, productCore: {...}} 标准格式
    if (infoAnalysisResult && (infoAnalysisResult as any).infoAnalysisResult) {
      console.warn('[Node1] Result is wrapped in infoAnalysisResult, unwrapping');
      infoAnalysisResult = (infoAnalysisResult as any).infoAnalysisResult;
    }
    
    console.log('[Node1] Result keys:', Object.keys(infoAnalysisResult));
    console.log('[Node1] Has basicInfo:', !!(infoAnalysisResult as any).basicInfo);
    
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
 * 全局部分存入 projects.design_plan_result
 * modules 数组拆入 design_modules 表
 */
export async function runNode2(projectId: string) {
  const project = await Project.findByPk(projectId);
  if (!project) throw new AppError('项目不存在', 404);
  if (!project.infoAnalysisResult) {
    throw new AppError('请先完成节点1（信息整理）', 400);
  }

  await project.update({ status: 'planning' });

  try {
    let node2Output = await generateDesignPlan(project.infoAnalysisResult, project.screenCount);

    // 防御性处理：LLM 可能包装在额外 key 中
    if (node2Output && (node2Output as any).designPlan) {
      console.warn('[Node2] Result is wrapped in designPlan, unwrapping');
      node2Output = (node2Output as any).designPlan;
    }

    // 防御性处理：LLM 可能用 screens 代替 modules
    if (!node2Output.modules && (node2Output as any).screens) {
      console.warn('[Node2] LLM used "screens" instead of "modules", mapping fields');
      const screens = (node2Output as any).screens as any[];
      node2Output.modules = screens.map((s: any, i: number) => ({
        index: s.index ?? i,
        theme: s.theme || s.role || `模块${i}`,
        actualImageType: s.actualImageType || '全幅主图',
        coreVisual: s.coreVisual || s.goal || '',
        bgStyle: s.bgStyle || '',
        visualStrategy: s.visualStrategy || s.visual || '',
        characterPropSuggestions: s.characterPropSuggestions || '无',
        platformRules: s.platformRules || '',
        textDirection: s.textDirection || (s.copy ? `${s.copy.title}${s.copy.sub ? ' ' + s.copy.sub : ''}` : ''),
        productAngle: s.productAngle || '正面平视',
        coordination: s.coordination || '',
      }));
    }

    // 防御性处理：LLM 可能用 style 代替 globalVisualSystem
    if (!node2Output.globalVisualSystem && (node2Output as any).style) {
      console.warn('[Node2] LLM used "style" instead of "globalVisualSystem", mapping fields');
      const style = (node2Output as any).style;
      node2Output.globalVisualSystem = {
        bgColor: style.bgColor || style.palette || '',
        mainColor: style.mainColor || style.palette || '',
        accentColor: style.accentColor || '',
        highlightColor: style.highlightColor || '',
        colorRatio: style.colorRatio || '',
        artStyle: style.artStyle || style.mood || '',
        lighting: style.lighting || '',
        rendering: style.rendering || '',
        titleFont: style.titleFont || style.fontVibe || '',
        bodyFont: style.bodyFont || style.fontVibe || '',
        titlePlacement: style.titlePlacement || '',
        fontColorCount: style.fontColorCount || '',
        cardStyle: style.cardStyle || '',
        cornerLineStyle: style.cornerLineStyle || '',
        whitespace: style.whitespace || '',
        hierarchy: style.hierarchy || '',
        categoryAtmosphere: style.categoryAtmosphere || '',
      };
    }

    console.log('[Node2] Output keys:', Object.keys(node2Output));
    console.log('[Node2] Has modules:', Array.isArray(node2Output.modules), 'Count:', node2Output.modules?.length ?? 0);
    console.log('[Node2] Has globalVisualSystem:', !!node2Output.globalVisualSystem);

    if (!Array.isArray(node2Output.modules)) {
      throw new AppError(`Node2 LLM 输出结构异常：缺少 modules 数组。实际 keys: ${Object.keys(node2Output).join(', ')}`, 500);
    }

    // 全局部分存入 projects 表
    const designPlanResult: Node2OutputGlobal = {
      overallStyle: node2Output.overallStyle,
      globalVisualSystem: node2Output.globalVisualSystem,
      complianceRules: node2Output.complianceRules,
    };
    await project.update({ designPlanResult, status: 'uploaded' });

    // modules 拆入 design_modules 表（所有字段通过 safeStr 消毒，防止 LLM 输出对象/数组导致写入失败）
    await DesignModule.destroy({ where: { projectId } }); // 清理旧数据
    for (const m of node2Output.modules) {
      await DesignModule.create({
        id: uuidv4(),
        projectId,
        moduleIndex: typeof m.index === 'number' ? m.index : node2Output.modules.indexOf(m),
        theme: safeStr(m.theme, `模块${node2Output.modules.indexOf(m)}`),
        actualImageType: safeStr(m.actualImageType, '全幅主图'),
        coreVisual: safeStr(m.coreVisual),
        bgStyle: safeStr(m.bgStyle),
        visualStrategy: safeStr(m.visualStrategy),
        characterPropSuggestions: safeStr(m.characterPropSuggestions, '无'),
        platformRules: safeStr(m.platformRules),
        textDirection: safeStr(m.textDirection),
        productAngle: safeStr(m.productAngle, '正面平视'),
        coordination: safeStr(m.coordination),
      });
    }

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
 * Step1: 生成全局母提示词
 * Step2: 逐屏并发生成每屏提示词（每屏完成即触发回调）
 * 全局母提示词存入 projects.prompt_gen_mother_prompt
 * 每屏提示词全部字段写入 screens 表
 */
export async function runNode3(projectId: string, callbacks?: Node3Callbacks) {
  const project = await Project.findByPk(projectId);
  if (!project) throw new AppError('项目不存在', 404);
  if (!project.designPlanResult) {
    throw new AppError('请先完成节点2（设计规划）', 400);
  }

  try {
    // 从 DB 重建完整 node2Output（全局 + modules）供 LLM 使用
    const modules = await DesignModule.findAll({
      where: { projectId },
      order: [['moduleIndex', 'ASC']],
    });
    const node2Output = {
      ...project.designPlanResult,
      modules: modules.map(m => ({
        index: m.moduleIndex,
        theme: m.theme,
        actualImageType: m.actualImageType,
        coreVisual: m.coreVisual,
        bgStyle: m.bgStyle,
        visualStrategy: m.visualStrategy,
        characterPropSuggestions: m.characterPropSuggestions,
        platformRules: m.platformRules,
        textDirection: m.textDirection,
        productAngle: m.productAngle,
        coordination: m.coordination,
      })),
    };

    // ── Step 1: 生成全局母提示词（轻量调用，~5秒） ──
    console.log(`[Node3] Step 1: generating mother prompt...`);
    const motherPrompt = await generateMotherPrompt(node2Output);
    console.log(`[Node3] Mother prompt generated: ${motherPrompt.substring(0, 80)}...`);

    // 全局母提示词存入 projects 表
    await project.update({ promptGenMotherPrompt: motherPrompt });

    // ── Step 2: 逐屏并发生成每屏提示词 ──
    console.log(`[Node3] Step 2: generating ${modules.length} screen prompts in parallel...`);
    const totalScreens = modules.length;
    const screenResults = await Promise.all(
      node2Output.modules.map(async (m, i) => {
        console.log(`[Node3] Screen ${i} (${m.theme}) starting...`);
        try {
          const sp = await generateSingleScreenPrompt({
            module: m,
            motherPrompt: motherPrompt,
            overallStyle: node2Output.overallStyle,
            globalVisualSystem: node2Output.globalVisualSystem,
            screenIndex: i,
            totalScreens,
            onProgress: (chunk, totalLen) => {
              callbacks?.onScreenProgress?.(i, totalLen);
            },
          });
          console.log(`[Node3] Screen ${i} (${m.theme}) completed`);

          // 写入 screens 表
          const dm = modules.find(mod => mod.moduleIndex === i);
          const screenData = {
            label: safeStr(sp.label, `屏${i + 1}`),
            theme: dm?.theme || m.theme,
            prompt: safeStr(sp.prompt),
            generationGoal: safeStr(sp.generationGoal),
            coreVisual: safeStr(sp.coreVisual),
            compositionStrategy: safeStr(sp.compositionStrategy),
            subjectProps: safeStr(sp.subjectProps),
            bgStyle: safeStr(sp.bgStyle),
            textCarrierLevel: safeStr(sp.textCarrierLevel),
            productAngle: safeStr(sp.productAngle),
            consistencyConstraints: safeStr(sp.consistencyConstraints),
            platformRules: safeStr(sp.platformRules),
            outputRequirements: safeStr(sp.outputRequirements),
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
          console.error(`[Node3] Screen ${i} (${m.theme}) failed:`, err.message);
          // 单屏失败不阻断整体流程，返回一个占位对象
          return {
            screenIndex: i,
            label: m.theme,
            prompt: '',
            generationGoal: '',
            coreVisual: '',
            compositionStrategy: '',
            subjectProps: '',
            bgStyle: '',
            textCarrierLevel: '',
            productAngle: '',
            consistencyConstraints: '',
            platformRules: '',
            outputRequirements: '',
            _error: err.message,
          } as any;
        }
      })
    );

    const successCount = screenResults.filter((r: any) => r.prompt && !r._error).length;
    console.log(`[Node3] All screen prompts done: ${successCount}/${totalScreens} succeeded`);

    return {
      globalMotherPrompt: motherPrompt,
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

    const referenceImages = project.referenceImageUrls?.length ? project.referenceImageUrls : undefined;
    const result = await generateScreenImageSmart({
      prompt: screen.prompt,
      referenceImages,
      screenIndex,
      projectId,
      screenLabel: screen.label,
      versionNumber,
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
