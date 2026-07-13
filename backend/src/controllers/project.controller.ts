import { Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import fs from 'fs';
import path from 'path';
import { Project, Screen, ScreenVersion, ScreenRevision, ExportRecord } from '../models';
import { AppError } from '../middleware/error-handler';
import type { AuthRequest } from '../middleware/auth.middleware';
import {
  runNode1, runNode2, runNode3, runNode4,
  approveScreen, reviseScreen, editScreen, runExport,
} from '../services/workflow.service';
import { config } from '../config';

const TRASH_RETENTION_DAYS = 7;

function getTrashCutoff() {
  return new Date(Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

// ─── 项目管理 ─────────────────────────────────────────────

export async function createProject(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.userId) throw new AppError('请先登录', 401);

    const { name, platform, sellingPoints, targetAudience, priceRange, designRequirements, category, referenceStyle, language, screenCount, material, productSpecs } = req.body;

    // 处理上传的参考图
    const projectId = req.projectId!;
    const referenceImageUrls: string[] = [];
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files as Express.Multer.File[]) {
        referenceImageUrls.push(`/uploads/${projectId}/${file.filename}`);
      }
    }

    // 自动语言逻辑：根据平台自动设定语种
    const resolvedLanguage = language || (platform === 'overseas' ? 'en' : 'zh-CN');

    const project = await Project.create({
      id: projectId,
      userId: req.userId!,
      name,
      platform: platform || 'domestic',
      status: 'created',
      screenCount: Math.min(12, Math.max(4, parseInt(screenCount) || 8)),
      // 商品信息拆为独立列
      sellingPoints: sellingPoints || '',
      targetAudience: targetAudience || '',
      priceRange: priceRange || '',
      designRequirements: designRequirements || '',
      category: category || '',
      referenceStyle: referenceStyle || '',
      referenceImageUrls,
      language: resolvedLanguage,
      material: material || '',
      productSpecs: productSpecs || '',
    });

    res.json({ success: true, data: project.toJSON() });
  } catch (err) {
    next(err);
  }
}

export async function getProject(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.userId) throw new AppError('请先登录', 401);
    const id = req.params.id as string;
    const project = await Project.findOne({
      where: { id, userId: req.userId },
      include: [
        {
          model: Screen, as: 'screens',
          include: [
            { model: ScreenVersion, as: 'versions', order: [['versionNumber', 'ASC']] },
            { model: ScreenRevision, as: 'revisions', order: [['createdAt', 'DESC']] },
          ],
        },
        { model: ExportRecord, as: 'exportRecords', order: [['createdAt', 'DESC']] },
      ],
      order: [[{ model: Screen, as: 'screens' }, 'screenIndex', 'ASC']],
    });
    if (!project) throw new AppError('项目不存在', 404);
    res.json({ success: true, data: project.toJSON() });
  } catch (err) {
    next(err);
  }
}

export async function deleteProject(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.userId) throw new AppError('请先登录', 401);
    const id = req.params.id as string;
    const project = await Project.findOne({ where: { id, userId: req.userId } });
    if (!project) throw new AppError('项目不存在', 404);
    await project.destroy(); // 软删除：仅设置 deletedAt，不删除子记录
    res.json({ success: true, message: '项目已移入回收站' });
  } catch (err) {
    next(err);
  }
}

export async function restoreProject(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.userId) throw new AppError('请先登录', 401);
    const id = req.params.id as string;
    const cutoff = getTrashCutoff();
    const project = await Project.findOne({
      where: {
        id,
        userId: req.userId,
        deletedAt: { [Op.gte]: cutoff },
      },
      paranoid: false,
    });
    if (!project || !project.deletedAt) throw new AppError('项目不存在或已超过恢复期限', 404);
    await project.restore();
    res.json({ success: true, message: '项目已恢复' });
  } catch (err) {
    next(err);
  }
}

export async function listDeletedProjects(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.userId) throw new AppError('请先登录', 401);
    const cutoff = getTrashCutoff();
    const projects = await Project.findAll({
      where: {
        userId: req.userId,
        deletedAt: { [Op.gte]: cutoff },
      },
      paranoid: false,
      order: [['deletedAt', 'DESC']],
    });
    res.json({ success: true, data: projects.map(p => p.toJSON()) });
  } catch (err) {
    next(err);
  }
}

export async function listProjects(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const where = req.userId ? { userId: req.userId } : {};
    const projects = await Project.findAll({
      where,
      order: [['createdAt', 'DESC']],
      include: [{ model: Screen, as: 'screens' }],
    });
    res.json({ success: true, data: projects.map(p => p.toJSON()) });
  } catch (err) {
    next(err);
  }
}

// ─── 四节点工作流 ─────────────────────────────────────────

export async function analyzeProject(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const result = await runNode1(id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function planProject(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const result = await runNode2(id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function generatePrompts(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const result = await runNode3(id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function generateScreen(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const screenIndex = parseInt(req.params.idx as string, 10);
    const result = await runNode4(id, screenIndex);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ─── 屏级确认 ─────────────────────────────────────────────

export async function approveScreenHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const screenIndex = parseInt(req.params.idx as string, 10);
    const result = await approveScreen(id, screenIndex);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function reviseScreenHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const screenIndex = parseInt(req.params.idx as string, 10);
    const { prompt, feedback } = req.body;
    const result = await reviseScreen(id, screenIndex, feedback, prompt);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function editScreenHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const screenIndex = parseInt(req.params.idx as string, 10);
    const { editPrompt } = req.body;
    const result = await editScreen(id, screenIndex, editPrompt);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ─── 内容编辑（用户手动修改节点输出）─────────────────────

export async function updateDesignPlan(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const { fullReport } = req.body;
    if (!fullReport) throw new AppError('缺少 fullReport 字段', 400);

    const project = await Project.findByPk(id);
    if (!project) throw new AppError('项目不存在', 404);

    await project.update({ designPlanResult: { fullReport } });
    res.json({ success: true, data: { fullReport } });
  } catch (err) {
    next(err);
  }
}

// ─── 导出 ─────────────────────────────────────────────────

export async function exportProject(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const { format, quality, width } = req.body;
    // ExportRecord 已在 runExport 内创建，确保原子性
    const result = await runExport(
      id,
      format || 'JPG',
      quality || 'hd',
      width || 750,
    );

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ─── 项目复制（深拷贝：含所有节点输出、分屏数据、图片文件）──

/**
 * 把 srcPath 指向的文件拷到 destPath（自动创建目录），失败静默返回 false
 */
function safeCopyFile(srcPath: string, destPath: string): boolean {
  if (!srcPath || srcPath === destPath) return false;
  try {
    if (!fs.existsSync(srcPath)) return false;
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(srcPath, destPath);
    return true;
  } catch { return false; }
}

/**
 * 把 /uploads/{oldId}/xxx 映射到 /uploads/{newId}/xxx 并拷贝文件，返回新路径
 */
function remapUploadUrl(url: string, oldId: string, newId: string, uploadsRoot: string): string {
  if (!url || !url.startsWith('/uploads/')) return url;
  const afterPrefix = url.substring('/uploads/'.length);   // oldId/xxx.png
  const segments = afterPrefix.split('/');
  if (segments[0] !== oldId) return url;                   // 异常路径原样返回
  segments[0] = newId;
  const destRelative = segments.join('/');
  safeCopyFile(
    path.join(uploadsRoot, afterPrefix),
    path.join(uploadsRoot, destRelative),
  );
  return `/uploads/${destRelative}`;
}

export async function duplicateProject(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.userId) throw new AppError('请先登录', 401);
    const id = req.params.id as string;
    const source = await Project.findOne({ where: { id, userId: req.userId } });
    if (!source) throw new AppError('项目不存在', 404);

    const uploadsRoot = path.resolve(__dirname, '..', '..', config.upload.dir);

    // 1. 查原分屏
    const sourceScreens = await Screen.findAll({
      where: { projectId: id },
      order: [['screenIndex', 'ASC']],
    });

    // 2. 创建新项目（先写入临时 referenceImageUrls，后面更新为正确路径）
    const newProject = await Project.create({
      userId: req.userId!,
      name: `${source.name}（副本）`,
      platform: source.platform,
      language: source.language,
      status: source.status,
      screenCount: source.screenCount,
      sellingPoints: source.sellingPoints,
      targetAudience: source.targetAudience,
      priceRange: source.priceRange,
      designRequirements: source.designRequirements,
      category: source.category,
      referenceStyle: source.referenceStyle,
      material: source.material,
      productSpecs: source.productSpecs,
      // 节点输出全部拷贝
      infoAnalysisResult: source.infoAnalysisResult,
      designPlanResult: source.designPlanResult,
      promptGenMotherPrompt: source.promptGenMotherPrompt,
      jointGenInstruction: source.jointGenInstruction,
      referenceImageUrls: source.referenceImageUrls || [],
    });
    const newId = newProject.id;

    // 3. 拷贝参考图文件 + 修正路径
    const refUrls = source.referenceImageUrls as string[] || [];
    const newRefUrls = refUrls.map((u: string) => remapUploadUrl(u, id, newId, uploadsRoot));
    await newProject.update({ referenceImageUrls: newRefUrls });

    // 4. 创建分屏——深拷贝 prompt、status、图片等
    const newScreens = await Promise.all(sourceScreens.map(s =>
      Screen.create({
        projectId: newId,
        screenIndex: s.screenIndex,
        label: s.label,
        theme: s.theme,
        status: s.status,
        prompt: s.prompt,
        imageUrl: s.imageUrl ? remapUploadUrl(s.imageUrl, id, newId, uploadsRoot) : null,
        originalImageUrl: s.originalImageUrl ? remapUploadUrl(s.originalImageUrl, id, newId, uploadsRoot) : null,
        revisionFeedback: s.revisionFeedback,
      })
    ));

    res.json({
      success: true,
      data: {
        ...newProject.toJSON(),
        screens: newScreens,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getLatestExport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const record = await ExportRecord.findOne({
      where: { projectId: req.params.id as string },
      order: [['createdAt', 'DESC']],
    });
    if (!record) throw new AppError('暂无导出记录', 404);
    res.json({ success: true, data: record.toJSON() });
  } catch (err) {
    next(err);
  }
}
