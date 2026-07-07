import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    name: process.env.DB_NAME || 'ecommerce_detail',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  },

  ssy: {
    baseUrl: process.env.SSY_BASE_URL || 'https://router.shengsuanyun.com/api/v1',
    apiKey: process.env.SSY_API_KEY || '',
  },

  // 柴犬平台 (GPT Image 2 同步生图)
  chaiquan: {
    baseUrl: process.env.CHAIQUAN_BASE_URL || 'https://image.wucur.com',
    apiKey: process.env.CHAIQUAN_API_KEY || '',
  },

  // 柴犬平台 (GPT-5.5 LLM 聊天)
  chaiquanLLM: {
    baseUrl: process.env.CHAIQUAN_LLM_BASE_URL || 'https://api.2000.run/v1',
    apiKey: process.env.CHAIQUAN_LLM_API_KEY || '',
  },

  // 火山引擎 ARK (已停用，保留备用)
  ark: {
    baseUrl: process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
    apiKey: process.env.ARK_API_KEY || '',
  },

  // 阿里百炼 (qwen3.7-plus LLM + 多模态视觉理解)
  bailian: {
    baseUrl: process.env.BAILIAN_BASE_URL || '',
    apiKey: process.env.BAILIAN_API_KEY || '',
  },

  // 阿里百炼图像生成 (wan2.7-image-pro 系列)
  bailianImage: {
    baseUrl: process.env.BAILIAN_IMAGE_BASE_URL || '',
    apiKey: process.env.BAILIAN_IMAGE_API_KEY || process.env.BAILIAN_API_KEY || '',
    model: process.env.BAILIAN_IMAGE_MODEL || 'wan2.7-image-pro',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'ecommerce-detail-jwt-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
  },
};
