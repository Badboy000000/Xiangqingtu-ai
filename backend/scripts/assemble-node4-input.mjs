/**
 * Node4 生图输入源组装脚本
 *
 * 读取 Node3 输出的各屏 JSON 数据，解析 prompt 中的参考图描述，
 * 生成符合 Node4 输入规范的 Markdown 文件（与 node4-screen-N-input.md 结构一致）。
 *
 * 用法：node backend/scripts/assemble-node4-input.mjs
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

// ==================== 配置区 ====================

const PROJECT_ID = '9dd07de4-a517-457c-83a2-bce7b6e2ffa6';
const PLATFORM = 'domestic';
const API_SIZE = '790*1400';
const VERSION_NUMBER = 1;

/**
 * 项目参考图清单（按原始索引排列）
 * 文件名格式：{projectId}_cankaotu{N}.jpg
 */
const REFERENCE_IMAGES = [
  `/uploads/${PROJECT_ID}/${PROJECT_ID}_cankaotu1.jpg`,
  `/uploads/${PROJECT_ID}/${PROJECT_ID}_cankaotu2.jpg`,
  `/uploads/${PROJECT_ID}/${PROJECT_ID}_cankaotu3.jpg`,
  `/uploads/${PROJECT_ID}/${PROJECT_ID}_cankaotu4.jpg`,
];

/**
 * Node3 输出数据（5 屏）
 * 来源：node3-screen-{1~5}-output-对比.md
 */
const NODE3_OUTPUTS = [
  {
    screenIndex: 0,
    label: '原木生香，伴爱成长',
    prompt: '以下参考图按顺序依次为：图1是米白陶瓷盘中筷子与黄豆静物生活场景，图2是麻绳十字捆绑的天然木筷包装展示。将图1中的餐桌静物构图作为主视觉基础，保留产品摆放方式与自然光影，将图2中的麻绳包装元素作为辅助视觉细节融入画面，呈现产品的自然手作气质。电商详情页第1屏，竖版手机端设计，宽度750高度1500像素的比例。采用45度侧俯拍视角，画面中心为陶瓷盘与亲子筷组合，背景使用高质感米白色纹理纸，周围保留充足留白，加入小碗黄豆作为比例参照，右上方加入柔和植物阴影。整体采用柔和自然侧光，模拟清晨窗边光线，形成轻淡长阴影。顶部核心标题："天然铁木 · 亲子食光"，方正兰亭黑，80px，字重900，深棕色；中部副标题："甄选坚硬原木，定制专属尺寸，守护全家舌尖安全"，方正兰亭黑，30px，字重500，暖灰色；底部标签组："天然材质" "亲子设计" "耐用防霉"，方正兰亭黑，29px，字重600，米白底衬。禁止改变产品颜色、材质、形状和比例。日式侘寂、自然主义、高级电商、大量留白、专业产品摄影质感，no watermark, no gibberish text',
  },
  {
    screenIndex: 1,
    label: '坚硬如铁，温润如玉',
    prompt: '以下参考图按顺序依次为：图1是筷身Logo与木纹细节特写，图2是多双筷子平行排列展示。将图1中的筷身局部纹理与端面细节作为微距材质展示主体，结合图2中的排列形态辅助呈现产品整体质感。电商详情页第2屏，竖版手机端设计，宽度750高度1500像素的比例。采用微距平视侧视角，聚焦单根筷子中段，画面放大展示细腻纹理和圆润轮廓，背景保持浅米色自然材质，一角虚化加入原木切片作为天然来源氛围元素，利用侧逆光形成柔和阴影。顶部模块标题："拒绝冰冷，回归自然触感"，方正兰亭黑，72px，字重900，深棕色；中部副标题："精选高密度铁木，质地坚硬紧密，不易发霉变形"，方正兰亭黑，30px，字重500，暖灰色；底部标签组："细腻木纹" "磨砂手感" "经久耐用"，方正兰亭黑，29px，字重600，米白底衬。禁止改变产品颜色、材质、形状和比例。日式侘寂、自然主义、高级电商、微距产品摄影质感，no watermark, no gibberish text',
  },
  {
    screenIndex: 2,
    label: '大手牵小手，成长同步',
    prompt: '以下参考图按顺序依次为：图1是盘中静物场景中成人筷与儿童筷长短关系展示，图2是多双筷子平行排列展示。将图1中的亲子筷组合关系作为尺寸对比主体，结合图2中的整齐排列方式呈现产品套装逻辑。电商详情页第3屏，竖版手机端设计，宽度750高度1500像素的比例。采用正面平视结合俯拍视角，将一双成人筷与一双儿童筷平行摆放或呈V字交错，旁边加入简洁刻度尺辅助展示长度关系，背景保持干净米白色，突出亲子尺寸比例和协调感。利用柔和自然侧光形成轻淡阴影，保持日式侘寂自然主义氛围。顶部模块标题："专属尺寸，适配全家手型"，方正兰亭黑，72px，字重900，深棕色；中部副标题："成人23cm优雅进餐 / 儿童18cm轻松抓握"，方正兰亭黑，30px，字重500，暖灰色；底部标签组："人体工学" "大小手配套"，方正兰亭黑，29px，字重600，米白底衬。禁止改变产品颜色、材质、形状和比例。日式侘寂、自然主义、高级电商、专业产品摄影质感，no watermark, no gibberish text',
  },
  {
    screenIndex: 3,
    label: '一日三餐，四季相伴',
    prompt: '以下参考图按顺序依次为：图1是盘中静物与餐桌氛围场景参考，图2是麻绳捆绑的产品包装展示。将图1中的家庭餐桌氛围作为场景基础，融入图2中的手作包装元素作为情感辅助，构建亲子用餐生活画面。电商详情页第4屏，竖版手机端设计，宽度750高度1500像素的比例。采用场景化平视结合略俯拍视角，画面分为两个区域，一侧展示成人手使用长筷夹菜，另一侧展示儿童手使用短筷独立进食，桌面摆放暖色家常菜肴、陶瓷餐具和自然生活道具。整体使用明亮温暖的自然光，模拟家庭餐厅环境，营造共同进餐的幸福感。顶部模块标题："大手牵小手，吃饭更有仪式感"，方正兰亭黑，72px，字重900，深棕色；中部副标题："从小培养自主用餐好习惯，让陪伴更有温度"，方正兰亭黑，30px，字重500，暖灰色；底部标签组："自主进食" "温馨陪伴"，方正兰亭黑，29px，字重600，米白底衬。禁止改变产品颜色、材质、形状和比例。日式侘寂、自然主义、家庭生活摄影、高级电商质感，no watermark, no gibberish text',
  },
  {
    screenIndex: 4,
    label: '产品档案，安心之选',
    prompt: '以下参考图按顺序依次为：图1是麻绳捆绑包装产品展示，图2是多双筷子平行排列组合展示，图3是筷身Logo与端面细节特写，图4是盘中静物生活场景展示。将图1中的完整产品形态作为规格页主体参考，结合图2的组合排列、图3的细节展示和图4的生活化视觉元素，构建完整产品信息展示。电商详情页第5屏，竖版手机端设计，宽度750高度1500像素的比例。采用正面平视结合轻微俯拍视角，左侧放置一双长一双短的产品组合图，右侧设计简洁参数信息区域，加入尺寸辅助线展示18cm与23cm差异，下方加入局部细节放大区域。背景采用浅米色纯净空间，保持高级留白，使用柔和自然侧光增强层次。顶部模块标题："产品参数"，方正兰亭黑，72px，字重900，深棕色；中部正文信息："品名：天然铁木亲子筷" "材质：天然铁木+环保涂层" "规格：成人23cm/儿童18cm" "包含：儿童筷×1 + 成人筷×1"，方正兰亭黑，26px，字重500，暖灰色；底部辅助文字："天然木材纹理各异，皆为自然馈赠。"，方正兰亭黑，22px，字重400，深灰色。禁止改变产品颜色、材质、形状和比例。日式侘寂、自然主义、高级电商、产品信息图摄影质感，no watermark, no gibberish text',
  },
];

// ==================== 核心逻辑 ====================

/**
 * 从 prompt 的"以下参考图按顺序依次为：图1是...图2是..."声明中
 * 解析出该屏引用的参考图编号（1-based），再转为 0-based 索引
 */
function parseRefImageIndicesFromPrompt(prompt) {
  // 匹配"图1""图2"等编号声明
  const declarationMatch = prompt.match(/以下参考图按顺序依次为[：:](.*?)(?:。|$)/);
  if (!declarationMatch) return [];

  const declaration = declarationMatch[1];
  const indices = [];
  const numRegex = /图(\d+)/g;
  let m;
  while ((m = numRegex.exec(declaration)) !== null) {
    const oneBased = parseInt(m[1]);
    indices.push(oneBased - 1); // 转为 0-based
  }
  return indices;
}

/**
 * 根据 prompt 中的参考图描述，构建精简版声明
 * 提取"以下参考图按顺序依次为：图1是...图2是..."这整句
 */
function extractRefDeclaration(prompt) {
  const match = prompt.match(/(以下参考图按顺序依次为[：:].*?。)/);
  return match ? match[1] : '';
}

/**
 * 生成单屏的 Node4 输入 Markdown 内容
 */
function buildNode4InputMarkdown(screen, refImages, refIndices) {
  const screenNum = screen.screenIndex + 1;

  const refLines = refImages.map((url, i) => {
    const origIdx = refIndices[i] !== undefined ? refIndices[i] : i;
    return `${i + 1}. ${url} (原索引${origIdx})`;
  });

  return `# Node4 Screen ${screenNum} Input

## Prompt
\`\`\`
${screen.prompt}
\`\`\`

## Reference Images
${refLines.join('\n')}

## Metadata
- projectId: ${PROJECT_ID}
- screenLabel: ${screen.label}
- versionNumber: ${VERSION_NUMBER}
- platform: ${PLATFORM}
- apiSize: ${API_SIZE}`;
}

// ==================== 执行 ====================

function main() {
  const outputDir = path.join(PROJECT_ROOT, 'backend', 'uploads', 'debug-logs', PROJECT_ID);

  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('='.repeat(60));
  console.log('Node4 生图输入源组装脚本');
  console.log('='.repeat(60));
  console.log(`项目ID: ${PROJECT_ID}`);
  console.log(`参考图总数: ${REFERENCE_IMAGES.length}`);
  console.log(`待处理屏数: ${NODE3_OUTPUTS.length}`);
  console.log(`输出目录: ${outputDir}`);
  console.log('');

  for (const screen of NODE3_OUTPUTS) {
    const screenNum = screen.screenIndex + 1;

    // 1. 从 prompt 中解析参考图索引
    const refIndices = parseRefImageIndicesFromPrompt(screen.prompt);

    // 2. 根据索引取出对应的参考图 URL
    const refImages = refIndices
      .map(idx => REFERENCE_IMAGES[idx])
      .filter(Boolean);

    // 如果解析不到，回退全量
    if (refImages.length === 0) {
      console.warn(`  [屏${screenNum}] 未解析到参考图编号，回退使用全量参考图`);
      refIndices.push(...REFERENCE_IMAGES.map((_, i) => i));
      refImages.push(...REFERENCE_IMAGES);
    }

    // 3. 生成 Markdown
    const mdContent = buildNode4InputMarkdown(screen, refImages, refIndices);
    const filename = `node4-screen-${screenNum}-input.md`;
    const filePath = path.join(outputDir, filename);

    fs.writeFileSync(filePath, mdContent, 'utf-8');

    // 4. 打印摘要
    console.log(`[屏${screenNum}] "${screen.label}"`);
    console.log(`  参考图: ${refIndices.map(i => `图${i + 1}(索引${i})`).join(', ')}`);
    console.log(`  输出: ${filename}`);
    console.log('');
  }

  console.log('='.repeat(60));
  console.log(`全部完成！共生成 ${NODE3_OUTPUTS.length} 个 Node4 输入文件`);
  console.log('='.repeat(60));
}

main();
