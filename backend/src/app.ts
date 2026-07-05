import express from 'express';
import cors from 'cors';
import * as path from 'path';
import { config } from './config';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import projectRoutes from './routes/project.routes';
import authRoutes from './routes/auth.routes';

const app = express();

// ─── 中间件 ───────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// ─── 静态文件（uploads 目录） ─────────────────────────────
const uploadsDir = path.resolve(__dirname, '..', config.upload.dir);
app.use('/uploads', express.static(uploadsDir));

// ─── API 路由 ─────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);

// ─── 健康检查 ─────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── 错误处理 ─────────────────────────────────────────────
app.use(errorHandler);

export default app;
