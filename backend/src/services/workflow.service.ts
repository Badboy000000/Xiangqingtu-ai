import { Project, Screen, DesignModule, ScreenVersion, ScreenRevision, ExportRecord } from '../models';
import { v4 as uuidv4 } from 'uuid';
import { analyzeProductInfo } from './node1-info.service';
import { generateDesignPlan } from './node2-plan.service';
import { generateScreenPrompts } from './node3-prompt.service';
import { generateScreenImageSmart } from './node4-image.service';
import { composeLongImage } from './export.service';
import { reviseScreenPrompt } from './node3-prompt.service';
import { AppError } from '../middleware/error-handler';
import type { ProductInfo, ExportFormat, ExportQuality, Node2OutputGlobal } from '../types';

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
    const node2Output = await generateDesignPlan(project.infoAnalysisResult, project.screenCount);

    // 全局部分存入 projects 表
    const designPlanResult: Node2OutputGlobal = {
      overallStyle: node2Output.overallStyle,
      globalVisualSystem: node2Output.globalVisualSystem,
      complianceRules: node2Output.complianceRules,
    };
    await project.update({ designPlanResult, status: 'uploaded' });

    // modules 拆入 design_modules 表
    await DesignModule.destroy({ where: { projectId } }); // 清理旧数据
    for (const m of node2Output.modules) {
      await DesignModule.create({
        id: uuidv4(),
        projectId,
        moduleIndex: m.index,
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
      });
    }

    return node2Output;
  } catch (err: unknown) {
    await project.update({ status: 'failed' });
    throw err;
  }
}

/**
 * 节点3: 分屏 Prompt 生成
 * 全局母提示词存入 projects.prompt_gen_mother_prompt
 * 每屏提示词的 13 个字段全部写入 screens 表
 */
export async function runNode3(projectId: string) {
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

    const node3Output = await generateScreenPrompts(node2Output);

    // 全局母提示词存入 projects 表
    await project.update({ promptGenMotherPrompt: node3Output.globalMotherPrompt });

    // 每屏提示词全部字段写入 screens 表
    for (const sp of node3Output.screenPrompts) {
      // 从 design_modules 获取 theme
      const dm = modules.find(m => m.moduleIndex === sp.screenIndex);

      // 归一化 screenIndex 为 0-based（LLM 可能返回 1-based）
      const normalizedIndex = sp.screenIndex >= 1 ? sp.screenIndex - 1 : sp.screenIndex;

      const [screen] = await Screen.findOrCreate({
        where: { projectId, screenIndex: normalizedIndex },
        defaults: {
          id: uuidv4(),
          projectId,
          screenIndex: normalizedIndex,
          label: sp.label,
          theme: dm?.theme || '',
          status: 'prompt_ready',
          prompt: sp.prompt,
          generationGoal: sp.generationGoal,
          coreVisual: sp.coreVisual,
          compositionStrategy: sp.compositionStrategy,
          subjectProps: sp.subjectProps,
          bgStyle: sp.bgStyle,
          textCarrierLevel: sp.textCarrierLevel,
          productAngle: sp.productAngle,
          consistencyConstraints: sp.consistencyConstraints,
          platformRules: sp.platformRules,
          outputRequirements: sp.outputRequirements,
        },
      });

      // 如果已存在，更新所有字段
      if (screen.status === 'waiting' || !screen.prompt) {
        await screen.update({
          label: sp.label,
          theme: dm?.theme || '',
          prompt: sp.prompt,
          generationGoal: sp.generationGoal,
          coreVisual: sp.coreVisual,
          compositionStrategy: sp.compositionStrategy,
          subjectProps: sp.subjectProps,
          bgStyle: sp.bgStyle,
          textCarrierLevel: sp.textCarrierLevel,
          productAngle: sp.productAngle,
          consistencyConstraints: sp.consistencyConstraints,
          platformRules: sp.platformRules,
          outputRequirements: sp.outputRequirements,
          status: 'prompt_ready',
        });
      }
    }

    return node3Output;
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
