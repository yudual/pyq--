const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// 支持指定环境变量，默认定位到本仓库 backend 目录
const backendDir = process.env.BACKEND_DIR || path.join(__dirname, "../backend");
require("dotenv").config({ path: path.join(backendDir, ".env") });

const { Post, User } = require(path.join(backendDir, "dist/models"));
const { generateShortId } = require(path.join(backendDir, "dist/utils/short-id"));
const { triggerRevalidate } = require(path.join(backendDir, "dist/utils/revalidate"));

async function run() {
  console.log("==> 开始执行《弹药工程与兵器行业深度情报全景库》发布流程...");

  const admin = await User.findOne({ where: { role: "admin" } }) || await User.findOne();
  if (!admin) {
    throw new Error("未找到管理员用户，无法发布文章");
  }
  console.log(`[+] 确定发布作者: ${admin.nickname || admin.username} (ID: ${admin.id})`);

  const importDir = process.env.IMPORT_DIR || path.join(__dirname, "../import-data");
  if (!fs.existsSync(importDir)) {
    throw new Error(`找不到文章源目录: ${importDir}`);
  }

  // 定义所有 7 篇子文章的元数据规格与文件名映射
  const articleConfigs = [
    {
      file: "INDEX_情报底账总览.md",
      title: "弹药工程·全量信息整合与深度扩展情报全宗（总览与速查矩阵）",
      excerpt: "基于两大众包校友群逾11.2万条一手记录提炼出4611条真实对话，结合企业股权穿透、国考职位表、直招军官实务与研招自命题，打破信息不对称。",
      category: "行业洞察",
    },
    {
      file: "01_企业与用人单位深度情报_宏大_紫金_保利_江南化工.md",
      title: "企业与用人单位深度情报：宏大、紫金、保利与民爆巨头真相穿透",
      excerpt: "宏大爆破为何被称“黑奴”？紫金矿业与紫金建设有何天壤之别？保利联合新疆待遇如何？穿透易普力、雪峰科技、生力民爆与海螺矿业一线真实生态。",
      category: "行业洞察",
    },
    {
      file: "02_体制内与公考专岗深度情报_铁路公安_直招军官_军队文职.md",
      title: "体制内与公考专岗深度情报：铁路公安定向招录、直招军官与文职内幕",
      excerpt: "破译国考极低竞争比的铁路公安082102专岗；解析兵器类直招军官“双一流岗”爆冷空缺原因；揭秘部队一线生态、机关材料与视力手术硬性红线。",
      category: "行业洞察",
    },
    {
      file: "03_考研院校考情_航天四院_848专业课_调剂与体检暗坑.md",
      title: "考研院校考情深度情报：航天四院、南理北理、848专业课与体检暗坑",
      excerpt: "为什么“航天>兵器”？腾讯工程师为何跳槽航天四院？破译848自命题调剂军工院所黄金路线，严防含能材料复试色弱一票否决致命暗坑。",
      category: "行业洞察",
    },
    {
      file: "04_行业门槛_卡挂科_英语四级_待遇吐槽与转专业真相.md",
      title: "行业门槛与职场实录：挂科审查、四级筛选、真实待遇与转专业抉择",
      excerpt: "校招反向召回与高绩点备胎效应；矿山现场野外虚高薪酬拆解；提前缴社保对考研调档的致命冲突；从招聘会心理崩溃到大二转专业潮深度复盘。",
      category: "行业洞察",
    },
    {
      file: "05_一手事实对话全量索引库_二群考研升学与学业底账.md",
      title: "一手事实对话全量索引库（上篇：二群考研升学与学业底账 1864条）",
      excerpt: "基于弹药工程考研与升学二群99,906条原始记录清洗出的1864条真实对话底账，按用人门槛、考研自命题、调剂升学与学业警示分类建档。",
      category: "行业洞察",
    },
    {
      file: "06_一手事实对话全量索引库_一群校友与职场底账.md",
      title: "一手事实对话全量索引库（下篇：一群校友职场与实体溯源档案 2747条）",
      excerpt: "基于弹药工程一群12,645条原始记录清洗出的2747条真实对话底账，按现场作业、劳动合规、涉爆安全法律底线与校友名片全景建档。",
      category: "行业洞察",
    },
  ];

  // 预生成所有子文章的 ID 与 shortId，以便双向引用
  const articles = articleConfigs.map((cfg) => {
    let rawContent = fs.readFileSync(path.join(importDir, cfg.file), "utf-8");
    // 去除原文开头的 # 01_... 原始粗糙大标题，避免与博客详情页渲染的精修主标题重复
    rawContent = rawContent.replace(/^#[ \t]+[^\r\n]+\r?\n+/, "").trim();
    return {
      ...cfg,
      id: crypto.randomUUID(),
      shortId: generateShortId(),
      content: rawContent,
    };
  });

  const [indexArticle, p01, p02, p03, p04, p05, p06] = articles;

  // 1. 处理 06 中的表情括号，避免被当成失效 wikilink
  p06.content = p06.content
    .replace(/\[\[嘻嘻\]\]/g, "[嘻嘻]")
    .replace(/\[\[阴险\]\]/g, "[阴险]")
    .replace(/\[\[欢呼\]\]/g, "[欢呼]")
    .replace(/\[\[呵呵\]\]/g, "[呵呵]")
    .replace(/\[\[生气\]\]/g, "[生气]")
    .replace(/\[\[哈哈\]\]/g, "[哈哈]");

  // 2. 替换 INDEX 文件中的 Obsidian Wikilinks 为真实的 /articles/{shortId} 链接
  indexArticle.content = indexArticle.content
    .replace(
      /\[\[01_企业与用人单位深度情报_宏大_紫金_保利_江南化工\]\]/g,
      `[01. 《${p01.title}》](/articles/${p01.shortId})`
    )
    .replace(
      /\[\[02_体制内与公考专岗深度情报_铁路公安_直招军官_军队文职\]\]/g,
      `[02. 《${p02.title}》](/articles/${p02.shortId})`
    )
    .replace(
      /\[\[03_考研院校考情_航天四院_848专业课_调剂与体检暗坑\]\]/g,
      `[03. 《${p03.title}》](/articles/${p03.shortId})`
    )
    .replace(
      /\[\[04_行业门槛_卡挂科_英语四级_待遇吐槽与转专业真相#三、待遇真相与行业滤镜彻底粉碎\]\]/g,
      `[04. 行业待遇真相与滤镜粉碎](/articles/${p04.shortId}#三待遇真相与行业滤镜彻底粉碎)`
    )
    .replace(
      /\[\[04_行业门槛_卡挂科_英语四级_待遇吐槽与转专业真相\]\]/g,
      `[04. 《${p04.title}》](/articles/${p04.shortId})`
    )
    .replace(
      /\[\[05_一手事实对话全量索引库_二群考研升学与学业底账\]\]/g,
      `[05. 《${p05.title}》](/articles/${p05.shortId})`
    )
    .replace(
      /\[\[06_一手事实对话全量索引库_一群校友与职场底账\]\]/g,
      `[06. 《${p06.title}》](/articles/${p06.shortId})`
    );

  // 3. 生成合辑实体
  const collectionId = crypto.randomUUID();
  const collectionShortId = generateShortId();
  const orderedPostIds = [
    indexArticle.id,
    p01.id,
    p02.id,
    p03.id,
    p04.id,
    p05.id,
    p06.id,
  ];

  const now = Date.now();
  // 时间错开，使排序整齐（文章按顺序升序创建，合辑最新并在首页置顶）
  const baseTime = now - 10 * 60 * 1000;

  console.log("\n[+] 正在写入 7 篇核心文章到数据库...");
  for (let i = 0; i < articles.length; i++) {
    const a = articles[i];
    const postTime = new Date(baseTime + i * 60 * 1000);
    await Post.create({
      id: a.id,
      shortId: a.shortId,
      userId: admin.id,
      type: "article",
      title: a.title,
      excerpt: a.excerpt,
      cover: "",
      category: a.category,
      articleType: "original",
      repostUrl: "",
      content: a.content,
      images: [],
      location: null,
      region: "安徽",
      pinned: false,
      likesDisabled: false,
      commentsDisabled: false,
      viewCount: 0,
      status: "published",
      collectionId: collectionId,
      hideInHome: true, // 在首页收拢入合辑卡片，不刷屏
      createdAt: postTime,
    });
    console.log(`    [✓] 已发布: ${a.title} (shortId: ${a.shortId})`);
  }

  console.log("\n[+] 正在创建系列合辑卡片...");
  const collection = await Post.create({
    id: collectionId,
    shortId: collectionShortId,
    userId: admin.id,
    type: "collection",
    title: "弹药工程与兵器行业深度情报全景库",
    excerpt:
      "全库整合了二群与一群两大众包大群逾11.2万条一手聊天记录，提炼4611条真实对话底账，深度穿透企业股权、国考职位表、直招军官条例、考研暗坑与职场门槛。彻底打破信息不对称。",
    cover: "",
    category: "行业洞察",
    articleType: "original",
    repostUrl: "",
    content: "",
    images: [],
    location: null,
    region: "安徽",
    pinned: true, // 首页置顶展示
    likesDisabled: false,
    commentsDisabled: false,
    viewCount: 0,
    status: "published",
    collectionPostIds: orderedPostIds,
    hideInHome: false,
    createdAt: new Date(now),
  });
  console.log(`    [✓] 系列合辑已创建并置顶 (shortId: ${collection.shortId})`);

  // 触发 Next.js 页面增量重验证 (ISR)
  console.log("\n[+] 正在触发前端缓存重新验证 (Revalidation)...");
  const pathsToRevalidate = [
    "/",
    "/articles",
    "/archives",
    `/articles/${collection.shortId}`,
    ...articles.map((a) => `/articles/${a.shortId}`),
  ];
  await triggerRevalidate(pathsToRevalidate);
  console.log(`    [✓] 已通知前端刷新以下 ${pathsToRevalidate.length} 个路径缓存。`);

  console.log("\n==========================================");
  console.log("🎉 全部文章与合辑已成功发布至线上博客！");
  console.log(`- 合辑标题: ${collection.title}`);
  console.log(`- 包含章节: 共 7 篇`);
  for (let i = 0; i < articles.length; i++) {
    console.log(`  ${i + 1}. ${articles[i].title} -> /articles/${articles[i].shortId}`);
  }
  console.log("==========================================\n");
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("发布失败:", err);
    process.exit(1);
  });
