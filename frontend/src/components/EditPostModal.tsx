"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useEditPost } from "@/lib/edit-post-store";
import { getCurrentUser } from "@/lib/auth";
import { PublishModal } from "./TopBar";

export default function EditPostModal() {
  const router = useRouter();
  const post = useEditPost((s) => s.post);
  const close = useEditPost((s) => s.close);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!post) return;
    if (post.category === "项目" || post.type === "project") {
      close();
      router.push(`/admin/projects/${post.id}`);
    } else if (post.type === "article") {
      close();
      router.push(`/admin/articles/${post.id}`);
    }
  }, [post, close, router]);

  if (!mounted || !post) return null;
  if (post.category === "项目" || post.type === "project" || post.type === "article") return null;

  const user = getCurrentUser();
  if (!user?.isLoggedIn || !user.token) return null;

  return (
    <PublishModal
      token={user.token}
      editPost={post}
      onClose={close}
      onPublished={() => {
        window.dispatchEvent(new CustomEvent("post-published"));
      }}
    />
  );
}
