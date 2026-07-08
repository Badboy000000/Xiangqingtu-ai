import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config';
import { authMiddleware } from '../middleware/auth.middleware';
import type { AuthRequest } from '../middleware/auth.middleware';
import {
  createProject, getProject, deleteProject, listProjects,
  analyzeProject, planProject, generatePrompts,
  generateScreen, approveScreenHandler, reviseScreenHandler, editScreenHandler,
  exportProject, getLatestExport,
} from '../controllers/project.controller';
import { streamWorkflow } from '../controllers/workflow-stream.controller';

const router = Router();

// 预生成项目 ID 中间件（在 multer 之前执行）
function preGenerateProjectId(req: AuthRequest, _res: any, next: any) {
  req.projectId = uuidv4();
  (req as any).__fileCounter = 0;
  next();
}

// multer 上传配置：按项目 ID 分目录存储
const storage = multer.diskStorage({
  destination: (req: any, _file, cb) => {
    const projectId = req.projectId;
    const destDir = path.join(config.upload.dir, projectId);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    cb(null, destDir);
  },
  filename: (req: any, file, cb) => {
    const projectId = req.projectId;
    const counter = (req.__fileCounter || 0) + 1;
    req.__fileCounter = counter;
    const ext = path.extname(file.originalname);
    cb(null, `${projectId}_cankaotu${counter}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件格式'));
    }
  },
});

// ─── 项目管理 ─────────────────────────────────────────────
router.post('/', authMiddleware, preGenerateProjectId, upload.array('referenceImages', 10), createProject);
router.get('/', authMiddleware, listProjects);
router.get('/:id', authMiddleware, getProject);
router.delete('/:id', authMiddleware, deleteProject);

// ─── 四节点工作流 ─────────────────────────────────────────
router.post('/:id/analyze', authMiddleware, analyzeProject);       // 节点1
router.post('/:id/plan', authMiddleware, planProject);             // 节点2
router.post('/:id/prompts', authMiddleware, generatePrompts);      // 节点3
router.get('/:id/workflow/stream', authMiddleware, streamWorkflow);  // 流式工作流（SSE）

// ─── 屏级操作 ─────────────────────────────────────────────
router.post('/:id/screens/:idx/generate', authMiddleware, generateScreen);     // 节点4
router.post('/:id/screens/:idx/regenerate', authMiddleware, generateScreen);   // 重生成
router.post('/:id/screens/:idx/approve', authMiddleware, approveScreenHandler);
router.post('/:id/screens/:idx/revise', authMiddleware, reviseScreenHandler);
router.post('/:id/screens/:idx/edit', authMiddleware, editScreenHandler);      // 图片编辑（qwen-image-edit-plus）

// ─── 导出 ─────────────────────────────────────────────────
router.post('/:id/export', authMiddleware, exportProject);
router.get('/:id/export/latest', authMiddleware, getLatestExport);

export default router;
