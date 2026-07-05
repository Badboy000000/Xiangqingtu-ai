import { Response, NextFunction } from 'express';
import { Project, Screen, DesignModule, ScreenVersion, ScreenRevision, ExportRecord } from '../models';
import { AppError } from '../middleware/error-handler';
import type { AuthRequest } from '../middleware/auth.middleware';
import {
  runNode1, runNode2, runNode3, runNode4,
  approveScreen, reviseScreen, runExport,
} from '../services/workflow.service';

// ─── 项目管理 ─────────────────────────────────────────────

export async function createProject(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.userId) throw new AppError('请先登录', 401);

    const { name, platform, sellingPoints, targetAudience, priceRange, designRequirements, category, referenceStyle, language, screenCount } = req.body;

    // 处理上传的参考图
    const projectId = req.projectId!;
    const referenceImageUrls: string[] = [];
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files as Express.Multer.File[]) {
        referenceImageUrls.push(`/uploads/${projectId}/${file.filename}`);
      }
    }

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
      language: language || 'zh-CN',
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
        { model: DesignModule, as: 'designModules', order: [['moduleIndex', 'ASC']] },
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
    await Screen.destroy({ where: { projectId: id } });
    await ExportRecord.destroy({ where: { projectId: id } });
    await project.destroy();
    res.json({ success: true, message: '项目已删除' });
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
