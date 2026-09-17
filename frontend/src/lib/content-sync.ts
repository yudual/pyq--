/**
 * 跨标签页与同窗口内容即时同步机制
 * 基于 BroadcastChannel + StorageEvent + CustomEvent 三重通道实现。
 * 当博主在管理端或弹窗发表/编辑/删除/切换草稿状态时，
 * 所有打开的博客前台标签页均会实时感知并静默拉取最新数据，无需用户手动按 F5 刷新。
 */

const CHANNEL_NAME = "blog-content-sync";
const STORAGE_SYNC_KEY = "blog_content_sync_ping";

export function notifyContentUpdated(): void {
  if (typeof window === "undefined") return;

  // 1. 同页面内事件通知
  try {
    window.dispatchEvent(new CustomEvent("post-published"));
  } catch (err) {
    console.warn("Dispatch post-published error:", err);
  }

  // 2. 现代浏览器跨标签页 BroadcastChannel 广播
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel(CHANNEL_NAME);
      bc.postMessage({ type: "content-updated", timestamp: Date.now() });
      bc.close();
    }
  } catch (err) {
    console.warn("BroadcastChannel post error:", err);
  }

  // 3. 移动端与全浏览器通用的 localStorage storage 事件广播兜底
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_SYNC_KEY, String(Date.now()));
    }
  } catch {
    // 容错：私密模式或禁用 localStorage 时静默忽略
  }
}

export function subscribeContentUpdated(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleCustomEvent = () => {
    callback();
  };

  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === STORAGE_SYNC_KEY) {
      callback();
    }
  };

  window.addEventListener("post-published", handleCustomEvent);
  window.addEventListener("storage", handleStorageEvent);

  let bc: BroadcastChannel | null = null;
  try {
    if (typeof BroadcastChannel !== "undefined") {
      bc = new BroadcastChannel(CHANNEL_NAME);
      bc.onmessage = (event) => {
        if (event.data?.type === "content-updated") {
          callback();
        }
      };
    }
  } catch (err) {
    console.warn("BroadcastChannel subscribe error:", err);
  }

  return () => {
    window.removeEventListener("post-published", handleCustomEvent);
    window.removeEventListener("storage", handleStorageEvent);
    if (bc) {
      try {
        bc.close();
      } catch {
        // ignore
      }
    }
  };
}
