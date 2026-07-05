/**
 * 完整流程测试（不清理数据）- 用于验证数据库持久化
 */
const BASE = 'http://localhost:3000/api';

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
  console.log('\n=== 完整流程测试（保留数据）===\n');

  // 0. 健康检查
  const h = await req('GET', '/health');
  if (h.status !== 200) { console.log('服务不可达'); return; }
  console.log('[OK] 服务可达\n');

  // 1. 注册
  const regRes = await req('POST', '/auth/register', {
    username: `dbcheck_${ts}`, email: `dbcheck_${ts}@test.com`,
    password: 'test123456', nickname: '数据验证',
  });
  const TOKEN = regRes.data?.token;
  if (!TOKEN) { console.log('注册失败:', JSON.stringify(regRes)); return; }
  console.log('[OK] 注册成功');

  // 2. 创建项目
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
  console.log('[OK] 创建项目 id=' + PID.substring(0, 8));

  // 3. 节点1
  console.log('\n-- 节点1 信息整理 --');
  const t1 = Date.now();
  const n1 = await req('POST', `/projects/${PID}/analyze`, null, TOKEN);
  console.log(`  节点1: status=${n1.status}, 耗时=${Date.now()-t1}ms`);

  // 4. 节点2
  console.log('-- 节点2 设计规划 --');
  const t2 = Date.now();
  const n2 = await req('POST', `/projects/${PID}/plan`, null, TOKEN);
  console.log(`  节点2: status=${n2.status}, 耗时=${Date.now()-t2}ms`);

  // 5. 节点3
  console.log('-- 节点3 分屏提示词 --');
  const t3 = Date.now();
  const n3 = await req('POST', `/projects/${PID}/prompts`, null, TOKEN);
  console.log(`  节点3: status=${n3.status}, 耗时=${Date.now()-t3}ms`);

  // 6. 节点4前置
  console.log('-- 节点4前置 --');
  const t4p = Date.now();
  const n4p = await req('POST', `/projects/${PID}/prepare-generate`, null, TOKEN);
  console.log(`  节点4前置: status=${n4p.status}, 耗时=${Date.now()-t4p}ms`);

  // 7. 节点4 生图 (Screen 1)
  console.log('-- 节点4 Screen1 生图 --');
  const tg1 = Date.now();
  const gen1 = await req('POST', `/projects/${PID}/screens/1/generate`, null, TOKEN);
  console.log(`  Screen1生图: status=${gen1.status}, 耗时=${Date.now()-tg1}ms`);

  // 8. 节点4 生图 (Screen 2)
  console.log('-- 节点4 Screen2 生图 --');
  const tg2 = Date.now();
  const gen2 = await req('POST', `/projects/${PID}/screens/2/generate`, null, TOKEN);
  console.log(`  Screen2生图: status=${gen2.status}, 耗时=${Date.now()-tg2}ms`);

  // 9. 确认
  await req('POST', `/projects/${PID}/screens/1/approve`, null, TOKEN);
  await req('POST', `/projects/${PID}/screens/2/approve`, null, TOKEN);
  console.log('[OK] 两屏已确认');

  // 10. 屏级修改
  const reviseRes = await req('POST', `/projects/${PID}/screens/2/revise`, {
    feedback: '背景颜色太暗了，请改成明亮的白色背景',
  }, TOKEN);
  console.log(`  屏级修改: status=${reviseRes.status}`);

  // 11. 重生成
  console.log('-- 重生成 Screen2 --');
  const tr = Date.now();
  const regen = await req('POST', `/projects/${PID}/screens/2/regenerate`, null, TOKEN);
  console.log(`  重生成: status=${regen.status}, 耗时=${Date.now()-tr}ms`);
  if (regen.status === 200) {
    await req('POST', `/projects/${PID}/screens/2/approve`, null, TOKEN);
  }

  // 12. 导出
  console.log('\n-- 导出长图 --');
  const exportRes = await req('POST', `/projects/${PID}/export`, {
    format: 'JPG', quality: 'hd', width: 750,
  }, TOKEN);
  console.log(`  导出: status=${exportRes.status}`);

  console.log('\n========================================');
  console.log('  全流程完成！数据已保留在数据库中。');
  console.log(`  项目ID: ${PID}`);
  console.log('========================================\n');
}

run().catch(e => { console.error('异常:', e.message); process.exit(1); });
