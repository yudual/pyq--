import type { Metadata } from "next";
import CatalogPage, { type CatalogCategory } from "@/components/CatalogPage";
import { getApiUrl } from "@/lib/api-fetch";
import { fetchOwner, fetchSiteSettings } from "@/lib/server-data";
import type { User } from "@/lib/mock-data";

const API_URL = getApiUrl();
export const revalidate = 10;
export const metadata: Metadata = { title: "Labs" };

async function getOwner(): Promise<User> {
  const [owner, settings] = await Promise.all([fetchOwner(), fetchSiteSettings()]);
  const nickname = owner.nickname || (typeof settings?.siteName === "string" ? settings.siteName : "") || "博主";
  return {
    ...owner,
    nickname,
  };
}

async function getCatalog(): Promise<CatalogCategory[]> {
  try {
    const response = await fetch(`${API_URL}/catalog/labs`, { next: { revalidate } });
    return response.ok ? (await response.json()).categories || [] : [];
  } catch {
    return [];
  }
}

export default async function LabsPage() {
  const [owner, categories] = await Promise.all([getOwner(), getCatalog()]);
  return <CatalogPage owner={owner} title="Labs" description="这里收录正在尝试、研究与制作的小项目。" categories={categories} linkTitles />;
}
