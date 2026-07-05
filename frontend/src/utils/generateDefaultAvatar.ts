/**
 * 根据用户名首字母生成彩色默认头像
 * @param username 用户名
 * @returns Base64 格式的 PNG 图片
 */
export function generateDefaultAvatar(username: string): string {
  // 提取首字母（支持中文和英文）
  const firstChar = username.charAt(0).toUpperCase();
  
  // 预定义的配色方案
  const colors = [
    { bg: '#FF6B6B', text: '#FFF' }, // 红色
    { bg: '#4ECDC4', text: '#FFF' }, // 青色
    { bg: '#45B7D1', text: '#FFF' }, // 蓝色
    { bg: '#FFA07A', text: '#FFF' }, // 橙色
    { bg: '#98D8C8', text: '#333' }, // 绿色
    { bg: '#F7DC6F', text: '#333' }, // 黄色
    { bg: '#BB8FCE', text: '#FFF' }, // 紫色
    { bg: '#85C1E9', text: '#333' }, // 浅蓝
  ];

  // 根据首字母的 Unicode 值选择颜色
  const charCode = firstChar.charCodeAt(0);
  const colorIndex = charCode % colors.length;
  const { bg, text } = colors[colorIndex];

  // 创建 Canvas
  const canvas = document.createElement('canvas');
  const size = 200; // 头像尺寸
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 绘制背景
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // 绘制文字
  ctx.fillStyle = text;
  ctx.font = 'bold 80px "Space Grotesk", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(firstChar, size / 2, size / 2);

  // 导出为 PNG
  return canvas.toDataURL('image/png');
}
