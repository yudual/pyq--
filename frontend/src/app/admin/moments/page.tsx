import type { Metadata } from "next";
import AdminPosts from "../posts/AdminPosts";

export const metadata: Metadata = {
  title: "管理后台 - 岁岁念与动态",
};

export default function Page() {
  return (
    <AdminPosts
      defaultCategory="all"
      title="岁岁念与动态"
      description="管理在「岁岁念」以及首页时间线中展示的日常碎片、随笔与短动态"
    />
  );
}
