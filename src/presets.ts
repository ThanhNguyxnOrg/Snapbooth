export type LayoutId = "S" | "A" | "B" | "C" | "D";
export type CameraFacing = "user" | "environment";
export type CaptionGroup = "EDITORIAL" | "ANALOG" | "PLAYFUL" | "MINIMAL";
export type FilterId =
  | "BARE"
  | "BRIGHT"
  | "BLOOM"
  | "COOL"
  | "VIVID"
  | "WARM"
  | "INK"
  | "SILVER"
  | "CHARCOAL"
  | "KODAK"
  | "PORTRA"
  | "CINESTILL"
  | "FADE"
  | "VELVET"
  | "DUSK"
  | "EXPIRED"
  | "RISO"
  | "NOIR"
  | "NEON"
  | "TUNGSTEN"
  | "FLASH"
  | "CHROME"
  | "HALATION"
  | "SOLAR";
export type FrameId =
  | "CLASSIC"
  | "POST"
  | "DESKTOP"
  | "BROADSHEET"
  | "COVER"
  | "MARQUEE"
  | "DOCUMENT"
  | "KEEPSAKE"
  | "PANEL"
  | "BULLETIN"
  | "EXPOSURE"
  | "POLAROID"
  | "TICKET"
  | "ALBUM"
  | "INDEX"
  | "ZINE"
  | "ARCHIVE"
  | "MIDNIGHT"
  | "BLANK";

export interface LayoutSpec {
  id: LayoutId;
  code: string;
  label: string;
  frames: number;
  grid: [number, number];
  cellAspect: number;
  stripWidth: number;
}

export interface FrameSpec {
  id: FrameId;
  label: string;
  tone: string;
  paper: string;
  ink: string;
  accent: string;
}

export interface FilterSpec {
  id: FilterId;
  label: string;
  group: "DAYLIGHT" | "MONO" | "FILM" | "MOOD" | "LAB";
  css: string;
}

export interface CaptionPreset {
  value: string;
  group: CaptionGroup;
}

export type PhotoSlot = string | null;

export interface StickerInstance {
  id: string;
  type: "svg" | "text";
  value: string;
  font?: string;
  color?: string;
  fontSize?: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export const STICKER_TEMPLATES = [
  { id: "heart", label: "❤️ Heart", viewBox: "0 0 24 24", path: "M12,21.35 l-1.45,-1.32 C5.4,15.36 2,12.28 2,8.5 C2,5.42 4.42,3 7.5,3 c1.74,0 3.41,0.81 4.5,2.09 C13.09,3.81 14.76,3 16.5,3 C19.58,3 22,5.42 22,8.5 c0,3.78 -3.4,6.86 -8.55,11.54 L12,21.35 z" },
  { id: "star", label: "⭐ Star", viewBox: "0 0 24 24", path: "M12,17.27 L18.18,21 L16.54,13.97 L22,9.24 L14.81,8.63 L12,2 L9.19,8.63 L2,9.24 L7.46,13.97 L5.82,21 L12,17.27 Z" },
  { id: "crown", label: "👑 Crown", viewBox: "0 0 30 24", path: "M2,22 L5,8 L10,15 L15,5 L20,15 L25,8 L28,22 Z" },
  { id: "mustache", label: "🥸 Mustache", viewBox: "0 0 24 24", path: "M16,19c-2.3,0-4.3-1-5.7-2.6C8.9,14.8,6.9,14,4.7,14H2v-1.5c2,0,4,.7,5.6,2c1.3,1,2.8,1.5,4.4,1.5s3.1-.5,4.4-1.5c1.6-1.3,3.6-2,5.6-2V14h-2.7c-2.2,0-4.2.8-5.6,2.4-1.4,1.6-3.4,2.6-5.7,2.6z" },
  { id: "speech", label: "💬 Bubble", viewBox: "0 0 24 24", path: "M20,2 H4 C2.9,2 2,2.9 2,4 V14 C2,15.1 2.9,16 4,16 H16 L22,22 V4 C22,2.9 21.1,2 20,2 Z" },
  { id: "arrow", label: "➡️ Arrow", viewBox: "0 0 24 24", path: "M12,2 L22,12 L17,12 L17,22 L7,22 L7,12 L2,12 Z" },
  { id: "sparkles", label: "✨ Sparkles", viewBox: "0 0 30 30", path: "M10,3 L12,8 L17,10 L12,12 L10,17 L8,12 L3,10 L8,8 Z M22,12 L23,15 L26,16 L23,17 L22,20 L21,17 L18,16 L21,15 Z" }
];

export const REPO_URL = "https://github.com/ThanhNguyxnOrg/Snapbooth";
export const TMPFILES_API = "https://tmpfiles.org/api/v1/upload";

export const LAYOUTS: Record<LayoutId, LayoutSpec> = {
  S: {
    id: "S",
    code: "S / 1",
    label: "Single",
    frames: 1,
    grid: [1, 1],
    cellAspect: 4 / 5,
    stripWidth: 920
  },
  A: {
    id: "A",
    code: "A / 4",
    label: "Quad",
    frames: 4,
    grid: [2, 2],
    cellAspect: 1,
    stripWidth: 1040
  },
  B: {
    id: "B",
    code: "B / 3",
    label: "Strip",
    frames: 3,
    grid: [1, 3],
    cellAspect: 4 / 5,
    stripWidth: 760
  },
  C: {
    id: "C",
    code: "C / 2",
    label: "Pair",
    frames: 2,
    grid: [1, 2],
    cellAspect: 4 / 5,
    stripWidth: 760
  },
  D: {
    id: "D",
    code: "D / 6",
    label: "Contact",
    frames: 6,
    grid: [2, 3],
    cellAspect: 1,
    stripWidth: 1040
  }
};

export const LAYOUT_ORDER: LayoutId[] = ["S", "A", "B", "C", "D"];

export const FRAMES: FrameSpec[] = [
  { id: "CLASSIC", label: "Classic", tone: "Paper booth", paper: "#FFFFFF", ink: "#141414", accent: "#141414" },
  { id: "POST", label: "Post", tone: "Air mail edge", paper: "#FCF7EA", ink: "#141414", accent: "#B5302A" },
  { id: "DESKTOP", label: "Desktop", tone: "Machine label", paper: "#F8F8F4", ink: "#111111", accent: "#2F6F4E" },
  { id: "BROADSHEET", label: "Broadsheet", tone: "Newspaper rule", paper: "#F7F1DF", ink: "#111111", accent: "#141414" },
  { id: "COVER", label: "Cover", tone: "Editorial cover", paper: "#FFFFFF", ink: "#141414", accent: "#E84A2A" },
  { id: "MARQUEE", label: "Marquee", tone: "Cinema print", paper: "#161513", ink: "#F1ECDF", accent: "#FF6B49" },
  { id: "DOCUMENT", label: "Document", tone: "Archive sheet", paper: "#F5F1E7", ink: "#141414", accent: "#5C5A52" },
  { id: "KEEPSAKE", label: "Keepsake", tone: "Warm matte", paper: "#F9E8DA", ink: "#271B13", accent: "#B76B47" },
  { id: "PANEL", label: "Panel", tone: "Gallery edge", paper: "#FDFDF9", ink: "#141414", accent: "#29384A" },
  { id: "BULLETIN", label: "Bulletin", tone: "Pinned note", paper: "#FFF9D9", ink: "#17130A", accent: "#D39A13" },
  { id: "EXPOSURE", label: "Exposure", tone: "Contact proof", paper: "#E9E9E1", ink: "#0D0D0C", accent: "#76766C" },
  { id: "POLAROID", label: "Polaroid", tone: "Instant border", paper: "#F8F2E6", ink: "#1C1A17", accent: "#C96B42" },
  { id: "TICKET", label: "Ticket", tone: "Stub print", paper: "#F4E9C5", ink: "#211B16", accent: "#D28B2A" },
  { id: "ALBUM", label: "Album", tone: "Memory page", paper: "#FDF7F0", ink: "#1A1512", accent: "#7A5A46" },
  { id: "INDEX", label: "Index", tone: "Contact index", paper: "#F1EEE7", ink: "#171717", accent: "#4D5B6B" },
  { id: "ZINE", label: "Zine", tone: "Soft print", paper: "#F5E8F1", ink: "#231A27", accent: "#7F4D78" },
  { id: "ARCHIVE", label: "Archive", tone: "Filed proof", paper: "#EDE8DF", ink: "#20201F", accent: "#8A6B3C" },
  { id: "MIDNIGHT", label: "Midnight", tone: "Darkroom", paper: "#0E0D0B", ink: "#F1ECDF", accent: "#FF6B49" },
  { id: "BLANK", label: "Blank", tone: "No caption", paper: "#FFFFFF", ink: "#141414", accent: "#FFFFFF" }
];

export const FILTERS: FilterSpec[] = [
  { id: "BARE", label: "Bare", group: "DAYLIGHT", css: "none" },
  { id: "BRIGHT", label: "Bright", group: "DAYLIGHT", css: "brightness(1.12) contrast(1.04) saturate(1.04)" },
  { id: "BLOOM", label: "Bloom", group: "DAYLIGHT", css: "brightness(1.08) contrast(0.95) saturate(0.95)" },
  { id: "COOL", label: "Cool", group: "DAYLIGHT", css: "brightness(1.04) contrast(1.04) saturate(0.96) hue-rotate(10deg)" },
  { id: "VIVID", label: "Vivid", group: "DAYLIGHT", css: "brightness(1.04) contrast(1.12) saturate(1.42)" },
  { id: "WARM", label: "Warm", group: "DAYLIGHT", css: "brightness(1.08) contrast(1.02) saturate(1.12) sepia(0.08)" },
  { id: "INK", label: "Ink", group: "MONO", css: "grayscale(1) contrast(1.38) brightness(1.03)" },
  { id: "SILVER", label: "Silver", group: "MONO", css: "grayscale(1) contrast(0.94) brightness(1.06)" },
  { id: "CHARCOAL", label: "Charcoal", group: "MONO", css: "grayscale(1) contrast(1.28) brightness(0.92)" },
  { id: "KODAK", label: "Kodak", group: "FILM", css: "sepia(0.24) saturate(1.16) contrast(1.05) brightness(1.03)" },
  { id: "PORTRA", label: "Portra", group: "FILM", css: "sepia(0.12) saturate(0.96) contrast(1.02)" },
  { id: "CINESTILL", label: "Cinestill", group: "FILM", css: "saturate(1.22) hue-rotate(-8deg) contrast(1.1)" },
  { id: "FADE", label: "Fade", group: "FILM", css: "sepia(0.12) saturate(0.78) contrast(0.88) brightness(1.08)" },
  { id: "VELVET", label: "Velvet", group: "FILM", css: "sepia(0.1) saturate(0.86) contrast(1.12) brightness(0.99)" },
  { id: "DUSK", label: "Dusk", group: "MOOD", css: "sepia(0.28) hue-rotate(-24deg) saturate(1.18) contrast(1.08)" },
  { id: "EXPIRED", label: "Expired", group: "MOOD", css: "sepia(0.36) saturate(0.74) contrast(0.92) brightness(1.06)" },
  { id: "RISO", label: "Riso", group: "MOOD", css: "saturate(0.68) contrast(1.28) hue-rotate(8deg)" },
  { id: "NOIR", label: "Noir", group: "MOOD", css: "grayscale(0.86) contrast(1.42) brightness(0.9)" },
  { id: "NEON", label: "Neon", group: "LAB", css: "saturate(1.72) contrast(1.18) hue-rotate(-18deg) brightness(1.02)" },
  { id: "TUNGSTEN", label: "Tungsten", group: "LAB", css: "sepia(0.2) saturate(1.1) hue-rotate(-16deg) contrast(1.1)" },
  { id: "FLASH", label: "Flash", group: "LAB", css: "brightness(1.18) contrast(1.22) saturate(0.94)" },
  { id: "CHROME", label: "Chrome", group: "LAB", css: "contrast(1.26) saturate(1.28) brightness(0.98)" },
  { id: "HALATION", label: "Halation", group: "LAB", css: "sepia(0.18) saturate(1.36) contrast(1.06) brightness(1.08)" },
  { id: "SOLAR", label: "Solar", group: "LAB", css: "invert(1) hue-rotate(180deg) saturate(1.25) contrast(1.1)" }
];

export const FILTER_GROUPS: FilterSpec["group"][] = ["DAYLIGHT", "MONO", "FILM", "MOOD", "LAB"];

export const CAPTION_GROUPS: CaptionGroup[] = ["EDITORIAL", "ANALOG", "PLAYFUL", "MINIMAL"];

export const CAPTION_PRESETS: CaptionPreset[] = [
  { group: "EDITORIAL", value: "BROWSER DARKROOM" },
  { group: "EDITORIAL", value: "CONTACT SHEET CLUB" },
  { group: "EDITORIAL", value: "PAPER MEMORY" },
  { group: "EDITORIAL", value: "FRAME THE MOMENT" },
  { group: "EDITORIAL", value: "ARCHIVE THIS" },
  { group: "EDITORIAL", value: "BIG MOOD ONLY" },
  { group: "ANALOG", value: "FLASH BETWEEN FRIENDS" },
  { group: "ANALOG", value: "AFTERLIGHT SESSION" },
  { group: "ANALOG", value: "GOOD LIGHT ONLY" },
  { group: "ANALOG", value: "KEEP IT IN THE ROLL" },
  { group: "ANALOG", value: "ONE MORE FOR THE WALL" },
  { group: "ANALOG", value: "SOFT PRESS PAPER" },
  { group: "PLAYFUL", value: "PRESS, POSE, PRINT" },
  { group: "PLAYFUL", value: "PROOF OF LIFE" },
  { group: "PLAYFUL", value: "NO RETAKE ENERGY" },
  { group: "PLAYFUL", value: "ONE MORE STRIP" },
  { group: "PLAYFUL", value: "FLASH ME AGAIN" },
  { group: "PLAYFUL", value: "POCKET TIME CAPSULE" },
  { group: "MINIMAL", value: "LOCAL ONLY" },
  { group: "MINIMAL", value: "MADE IN THE BROWSER" },
  { group: "MINIMAL", value: "FRAME BY FRAME" },
  { group: "MINIMAL", value: "NO CLOUD REQUIRED" },
  { group: "MINIMAL", value: "FAST ROLL" },
  { group: "MINIMAL", value: "SILENT SHUTTER" }
];

export function getFilter(id: FilterId): FilterSpec {
  return FILTERS.find((filter) => filter.id === id) ?? FILTERS[0];
}

export function getFrame(id: FrameId): FrameSpec {
  return FRAMES.find((frame) => frame.id === id) ?? FRAMES[0];
}

export function emptyPhotos(layout: LayoutId): PhotoSlot[] {
  return Array.from({ length: LAYOUTS[layout].frames }, () => null);
}
