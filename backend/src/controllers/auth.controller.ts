import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { User } from '../models';
import { config } from '../config';
import { AppError } from '../middleware/error-handler';
import type { AuthRequest } from '../middleware/auth.middleware';

function signToken(user: { id: string; username: string; email: string }) {
  // 7 天 = 604800 秒
  return jwt.sign(user, config.jwt.secret, { expiresIn: 604800 });
}

// ─── 注册 ───────────────────────────────────────────────────
export async function register(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { username, email, password, nickname, avatar } = req.body;

    if (!username || !email || !password) {
      throw new AppError('用户名、邮箱和密码为必填项', 400);
    }
    if (password.length < 6) {
      throw new AppError('密码至少需要 6 个字符', 400);
    }

    // 查重
    const existing = await User.findOne({ where: { email } });
    if (existing) throw new AppError('该邮箱已被注册', 409);

    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) throw new AppError('该用户名已被占用', 409);

    const hashedPassword = await bcrypt.hash(password, 12);

    // 处理头像
    let savedAvatarPath: string | null = null;
    if (avatar && typeof avatar === 'string' && avatar.startsWith('data:image/')) {
      // 确保头像目录存在
      const avatarDir = path.join(__dirname, '../../uploads/avatars');
      if (!fs.existsSync(avatarDir)) {
        fs.mkdirSync(avatarDir, { recursive: true });
      }

      // 解析 Base64 图片（支持 JPEG 和 PNG）
      const matches = avatar.match(/^data:(image\/(?:jpeg|png));base64,(.+)$/);
      if (!matches) {
        throw new AppError('无效的头像格式，仅支持 JPEG 和 PNG', 400);
      }

      const ext = matches[1] === 'image/jpeg' ? 'jpg' : 'png';
      const buffer = Buffer.from(matches[2], 'base64');

      // 验证文件大小（最大 2MB）
      if (buffer.length > 2 * 1024 * 1024) {
        throw new AppError('头像大小不能超过 2MB', 400);
      }

      // 生成唯一文件名
      const filename = `avatar_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      const filepath = path.join(avatarDir, filename);

      // 保存文件
      fs.writeFileSync(filepath, buffer);
      savedAvatarPath = `/uploads/avatars/${filename}`;
      
      console.log(`[Avatar] 头像保存成功: ${filename}, 大小: ${(buffer.length / 1024).toFixed(2)}KB`);
    }

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      nickname: nickname || username,
      avatar: savedAvatarPath,
    });

    const token = signToken({ id: user.id, username: user.username, email: user.email });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          nickname: user.nickname,
          avatar: user.avatar,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── 登录 ───────────────────────────────────────────────────
export async function login(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { account, password } = req.body;

    if (!account || !password) {
      throw new AppError('请输入账号和密码', 400);
    }

    // 支持邮箱或用户名登录
    const user = await User.findOne({
      where: account.includes('@') ? { email: account } : { username: account },
    });
    if (!user) throw new AppError('账号或密码错误', 401);

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new AppError('账号或密码错误', 401);

    const token = signToken({ id: user.id, username: user.username, email: user.email });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          nickname: user.nickname,
          avatar: user.avatar,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── 获取当前用户 ────────────────────────────────────────────
export async function getMe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.userId) throw new AppError('请先登录', 401);

    const user = await User.findByPk(req.userId, {
      attributes: { exclude: ['password'] },
    });
    if (!user) throw new AppError('用户不存在', 404);

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}
