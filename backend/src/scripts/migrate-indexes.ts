import dotenv from "dotenv";
import sequelize from "../config/database";
import { Post, Comment, Media } from "../models";

dotenv.config();

/**
 * 需要补齐的索引清单。字段写模型属性名，实际列名通过
 * model.getAttributes()[attr].field 解析（本项目两种命名风格混用）。
 */
const PLANNED_INDEXES: Array<{ model: typeof Post | typeof Comment | typeof Media; table: string; name: string; attrs: string[] }> = [
  // 主列表查询：按 status + type 过滤、createdAt 排序
  { model: Post, table: "posts", name: "idx_posts_status_type_created", attrs: ["status", "type", "createdAt"] },
  // 合辑子文章批量查询与 UPDATE ... WHERE collection_id
  { model: Post, table: "posts", name: "idx_posts_collection_id", attrs: ["collectionId"] },
  // 通知页按 replyToEmail 查询（访客回复通知）
  { model: Comment, table: "comments", name: "idx_comments_reply_to_email", attrs: ["replyToEmail"] },
  // 通知页按点赞者昵称反查邮箱
  { model: Comment, table: "comments", name: "idx_comments_author_name", attrs: ["authorName"] },
  // 媒体按上传者过滤
  { model: Media, table: "media", name: "idx_media_uploader_id", attrs: ["uploaderId"] },
];

async function indexExists(table: string, indexName: string): Promise<boolean> {
  const dbName = (sequelize as any).config.database as string;
  const [rows] = await sequelize.query(
    "SELECT 1 FROM information_schema.statistics WHERE table_schema = ? AND table_name = ? AND index_name = ? LIMIT 1",
    { replacements: [dbName, table, indexName] }
  );
  return (rows as unknown[]).length > 0;
}

function resolveColumns(model: typeof Post | typeof Comment | typeof Media, attrs: string[]): string[] {
  const attributes = (model as any).getAttributes();
  return attrs.map((attr) => {
    const col = attributes[attr]?.field || attr;
    return `\`${col}\``;
  });
}

/**
 * 迁移：为核心查询补齐索引（对已有库生效；新库由模型 indexes 定义经 sync 创建）。
 * 可安全重复执行：已存在的索引会跳过。
 */
export async function migrateIndexes() {
  for (const plan of PLANNED_INDEXES) {
    if (await indexExists(plan.table, plan.name)) {
      console.log(`Index exists, skipped: ${plan.name}`);
      continue;
    }
    const columns = resolveColumns(plan.model, plan.attrs).join(", ");
    await sequelize.query(`CREATE INDEX \`${plan.name}\` ON \`${plan.table}\` (${columns})`);
    console.log(`Created index: ${plan.name} on ${plan.table} (${columns})`);
  }
}

async function main() {
  try {
    await sequelize.authenticate();
    await migrateIndexes();
    console.log("Index migration completed successfully.");
  } catch (error) {
    console.error("Index migration failed:", error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  main();
}
