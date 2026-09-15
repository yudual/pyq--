import dotenv from "dotenv";
import { QueryTypes } from "sequelize";
import sequelize from "../config/database";

dotenv.config();

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await sequelize.query<{ count: number }>(
    `SELECT COUNT(*) AS count
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND COLUMN_NAME = :column`,
    {
      replacements: { table, column },
      type: QueryTypes.SELECT,
    }
  );
  return Number(rows[0]?.count || 0) > 0;
}

async function dropColumnIfPresent(table: string, column: string) {
  if (!(await columnExists(table, column))) {
    console.log(`Already removed: ${table}.${column}`);
    return;
  }
  await sequelize.query(`ALTER TABLE \`${table}\` DROP COLUMN \`${column}\``);
  console.log(`Removed: ${table}.${column}`);
}

/** Removes legacy ad posts, settings, and schema fields from older deployments. */
export async function migrateRemoveAds() {
  if (await columnExists("posts", "is_ad")) {
    await sequelize.query("DELETE FROM posts WHERE is_ad = 1");
    console.log("Removed legacy ad posts.");
  }

  await dropColumnIfPresent("posts", "is_ad");
  await dropColumnIfPresent("posts", "ad_avatar");
  await dropColumnIfPresent("posts", "ad_nickname");
  await dropColumnIfPresent("site_settings", "ad_on_archives");
}

async function main() {
  try {
    await sequelize.authenticate();
    await migrateRemoveAds();
  } catch (error) {
    console.error("Ad removal migration failed:", error);
    process.exitCode = 1;
  } finally {
    await sequelize.close().catch(() => {});
  }
}

if (require.main === module) void main();
