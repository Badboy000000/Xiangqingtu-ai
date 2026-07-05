import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config';
import type { ExportFormat, ExportQuality } from '../types';

const QUALITY_MAP: Record<ExportQuality, number> = {
  standard: 70,
  hd: 85,
  print: 100,
};

/**
 * 拼接已确认屏为长图
 */
export async function composeLongImage(params: {
  projectId: string;
  imagePaths: string[];   // 本地路径（/uploads/{projectId}/xxx.png）
  format: ExportFormat;
  quality: ExportQuality;
  width: number;
}): Promise<string> {
  // uploads 根目录（绝对路径）
  const uploadsRoot = path.resolve(__dirname, '..', '..', config.upload.dir);
  // 项目子目录
  const projectDir = path.join(uploadsRoot, params.projectId);
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }

  // 读取所有图片并 resize 到统一宽度
  const images: Buffer[] = [];
  for (const imgPath of params.imagePaths) {
    // 解析为绝对路径
    const fullPath = imgPath.startsWith('/uploads/')
      ? path.join(uploadsRoot, imgPath.substring('/uploads/'.length))
      : imgPath;

    const buffer = await sharp(fullPath)
      .resize(params.width, null, { withoutEnlargement: false })
      .png()
      .toBuffer();
    images.push(buffer);
  }

  // 获取每张图片的高度
  const heights: number[] = [];
  for (const buf of images) {
    const meta = await sharp(buf).metadata();
    heights.push(meta.height || 0);
  }

  const totalHeight = heights.reduce((sum, h) => sum + h, 0);

  // 创建画布并拼接
  const composites = images.map((buf, i) => {
    const topOffset = heights.slice(0, i).reduce((sum, h) => sum + h, 0);
    return { input: buf, top: topOffset, left: 0 };
  });

  const extMap: Record<ExportFormat, string> = { JPG: 'jpg', PNG: 'png', WebP: 'webp' };
  const filename = `export_${params.projectId.substring(0, 8)}_${Date.now()}.${extMap[params.format]}`;
  const outputPath = path.join(projectDir, filename);

  const pipeline = sharp({
    create: {
      width: params.width,
      height: totalHeight,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  }).composite(composites);

  const quality = QUALITY_MAP[params.quality];

  if (params.format === 'JPG') {
    await pipeline.jpeg({ quality }).toFile(outputPath);
  } else if (params.format === 'PNG') {
    await pipeline.png({ quality: Math.min(quality, 9) }).toFile(outputPath);
  } else {
    await pipeline.webp({ quality }).toFile(outputPath);
  }

  return `/uploads/${params.projectId}/${filename}`;
}
