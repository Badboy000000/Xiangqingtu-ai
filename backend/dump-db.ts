import { sequelize } from './src/config/database';

async function dump() {
  await sequelize.authenticate();

  // projects
  const [projects]: any = await sequelize.query('SELECT * FROM projects LIMIT 1');
  const p = projects[0];
  if (!p) { console.log('无项目数据'); await sequelize.close(); return; }
  console.log('\n========== projects ==========');
  console.log('  id:', p.id);
  console.log('  name:', p.name);
  console.log('  platform:', p.platform);
  console.log('  language:', p.language);
  console.log('  status:', p.status);
  console.log('  selling_points:', String(p.selling_points).substring(0, 80));
  console.log('  target_audience:', p.target_audience);
  console.log('  price_range:', p.price_range);
  console.log('  design_requirements:', p.design_requirements);
  console.log('  category:', p.category);
  console.log('  reference_style:', p.reference_style);
  console.log('  reference_image_urls:', p.reference_image_urls);
  console.log('  info_analysis_result:', JSON.stringify(p.info_analysis_result).substring(0, 120) + '...');
  console.log('  design_plan_result:', JSON.stringify(p.design_plan_result).substring(0, 120) + '...');
  console.log('  prompt_gen_mother_prompt:', String(p.prompt_gen_mother_prompt).substring(0, 120) + '...');
  console.log('  joint_gen_instruction:', String(p.joint_gen_instruction).substring(0, 120) + '...');

  // design_modules
  const [modules]: any = await sequelize.query('SELECT * FROM design_modules WHERE project_id = ?', { replacements: [p.id] });
  console.log('\n========== design_modules (共' + modules.length + '行) ==========');
  modules.forEach((m: any) => {
    console.log(`  [${m.module_index}] theme=${m.theme}, imageType=${m.actual_image_type}`);
    console.log(`       core_visual=${String(m.core_visual).substring(0, 60)}...`);
    console.log(`       bg_style=${String(m.bg_style).substring(0, 60)}...`);
    console.log(`       visual_strategy=${String(m.visual_strategy).substring(0, 60)}...`);
    console.log(`       product_angle=${m.product_angle}`);
  });

  // screens
  const [screens]: any = await sequelize.query('SELECT * FROM screens WHERE project_id = ?', { replacements: [p.id] });
  console.log('\n========== screens (共' + screens.length + '行) ==========');
  screens.forEach((s: any) => {
    console.log(`  [${s.screen_index}] id=${s.id.substring(0, 8)} label=${s.label} status=${s.status}`);
    console.log(`       theme=${s.theme}`);
    console.log(`       prompt=${String(s.prompt).substring(0, 80)}...`);
    console.log(`       generation_goal=${String(s.generation_goal).substring(0, 60)}`);
    console.log(`       core_visual=${String(s.core_visual).substring(0, 60)}`);
    console.log(`       composition_strategy=${String(s.composition_strategy).substring(0, 60)}`);
    console.log(`       subject_props=${String(s.subject_props).substring(0, 60)}`);
    console.log(`       bg_style=${String(s.bg_style).substring(0, 60)}`);
    console.log(`       text_carrier_level=${String(s.text_carrier_level).substring(0, 60)}`);
    console.log(`       product_angle=${s.product_angle}`);
    console.log(`       consistency_constraints=${String(s.consistency_constraints).substring(0, 60)}`);
    console.log(`       platform_rules=${String(s.platform_rules).substring(0, 60)}`);
    console.log(`       output_requirements=${String(s.output_requirements).substring(0, 60)}`);
    console.log(`       module_name=${s.module_name}`);
    console.log(`       generation_instruction=${String(s.generation_instruction).substring(0, 80)}...`);
    console.log(`       consistency_anchor=${String(s.consistency_anchor).substring(0, 60)}`);
    console.log(`       image_url=${s.image_url}`);
    console.log(`       original_image_url=${s.original_image_url}`);
    console.log(`       revision_feedback=${s.revision_feedback ? String(s.revision_feedback).substring(0, 60) : '(空)'}`);
  });

  // screen_versions
  const [versions]: any = await sequelize.query(`
    SELECT sv.*, s.screen_index 
    FROM screen_versions sv 
    JOIN screens s ON sv.screen_id = s.id 
    WHERE s.project_id = ?
    ORDER BY s.screen_index, sv.version_number
  `, { replacements: [p.id] });
  console.log('\n========== screen_versions (共' + versions.length + '行) ==========');
  versions.forEach((v: any) => {
    console.log(`  screen=${v.screen_index} v${v.version_number}: image=${v.image_url}, prompt=${String(v.prompt).substring(0, 50)}...`);
  });

  // screen_revisions
  const [revisions]: any = await sequelize.query(`
    SELECT sr.*, s.screen_index 
    FROM screen_revisions sr 
    JOIN screens s ON sr.screen_id = s.id 
    WHERE s.project_id = ?
  `, { replacements: [p.id] });
  console.log('\n========== screen_revisions (共' + revisions.length + '行) ==========');
  revisions.forEach((r: any) => {
    console.log(`  screen=${r.screen_index}: feedback="${r.feedback}"`);
    console.log(`    old_prompt=${String(r.old_prompt).substring(0, 60)}...`);
    console.log(`    new_prompt=${String(r.new_prompt).substring(0, 60)}...`);
  });

  // export_records
  const [exports]: any = await sequelize.query('SELECT * FROM export_records WHERE project_id = ?', { replacements: [p.id] });
  console.log('\n========== export_records (共' + exports.length + '行) ==========');
  exports.forEach((e: any) => {
    console.log(`  format=${e.format} quality=${e.quality} width=${e.width} screenCount=${e.screen_count} url=${e.output_url}`);
  });

  console.log('\n========== 验证完毕 ==========\n');
  await sequelize.close();
}

dump().catch((e: any) => { console.error(e.message); process.exit(1); });
