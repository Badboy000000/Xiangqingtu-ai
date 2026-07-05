/**
 * 电商详情图生成系统 —— 业务层面全流程测试脚本
 * 模拟真实用户操作，验证每个功能的业务逻辑正确性
 * 对照《电商详情图_四节点工作流总说明.md》文档逐项验证
 */

const BASE = 'http://localhost:3000/api';

// ── 测试工具 ─────────────────────────────────────────────────
let passed = 0, failed = 0, skipped = 0;
const results = [];
const timings = {};

function log(testName, ok, detail = '') {
  const icon = ok ? 'PASS' : 'FAIL';
  const msg = `[${icon}] ${testName}${detail ? ' — ' + detail : ''}`;
  console.log(msg);
  results.push({ test: testName, ok, detail });
  if (ok) passed++; else failed++;
}

function skip(testName, reason = '') {
  const msg = `[SKIP] ${testName}${reason ? ' — ' + reason : ''}`;
  console.log(msg);
  results.push({ test: testName, ok: null, detail: reason });
  skipped++;
}

async function req(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  // status 始终为 HTTP 状态码，放在展开之后以覆盖 data 中可能存在的 status 字段
  return { ...data, status: res.status };
}

function timerStart(label) { timings[label] = Date.now(); }
function timerEnd(label) {
  const ms = Date.now() - (timings[label] || Date.now());
  timings[label] = ms;
  return ms;
}

// ── 测试数据 ─────────────────────────────────────────────────
const ts = Date.now();
const TEST_USER = {
  username: `testuser_${ts}`,
  email: `test_${ts}@test.com`,
  password: 'test123456',
  nickname: '测试用户',
};

let AUTH_TOKEN = null;
let PROJECT_ID = null;
let SCREEN_COUNT = 0;

// ═══════════════════════════════════════════════════════════════
async function runTests() {
  console.log('\n==================================================');
  console.log('  电商详情图生成系统 - 业务全流程测试');
  console.log('==================================================\n');

  // ── 0. 健康检查 ──────────────────────────────────────────────
  console.log('-- 0. 健康检查 --');
  try {
    const r = await req('GET', '/health');
    log('健康检查接口可达', r.status === 200, `status=${r.status}`);
    log('健康检查返回时间戳', !!r.timestamp, `timestamp=${r.timestamp}`);
  } catch (e) {
    log('健康检查接口可达', false, e.message);
    console.log('\n  后端服务不可达，终止测试。');
    return { passed, failed, skipped, results, timings };
  }

  // ── 1. 用户注册 ──────────────────────────────────────────────
  console.log('\n-- 1. 用户注册 --');

  const regRes = await req('POST', '/auth/register', TEST_USER);
  log('注册成功返回 201', regRes.status === 201, `status=${regRes.status}`);
  log('注册返回 token', !!regRes.data?.token);
  log('注册返回用户信息', !!regRes.data?.user?.id && regRes.data.user.username === TEST_USER.username);
  log('注册返回的密码已脱敏', !regRes.data?.user?.password);
  AUTH_TOKEN = regRes.data?.token;

  const regDupEmail = await req('POST', '/auth/register', { ...TEST_USER, username: `other_${ts}` });
  log('重复邮箱注册被拒绝', regDupEmail.status === 409, `status=${regDupEmail.status}, error=${regDupEmail.error}`);

  const regDupUser = await req('POST', '/auth/register', { ...TEST_USER, email: `other_${ts}@test.com` });
  log('重复用户名注册被拒绝', regDupUser.status === 409, `status=${regDupUser.status}, error=${regDupUser.error}`);

  const regMissing = await req('POST', '/auth/register', { username: 'noemail' });
  log('缺少必填字段被拒绝', regMissing.status === 400, `status=${regMissing.status}`);

  const regShortPwd = await req('POST', '/auth/register', { username: `short_${ts}`, email: `short_${ts}@t.com`, password: '123' });
  log('密码过短被拒绝', regShortPwd.status === 400, `status=${regShortPwd.status}`);

  // ── 2. 用户登录 ──────────────────────────────────────────────
  console.log('\n-- 2. 用户登录 --');

  const loginEmail = await req('POST', '/auth/login', { account: TEST_USER.email, password: TEST_USER.password });
  log('邮箱登录成功', loginEmail.status === 200 && !!loginEmail.data?.token, `status=${loginEmail.status}`);
  log('登录返回完整用户信息', loginEmail.data?.user?.email === TEST_USER.email);

  const loginUser = await req('POST', '/auth/login', { account: TEST_USER.username, password: TEST_USER.password });
  log('用户名登录成功', loginUser.status === 200 && !!loginUser.data?.token);

  const loginBadPwd = await req('POST', '/auth/login', { account: TEST_USER.email, password: 'wrongpwd' });
  log('错误密码被拒绝', loginBadPwd.status === 401, `status=${loginBadPwd.status}`);

  const loginNoUser = await req('POST', '/auth/login', { account: 'nonexist@xx.com', password: '123456' });
  log('不存在账号被拒绝', loginNoUser.status === 401, `status=${loginNoUser.status}`);

  const loginMissing = await req('POST', '/auth/login', { account: TEST_USER.email });
  log('登录缺少密码被拒绝', loginMissing.status === 400, `status=${loginMissing.status}`);

  // ── 3. 获取当前用户 ──────────────────────────────────────────
  console.log('\n-- 3. 获取当前用户 --');

  const meRes = await req('GET', '/auth/me', null, AUTH_TOKEN);
  log('带 token 获取当前用户成功', meRes.status === 200 && meRes.data?.username === TEST_USER.username);
  log('me 接口不返回密码', meRes.data?.password === undefined);

  const meNoToken = await req('GET', '/auth/me');
  log('无 token 访问被拒绝', meNoToken.status === 401);

  const meBadToken = await req('GET', '/auth/me', null, 'invalid.token.here');
  log('无效 token 被拒绝', meBadToken.status === 401);

  // ── 4. 创建项目 ──────────────────────────────────────────────
  console.log('\n-- 4. 创建项目 --');

  const projNoAuth = await req('POST', '/projects', { name: '测试商品' });
  log('无 token 创建项目被拒绝', projNoAuth.status === 401);

  const projRes = await req('POST', '/projects', {
    name: '小米电动牙刷T500',
    platform: 'domestic',
    sellingPoints: '声波震动38000次/分钟,4种清洁模式,IPX7防水,续航25天',
    targetAudience: '25-40岁注重口腔健康的都市白领',
    priceRange: '199-299元',
    designRequirements: '科技感,简约白底,蓝色点缀',
  }, AUTH_TOKEN);
  log('创建项目成功', projRes.status === 200 && !!projRes.data?.id, `id=${projRes.data?.id?.substring(0, 8)}...`);
  log('项目初始状态为 created', projRes.data?.status === 'created', `status=${projRes.data?.status}`);
  log('项目保存了商品信息', !!projRes.data?.productInfo?.name, `name=${projRes.data?.productInfo?.name}`);
  log('项目平台字段正确', projRes.data?.productInfo?.platform === 'domestic');
  log('项目卖点字段正确', projRes.data?.productInfo?.sellingPoints?.includes('声波震动'));
  PROJECT_ID = projRes.data?.id;

  const proj2Res = await req('POST', '/projects', {
    name: '测试商品B', platform: 'overseas', sellingPoints: '测试卖点',
  }, AUTH_TOKEN);
  const PROJECT_ID_2 = proj2Res.data?.id;

  // ── 5. 项目列表 ──────────────────────────────────────────────
  console.log('\n-- 5. 项目列表 --');

  const listRes = await req('GET', '/projects', null, AUTH_TOKEN);
  log('获取项目列表成功', listRes.status === 200 && Array.isArray(listRes.data));
  log('列表包含刚创建的项目', listRes.data?.length >= 2, `共${listRes.data?.length}个项目`);

  // ── 6. 获取项目详情 ──────────────────────────────────────────
  console.log('\n-- 6. 获取项目详情 --');

  const getProjRes = await req('GET', `/projects/${PROJECT_ID}`, null, AUTH_TOKEN);
  log('获取项目详情成功', getProjRes.status === 200 && getProjRes.data?.id === PROJECT_ID);
  log('详情包含 screens 数组', Array.isArray(getProjRes.data?.screens));
  log('详情包含 exportRecords 数组', Array.isArray(getProjRes.data?.exportRecords));

  // ═══════════════════════════════════════════════════════════════
  // ── 7. 节点1：信息整理补全 ────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════
  console.log('\n-- 7. 节点1：信息整理补全 --');

  timerStart('node1');
  const node1Res = await req('POST', `/projects/${PROJECT_ID}/analyze`, null, AUTH_TOKEN);
  const node1Time = timerEnd('node1');
  log('节点1调用成功', node1Res.status === 200 && !!node1Res.data, `status=${node1Res.status}, 耗时=${node1Time}ms`);

  if (node1Res.data) {
    const n1 = node1Res.data;
    // 基础信息字段
    log('节点1 basicInfo.name', !!n1.basicInfo?.name, `name=${n1.basicInfo?.name}`);
    log('节点1 basicInfo.category', !!n1.basicInfo?.category);
    log('节点1 basicInfo.crowdSceneStyle', !!n1.basicInfo?.crowdSceneStyle);
    log('节点1 basicInfo.platform', !!n1.basicInfo?.platform);
    log('节点1 basicInfo.language', !!n1.basicInfo?.language);
    // 商品核心字段
    log('节点1 productCore.coreContent', !!n1.productCore?.coreContent);
    log('节点1 productFacts 为数组且非空', Array.isArray(n1.productCore?.productFacts) && n1.productCore.productFacts.length > 0, `共${n1.productCore?.productFacts?.length}条`);
    log('节点1 visualEvidence 为数组且非空', Array.isArray(n1.productCore?.visualEvidence) && n1.productCore.visualEvidence.length > 0);
    log('节点1 brandVisualGene', !!n1.productCore?.brandVisualGene);
    log('节点1 packagingAppearance', !!n1.productCore?.packagingAppearance);
    log('节点1 actionPropSuggestions 为数组', Array.isArray(n1.productCore?.actionPropSuggestions) && n1.productCore.actionPropSuggestions.length > 0);
    log('节点1 complianceBoundary 为数组', Array.isArray(n1.productCore?.complianceBoundary) && n1.productCore.complianceBoundary.length > 0);
    log('节点1 infoGaps 为数组', Array.isArray(n1.productCore?.infoGaps));
    // 不越权检查
    const n1Str = JSON.stringify(n1);
    log('节点1未越权输出模块规划', !n1Str.includes('"modules"'));
    log('节点1未越权输出screenPrompts', !n1Str.includes('"screenPrompts"'));
    log('节点1未越权输出globalVisualSystem', !n1Str.includes('"globalVisualSystem"'));
    // 信息归纳检查
    log('节点1 coreContent 非原样复制卖点', !(n1.productCore?.coreContent || '').includes('声波震动38000次/分钟,4种清洁模式,IPX7防水,续航25天'));
  }

  const projAfterN1 = await req('GET', `/projects/${PROJECT_ID}`, null, AUTH_TOKEN);
  log('节点1后项目保存了 node1Output', !!projAfterN1.data?.node1Output);
  log('节点1后项目状态非 failed', projAfterN1.data?.status !== 'failed', `status=${projAfterN1.data?.status}`);

  // ═══════════════════════════════════════════════════════════════
  // ── 8. 节点2：详情页设计规划 ──────────────────────────────────
  // ═══════════════════════════════════════════════════════════════
  console.log('\n-- 8. 节点2：详情页设计规划 --');

  const n2BeforeN1 = await req('POST', `/projects/${PROJECT_ID_2}/plan`, null, AUTH_TOKEN);
  log('节点2前置检查：未完成节点1则拒绝', n2BeforeN1.status === 400, `status=${n2BeforeN1.status}`);

  timerStart('node2');
  const node2Res = await req('POST', `/projects/${PROJECT_ID}/plan`, null, AUTH_TOKEN);
  const node2Time = timerEnd('node2');
  log('节点2调用成功', node2Res.status === 200 && !!node2Res.data, `status=${node2Res.status}, 耗时=${node2Time}ms`);

  if (node2Res.data) {
    const n2 = node2Res.data;
    log('节点2 overallStyle', !!n2.overallStyle);
    // 全局视觉系统 17 字段
    log('节点2 globalVisualSystem 存在', !!n2.globalVisualSystem);
    const gvs = n2.globalVisualSystem;
    if (gvs) {
      const gvsFields = ['bgColor', 'mainColor', 'accentColor', 'highlightColor', 'colorRatio',
        'artStyle', 'lighting', 'rendering', 'titleFont', 'bodyFont',
        'titlePlacement', 'fontColorCount', 'cardStyle', 'cornerLineStyle',
        'whitespace', 'hierarchy', 'categoryAtmosphere'];
      const present = gvsFields.filter(f => !!gvs[f]);
      log(`全局视觉系统字段完整性 (${present.length}/${gvsFields.length})`, present.length === gvsFields.length, `缺失: ${gvsFields.filter(f => !gvs[f]).join(', ') || '无'}`);
      log('bgColor 为 HEX 格式', /^#[0-9a-fA-F]{3,8}$/.test(gvs.bgColor || ''), `bgColor=${gvs.bgColor}`);
    }
    log('节点2 complianceRules 为数组', Array.isArray(n2.complianceRules) && n2.complianceRules.length > 0);
    log('节点2 modules 为数组', Array.isArray(n2.modules));
    log('节点2 输出 8 个模块', n2.modules?.length === 8, `实际=${n2.modules?.length}`);

    // 模块顺序
    const expectedThemes = ['首屏品牌主视觉', '核心卖点图', '场景使用图', '效果对比图', '多使用场景图', '品质细节图', '使用方法图', '规格清单图'];
    if (n2.modules?.length === 8) {
      let orderOk = true;
      for (let i = 0; i < 8; i++) {
        if (!n2.modules[i].theme?.includes(expectedThemes[i].substring(0, 4))) orderOk = false;
      }
      log('节点2模块顺序符合文档要求', orderOk, `顺序: ${n2.modules.map(m => m.theme).join(' -> ')}`);
    }
    // 模块字段
    if (n2.modules?.[0]) {
      const m = n2.modules[0];
      const moduleFields = ['index', 'theme', 'actualImageType', 'coreVisual', 'bgStyle',
        'visualStrategy', 'characterPropSuggestions', 'platformRules', 'textDirection', 'productAngle', 'coordination'];
      const fp = moduleFields.filter(f => m[f] !== undefined && m[f] !== null && m[f] !== '');
      log(`模块字段完整性 (${fp.length}/${moduleFields.length})`, fp.length === moduleFields.length, `缺失: ${moduleFields.filter(f => !m[f]).join(', ') || '无'}`);
    }
    // 不越权
    const n2Str = JSON.stringify(n2);
    log('节点2未越权输出screenPrompts', !n2Str.includes('"screenPrompts"'));
    // 不连续同构
    if (n2.modules?.length === 8) {
      let same = false;
      for (let i = 0; i < 7; i++) {
        if (n2.modules[i].coreVisual === n2.modules[i+1].coreVisual && n2.modules[i].bgStyle === n2.modules[i+1].bgStyle && n2.modules[i].productAngle === n2.modules[i+1].productAngle) same = true;
      }
      log('节点2模块不存在连续同构', !same);
    }
  }

  const projAfterN2 = await req('GET', `/projects/${PROJECT_ID}`, null, AUTH_TOKEN);
  log('节点2后项目保存了 node2Output', !!projAfterN2.data?.node2Output);

  // ═══════════════════════════════════════════════════════════════
  // ── 9. 节点3：分屏生图提示词生成 ──────────────────────────────
  // ═══════════════════════════════════════════════════════════════
  console.log('\n-- 9. 节点3：分屏生图提示词生成 --');

  const n3BeforeN2 = await req('POST', `/projects/${PROJECT_ID_2}/prompts`, null, AUTH_TOKEN);
  log('节点3前置检查：未完成节点2则拒绝', n3BeforeN2.status === 400);

  timerStart('node3');
  const node3Res = await req('POST', `/projects/${PROJECT_ID}/prompts`, null, AUTH_TOKEN);
  const node3Time = timerEnd('node3');
  log('节点3调用成功', node3Res.status === 200 && !!node3Res.data, `耗时=${node3Time}ms`);

  if (node3Res.data) {
    const n3 = node3Res.data;
    log('节点3 globalMotherPrompt', !!n3.globalMotherPrompt && n3.globalMotherPrompt.length > 50, `长度=${(n3.globalMotherPrompt || '').length}`);
    log('节点3 screenPrompts 为数组', Array.isArray(n3.screenPrompts));
    SCREEN_COUNT = n3.screenPrompts?.length || 0;
    log('节点3屏数与模块数一致', SCREEN_COUNT === 8, `screenPrompts=${SCREEN_COUNT}`);
    log('节点3每屏都有prompt', SCREEN_COUNT > 0 && n3.screenPrompts.every(sp => !!sp.prompt && sp.prompt.length > 20));

    if (n3.screenPrompts?.[0]) {
      const sp = n3.screenPrompts[0];
      const spFields = ['screenIndex', 'label', 'prompt', 'generationGoal', 'coreVisual',
        'compositionStrategy', 'subjectProps', 'bgStyle', 'textCarrierLevel',
        'productAngle', 'consistencyConstraints', 'platformRules', 'outputRequirements'];
      const spPresent = spFields.filter(f => sp[f] !== undefined && sp[f] !== null && sp[f] !== '');
      log(`屏级prompt字段完整性 (${spPresent.length}/${spFields.length})`, spPresent.length === spFields.length, `缺失: ${spFields.filter(f => !sp[f]).join(', ') || '无'}`);
      log('屏级 prompt 为英文', /[a-zA-Z]{5,}/.test(sp.prompt || ''));
    }

    // prompt 唯一性
    if (n3.screenPrompts?.length > 1) {
      const prompts = n3.screenPrompts.map(sp => sp.prompt);
      log('每屏 prompt 互不相同', new Set(prompts).size === prompts.length);
    }

    // Screen 记录
    const projAfterN3 = await req('GET', `/projects/${PROJECT_ID}`, null, AUTH_TOKEN);
    const screens = projAfterN3.data?.screens || [];
    log('节点3创建了 Screen 记录', screens.length === SCREEN_COUNT, `screen记录数=${screens.length}`);
    if (screens[0]) {
      log('Screen 状态为 prompt_ready', screens[0].status === 'prompt_ready', `status=${screens[0].status}`);
      log('Screen 保存了 prompt', !!screens[0].prompt);
      log('Screen versions 初始为空', Array.isArray(screens[0].versions) && screens[0].versions.length === 0);
    }
  }

  const projAfterN3Save = await req('GET', `/projects/${PROJECT_ID}`, null, AUTH_TOKEN);
  log('节点3后项目保存了 node3Output', !!projAfterN3Save.data?.node3Output);

  // ═══════════════════════════════════════════════════════════════
  // ── 10. 节点4前置：联合生图指令 ──────────────────────────────
  // ═══════════════════════════════════════════════════════════════
  console.log('\n-- 10. 节点4前置：联合生图指令 --');

  const n4prepBefore = await req('POST', `/projects/${PROJECT_ID_2}/prepare-generate`, null, AUTH_TOKEN);
  log('节点4前置检查：未完成节点3则拒绝', n4prepBefore.status === 400);

  timerStart('node4prepare');
  const n4PrepRes = await req('POST', `/projects/${PROJECT_ID}/prepare-generate`, null, AUTH_TOKEN);
  const n4PrepTime = timerEnd('node4prepare');
  log('节点4前置调用成功', n4PrepRes.status === 200 && !!n4PrepRes.data, `耗时=${n4PrepTime}ms`);

  if (n4PrepRes.data) {
    const n4o = n4PrepRes.data;
    log('globalJointInstruction 存在', !!n4o.globalJointInstruction && n4o.globalJointInstruction.length > 20);
    log('screenResults 为数组', Array.isArray(n4o.screenResults) && n4o.screenResults.length > 0);
    if (n4o.screenResults?.[0]) {
      const sr = n4o.screenResults[0];
      log('screenResult 包含 screenIndex', typeof sr.screenIndex === 'number');
      log('screenResult 包含 moduleName', !!sr.moduleName);
      log('screenResult 包含 generationInstruction', !!sr.generationInstruction);
      log('screenResult 包含 consistencyAnchor', !!sr.consistencyAnchor);
      log('screenResult outputStatus 为 ready', sr.outputStatus === 'ready');
    }
  }

  const projAfterN4Prep = await req('GET', `/projects/${PROJECT_ID}`, null, AUTH_TOKEN);
  log('节点4前置后项目保存了 node4Output', !!projAfterN4Prep.data?.node4Output);

  // ═══════════════════════════════════════════════════════════════
  // ── 11. 节点4：单屏生图（仅测试前2屏控制API费用）──────────
  // ═══════════════════════════════════════════════════════════════
  console.log('\n-- 11. 节点4：单屏生图（Screen 1）--');

  timerStart('node4_screen1');
  const genRes = await req('POST', `/projects/${PROJECT_ID}/screens/1/generate`, null, AUTH_TOKEN);
  const genTime1 = timerEnd('node4_screen1');
  log('节点4生图调用成功', genRes.status === 200 && !!genRes.data, `耗时=${genTime1}ms`);

  if (genRes.data) {
    log('生图返回 imageUrl', !!genRes.data.imageUrl);
    log('生图返回 versions 数组', Array.isArray(genRes.data.versions) && genRes.data.versions.length > 0);

    const projAfterGen = await req('GET', `/projects/${PROJECT_ID}`, null, AUTH_TOKEN);
    const screen1g = projAfterGen.data?.screens?.find(s => s.screenIndex === 1);
    log('生图后 Screen 状态为 generated', screen1g?.status === 'generated', `status=${screen1g?.status}`);
    log('生图后 Screen 有 imageUrl', !!screen1g?.imageUrl);
    log('生图后 Screen versions 有1条', screen1g?.versions?.length === 1);
  }

  // ═══════════════════════════════════════════════════════════════
  // ── 12. 屏级确认机制 ──────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════
  console.log('\n-- 12. 屏级确认机制 --');

  const approveRes = await req('POST', `/projects/${PROJECT_ID}/screens/1/approve`, null, AUTH_TOKEN);
  log('屏级确认成功', approveRes.status === 200 && approveRes.data?.approved === true);
  log('确认返回 allApproved 标志', typeof approveRes.data?.allApproved === 'boolean');
  log('仅确认1屏时 allApproved=false', approveRes.data?.allApproved === false);

  const projAfterApprove = await req('GET', `/projects/${PROJECT_ID}`, null, AUTH_TOKEN);
  const screen1a = projAfterApprove.data?.screens?.find(s => s.screenIndex === 1);
  log('确认后 Screen 状态为 approved', screen1a?.status === 'approved');

  const approveNoScreen = await req('POST', `/projects/${PROJECT_ID}/screens/99/approve`, null, AUTH_TOKEN);
  log('不存在屏的确认被拒绝', approveNoScreen.status === 404 || approveNoScreen.status === 500);

  // ═══════════════════════════════════════════════════════════════
  // ── 13. 屏级修改 ──────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════
  console.log('\n-- 13. 屏级修改 --');

  if (SCREEN_COUNT > 1) {
    timerStart('node4_screen2');
    const gen2 = await req('POST', `/projects/${PROJECT_ID}/screens/2/generate`, null, AUTH_TOKEN);
    timerEnd('node4_screen2');
    log('第二屏生图成功', gen2.status === 200, `耗时=${timings.node4_screen2}ms`);

    const reviseRes = await req('POST', `/projects/${PROJECT_ID}/screens/2/revise`, {
      feedback: '背景颜色太暗了，请改成明亮的白色背景',
    }, AUTH_TOKEN);
    log('屏级修改（feedback）成功', reviseRes.status === 200 && !!reviseRes.data?.prompt);

    const projAfterRevise = await req('GET', `/projects/${PROJECT_ID}`, null, AUTH_TOKEN);
    const screen2 = projAfterRevise.data?.screens?.find(s => s.screenIndex === 2);
    log('修改后 Screen 状态为 needs_revision', screen2?.status === 'needs_revision');

    const directPrompt = 'A clean product photo of electric toothbrush on white background, studio lighting';
    const reviseDirect = await req('POST', `/projects/${PROJECT_ID}/screens/2/revise`, {
      prompt: directPrompt,
    }, AUTH_TOKEN);
    log('屏级修改（直接 prompt）成功', reviseDirect.status === 200 && !!reviseDirect.data?.prompt);
    log('直接修改后 prompt 一致', reviseDirect.data?.prompt === directPrompt);

    const regenRes = await req('POST', `/projects/${PROJECT_ID}/screens/2/regenerate`, null, AUTH_TOKEN);
    log('重生成成功', regenRes.status === 200 && !!regenRes.data);
    if (regenRes.data) {
      const projAfterRegen = await req('GET', `/projects/${PROJECT_ID}`, null, AUTH_TOKEN);
      const s2r = projAfterRegen.data?.screens?.find(s => s.screenIndex === 2);
      log('重生成后版本数增加', (s2r?.versions?.length || 0) >= 2, `versions=${s2r?.versions?.length}`);
    }

    const approve2 = await req('POST', `/projects/${PROJECT_ID}/screens/2/approve`, null, AUTH_TOKEN);
    log('第二屏确认成功', approve2.status === 200 && approve2.data?.approved === true);
  } else {
    skip('屏级修改测试', '只有1屏');
  }

  // ── 14. 异常场景 ────────────────────────────────────────────
  console.log('\n-- 14. 异常场景 --');
  const genNoScreen = await req('POST', `/projects/${PROJECT_ID}/screens/99/generate`, null, AUTH_TOKEN);
  log('生成不存在的屏被拒绝', genNoScreen.status === 400 || genNoScreen.status === 404 || genNoScreen.status === 500);

  // ── 15. 导出长图 ──────────────────────────────────────────────
  console.log('\n-- 15. 导出长图 --');

  const projBeforeExport = await req('GET', `/projects/${PROJECT_ID}`, null, AUTH_TOKEN);
  const approvedScreens = (projBeforeExport.data?.screens || []).filter(s => s.status === 'approved');
  log(`已确认屏数量: ${approvedScreens.length}`, approvedScreens.length >= 2);

  timerStart('export');
  const exportRes = await req('POST', `/projects/${PROJECT_ID}/export`, {
    format: 'JPG', quality: 'hd', width: 750,
  }, AUTH_TOKEN);
  const exportTime = timerEnd('export');
  log('导出成功', exportRes.status === 200 && !!exportRes.data?.outputUrl, `耗时=${exportTime}ms`);
  log('导出返回 outputUrl', !!exportRes.data?.outputUrl);
  log('导出返回 screenCount', (exportRes.data?.screenCount || 0) > 0);
  log('screenCount 等于已确认屏数', exportRes.data?.screenCount === approvedScreens.length);

  const projAfterExport = await req('GET', `/projects/${PROJECT_ID}`, null, AUTH_TOKEN);
  log('导出后项目状态为 completed', projAfterExport.data?.status === 'completed');
  log('导出记录已保存', (projAfterExport.data?.exportRecords?.length || 0) > 0);

  // ── 16. 获取最新导出 ──────────────────────────────────────────
  console.log('\n-- 16. 获取最新导出 --');

  const latestExport = await req('GET', `/projects/${PROJECT_ID}/export/latest`, null, AUTH_TOKEN);
  log('获取最新导出成功', latestExport.status === 200 && !!latestExport.data?.outputUrl);
  log('导出记录 format=JPG', latestExport.data?.format === 'JPG');
  log('导出记录 quality=hd', latestExport.data?.quality === 'hd');
  log('导出记录 width=750', latestExport.data?.width === 750);

  const noExport = await req('GET', `/projects/${PROJECT_ID_2}/export/latest`, null, AUTH_TOKEN);
  log('无导出记录返回 404', noExport.status === 404);

  // ── 17. 导出异常 ──────────────────────────────────────────────
  console.log('\n-- 17. 导出异常 --');
  const exportEmpty = await req('POST', `/projects/${PROJECT_ID_2}/export`, { format: 'PNG' }, AUTH_TOKEN);
  log('无已确认屏时导出被拒绝', exportEmpty.status === 400);

  // ── 18. 状态流转验证 ──────────────────────────────────────────
  console.log('\n-- 18. 状态流转验证 --');

  const newProj = await req('POST', '/projects', { name: '状态测试项目' }, AUTH_TOKEN);
  const NEW_PROJ_ID = newProj.data?.id;
  log('新项目状态为 created', newProj.data?.status === 'created');

  await req('POST', `/projects/${NEW_PROJ_ID}/analyze`, null, AUTH_TOKEN);
  const afterN1 = await req('GET', `/projects/${NEW_PROJ_ID}`, null, AUTH_TOKEN);
  log('节点1后状态非 failed', afterN1.data?.status !== 'failed', `status=${afterN1.data?.status}`);

  // ── 19. 项目删除 ──────────────────────────────────────────────
  console.log('\n-- 19. 项目删除 --');

  const delRes = await req('DELETE', `/projects/${PROJECT_ID_2}`, null, AUTH_TOKEN);
  log('删除项目成功', delRes.status === 200);

  const delVerify = await req('GET', `/projects/${PROJECT_ID_2}`, null, AUTH_TOKEN);
  log('删除后无法获取项目', delVerify.status === 404 || delVerify.status === 500);

  const delNoExist = await req('DELETE', '/projects/nonexist-000', null, AUTH_TOKEN);
  log('删除不存在项目返回错误', delNoExist.status === 404 || delNoExist.status === 500);

  // 清理
  await req('DELETE', `/projects/${NEW_PROJ_ID}`, null, AUTH_TOKEN);
  await req('DELETE', `/projects/${PROJECT_ID}`, null, AUTH_TOKEN);

  // ── 总结 ──────────────────────────────────────────────────────
  console.log('\n==================================================');
  console.log(`  测试结果: PASS=${passed} | FAIL=${failed} | SKIP=${skipped}`);
  console.log('==================================================\n');

  console.log('-- 耗时汇总 --');
  Object.entries(timings).forEach(([k, v]) => console.log(`  ${k}: ${v}ms`));
  console.log('');

  if (failed > 0) {
    console.log('-- 失败项明细 --');
    results.filter(r => r.ok === false).forEach(r => console.log(`  FAIL: ${r.test}: ${r.detail}`));
    console.log('');
  }

  return { passed, failed, skipped, results, timings };
}

runTests().then(({ passed, failed, skipped, timings: t }) => {
  const summary = {
    total: passed + failed + skipped, passed, failed, skipped,
    timings: t, timestamp: new Date().toISOString(), results,
  };
  console.log('\n__TEST_SUMMARY__');
  console.log(JSON.stringify(summary, null, 2));
  process.exit(failed > 0 ? 1 : 0);
}).catch(err => {
  console.error('测试脚本异常:', err);
  process.exit(2);
});
