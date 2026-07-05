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

  ark: {
    baseUrl: process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
    apiKey: process.env.ARK_API_KEY || '',
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
