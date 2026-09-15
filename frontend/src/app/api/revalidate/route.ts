import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { secret, path, paths } = await request.json();
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  }

  const targetPaths: string[] = [];
  if (typeof path === "string" && path) {
    targetPaths.push(path);
  }
  if (Array.isArray(paths)) {
    for (const p of paths) {
      if (typeof p === "string" && p && !targetPaths.includes(p)) {
        targetPaths.push(p);
      }
    }
  }

  // 若请求中指定了具体 path / paths，优先单独重验证
  for (const p of targetPaths) {
    revalidatePath(p);
  }

  // 全站核心内容频道与聚合页面的按需重验证
  revalidatePath("/", "layout");
  revalidatePath("/articles", "layout");
  revalidatePath("/moments", "layout");
  revalidatePath("/projects", "layout");
  revalidatePath("/archives", "layout");
  revalidatePath("/about", "layout");
  revalidatePath("/equipment", "layout");
  revalidatePath("/labs", "layout");

  return NextResponse.json({ revalidated: true, now: Date.now() });
}
