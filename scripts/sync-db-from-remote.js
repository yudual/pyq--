const path = require("path");
// 优先加载后端 .env 环境变量（如存在），避免在源码中硬编码明文密码
require("dotenv").config({ path: path.join(__dirname, "../backend/.env") });

const mysql = require(path.join(__dirname, "../backend/node_modules/mysql2/promise"));
const { execSync } = require("child_process");

async function main() {
  console.log("==> 检查远程 SSH 隧道与数据库连接...");

  const remoteHost = process.env.REMOTE_DB_HOST || "127.0.0.1";
  const remotePort = Number(process.env.REMOTE_DB_PORT || 33306);
  const remoteUser = process.env.REMOTE_DB_USER || "dual";
  const remotePassword = process.env.REMOTE_DB_PASSWORD || process.env.DB_PASSWORD;
  const remoteDatabase = process.env.REMOTE_DB_NAME || "moment_blog";

  if (!remotePassword) {
    console.error("❌ 错误：未提供远程数据库密码。请在环境变量或 backend/.env 中配置 REMOTE_DB_PASSWORD 或 DB_PASSWORD。");
    process.exit(1);
  }

  // 检查是否已有 33306 隧道，如果没有则启动
  try {
    execSync(`fuser ${remotePort}/tcp 2>/dev/null`);
    console.log(`${remotePort} 隧道已就绪。`);
  } catch {
    console.log(`正在建立 SSH 端口转发 (127.0.0.1:${remotePort} -> Azure MySQL)...`);
    try {
      execSync(`ssh -f -N -L ${remotePort}:azure-jp-blog.mysql.database.azure.com:3306 azure-blog`);
    } catch (e) {
      console.warn("⚠️ 自动建立 SSH 隧道失败，将尝试直接连接当前配置的端口...");
    }
  }

  const remote = await mysql.createConnection({
    host: remoteHost,
    port: remotePort,
    user: remoteUser,
    password: remotePassword,
    database: remoteDatabase,
    ssl: { rejectUnauthorized: false },
    connectTimeout: 10000,
  });

  const localUser = process.env.LOCAL_DB_USER || process.env.DB_USER || "root";
  const localPassword = process.env.LOCAL_DB_PASSWORD !== undefined ? process.env.LOCAL_DB_PASSWORD : (process.env.DB_PASSWORD || "");
  const localHost = process.env.LOCAL_DB_HOST || "127.0.0.1";
  const localPort = Number(process.env.LOCAL_DB_PORT || 3306);
  const localDatabase = process.env.LOCAL_DB_NAME || remoteDatabase;

  const local = await mysql.createConnection({
    host: localHost,
    port: localPort,
    user: localUser,
    password: localPassword,
    database: localDatabase,
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
