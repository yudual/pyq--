import type { Metadata } from "next";
import ProjectEditorPage from "@/components/admin/ProjectEditorPage";

export const metadata: Metadata = {
  title: "新建项目 - 管理后台",
};

export default function NewProjectPage() {
  return <ProjectEditorPage />;
}
