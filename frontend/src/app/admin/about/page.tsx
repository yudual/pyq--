import type { Metadata } from "next";
import AdminAbout from "./AdminAbout";

export const metadata: Metadata = {
  title: "管理后台 - 关于页自述",
};

export default function Page() {
  return <AdminAbout />;
}
