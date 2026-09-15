import type { Metadata } from "next";
import ProjectEditorPage from "@/components/admin/ProjectEditorPage";

export const metadata: Metadata = {
  title: "编辑项目 - 管理后台",
};

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectEditorPage projectId={id} />;
}
