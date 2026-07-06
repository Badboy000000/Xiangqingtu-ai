/**
 * 快速测试：阿里百炼 qwen-image-2.0 生图 API
 * 直接调用 API 验证连通性，不依赖后端服务
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const BASE_URL = process.env.BAILIAN_IMAGE_BASE_URL;
const API_KEY  = process.env.BAILIAN_IMAGE_API_KEY;
const MODEL    = process.env.BAILIAN_IMAGE_MODEL || 'qwen-image-2.0-2026-03-03';

console.log('=== 阿里百炼 qwen-image 生图测试 ===');
console.log(`BASE_URL : ${BASE_URL}`);
console.log(`MODEL    : ${MODEL}`);
console.log(`API_KEY  : ${API_KEY ? API_KEY.substring(0, 12) + '...' : '(未配置)'}`);
console.log('');

if (!BASE_URL || !API_KEY) {
  console.error('❌ 请先在 .env 中配置 BAILIAN_IMAGE_BASE_URL 和 BAILIAN_IMAGE_API_KEY');
  process.exit(1);
}

const body = {
  model: MODEL,
  input: {
    messages: [
      {
        role: 'user',
        content: [
          { text: '一张简约的白色陶瓷咖啡杯，放在浅色木质桌面上，柔和的自然光从左侧照射，背景虚化，电商产品摄影风格，高级感' }
        ]
      }
    ]
  },
  parameters: {
    size: '1024*1792',
    n: 1,
    watermark: false
  }
};

console.log('📤 正在发送生图请求（同步调用，可能需要 20-60 秒）...');
console.log(`   提示词: "一张简约的白色陶瓷咖啡杯..."`);
console.log(`   尺寸: 1024*1792 (9:16)`);
console.log('');

const startTime = Date.now();

try {
  const response = await fetch(`${BASE_URL}/generation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  if (!response.ok) {
    const errText = await response.text();
    console.error(`❌ HTTP ${response.status} (${elapsed}s)`);
    console.error(`   响应: ${errText}`);
    process.exit(1);
  }

  const data = await response.json();

  // 检查业务错误
  if (data.code) {
    console.error(`❌ 业务错误 (${elapsed}s)`);
    console.error(`   code: ${data.code}`);
    console.error(`   message: ${data.message}`);
    console.error(`   request_id: ${data.request_id}`);
    process.exit(1);
  }

  // 提取图片 URL
  const imageUrls = [];
  for (const choice of (data.output?.choices || [])) {
    for (const item of (choice.message?.content || [])) {
      // 百炼实际响应中可能没有 type 字段，直接检查 image 是否存在
      if (item.image) {
        imageUrls.push(item.image);
      }
    }
  }

  if (imageUrls.length === 0) {
    console.error(`❌ 未返回图片 (${elapsed}s)`);
    console.error(`   完整响应: ${JSON.stringify(data, null, 2)}`);
    process.exit(1);
  }

  console.log(`✅ 生图成功！(${elapsed}s)`);
  console.log(`   生成图片数: ${imageUrls.length}`);
  console.log(`   图片 URL:`);
  imageUrls.forEach((url, i) => {
    console.log(`   [${i + 1}] ${url}`);
  });

  if (data.usage) {
    console.log(`   分辨率: ${data.usage.size || 'N/A'}`);
    console.log(`   image_count: ${data.usage.image_count || 'N/A'}`);
  }
  console.log(`   request_id: ${data.request_id || 'N/A'}`);

} catch (err) {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.error(`❌ 请求异常 (${elapsed}s)`);
  console.error(`   ${err.message}`);
  process.exit(1);
}
