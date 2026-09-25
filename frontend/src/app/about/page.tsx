import type { Metadata } from "next";
import { fetchOwner, fetchSiteSettings } from "@/lib/server-data";
import { getApiUrl } from "@/lib/api-fetch";
import AboutReader from "@/components/AboutReader";
import SpecialPageLayout from "@/components/SpecialPageLayout";
import type { User } from "@/lib/types";

export const revalidate = 10;

async function getResolvedOwner(): Promise<User> {
  const [owner, settings] = await Promise.all([fetchOwner(), fetchSiteSettings()]);
  const nickname = owner.nickname || (typeof settings?.siteName === "string" ? settings.siteName : "") || "博主";
  return {
    ...owner,
    nickname,
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const owner = await getResolvedOwner();
  return {
    title: owner.nickname ? `关于 - ${owner.nickname}` : "关于",
    description: "个人介绍与博客站点说明",
  };
}

async function getAbout() {
  try {
    const response = await fetch(`${getApiUrl()}/pages/about`, { next: { revalidate } });
    if (!response.ok) return { id: "about", content: "", comments: [] };
    const data = await response.json();
    return {
      id: data?.id || "about",
      content: typeof data?.content === "string" ? data.content : "",
      comments: Array.isArray(data?.comments) ? data.comments : [],
    };
  } catch {
    return { id: "about", content: "", comments: [] };
  }
}

export default async function AboutPage() {
  const [owner, page, settings] = await Promise.all([
    getResolvedOwner(),
    getAbout(),
    fetchSiteSettings(),
  ]);
  return (
    <SpecialPageLayout owner={owner}>
      <AboutReader page={page} owner={owner} siteSettings={settings} />
    </SpecialPageLayout>
  );
}
