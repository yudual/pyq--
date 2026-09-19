const path = require("path");
const mysql = require(path.join(__dirname, "../backend/node_modules/mysql2/promise"));
const { execSync } = require("child_process");

async function main() {
  console.log("==> 检查远程 SSH 隧道与数据库连接...");

  // 检查是否已有 33306 隧道，如果没有则启动
  try {
    execSync("fuser 33306/tcp 2>/dev/null");
    console.log("33306 隧道已就绪。");
  } catch {
    console.log("正在建立 SSH 端口转发 (127.0.0.1:33306 -> Azure MySQL)...");
    execSync("ssh -f -N -L 33306:azure-jp-blog.mysql.database.azure.com:3306 azure-blog");
  }

  const remote = await mysql.createConnection({
    host: "127.0.0.1",
    port: 33306,
    user: "dual",
    password: "Ty20070218@",
    database: "moment_blog",
    ssl: { rejectUnauthorized: false },
    connectTimeout: 10000,
  });

  const local = await mysql.createConnection({
    host: "127.0.0.1",
    port: 3306,
    user: "kanle",
    password: "change-me",
    database: "moment_blog",
    connectTimeout: 10000,
  });

  console.log("==> 本地与远程数据库均已连通，开始同步数据...");

  const [tables] = await remote.query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");

  await local.query("SET FOREIGN_KEY_CHECKS = 0;");

  for (const t of tables) {
    const table = Object.values(t)[0];
    const [rows] = await remote.query(`SELECT * FROM \`${table}\``);
    console.log(`  - 表 ${table}: 同步 ${rows.length} 条记录`);

    await local.query(`TRUNCATE TABLE \`${table}\``);
    for (const row of rows) {
      const cols = Object.keys(row).map((c) => `\`${c}\``).join(", ");
      const placeholders = Object.keys(row).map(() => "?").join(", ");
      const values = Object.values(row).map((val) => {
        if (val !== null && typeof val === "object" && !(val instanceof Date) && !Buffer.isBuffer(val)) {
          return JSON.stringify(val);
        }
        return val;
      });
      await local.query(`INSERT INTO \`${table}\` (${cols}) VALUES (${placeholders})`, values);
    }
  }

  await local.query("SET FOREIGN_KEY_CHECKS = 1;");
  console.log("==> 数据同步全部完成！本地数据库已与远程生产环境保持一致。");

  await remote.end();
  await local.end();
}

main().catch((err) => {
  console.error("同步失败:", err);
  process.exit(1);
});
