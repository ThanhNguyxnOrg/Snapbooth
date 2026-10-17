import { LAYOUTS, STICKER_TEMPLATES, getFilter, getFrame } from "./presets";
import type { FilterId, FrameId, LayoutId, LayoutSpec, StickerInstance } from "./presets";

export function getFontFamilyCSS(fontKey: string): string {
  switch (fontKey) {
    case "Playfair": return "'Playfair Display', Georgia, serif";
    case "Cormorant": return "'Cormorant Garamond', Georgia, serif";
    case "Bebas": return "'Bebas Neue', sans-serif";
    case "Outfit": return "'Outfit', sans-serif";
    case "Syne": return "'Syne', sans-serif";
    case "Mono": return "'JetBrains Mono', monospace";
    default: return "Fraunces, Georgia, serif";
  }
}

export function getViewfinderAspect(layout: LayoutSpec): number {
  const [cols, rows] = layout.grid;
  return (cols * layout.cellAspect) / rows;
}

export function getViewfinderMaxWidth(layout: LayoutSpec): number {
  if (layout.id === "B" || layout.id === "C") return 360;
  if (layout.id === "S") return 520;
  return 760;
}

export function createDemoPhoto(index: number, aspect: number, filterCss: string): string {
  const width = 960;
  const height = Math.round(width / aspect);
  const base = document.createElement("canvas");
  base.width = width;
  base.height = height;
  const baseCtx = base.getContext("2d");
  if (!baseCtx) return "";

  const palettes = [
    ["#F5D6B8", "#9BB7A7", "#282521"],
    ["#D7E1EA", "#E84A2A", "#171717"],
    ["#F7E0D4", "#5E7A8A", "#2B211B"],
    ["#E7D7A8", "#2F6F4E", "#141414"],
    ["#E8C4C4", "#29384A", "#F9F1E7"],
    ["#D8D6C9", "#B5302A", "#111111"]
  ];
  const [paper, accent, ink] = palettes[index % palettes.length];
  const gradient = baseCtx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, paper);
  gradient.addColorStop(0.62, "#f7f1df");
  gradient.addColorStop(1, accent);
  baseCtx.fillStyle = gradient;
  baseCtx.fillRect(0, 0, width, height);

  baseCtx.fillStyle = "rgba(255,255,255,0.28)";
  baseCtx.fillRect(width * 0.08, height * 0.08, width * 0.84, height * 0.84);
  baseCtx.fillStyle = accent;
  baseCtx.beginPath();
  baseCtx.ellipse(width * 0.5, height * 0.44, width * 0.18, height * 0.18, 0, 0, Math.PI * 2);
  baseCtx.fill();
  baseCtx.fillStyle = ink;
  baseCtx.beginPath();
  baseCtx.ellipse(width * 0.5, height * 0.84, width * 0.32, height * 0.26, 0, Math.PI, Math.PI * 2);
  baseCtx.fill();
  baseCtx.strokeStyle = "rgba(20,20,20,0.22)";
  baseCtx.lineWidth = 10;
  baseCtx.strokeRect(44, 44, width - 88, height - 88);

  baseCtx.fillStyle = "rgba(20,20,20,0.12)";
  for (let dot = 0; dot < 220; dot += 1) {
    const x = (dot * 47 + index * 83) % width;
    const y = (dot * 71 + index * 53) % height;
    baseCtx.fillRect(x, y, 2, 2);
  }

  baseCtx.fillStyle = ink;
  baseCtx.font = "600 40px JetBrains Mono, monospace";
  baseCtx.textAlign = "center";
  baseCtx.fillText(`POSE ${String(index + 1).padStart(2, "0")}`, width / 2, height - 72);

  if (filterCss === "none") return base.toDataURL("image/jpeg", 0.92);
  const filtered = document.createElement("canvas");
  filtered.width = width;
  filtered.height = height;
  const filteredCtx = filtered.getContext("2d");
  if (!filteredCtx) return base.toDataURL("image/jpeg", 0.92);
  filteredCtx.filter = filterCss;
  filteredCtx.drawImage(base, 0, 0);
  return filtered.toDataURL("image/jpeg", 0.92);
}

export function captureSourceToDataUrl({
  source,
  sourceWidth,
  sourceHeight,
  aspect,
  filterCss,
  mirror
}: {
  source: CanvasImageSource;
  sourceWidth: number;
  sourceHeight: number;
  aspect: number;
  filterCss: string;
  mirror: boolean;
}): string {
  const targetWidth = 960;
  const targetHeight = Math.round(targetWidth / aspect);
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const sourceAspect = sourceWidth / sourceHeight;
  let sx = 0;
  let sy = 0;
  let sw = sourceWidth;
  let sh = sourceHeight;

  if (sourceAspect > aspect) {
    sw = sourceHeight * aspect;
    sx = (sourceWidth - sw) / 2;
  } else {
    sh = sourceWidth / aspect;
    sy = (sourceHeight - sh) / 2;
  }

  ctx.save();
  ctx.filter = filterCss;
  if (mirror) {
    ctx.translate(targetWidth, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
  ctx.restore();

  return canvas.toDataURL("image/jpeg", 0.92);
}

export async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

export async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not decode image."));
    image.src = src;
  });
}

let cachedNoisePattern: CanvasPattern | null = null;
export function getNoisePattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  if (cachedNoisePattern) return cachedNoisePattern;
  
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const nCtx = canvas.getContext("2d");
  if (!nCtx) return null;
  
  const imgData = nCtx.createImageData(size, size);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const val = Math.floor(Math.random() * 255);
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
    data[i + 3] = 45;
  }
  nCtx.putImageData(imgData, 0, 0);
  
  cachedNoisePattern = ctx.createPattern(canvas, "repeat");
  return cachedNoisePattern;
}

export async function renderStripCanvas(options: {
  layout: LayoutId;
  frame: FrameId;
  filter: FilterId;
  photos: string[];
  caption: string;
  note: string;
  textScale: number;
  timestamp: string;
  stickers?: StickerInstance[];
  captionFont?: string;
  vignette?: number;
  grain?: number;
}): Promise<HTMLCanvasElement> {
  const layout = LAYOUTS[options.layout];
  const frame = getFrame(options.frame);
  const [cols, rows] = layout.grid;
  const width = layout.stripWidth;
  const pad = 64;
  const gap = 28;
  const captionHeight = options.frame === "BLANK" ? 24 : 132;
  const cellWidth = (width - pad * 2 - gap * (cols - 1)) / cols;
  const cellHeight = cellWidth / layout.cellAspect;
  const height = Math.round(pad * 2 + rows * cellHeight + (rows - 1) * gap + captionHeight);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.fillStyle = frame.paper;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = frame.accent;
  ctx.lineWidth = options.frame === "BLANK" ? 0 : 10;
  if (ctx.lineWidth > 0) {
    ctx.strokeRect(18, 18, width - 36, height - 36);
  }

  drawPerforations(ctx, width, height, frame.paper, frame.ink);

  const images = await Promise.all(options.photos.map(loadImage));
  images.forEach((image, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const x = pad + col * (cellWidth + gap);
    const y = pad + row * (cellHeight + gap);
    ctx.drawImage(image, x, y, cellWidth, cellHeight);

    // Vignette Effect
    if (options.vignette && options.vignette > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, cellWidth, cellHeight);
      ctx.clip();
      
      const cx = x + cellWidth / 2;
      const cy = y + cellHeight / 2;
      const rOuter = Math.sqrt((cellWidth / 2) ** 2 + (cellHeight / 2) ** 2);
      const rInner = cellWidth * 0.25;
      
      const grad = ctx.createRadialGradient(cx, cy, rInner, cx, cy, rOuter);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, `rgba(0,0,0,${0.85 * (options.vignette / 100)})`);
      
      ctx.fillStyle = grad;
      ctx.globalCompositeOperation = "multiply";
      ctx.fillRect(x, y, cellWidth, cellHeight);
      ctx.restore();
    }
    
    // Grain Effect
    if (options.grain && options.grain > 0) {
      const pattern = getNoisePattern(ctx);
      if (pattern) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, cellWidth, cellHeight);
        ctx.clip();
        
        ctx.fillStyle = pattern;
        ctx.globalAlpha = options.grain / 100;
        ctx.globalCompositeOperation = "overlay";
        ctx.fillRect(x, y, cellWidth, cellHeight);
        ctx.restore();
      }
    }

    ctx.strokeStyle = "rgba(20,20,20,0.22)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, cellWidth, cellHeight);
  });

  if (options.frame !== "BLANK") {
    const textY = height - captionHeight + 50;
    ctx.fillStyle = frame.ink;
    ctx.textAlign = "center";
    ctx.font = `${Math.round(34 * options.textScale)}px ${getFontFamilyCSS(options.captionFont || "Fraunces")}`;
    ctx.fillText(options.caption.toUpperCase(), width / 2, textY, width - pad * 2);
    ctx.font = `${Math.round(18 * options.textScale)}px JetBrains Mono, monospace`;
    ctx.fillText(
      `${options.note} / ${layout.code} / ${getFilter(options.filter).label} / ${options.timestamp}`.toUpperCase(),
      width / 2,
      textY + 40,
      width - pad * 2
    );
  }

  if (options.stickers && options.stickers.length > 0) {
    const baseStickerWidth = width * 0.12;
    options.stickers.forEach((sticker) => {
      const canvasX = (sticker.x / 100) * width;
      const canvasY = (sticker.y / 100) * height;

      ctx.save();
      ctx.translate(canvasX, canvasY);
      ctx.rotate((sticker.rotation * Math.PI) / 180);

      const stickerScale = sticker.scale;
      const stickerColor = sticker.color || frame.ink;

      if (sticker.type === "svg") {
        const template = STICKER_TEMPLATES.find((t) => t.id === sticker.value);
        if (template) {
          ctx.fillStyle = stickerColor;
          const path = new Path2D(template.path);
          const [, , vbW, vbH] = template.viewBox.split(" ").map(Number);
          const maxDim = Math.max(vbW, vbH);
          const drawScale = (baseStickerWidth * stickerScale) / maxDim;

          ctx.scale(drawScale, drawScale);
          ctx.translate(-vbW / 2, -vbH / 2);
          ctx.fill(path);
        }
      } else if (sticker.type === "text") {
        ctx.fillStyle = stickerColor;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const fontSize = Math.round((sticker.fontSize || 22) * (width / 520) * stickerScale);
        const fontName =
          sticker.font === "var(--font-serif)"
            ? "Fraunces, Georgia, serif"
            : sticker.font === "var(--font-mono)"
            ? "JetBrains Mono, monospace"
            : "Inter, sans-serif";
        ctx.font = `bold ${fontSize}px ${fontName}`;
        ctx.fillText(sticker.value, 0, 0);
      }

      ctx.restore();
    });
  }

  return canvas;
}

export function renderPoseFrameCanvas(options: {
  layout: LayoutId;
  frame: FrameId;
  image: HTMLImageElement;
  caption: string;
  note: string;
  textScale: number;
  timestamp: string;
  index: number;
  total: number;
  captionFont?: string;
  vignette?: number;
  grain?: number;
}): HTMLCanvasElement {
  const layout = LAYOUTS[options.layout];
  const frame = getFrame(options.frame);
  const width = 720;
  const pad = 38;
  const captionHeight = options.frame === "BLANK" ? 28 : 112;
  const imageWidth = width - pad * 2;
  const imageHeight = Math.round(imageWidth / layout.cellAspect);
  const height = pad * 2 + imageHeight + captionHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.fillStyle = frame.paper;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = frame.accent;
  ctx.lineWidth = options.frame === "BLANK" ? 0 : 8;
  if (ctx.lineWidth > 0) {
    ctx.strokeRect(16, 16, width - 32, height - 32);
  }

  const x = pad;
  const y = pad;
  ctx.drawImage(options.image, x, y, imageWidth, imageHeight);

  // Vignette Effect
  if (options.vignette && options.vignette > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, imageWidth, imageHeight);
    ctx.clip();
    
    const cx = x + imageWidth / 2;
    const cy = y + imageHeight / 2;
    const rOuter = Math.sqrt((imageWidth / 2) ** 2 + (imageHeight / 2) ** 2);
    const rInner = imageWidth * 0.25;
    
    const grad = ctx.createRadialGradient(cx, cy, rInner, cx, cy, rOuter);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, `rgba(0,0,0,${0.85 * (options.vignette / 100)})`);
    
    ctx.fillStyle = grad;
    ctx.globalCompositeOperation = "multiply";
    ctx.fillRect(x, y, imageWidth, imageHeight);
    ctx.restore();
  }
  
  // Grain Effect
  if (options.grain && options.grain > 0) {
    const pattern = getNoisePattern(ctx);
    if (pattern) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, imageWidth, imageHeight);
      ctx.clip();
      
      ctx.fillStyle = pattern;
      ctx.globalAlpha = options.grain / 100;
      ctx.globalCompositeOperation = "overlay";
      ctx.fillRect(x, y, imageWidth, imageHeight);
      ctx.restore();
    }
  }

  ctx.strokeStyle = "rgba(20,20,20,0.22)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, imageWidth, imageHeight);

  if (options.frame !== "BLANK") {
    const textY = y + imageHeight + 48;
    ctx.fillStyle = frame.ink;
    ctx.textAlign = "center";
    ctx.font = `${Math.round(28 * options.textScale)}px ${getFontFamilyCSS(options.captionFont || "Fraunces")}`;
    ctx.fillText(options.caption.toUpperCase(), width / 2, textY, width - pad * 2);
    ctx.font = `${Math.round(14 * options.textScale)}px JetBrains Mono, monospace`;
    ctx.fillText(
      `${options.note} / POSE ${String(options.index).padStart(2, "0")}-${String(options.total).padStart(2, "0")} / ${options.timestamp}`.toUpperCase(),
      width / 2,
      textY + 34,
      width - pad * 2
    );
  }

  return canvas;
}

export function drawPerforations(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  paper: string,
  ink: string
) {
  const count = Math.max(4, Math.floor(height / 92));
  ctx.fillStyle = paper;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1;
  for (let index = 0; index < count; index += 1) {
    const y = 42 + index * ((height - 84) / Math.max(1, count - 1));
    for (const x of [18, width - 38]) {
      ctx.fillRect(x, y, 20, 42);
      ctx.strokeRect(x, y, 20, 42);
    }
  }
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error("Could not render export."));
      else resolve(blob);
    }, type);
  });
}

/** Cap GIF frame size — the encoder retains one ImageData copy per frame, so
 *  unbounded full-res strips could hold hundreds of MB during export. */
export const GIF_MAX_WIDTH = 1440;

export function downscaleForGif(canvas: HTMLCanvasElement): HTMLCanvasElement {
  if (canvas.width <= GIF_MAX_WIDTH) return canvas;
  const scale = GIF_MAX_WIDTH / canvas.width;
  const scaled = document.createElement("canvas");
  scaled.width = Math.round(canvas.width * scale);
  scaled.height = Math.round(canvas.height * scale);
  const ctx = scaled.getContext("2d");
  if (!ctx) return canvas;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(canvas, 0, 0, scaled.width, scaled.height);
  return scaled;
}
