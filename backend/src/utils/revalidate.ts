/**
 * 触发 Next.js 按需重验证（revalidatePath）。
 * fire-and-forget：不阻塞 API 响应，错误静默处理。
 * 后端写操作（发动态/点赞/评论等）后调用，使所有用户刷新即可看到最新数据。
 */
export async function triggerRevalidate(paths?: string[]): Promise<void> {
  try {
    const clientUrl = (
      process.env.FRONTEND_INTERNAL_URL ||
      process.env.FRONTEND_REVALIDATE_URL ||
      "http://127.0.0.1:3000"
    ).split(",")[0].trim();
    const secret = process.env.REVALIDATE_SECRET || "kanle-revalidate";
    const mergedPaths = Array.from(
      new Set(["/", "/articles", "/moments", "/archives", ...(paths || [])])
    );
    const body: Record<string, any> = {
      secret,
      paths: mergedPaths,
      path: mergedPaths[0],
    };
    const res = await fetch(`${clientUrl}/api/revalidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.warn(`Revalidation failed with status ${res.status}: ${txt}`);
    }
  } catch (err) {
    console.warn("Revalidation request failed:", err);
  }
}

