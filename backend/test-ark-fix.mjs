/**
 * 针对性测试：火山引擎 ARK_API_KEY 修复后的4个失败场景
 * 1. 节点4生图 (Screen generate)
 * 2. 重生成 (Regenerate)
 * 3. 导出长图 (Export)
 * 4. 获取最新导出 (Get latest export)
 */

const BASE = 'http://localhost:3000/api';
let passed = 0, failed = 0;
const results = [];

function log(name, ok, detail = '') {
  const icon = ok ? 'PASS' : 'FAIL';
  console.log(`[${icon}] ${name}${detail ? ' -- ' + detail : ''}`);
  results.push({ name, ok, detail });
  if (ok) passed++; else failed++;
}

async function req(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let data = {};
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { ...data, status: res.status };
}

async function run() {
  const ts = Date.now();
  console.log('\n=== ARK API Key 修复验证测试 ===\n');

  // 0. 健康检查
  try {
    const h = await req('GET', '/health');
    if (h.status !== 200) { console.log('服务不可达，退出'); return; }
    console.log('[OK] 服务可达\n');
  } catch (e) { console.log('服务不可达:', e.message); return; }

  // 1. 注册用户
  console.log('-- 准备: 注册 & 登录 --');
  const regRes = await req('POST', '/auth/register', {
    username: `arktest_${ts}`, email: `arktest_${ts}@test.com`,
    password: 'test123456', nickname: 'ARK测试',
  });
  const TOKEN = regRes.data?.token;
  if (!TOKEN) { console.log('注册失败:', JSON.stringify(regRes)); return; }
  console.log('[OK] 注册成功\n');

  // 2. 创建项目
  console.log('-- 准备: 创建项目 --');
  const projRes = await req('POST', '/projects', {
    name: '小米电动牙刷T500',
    platform: 'domestic',
    sellingPoints: '声波震动38000次/分钟,4种清洁模式,IPX7防水,续航25天',
    targetAudience: '25-40岁注重口腔健康的都市白领',
    priceRange: '199-299元',
    designRequirements: '科技感,简约白底,蓝色点缀',
  }, TOKEN);
  const PID = projRes.data?.id;
  if (!PID) { console.log('创建项目失败:', JSON.stringify(projRes)); return; }
  log('创建项目', true, `id=${PID.substring(0, 8)}`);

  // 3. 节点1
  console.log('\n-- 准备: 节点1 信息整理 --');
  const t1 = Date.now();
  const n1 = await req('POST', `/projects/${PID}/analyze`, null, TOKEN);
  log('节点1完成', n1.status === 200 && !!n1.data, `耗时=${Date.now() - t1}ms`);

  // 4. 节点2
  console.log('-- 准备: 节点2 设计规划 --');
  const t2 = Date.now();
  const n2 = await req('POST', `/projects/${PID}/plan`, null, TOKEN);
  log('节点2完成', n2.status === 200 && !!n2.data, `耗时=${Date.now() - t2}ms`);

  // 5. 节点3
  console.log('-- 准备: 节点3 分屏提示词 --');
  const t3 = Date.now();
  const n3 = await req('POST', `/projects/${PID}/prompts`, null, TOKEN);
  log('节点3完成', n3.status === 200 && !!n3.data, `耗时=${Date.now() - t3}ms`);

  // 6. 节点4前置
  console.log('-- 准备: 节点4前置 --');
  const t4p = Date.now();
  const n4p = await req('POST', `/projects/${PID}/prepare-generate`, null, TOKEN);
  log('节点4前置完成', n4p.status === 200 && !!n4p.data, `耗时=${Date.now() - t4p}ms`);

  // ═══════════════════════════════════════════════════════════
  // 正式测试开始
  // ═══════════════════════════════════════════════════════════
  console.log('\n========================================');
  console.log('  正式测试: 火山引擎 API 相关功能');
  console.log('========================================\n');

  // ── 测试1: 节点4生图 (Screen 1) ──────────────────────────
  console.log('-- 测试1: 节点4生图 (Screen 1) --');
  const tg1 = Date.now();
  const gen1 = await req('POST', `/projects/${PID}/screens/1/generate`, null, TOKEN);
  const gen1Time = Date.now() - tg1;
  log('节点4 Screen1 生图', gen1.status === 200 && !!gen1.data?.imageUrl,
    `status=${gen1.status}, 耗时=${gen1Time}ms, imageUrl=${gen1.data?.imageUrl || gen1.error || JSON.stringify(gen1).substring(0, 200)}`);

  // ── 测试2: 节点4生图 (Screen 2) ──────────────────────────
  console.log('\n-- 测试2: 节点4生图 (Screen 2) --');
  const tg2 = Date.now();
  const gen2 = await req('POST', `/projects/${PID}/screens/2/generate`, null, TOKEN);
  const gen2Time = Date.now() - tg2;
  log('节点4 Screen2 生图', gen2.status === 200 && !!gen2.data?.imageUrl,
    `status=${gen2.status}, 耗时=${gen2Time}ms, imageUrl=${gen2.data?.imageUrl || gen2.error || JSON.stringify(gen2).substring(0, 200)}`);

  // 确认Screen1以便后续导出
  await req('POST', `/projects/${PID}/screens/1/approve`, null, TOKEN);
  await req('POST', `/projects/${PID}/screens/2/approve`, null, TOKEN);

  // ── 测试3: 重生成 (Regenerate Screen 2) ──────────────────
  console.log('\n-- 测试3: 重生成 (Regenerate Screen 2) --');
  // 先修改再重生成
  const reviseRes = await req('POST', `/projects/${PID}/screens/2/revise`, {
    feedback: '背景颜色太暗了，请改成明亮的白色背景',
  }, TOKEN);
  log('屏级修改成功', reviseRes.status === 200, `status=${reviseRes.status}`);

  const tr = Date.now();
  const regen = await req('POST', `/projects/${PID}/screens/2/regenerate`, null, TOKEN);
  const regenTime = Date.now() - tr;
  log('重生成 Screen2', regen.status === 200 && !!regen.data,
    `status=${regen.status}, 耗时=${regenTime}ms, imageUrl=${regen.data?.imageUrl || regen.error || JSON.stringify(regen).substring(0, 200)}`);

  // 确认后用于导出
  await req('POST', `/projects/${PID}/screens/2/approve`, null, TOKEN);

  // ── 测试4: 导出长图 ──────────────────────────────────────
  console.log('\n-- 测试4: 导出长图 --');
  const projBeforeExport = await req('GET', `/projects/${PID}`, null, TOKEN);
  const approvedCount = (projBeforeExport.data?.screens || []).filter(s => s.status === 'approved').length;
  console.log(`  已确认屏数: ${approvedCount}`);

  const te = Date.now();
  const exportRes = await req('POST', `/projects/${PID}/export`, {
    format: 'JPG', quality: 'hd', width: 750,
  }, TOKEN);
  const exportTime = Date.now() - te;
  log('导出长图', exportRes.status === 200 && !!exportRes.data?.outputUrl,
    `status=${exportRes.status}, 耗时=${exportTime}ms, outputUrl=${exportRes.data?.outputUrl || exportRes.error || JSON.stringify(exportRes).substring(0, 200)}`);
  log('导出 screenCount 正确', exportRes.data?.screenCount === approvedCount,
    `screenCount=${exportRes.data?.screenCount}, expected=${approvedCount}`);

  // 再导出几次验证稳定性
  for (let i = 2; i <= 3; i++) {
    const te2 = Date.now();
    const exp2 = await req('POST', `/projects/${PID}/export`, {
      format: 'PNG', quality: 'standard', width: 750,
    }, TOKEN);
    log(`导出长图 第${i}次`, exp2.status === 200 && !!exp2.data?.outputUrl,
      `status=${exp2.status}, 耗时=${Date.now() - te2}ms, format=PNG`);
  }

  // ── 测试5: 获取最新导出 ──────────────────────────────────
  console.log('\n-- 测试5: 获取最新导出 --');
  const latest = await req('GET', `/projects/${PID}/export/latest`, null, TOKEN);
  log('获取最新导出', latest.status === 200 && !!latest.data?.outputUrl,
    `status=${latest.status}, outputUrl=${latest.data?.outputUrl || latest.error || JSON.stringify(latest).substring(0, 200)}`);
  log('最新导出 format=PNG', latest.data?.format === 'PNG', `format=${latest.data?.format}`);
  log('最新导出 width=750', latest.data?.width === 750, `width=${latest.data?.width}`);

  // 无导出项目测试
  const proj2Res = await req('POST', '/projects', { name: '空项目' }, TOKEN);
  const PID2 = proj2Res.data?.id;
  const noExport = await req('GET', `/projects/${PID2}/export/latest`, null, TOKEN);
  log('无导出记录返回404', noExport.status === 404, `status=${noExport.status}`);

  // 再次获取验证一致性
  const latest2 = await req('GET', `/projects/${PID}/export/latest`, null, TOKEN);
  log('重复获取最新导出一致', latest2.status === 200 && latest2.data?.outputUrl === latest.data?.outputUrl);

  // 清理
  console.log('\n-- 清理 --');
  await req('DELETE', `/projects/${PID}`, null, TOKEN);
  await req('DELETE', `/projects/${PID2}`, null, TOKEN);
  console.log('[OK] 清理完成');

  // 总结
  console.log('\n========================================');
  console.log(`  测试结果: PASS=${passed} | FAIL=${failed}`);
  console.log('========================================\n');
  if (failed > 0) {
    console.log('-- 失败明细 --');
    results.filter(r => !r.ok).forEach(r => console.log(`  FAIL: ${r.name}: ${r.detail}`));
  }
  return { passed, failed };
}

run().then(r => {
  if (r) process.exit(r.failed > 0 ? 1 : 0);
}).catch(e => { console.error('脚本异常:', e); process.exit(2); });
