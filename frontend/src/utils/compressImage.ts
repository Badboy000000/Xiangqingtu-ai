/**
 * 图片压缩工具
 * @param file 原始文件
 * @param maxWidth 最大宽度（默认 1920px）
 * @param maxHeight 最大高度（默认 1920px）
 * @param quality 质量（0-1，默认 0.85）
 * @returns 压缩后的 Blob
 */
export async function compressImage(
  file: File,
  maxWidth = 1920,
  maxHeight = 1920,
  quality = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = () => {
      // 计算缩放比例
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }

      // 创建 Canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // 绘制图片
      ctx.drawImage(img, 0, 0, width, height);

      // 导出为 Blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * 批量压缩图片
 * @param files 文件数组
 * @param maxSizeInMB 最大文件大小（MB），超过此大小才压缩（默认 18MB）
 * @returns 压缩后的文件数组
 */
export async function compressImages(
  files: File[],
  maxSizeInMB = 18
): Promise<File[]> {
  const maxSizeBytes = maxSizeInMB * 1024 * 1024;
  const compressedFiles: File[] = [];

  for (const file of files) {
    if (file.size <= maxSizeBytes) {
      // 未超过限制，直接使用原文件
      compressedFiles.push(file);
    } else {
      console.log(`[compressImages] Compressing ${file.name}: ${file.size} -> `);
      
      // 计算合适的质量参数（根据文件大小动态调整）
      const quality = Math.max(0.6, 0.85 - (file.size - maxSizeBytes) / (maxSizeBytes * 10));
      
      try {
        const blob = await compressImage(file, 1920, 1920, quality);
        const compressedFile = new File([blob], file.name, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        
        console.log(`[compressImages] Compressed to: ${compressedFile.size}`);
        compressedFiles.push(compressedFile);
      } catch (error) {
        console.error('[compressImages] Failed to compress:', error);
        // 压缩失败，使用原文件
        compressedFiles.push(file);
      }
    }
  }

  return compressedFiles;
}
