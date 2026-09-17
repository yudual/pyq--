/**
 * 客户端图片智能压缩工具 (Client-side Image Compression)
 *
 * 在浏览器端直传 Cloudflare R2 前，自动将大图压缩为高画质 WebP 格式：
 * 1. 规避 10MB+ 手机/相机直出大图挤占带宽、拖慢首屏与 CDN 流量
 * 2. 避免在低配 VPS（1核1G）跑 Sharp 造成 OOM 内存溢出
 * 3. 支持透明通道保留、EXIF 自动校正，GIF 与 SVG 矢量自动跳过
 */

export interface CompressOptions {
  /** 最大宽度（默认 2048px，兼顾高清视网膜屏与高压缩比） */
  maxWidth?: number;
  /** 最大高度（默认 2048px） */
  maxHeight?: number;
  /** 压缩质量 0 ~ 1（默认 0.82，肉眼无损级别） */
  quality?: number;
  /** 优先目标格式（默认 image/webp） */
  targetMime?: "image/webp" | "image/jpeg";
  /** 小于此体积（字节）且尺寸未超限时自动跳过压缩（默认 150KB） */
  minSizeToCompress?: number;
}

const DEFAULT_OPTIONS: Required<CompressOptions> = {
  maxWidth: 2048,
  maxHeight: 2048,
  quality: 0.82,
  targetMime: "image/webp",
  minSizeToCompress: 150 * 1024,
};

/**
 * 检查当前浏览器环境是否支持 Canvas toBlob WebP 导出
 */
let _supportsWebpExport: boolean | null = null;
function supportsWebpExport(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  if (_supportsWebpExport !== null) return _supportsWebpExport;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const dataUrl = canvas.toDataURL("image/webp");
    _supportsWebpExport = dataUrl.startsWith("data:image/webp");
  } catch {
    _supportsWebpExport = false;
  }
  return _supportsWebpExport;
}

/**
 * 智能压缩单个图片 File，返回压缩后的 File。
 * 若文件无需压缩或压缩失败，平滑降级返回原文件。
 */
export async function compressImage(file: File, options?: CompressOptions): Promise<File> {
  // 1. 服务端环境或非文件类型直接跳过
  if (typeof window === "undefined" || !file || !(file instanceof File)) {
    return file;
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };
  const rawType = file.type.toLowerCase();

  // 2. 动图 GIF、矢量图 SVG、音频/视频等非光栅图片直接放行
  if (
    rawType === "image/gif" ||
    rawType === "image/svg+xml" ||
    !rawType.startsWith("image/")
  ) {
    return file;
  }

  // 3. 判断目标格式：若浏览器支持 WebP 则用 WebP，否则降级为 JPEG
  const exportMime =
    opts.targetMime === "image/webp" && supportsWebpExport()
      ? "image/webp"
      : "image/jpeg";

  return new Promise<File>((resolve) => {
    let objectUrl = "";
    try {
      objectUrl = URL.createObjectURL(file);
    } catch {
      resolve(file);
      return;
    }

    const img = new Image();

    const cleanup = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = "";
      }
    };

    img.onload = () => {
      try {
        const originalWidth = img.naturalWidth || img.width;
        const originalHeight = img.naturalHeight || img.height;

        // 如果原图既小于最小体积阈值，且分辨率在限制内，直接保留原图
        if (
          file.size <= opts.minSizeToCompress &&
          originalWidth <= opts.maxWidth &&
          originalHeight <= opts.maxHeight
        ) {
          cleanup();
          resolve(file);
          return;
        }

        // 计算等比缩放目标尺寸
        let targetWidth = originalWidth;
        let targetHeight = originalHeight;
        if (targetWidth > opts.maxWidth || targetHeight > opts.maxHeight) {
          const ratio = Math.min(opts.maxWidth / targetWidth, opts.maxHeight / targetHeight);
          targetWidth = Math.max(1, Math.round(targetWidth * ratio));
          targetHeight = Math.max(1, Math.round(targetHeight * ratio));
        }

        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext("2d", { alpha: exportMime === "image/webp" });
        if (!ctx) {
          cleanup();
          resolve(file);
          return;
        }

        // 双三次高质量抗锯齿插值平滑缩放
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // JPEG 导出时若是带透明度的图片，预填充白色底
        if (exportMime === "image/jpeg") {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, targetWidth, targetHeight);
        }

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        canvas.toBlob(
          (blob) => {
            cleanup();
            if (!blob || blob.size === 0) {
              resolve(file);
              return;
            }

            // 若压缩后体积反而更大（极少见，如本身就是高压极限小图），直接保留原图
            if (blob.size >= file.size) {
              resolve(file);
              return;
            }

            // 构造新的规范化文件名
            const ext = exportMime === "image/webp" ? ".webp" : ".jpg";
            const originalName = file.name.replace(/\.[^.]+$/, "");
            const newFilename = `${originalName}${ext}`;

            const compressedFile = new File([blob], newFilename, {
              type: exportMime,
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          exportMime,
          opts.quality
        );
      } catch (err) {
        console.warn("[compressImage] 压缩发生异常，回退使用原图:", err);
        cleanup();
        resolve(file);
      }
    };

    img.onerror = () => {
      cleanup();
      resolve(file);
    };

    img.src = objectUrl;
  });
}
