"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, ImageIcon, ImagePlus, Library, Loader2, Pencil, Plus, Save, Trash2, Upload, X } from "lucide-react";
import MediaPicker, { type PickerMediaItem } from "@/components/MediaPicker";
import { apiFetch, getToken } from "@/lib/api-fetch";
import { toAbsoluteUrl, uploadDirect } from "@/lib/upload";

type Collection = "equipment" | "labs";

interface CatalogItem {
  id: string;
  title: string;
  configuration: string;
  description: string;
  imageMediaId: string | null;
  imageUrl: string;
  linkUrl: string;
  sortOrder: number;
}

interface CatalogCategory {
  id: string;
  name: string;
  intro: string;
  sortOrder: number;
  items: CatalogItem[];
}

interface Props {
  collection: Collection;
  title: string;
  description: string;
}

type CategoryDraft = { id?: string; name: string; intro: string };
type ItemDraft = {
  id?: string;
  categoryId: string;
  title: string;
  configuration: string;
  description: string;
  imageMediaId: string | null;
  imageUrl: string;
  linkUrl: string;
};

const emptyItem = (): Omit<ItemDraft, "categoryId"> => ({
  title: "",
  configuration: "",
  description: "",
  imageMediaId: null,
  imageUrl: "",
  linkUrl: "",
});

export default function CatalogManager({ collection, title, description }: Props) {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryDraft | null>(null);
  const [editingItem, setEditingItem] = useState<ItemDraft | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch(`/admin/catalog/${collection}`);
      if (!response.ok) throw new Error("加载失败");
      setCategories((await response.json()).categories || []);
    } catch (error) {
      alert(error instanceof Error ? error.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [collection]);

  useEffect(() => { void load(); }, [load]);

  const request = async (path: string, method: string, body?: unknown) => {
    const response = await apiFetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || "操作失败");
    }
  };

  const openCategory = (draft: CategoryDraft) => {
    setEditingItem(null);
    setPickerOpen(false);
    setEditingCategory(draft);
  };

  const openItem = (draft: ItemDraft) => {
    setEditingCategory(null);
    setPickerOpen(false);
    setEditingItem(draft);
  };

  const closeEditors = () => {
    setEditingCategory(null);
    setEditingItem(null);
    setPickerOpen(false);
  };

  const saveCategory = async () => {
    if (!editingCategory?.name.trim()) return alert("请输入分类名称");
    setSaving(true);
    try {
      if (editingCategory.id) {
        await request(`/admin/catalog/${collection}/categories/${editingCategory.id}`, "PUT", { name: editingCategory.name.trim(), intro: editingCategory.intro.trim() });
      } else {
        await request(`/admin/catalog/${collection}/categories`, "POST", { name: editingCategory.name.trim(), intro: editingCategory.intro.trim() });
      }
      closeEditors();
      await load();
    } catch (error) {
      alert(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const saveItem = async () => {
    if (!editingItem?.title.trim()) return alert("请输入名称");
    setSaving(true);
    try {
      const body = {
        title: editingItem.title.trim(),
        configuration: editingItem.configuration.trim(),
        description: editingItem.description.trim(),
        imageMediaId: editingItem.imageMediaId,
        imageUrl: editingItem.imageMediaId ? "" : editingItem.imageUrl.trim(),
        linkUrl: collection === "labs" ? editingItem.linkUrl.trim() : "",
      };
      if (editingItem.id) await request(`/admin/catalog/${collection}/items/${editingItem.id}`, "PUT", body);
      else await request(`/admin/catalog/${collection}/items`, "POST", { ...body, categoryId: editingItem.categoryId });
      closeEditors();
      await load();
    } catch (error) {
      alert(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (type: "categories" | "items", id: string) => {
    if (!confirm(type === "categories" ? "删除此分类及其中所有卡片？" : "删除此卡片？")) return;
    try {
      await request(`/admin/catalog/${collection}/${type}/${id}`, "DELETE");
      await load();
    } catch (error) {
      alert(error instanceof Error ? error.message : "删除失败");
    }
  };

  const move = async (type: "categories" | "items", id: string, sortOrder: number, direction: -1 | 1) => {
    const target = sortOrder + direction;
    if (target < 0) return;
    try {
      await request(`/admin/catalog/${collection}/${type}/${id}`, "PUT", { sortOrder: target });
      await load();
    } catch (error) {
      alert(error instanceof Error ? error.message : "排序失败");
    }
  };

  const selectImage = (item: PickerMediaItem) => {
    if (!editingItem) return;
    setEditingItem({ ...editingItem, imageMediaId: item.id, imageUrl: item.url });
    setPickerOpen(false);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-adm-text">{title}</h1>
          <p className="mt-1 text-sm text-adm-text-secondary">{description}</p>
        </div>
        <button onClick={() => openCategory({ name: "", intro: "" })} className="adm-btn adm-btn--primary">
          <Plus className="h-4 w-4" /> <span>新建分类</span>
        </button>
      </div>

      {editingCategory && <EditCategory data={editingCategory} setData={setEditingCategory} onSave={saveCategory} onClose={closeEditors} saving={saving} />}
      {editingItem && <EditItem collection={collection} data={editingItem} setData={setEditingItem} onSave={saveItem} onClose={closeEditors} onPick={() => setPickerOpen(true)} saving={saving} />}
      {editingItem && <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={selectImage} category="image" title="选择卡片图片" />}

      {loading ? <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-adm-text-tertiary" /></div> : categories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-adm-border py-16 text-center text-sm text-adm-text-secondary">还没有分类，先新建一个吧。</div>
      ) : (
        <div className="space-y-4">
          {categories.map((category) => (
            <section key={category.id} className="rounded-xl border border-adm-border bg-adm-card">
              <div className="flex items-start justify-between gap-3 border-b border-adm-border p-4">
                <div><h2 className="font-semibold text-adm-text">{category.name}</h2>{category.intro && <p className="mt-1 text-sm text-adm-text-secondary">{category.intro}</p>}</div>
                <div className="flex items-center gap-1">
                  <IconButton title="上移" onClick={() => move("categories", category.id, category.sortOrder, -1)}><ChevronUp className="h-4 w-4" /></IconButton>
                  <IconButton title="下移" onClick={() => move("categories", category.id, category.sortOrder, 1)}><ChevronDown className="h-4 w-4" /></IconButton>
                  <IconButton title="编辑" onClick={() => openCategory(category)}><Pencil className="h-4 w-4" /></IconButton>
                  <IconButton title="删除" danger onClick={() => remove("categories", category.id)}><Trash2 className="h-4 w-4" /></IconButton>
                </div>
              </div>
              <div className="space-y-2 p-4">
                {category.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-lg border border-adm-border p-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
                      {item.imageUrl ? <img src={toAbsoluteUrl(item.imageUrl)} alt="" className="h-full w-full object-contain" /> : <ImagePlus className="h-4 w-4 text-adm-text-tertiary" />}
                    </div>
                    <div className="min-w-0 flex-1"><p className="font-medium text-adm-text">{item.title}</p><p className="truncate text-xs text-adm-text-secondary">{item.configuration || item.description || "未填写说明"}</p></div>
                    <div className="flex gap-1"><IconButton title="上移" onClick={() => move("items", item.id, item.sortOrder, -1)}><ChevronUp className="h-4 w-4" /></IconButton><IconButton title="下移" onClick={() => move("items", item.id, item.sortOrder, 1)}><ChevronDown className="h-4 w-4" /></IconButton><IconButton title="编辑" onClick={() => openItem({ ...item, categoryId: category.id })}><Pencil className="h-4 w-4" /></IconButton><IconButton title="删除" danger onClick={() => remove("items", item.id)}><Trash2 className="h-4 w-4" /></IconButton></div>
                  </div>
                ))}
                <button onClick={() => openItem({ ...emptyItem(), categoryId: category.id })} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-adm-border py-2 text-sm text-adm-text-secondary hover:bg-adm-card-hover"><Plus className="h-4 w-4" /> 添加卡片</button>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function IconButton({ children, title, onClick, danger = false }: { children: React.ReactNode; title: string; onClick: () => void; danger?: boolean }) {
  return <button type="button" title={title} aria-label={title} onClick={onClick} className={`adm-icon-btn ${danger ? "adm-icon-btn--danger" : ""}`}>{children}</button>;
}

function EditCategory({ data, setData, onSave, onClose, saving }: { data: CategoryDraft; setData: (data: CategoryDraft) => void; onSave: () => void; onClose: () => void; saving: boolean }) {
  return <div className="mb-4 rounded-xl border border-adm-border bg-adm-card p-4"><div className="mb-3 flex justify-between items-center"><h2 className="font-semibold text-adm-text">{data.id ? "编辑分类" : "新建分类"}</h2><button type="button" onClick={onClose} aria-label="关闭" className="flex h-8 w-8 items-center justify-center rounded-lg text-adm-text-tertiary transition-colors hover:bg-adm-card-hover hover:text-adm-text"><X className="h-4 w-4" /></button></div><div className="space-y-3"><input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} placeholder="分类名称" className="w-full rounded-lg border border-adm-border bg-adm-input px-3 py-2 text-sm" /><textarea value={data.intro} onChange={(e) => setData({ ...data, intro: e.target.value })} placeholder="一句话简介" className="w-full rounded-lg border border-adm-border bg-adm-input px-3 py-2 text-sm" rows={2} /><button type="button" onClick={onSave} disabled={saving} className="adm-btn adm-btn--primary">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}<span>保存</span></button></div></div>;
}

function EditItem({ collection, data, setData, onSave, onClose, onPick, saving }: { collection: Collection; data: ItemDraft; setData: (data: ItemDraft) => void; onSave: () => void; onClose: () => void; onPick: () => void; saving: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const isLabs = collection === "labs";
  const handleUpload = async (file: File) => {
    const token = getToken();
    if (!token) return alert("请先登录");
    setUploading(true);
    try {
      const media = await uploadDirect(file, token, "image");
      setData({ ...data, imageMediaId: media.id, imageUrl: media.url });
    } catch (error) {
      alert(error instanceof Error ? error.message : "上传失败");
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="mb-4 rounded-xl border border-adm-border bg-adm-card p-4">
      <div className="mb-3 flex justify-between items-center">
        <h2 className="font-semibold text-adm-text">{data.id ? "编辑卡片" : "添加卡片"}</h2>
        <button type="button" onClick={onClose} aria-label="关闭" className="flex h-8 w-8 items-center justify-center rounded-lg text-adm-text-tertiary transition-colors hover:bg-adm-card-hover hover:text-adm-text"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid gap-4 md:grid-cols-[150px_1fr]">
        <div className="space-y-2">
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-dashed border-adm-border bg-white">
            {data.imageUrl ? (
              <img src={toAbsoluteUrl(data.imageUrl)} alt="预览" className="h-full w-full object-contain" />
            ) : (
              <ImageIcon className="h-6 w-6 text-adm-text-tertiary" />
            )}
          </div>
          <button
            type="button"
            onClick={() => setData({ ...data, imageMediaId: null, imageUrl: "" })}
            disabled={!data.imageUrl}
            className="w-full rounded-lg py-1 text-xs text-adm-text-tertiary hover:bg-adm-card-hover disabled:opacity-40"
          >
            清除图片
          </button>
        </div>
        <div className="space-y-3">
          <input
            value={data.title}
            onChange={(e) => setData({ ...data, title: e.target.value })}
            placeholder={isLabs ? "项目名称" : "设备名称"}
            className="w-full rounded-lg border border-adm-border bg-adm-input px-3 py-2 text-sm"
          />
          <input
            value={data.configuration}
            onChange={(e) => setData({ ...data, configuration: e.target.value })}
            placeholder="配置 / 副标题"
            className="w-full rounded-lg border border-adm-border bg-adm-input px-3 py-2 text-sm"
          />
          {isLabs && (
            <input
              type="url"
              value={data.linkUrl}
              onChange={(e) => setData({ ...data, linkUrl: e.target.value })}
              placeholder="项目链接（https://，选填）"
              className="w-full rounded-lg border border-adm-border bg-adm-input px-3 py-2 text-sm"
            />
          )}
          <textarea
            value={data.description}
            onChange={(e) => setData({ ...data, description: e.target.value })}
            placeholder="2~3 行简介"
            className="w-full rounded-lg border border-adm-border bg-adm-input px-3 py-2 text-sm"
            rows={3}
          />
          <div className="space-y-2 rounded-xl border border-adm-border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-adm-text-secondary">卡片图片（外链/上传）</span>
              {data.imageUrl && (
                <div className="flex items-center gap-2 text-xs">
                  <a
                    href={toAbsoluteUrl(data.imageUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-adm-primary hover:underline"
                  >
                    新窗口查看
                  </a>
                  <span className="text-adm-text-tertiary">·</span>
                  <button
                    type="button"
                    onClick={() => setData({ ...data, imageMediaId: null, imageUrl: "" })}
                    className="text-rose-500 hover:underline"
                  >
                    清除
                  </button>
                </div>
              )}
            </div>
            <input
              value={data.imageUrl || ""}
              onChange={(e) => setData({ ...data, imageMediaId: null, imageUrl: e.target.value })}
              placeholder="粘贴自有图床图片 URL，或点击下方上传"
              className="w-full rounded-lg border border-adm-border bg-adm-input px-3 py-2 text-sm"
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 rounded-lg border border-adm-border bg-adm-card px-3 py-1.5 text-xs text-adm-text-secondary hover:bg-adm-card-hover disabled:opacity-50"
              >
                <Upload className="h-3.5 w-3.5" />
                {uploading ? "上传中..." : "上传本地图片"}
              </button>
              <button
                type="button"
                onClick={onPick}
                className="flex items-center gap-1.5 rounded-lg border border-adm-border bg-adm-card px-3 py-1.5 text-xs text-adm-text-secondary hover:bg-adm-card-hover"
              >
                <Library className="h-3.5 w-3.5" />
                媒体素材库
              </button>
            </div>
            <p className="text-[11px] leading-relaxed text-adm-text-tertiary">
              支持直接粘贴自有图床图片外链；若已配置 R2，也可直接选择本地文件上传。
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(file);
                e.target.value = "";
              }}
            />
          </div>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="adm-btn adm-btn--primary"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>保存</span>
          </button>
        </div>
      </div>
    </div>
  );
}
