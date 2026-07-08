/**
 * E2E 浏览器自动化冒烟测试
 * ─────────────────────────────────────────────
 * 使用 Playwright 模拟真实用户操作：
 *   登录 → 填写产品表单 → 上传参考图 → 触发生成 → 等待工作流完成
 *
 * 运行方式：
 *   npx playwright test e2e-browser.spec.ts        （无头模式）
 *   npx playwright test e2e-browser.spec.ts --headed （有头模式，可观看）
 *   npm run test:e2e                                （默认有头）
 */

import { test, expect, type Page } from '@playwright/test';

// ─── 测试数据 ───────────────────────────────────────────
const BASE_URL = 'http://localhost:5173';
const LOGIN_ACCOUNT = '东篱馆主';
const LOGIN_PASSWORD = 'wj210504qf..';

const PRODUCT_NAME = '天然铁木亲子筷套装';
const SELLING_POINTS = `天然铁木材质，纹理自然细腻，手感温润不冰冷
亲子同款设计，成人筷与儿童筷搭配，培养家庭用餐仪式感
精选原木打造，筷身坚硬耐磨，经久耐用不易变形
符合儿童手型设计，长度适中，帮助孩子学习自主用餐`;
const PRODUCT_SPECS = '产品类型：亲子筷套装、儿童筷长度约18cm、成人筷长度约23cm、筷身直径约0.7-0.8cm、重量约80-120g/套、包装：儿童筷1双+成人筷1双、颜色：天然深木色';
const MATERIAL = '天然铁木、植物木质纤维、环保食品接触级涂层';
const TARGET_AUDIENCE = '3岁以上儿童及注重家庭用餐仪式感的家庭用户';
const PRICE_RANGE = '¥39 - ¥89';
const DESIGN_REQUIREMENTS = '温馨自然、原木质感、突出天然纹理、家庭温暖氛围';
// 分屏数量：4-6 随机
const SCREEN_COUNT = 4 + Math.floor(Math.random() * 3);

// 参考图路径（4 张）—— 绝对路径，Playwright setInputFiles 支持
const REF_IMAGES = [
  'E:/projects/电商详情图生成/backend/uploads/参考图目录/参考图1.jpg',
  'E:/projects/电商详情图生成/backend/uploads/参考图目录/参考图2.jpg',
  'E:/projects/电商详情图生成/backend/uploads/参考图目录/参考图3.jpg',
  'E:/projects/电商详情图生成/backend/uploads/参考图目录/参考图4.jpg',
];

// ─── 辅助函数 ───────────────────────────────────────────
async function waitForMs(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── 测试用例 ───────────────────────────────────────────
test('E2E 冒烟测试：登录 → 填表 → 上传 → 生成工作流', async ({ page }) => {
  // 设置较长超时，工作流可能需要数分钟
  test.setTimeout(24 * 60 * 60 * 1000); // 24 小时，等效于不超时

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 第 1 步：打开首页
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n🔵 第 1 步：打开首页...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await expect(page).toHaveTitle(/.*/); // 页面加载完成
  console.log('  ✅ 首页加载完成');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 第 2 步：点击「登录 / 注册」按钮
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n🔵 第 2 步：导航到登录页...');

  // 先检查是否已经登录（导航栏可能显示用户名而不是登录按钮）
  const alreadyLoggedIn = await page.locator('button', { hasText: '退出' }).isVisible().catch(() => false);
  if (alreadyLoggedIn) {
    console.log('  ℹ️ 已经是登录状态，跳过登录步骤');
  } else {
    // 使用更稳健的选择器，force click 绕过动画
    const loginBtn = page.getByRole('button', { name: /登录\s*[\/／]\s*注册/ });
    await loginBtn.waitFor({ state: 'visible', timeout: 15000 });
    await loginBtn.click({ force: true });
    await page.waitForURL('**/auth**', { timeout: 15000 });
    console.log('  ✅ 已到达登录页');
  }

  if (!alreadyLoggedIn) {
    // 步骤 3-4：登录
    console.log('\n🔵 第 3 步：填写登录表单...');

    // 用户名 / 邮箱 输入框（登录模式下第一个 input[type=text]）
    const accountInput = page.locator('input[type="text"]').first();
    await accountInput.click();
    await accountInput.fill(LOGIN_ACCOUNT);
    console.log('  ✅ 已输入用户名');

    // 密码输入框
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.click();
    await passwordInput.fill(LOGIN_PASSWORD);
    console.log('  ✅ 已输入密码');

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 第 4 步：点击登录按钮
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n🔵 第 4 步：点击登录...');
    const submitBtn = page.getByRole('button', { name: '登录' }).last();
    await submitBtn.click({ force: true });

    // 等待跳转到首页（登录成功后会 replace 到 /）
    await page.waitForURL(url => url.pathname === '/' || url.pathname === '', { timeout: 20000 });
    console.log('  ✅ 登录成功，已跳转到首页');

    // 验证导航栏显示用户名
    await expect(page.locator('text=东篱馆主')).toBeVisible({ timeout: 15000 });
    console.log('  ✅ 导航栏显示用户名：东篱馆主');
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 第 5 步：滚动到表单区域
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n🔵 第 5 步：滚动到产品表单区域...');

  // 滚动到"开始创作"区域
  const sectionHeader = page.locator('text=填写产品信息，一键生成');
  await sectionHeader.scrollIntoViewIfNeeded({ timeout: 10000 });
  await waitForMs(800);
  console.log('  ✅ 已滚动到表单区域');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 第 6 步：填写产品名称
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n🔵 第 6 步：填写产品表单...');

  const productNameInput = page.locator('input[type="text"][placeholder*="索尼"]');
  await productNameInput.click();
  await productNameInput.fill(PRODUCT_NAME);
  console.log(`  ✅ 产品名称：${PRODUCT_NAME}`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 第 7 步：选择平台（国内）
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const domesticBtn = page.locator('button', { hasText: '国内（淘宝 / 京东）' });
  await domesticBtn.click();
  console.log('  ✅ 平台：国内（淘宝 / 京东）');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 第 8 步：填写核心卖点
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const sellingPointsTextarea = page.locator('textarea[placeholder*="行业顶级"]');
  await sellingPointsTextarea.click();
  await sellingPointsTextarea.fill(SELLING_POINTS);
  console.log('  ✅ 核心卖点已填写（4条）');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 第 9 步：填写产品规格参数
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const specsTextarea = page.locator('textarea[placeholder*="尺寸"]');
  await specsTextarea.click();
  await specsTextarea.fill(PRODUCT_SPECS);
  console.log('  ✅ 产品规格参数已填写');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 第 10 步：填写目标人群和价格区间
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const audienceInput = page.locator('input[placeholder*="25-40"]');
  await audienceInput.click();
  await audienceInput.fill(TARGET_AUDIENCE);
  console.log('  ✅ 目标人群已填写');

  const priceInput = page.locator('input[placeholder*="¥"]');
  await priceInput.click();
  await priceInput.fill(PRICE_RANGE);
  console.log('  ✅ 价格区间已填写');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 第 11 步：填写材质
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const materialInput = page.locator('input[placeholder*="头层牛皮"]');
  await materialInput.click();
  await materialInput.fill(MATERIAL);
  console.log('  ✅ 材质已填写');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 第 12 步：设置分屏数量
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n🔵 第 12 步：设置分屏数量...');

  // 找到“分屏数量”标签所在的 Field 容器，然后定位内部的控制区
  // DOM 结构: div > label("分屏数量") + div(flex容器) > button(-) + span(数字) + button(+)
  const screenCountField = page.locator('label', { hasText: '分屏数量' }).locator('..'); // Field 的根 div
  const screenCountControl = screenCountField.locator('> div'); // 内部 flex 容器
  const screenCountSpan = screenCountControl.locator('span').first();

  // 读取当前值，计算差值
  let currentCount = parseInt(await screenCountSpan.textContent() || '8');
  console.log(`  当前分屏数量: ${currentCount}, 目标: ${SCREEN_COUNT}`);

  // 通过 type="button" 的 SVG 图标按钮调整
  const minusBtn = screenCountControl.locator('button[type="button"]').first();
  const plusBtn = screenCountControl.locator('button[type="button"]').last();

  while (currentCount > SCREEN_COUNT) {
    await minusBtn.click();
    currentCount--;
    await waitForMs(200);
  }
  while (currentCount < SCREEN_COUNT) {
    await plusBtn.click();
    currentCount++;
    await waitForMs(200);
  }
  console.log(`  ✅ 分屏数量已设置为 ${SCREEN_COUNT}`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 第 13 步：填写设计元素要求
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const designTextarea = page.locator('textarea[placeholder*="清新简约"]');
  await designTextarea.click();
  await designTextarea.fill(DESIGN_REQUIREMENTS);
  console.log('  ✅ 设计元素要求已填写');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 第 14 步：上传参考图
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n🔵 第 14 步：上传参考图...');

  // 找到隐藏的文件上传 input
  const fileInput = page.locator('input[type="file"][accept*="image"]').first();
  await fileInput.setInputFiles(REF_IMAGES);
  console.log(`  ✅ 已上传 ${REF_IMAGES.length} 张参考图`);

  // 等待图片预览出现
  const thumbnails = page.locator('img[alt^="ref-"]');
  await expect(thumbnails.first()).toBeVisible({ timeout: 10000 });
  const thumbCount = await thumbnails.count();
  console.log(`  ✅ 预览缩略图数量：${thumbCount}`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 第 15 步：截图 - 填写完成的表单
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n📸 截图：表单填写完成状态');
  await page.screenshot({ path: 'e2e-screenshots/01-form-filled.png', fullPage: true });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 第 16 步：点击「开始生成详情图 →」
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n🔵 第 16 步：点击"开始生成详情图"...');

  const generateBtn = page.locator('button', { hasText: '开始生成详情图' });
  await expect(generateBtn).toBeVisible({ timeout: 5000 });
  await generateBtn.click();
  const generateClickTime = Date.now(); // ⬅️ 计时起点：点击生成按钮的时刻
  console.log('  ✅ 已点击生成按钮');
  console.log(`  ⏱️  计时开始：${new Date(generateClickTime).toLocaleTimeString()}`);

  // 注册 Ctrl+C 信号处理：打印总耗时后退出
  process.on('SIGINT', () => {
    const totalMs = Date.now() - generateClickTime;
    const totalSec = Math.round(totalMs / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    console.log('\n' + '='.repeat(50));
    console.log('  🛑 用户按下 Ctrl+C，测试终止');
    console.log(`  ⏱️  总耗时（从点击生成到 Ctrl+C）：${min}分${sec}s（${totalSec}s）`);
    console.log('='.repeat(50));
    process.exit(0);
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 第 17 步：等待跳转到工作台（Canvas）
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n🔵 第 17 步：等待跳转到工作台...');
  await page.waitForURL('**/canvas', { timeout: 30000 });
  console.log('  ✅ 已跳转到工作台页面 /canvas');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 第 18 步：截图 - 工作台初始状态
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  await waitForMs(3000);
  await page.screenshot({ path: 'e2e-screenshots/02-canvas-initial.png', fullPage: true });
  console.log('  📸 截图：工作台初始状态');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 第 19 步：等待工作流完成
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n🔵 第 19 步：等待 AI 工作流执行（可能需要数分钟）...');
  console.log('  ⏳ 监听工作流进度...');

  // 监听网络请求中的 SSE 事件
  const sseResponses: string[] = [];
  page.on('response', async (response) => {
    if (response.url().includes('/workflow/stream')) {
      console.log(`  📡 SSE 连接已建立: ${response.status()}`);
    }
  });

  // 通过检查页面上的工作流进度来判断完成状态
  // 策略：每隔 10 秒截图一次，检查是否所有节点都完成
  const maxWait = 30 * 60 * 1000; // 最多等 30 分钟检测工作流完成
  const startTime = Date.now();
  let completed = false;
  let checkCount = 0;

  while (Date.now() - startTime < maxWait) {
    await waitForMs(10000); // 每 10 秒检查一次
    checkCount++;

    // 截图记录进度
    const screenshotPath = `e2e-screenshots/03-workflow-progress-${String(checkCount).padStart(2, '0')}.png`;
    try {
      await page.screenshot({ path: screenshotPath });
    } catch { /* 截图失败忽略 */ }

    // 检查页面上是否出现完成标志
    // 工作流完成后，Canvas 页面通常会显示所有面板的内容
    try {
      // 检查 node4 是否完成（最后一步图片生成）
      const pageText = await page.textContent('body');

      if (pageText?.includes('完成') || pageText?.includes('全部完成')) {
        // 额外等待 5 秒确保所有图片都加载完
        await waitForMs(5000);
        completed = true;
        console.log('  ✅ 检测到工作流完成标志！');
        break;
      }

      // 也检查是否出现生成的图片（ImagesPanel 中）
      const generatedImages = await page.locator('.canvas-images-panel img, [class*="image"] img').count();
      if (generatedImages >= SCREEN_COUNT) {
        completed = true;
        console.log(`  ✅ 检测到 ${generatedImages} 张生成图，工作流可能已完成！`);
        break;
      }

      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`  ⏳ 第 ${checkCount} 次检查... 已等待 ${elapsed}s`);
    } catch (e) {
      console.log(`  ⚠️ 检查出错: ${e}`);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 第 20 步：最终截图
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n🔵 第 20 步：截取最终状态...');
  await waitForMs(3000);
  await page.screenshot({ path: 'e2e-screenshots/04-final-state.png', fullPage: true });
  console.log('  📸 最终截图已保存');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 结果报告
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const totalSeconds = Math.round((Date.now() - startTime) / 1000);
  console.log('\n' + '='.repeat(50));
  console.log(`  📊 E2E 测试报告`);
  console.log('='.repeat(50));
  console.log(`  产品名称：${PRODUCT_NAME}`);
  console.log(`  分屏数量：${SCREEN_COUNT}`);
  console.log(`  平台：国内（淘宝 / 京东）`);
  console.log(`  工作流耗时：${totalSeconds}s`);
  console.log(`  工作流状态：${completed ? '✅ 完成' : '⚠️ 超时（可能仍在后台执行）'}`);
  console.log(`  截图目录：e2e-screenshots/`);
  console.log('='.repeat(50));
  console.log('\n  🖥️  浏览器保持打开，请手动查看结果。');
  console.log('  按 Ctrl+C 终止测试。\n');

  // 永不自动结束 —— 保持浏览器打开直到用户手动 Ctrl+C
  // 每 30 秒打印一次心跳，防止 Playwright 认为测试卡死
  while (true) {
    await waitForMs(30000);
    console.log(`  💓 浏览器仍在运行... 已计时 ${Math.round((Date.now() - generateClickTime) / 1000)}s`);
  }
});
