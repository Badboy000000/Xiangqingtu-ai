import { sequelize } from './src/config/database';

async function check() {
  await sequelize.authenticate();

  const [tables]: any = await sequelize.query('SHOW TABLES');
  console.log('=== 表列表 ===');
  tables.forEach((t: any) => console.log(' ', Object.values(t)[0]));

  for (const t of tables) {
    const name = Object.values(t)[0] as string;
    const [desc]: any = await sequelize.query('DESCRIBE `' + name + '`');
    console.log('\n=== ' + name + ' 结构 ===');
    desc.forEach((d: any) =>
      console.log(
        '  ' +
          String(d.Field).padEnd(30) +
          ' ' +
          String(d.Type).padEnd(28) +
          ' ' +
          (d.Null === 'YES' ? 'NULL    ' : 'NOT NULL') +
          '  ' +
          (d.Default || '(无)'),
      ),
    );
    const [count]: any = await sequelize.query('SELECT COUNT(*) as c FROM `' + name + '`');
    console.log('  >>> 行数: ' + count[0].c);
  }

  await sequelize.close();
}

check().catch((e: any) => {
  console.error(e.message);
  process.exit(1);
});
