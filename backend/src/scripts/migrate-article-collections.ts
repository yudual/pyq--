import dotenv from "dotenv";
import sequelize from "../config/database";

dotenv.config();

async function apply(statement: string, label: string) {
  try {
    await sequelize.query(statement);
    console.log(`Applied: ${label}`);
  } catch (error: any) {
    const message = String(error?.message || error);
    if (/duplicate column|already exists/i.test(message)) {
      console.log(`Already present: ${label}`);
      return;
    }
    throw error;
  }
}

/**
 * 迁移：为 posts 表支持系列/合辑功能
 * 1. 修改 type 字段支持 'collection' 类型（使用 VARCHAR(32) 或修改 ENUM）
 * 2. 添加 collection_id 字段：所属合辑 ID
 * 3. 添加 hide_in_home 字段：是否在首页隐藏（被合辑代表）
 * 4. 添加 collection_post_ids 字段：合辑包含的子文章有序 ID 列表
 */
export async function migrateArticleCollections() {
  // 1. 将 type 字段扩展支持 'collection'（使用 VARCHAR(32) 更加通用且不限制枚举）
  await apply(
    "ALTER TABLE posts MODIFY COLUMN type VARCHAR(32) NOT NULL DEFAULT 'moment'",
    "posts.type VARCHAR(32)"
  );

  // 2. 添加 collection_id
  await apply(
    "ALTER TABLE posts ADD COLUMN collection_id CHAR(36) NULL DEFAULT NULL",
    "posts.collection_id"
  );

  // 3. 添加 hide_in_home
  await apply(
    "ALTER TABLE posts ADD COLUMN hide_in_home TINYINT(1) NOT NULL DEFAULT 0",
    "posts.hide_in_home"
  );

  // 4. 添加 collection_post_ids
  await apply(
    "ALTER TABLE posts ADD COLUMN collection_post_ids LONGTEXT NULL DEFAULT NULL",
    "posts.collection_post_ids"
  );
}

async function main() {
  try {
    await sequelize.authenticate();
    await migrateArticleCollections();
    console.log("Article collections migration completed successfully.");
  } catch (error) {
    console.error("Article collections migration failed:", error);
    process.exitCode = 1;
  } finally {
    await sequelize.close().catch(() => {});
  }
}

if (require.main === module) {
  void main();
}
