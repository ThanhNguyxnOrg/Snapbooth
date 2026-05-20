import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode, RefObject } from "react";
import QRCode from "qrcode";
import GIF from "gif.js";
import gifWorkerUrl from "gif.js/dist/gif.worker.js?url";
import {
  Aperture,
  Camera,
  Check,
  Copy,
  Download,
  FlipHorizontal,
  Github,
  Moon,
  QrCode,
  RotateCcw,
  Sparkles,
  Shuffle,
  Square,
  Sun,
  Timer,
  Trash2,
  Upload,
  X
} from "lucide-react";

type Theme = "light" | "dark";
type View = "intro" | "studio" | "develop" | "faq" | "privacy" | "contact";
type LayoutId = "S" | "A" | "B" | "C" | "D";
type CameraFacing = "user" | "environment";
type CaptionGroup = "EDITORIAL" | "ANALOG" | "PLAYFUL" | "MINIMAL";
type FilterId =
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
type FrameId =
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

interface LayoutSpec {
  id: LayoutId;
  code: string;
  label: string;
  frames: number;
  grid: [number, number];
  cellAspect: number;
  stripWidth: number;
}

interface FrameSpec {
  id: FrameId;
  label: string;
  tone: string;
  paper: string;
  ink: string;
  accent: string;
}

interface FilterSpec {
  id: FilterId;
  label: string;
  group: "DAYLIGHT" | "MONO" | "FILM" | "MOOD" | "LAB";
  css: string;
}

interface CaptionPreset {
  value: string;
  group: CaptionGroup;
}

type PhotoSlot = string | null;

const REPO_URL = "https://github.com/ThanhNguyxnOrg/Photo-Booth";
const TMPFILES_API = "https://tmpfiles.org/api/v1/upload";

const LAYOUTS: Record<LayoutId, LayoutSpec> = {
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

const LAYOUT_ORDER: LayoutId[] = ["S", "A", "B", "C", "D"];

const FRAMES: FrameSpec[] = [
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

const FILTERS: FilterSpec[] = [
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

const FILTER_GROUPS: FilterSpec["group"][] = ["DAYLIGHT", "MONO", "FILM", "MOOD", "LAB"];

const CAPTION_GROUPS: CaptionGroup[] = ["EDITORIAL", "ANALOG", "PLAYFUL", "MINIMAL"];

const CAPTION_PRESETS: CaptionPreset[] = [
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

function getFilter(id: FilterId): FilterSpec {
  return FILTERS.find((filter) => filter.id === id) ?? FILTERS[0];
}

function getFrame(id: FrameId): FrameSpec {
  return FRAMES.find((frame) => frame.id === id) ?? FRAMES[0];
}

function emptyPhotos(layout: LayoutId): PhotoSlot[] {
  return Array.from({ length: LAYOUTS[layout].frames }, () => null);
}

function nowStamp(): string {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function App() {
  const [view, setView] = useState<View>("intro");
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = window.localStorage.getItem("snapbooth-theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [layout, setLayout] = useState<LayoutId>("B");
  const [frame, setFrame] = useState<FrameId>("CLASSIC");
  const [filter, setFilter] = useState<FilterId>("BARE");
  const [photos, setPhotos] = useState<PhotoSlot[]>(() => emptyPhotos("B"));
  const [mode, setMode] = useState<"MANUAL" | "AUTO">("MANUAL");
  const [timerSec, setTimerSec] = useState(3);
  const [mirror, setMirror] = useState(true);
  const [cameraFacing, setCameraFacing] = useState<CameraFacing>("user");
  const [caption, setCaption] = useState("BROWSER DARKROOM");
  const [note, setNote] = useState("SNAPBOOTH / ROLL 001");
  const [textScale, setTextScale] = useState(1);
  const [cameraState, setCameraState] = useState<"idle" | "ready" | "error" | "unsupported">("idle");
  const [cameraMessage, setCameraMessage] = useState("Camera is warming up.");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const [notice, setNotice] = useState("Use webcam or upload images. Processing stays in this browser.");
  const [autoRunning, setAutoRunning] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const photosRef = useRef<PhotoSlot[]>(photos);
  const autoRef = useRef(false);
  const countdownRef = useRef(0);

  const total = LAYOUTS[layout].frames;
  const filled = photos.filter(Boolean).length;
  const complete = filled === total;
  const nextIndex = photos.findIndex((photo) => !photo);
  const activeIndex = nextIndex === -1 ? total - 1 : nextIndex;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("snapbooth-theme", theme);
  }, [theme]);

  useEffect(() => {
    const next = emptyPhotos(layout);
    photosRef.current = next;
    setPhotos(next);
    autoRef.current = false;
    setAutoRunning(false);
    countdownRef.current += 1;
    setCountdown(null);
    setNotice(`Layout ${LAYOUTS[layout].code} armed.`);
  }, [layout]);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    if (view !== "studio") return undefined;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState("unsupported");
      setCameraMessage("This browser cannot access a webcam. Upload photos instead.");
      return undefined;
    }

    let cancelled = false;

    async function startCamera() {
      try {
        setCameraState("idle");
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: cameraFacing },
            width: { ideal: 1280 },
            height: { ideal: 960 }
          }
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraState("ready");
        setCameraMessage("Camera ready.");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Camera permission was blocked.";
        setCameraState("error");
        setCameraMessage(message);
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [view, cameraFacing]);

  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [activeIndex, layout, photos, view]);

  const addPhoto = useCallback((dataUrl: string) => {
    let inserted = false;
    setPhotos((current) => {
      const index = current.findIndex((photo) => !photo);
      if (index === -1) return current;
      const next = [...current];
      next[index] = dataUrl;
      photosRef.current = next;
      inserted = true;
      return next;
    });
    return inserted;
  }, []);

  const captureVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setNotice("Camera is not ready yet. Upload works immediately.");
      return false;
    }

    const dataUrl = captureSourceToDataUrl({
      source: video,
      sourceWidth: video.videoWidth,
      sourceHeight: video.videoHeight,
      aspect: LAYOUTS[layout].cellAspect,
      filterCss: getFilter(filter).css,
      mirror
    });

    const inserted = addPhoto(dataUrl);
    if (!inserted) return false;
    setFlash(true);
    window.setTimeout(() => setFlash(false), 90);
    setNotice("Frame captured.");
    return true;
  }, [addPhoto, filter, layout, mirror]);

  const cancelCountdown = useCallback(() => {
    countdownRef.current += 1;
    setCountdown(null);
  }, []);

  const runCountdown = useCallback(
    async (noticeLabel: string) => {
      const token = ++countdownRef.current;
      setNotice(noticeLabel);

      for (let tick = timerSec; tick > 0; tick -= 1) {
        if (countdownRef.current !== token) return false;
        setCountdown(tick);
        await wait(1000);
      }

      if (countdownRef.current !== token) return false;
      setCountdown(null);
      return true;
    },
    [timerSec]
  );

  const captureWithCountdown = useCallback(async () => {
    if (complete) return;
    const ready = await runCountdown(`Capture in ${timerSec}s.`);
    if (!ready) return;
    captureVideo();
  }, [captureVideo, complete, runCountdown, timerSec]);

  const switchCamera = useCallback(() => {
    setCameraFacing((current) => {
      const next = current === "user" ? "environment" : "user";
      setMirror(next === "user");
      return next;
    });
    setNotice("Switching camera.");
  }, []);

  const randomCaption = useCallback(() => {
    const current = caption.trim();
    const pool = CAPTION_PRESETS.filter((preset) => preset.value !== current);
    const source = pool.length ? pool : CAPTION_PRESETS;
    const next = source[Math.floor(Math.random() * source.length)].value;
    setCaption(next);
    setNotice(`Caption preset: ${next.toLowerCase()}.`);
  }, [caption]);

  const fillDemoRoll = useCallback(() => {
    const next = Array.from({ length: total }, (_, index) =>
      createDemoPhoto(index, LAYOUTS[layout].cellAspect, getFilter(filter).css)
    );
    photosRef.current = next;
    setPhotos(next);
    autoRef.current = false;
    setAutoRunning(false);
    cancelCountdown();
    setNotice("Demo roll loaded for preview and export.");
  }, [cancelCountdown, filter, layout, total]);

  const startAuto = useCallback(async () => {
    if (autoRef.current || complete) return;
    autoRef.current = true;
    setAutoRunning(true);
    setNotice("Auto roll armed.");

    while (autoRef.current && photosRef.current.some((photo) => !photo)) {
      const ready = await runCountdown(`Auto capture in ${timerSec}s.`);
      if (!ready || !autoRef.current) break;
      const captured = captureVideo();
      if (!captured) break;
      await wait(480);
    }

    const finishedNaturally = !photosRef.current.some((photo) => !photo);
    autoRef.current = false;
    setAutoRunning(false);
    cancelCountdown();
    if (finishedNaturally) {
      setNotice("Auto roll complete.");
    }
  }, [cancelCountdown, captureVideo, complete, runCountdown, timerSec]);

  const handleShutter = useCallback(() => {
    if (mode === "AUTO") {
      void startAuto();
      return;
    }
    void captureWithCountdown();
  }, [captureWithCountdown, mode, startAuto]);

  const stopAuto = useCallback(() => {
    autoRef.current = false;
    setAutoRunning(false);
    cancelCountdown();
    setNotice("Auto roll stopped.");
  }, [cancelCountdown]);

  const handleUpload = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      if (!autoRef.current) cancelCountdown();
      const available = total - photosRef.current.filter(Boolean).length;
      const selected = Array.from(files).slice(0, available);

      for (const file of selected) {
        const dataUrl = await readFileAsDataUrl(file);
        const image = await loadImage(dataUrl);
        addPhoto(
          captureSourceToDataUrl({
            source: image,
            sourceWidth: image.naturalWidth,
            sourceHeight: image.naturalHeight,
            aspect: LAYOUTS[layout].cellAspect,
            filterCss: getFilter(filter).css,
            mirror: false
          })
        );
      }

      setNotice(`${selected.length} upload${selected.length === 1 ? "" : "s"} added.`);
    },
    [addPhoto, cancelCountdown, filter, layout, total]
  );

  const retakeLast = useCallback(() => {
    cancelCountdown();
    setPhotos((current) => {
      const next = [...current];
      const index = next.map(Boolean).lastIndexOf(true);
      if (index >= 0) next[index] = null;
      photosRef.current = next;
      return next;
    });
    setNotice("Last frame cleared.");
  }, [cancelCountdown]);

  const retakeAll = useCallback(() => {
    const next = emptyPhotos(layout);
    photosRef.current = next;
    setPhotos(next);
    cancelCountdown();
    setNotice("Roll cleared.");
  }, [cancelCountdown, layout]);

  const startDevelop = useCallback(() => {
    if (!complete) return;
    autoRef.current = false;
    setAutoRunning(false);
    cancelCountdown();
    setView("develop");
  }, [cancelCountdown, complete]);

  const setCaptureMode = useCallback(
    (nextMode: "MANUAL" | "AUTO") => {
      cancelCountdown();
      setMode(nextMode);
    },
    [cancelCountdown]
  );

  return (
    <div className="app-shell">
      <TopBar
        view={view}
        theme={theme}
        onNavigate={setView}
        onToggleTheme={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
      />

      <main>
        {view === "intro" && (
          <Intro
            onBegin={() => setView("studio")}
            onJumpSamples={() => {
              const target = document.getElementById("intro-samples");
              target?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          />
        )}

        {view === "studio" && (
          <Studio
            layout={layout}
            frame={frame}
            filter={filter}
            photos={photos}
            mode={mode}
            timerSec={timerSec}
            mirror={mirror}
            cameraFacing={cameraFacing}
            caption={caption}
            note={note}
            textScale={textScale}
            cameraState={cameraState}
            cameraMessage={cameraMessage}
            countdown={countdown}
            flash={flash}
            notice={notice}
            autoRunning={autoRunning}
            complete={complete}
            activeIndex={activeIndex}
            videoRef={videoRef}
            fileRef={fileRef}
            onLayout={setLayout}
            onFrame={setFrame}
            onFilter={setFilter}
            onMode={setCaptureMode}
            onTimer={setTimerSec}
            onMirror={() => setMirror((current) => !current)}
            onSwitchCamera={switchCamera}
            onDemoRoll={fillDemoRoll}
            onRandomCaption={randomCaption}
            onCaption={setCaption}
            onNote={setNote}
            onTextScale={setTextScale}
            onShutter={handleShutter}
            onStopAuto={stopAuto}
            onUpload={(files) => void handleUpload(files)}
            onRetakeLast={retakeLast}
            onRetakeAll={retakeAll}
            onDevelop={startDevelop}
          />
        )}

        {view === "develop" && (
          <Develop
            layout={layout}
            frame={frame}
            filter={filter}
            photos={photos.filter(Boolean) as string[]}
            caption={caption}
            note={note}
            textScale={textScale}
            onBack={() => setView("studio")}
            onStartNew={() => {
              retakeAll();
              setView("intro");
            }}
          />
        )}

        {view === "faq" && <StaticPage kind="faq" />}
        {view === "privacy" && <StaticPage kind="privacy" />}
        {view === "contact" && <StaticPage kind="contact" />}
      </main>

      <Footer />
    </div>
  );
}

interface StudioProps {
  layout: LayoutId;
  frame: FrameId;
  filter: FilterId;
  photos: PhotoSlot[];
  mode: "MANUAL" | "AUTO";
  timerSec: number;
  mirror: boolean;
  cameraFacing: CameraFacing;
  caption: string;
  note: string;
  textScale: number;
  cameraState: "idle" | "ready" | "error" | "unsupported";
  cameraMessage: string;
  countdown: number | null;
  flash: boolean;
  notice: string;
  autoRunning: boolean;
  complete: boolean;
  activeIndex: number;
  videoRef: RefObject<HTMLVideoElement>;
  fileRef: React.RefObject<HTMLInputElement>;
  onLayout: (layout: LayoutId) => void;
  onFrame: (frame: FrameId) => void;
  onFilter: (filter: FilterId) => void;
  onMode: (mode: "MANUAL" | "AUTO") => void;
  onTimer: (value: number) => void;
  onMirror: () => void;
  onSwitchCamera: () => void;
  onDemoRoll: () => void;
  onRandomCaption: () => void;
  onCaption: (value: string) => void;
  onNote: (value: string) => void;
  onTextScale: (value: number) => void;
  onShutter: () => void;
  onStopAuto: () => void;
  onUpload: (files: FileList | null) => void;
  onRetakeLast: () => void;
  onRetakeAll: () => void;
  onDevelop: () => void;
}

function Studio(props: StudioProps) {
  const layoutSpec = LAYOUTS[props.layout];
  const frameSpec = getFrame(props.frame);
  const filterSpec = getFilter(props.filter);
  const filled = props.photos.filter(Boolean).length;

  return (
    <section className="studio-page">
      <div className="studio-heading">
        <div>
          <p className="eyebrow">Roll 001 / Browser darkroom</p>
          <h1>Snapbooth studio</h1>
        </div>
        <p>
          Select a layout, set a frame, capture from webcam or upload, then develop a clean photo strip.
        </p>
      </div>

      <div className="studio-grid">
        <aside className="rail rail-left" aria-label="Photo strip settings">
          <RailSection title="01 Layout">
            <div className="layout-list">
              {LAYOUT_ORDER.map((id) => (
                <button
                  className={`layout-option ${props.layout === id ? "is-active" : ""}`}
                  key={id}
                  onClick={() => props.onLayout(id)}
                >
                  <LayoutDiagram id={id} />
                  <span>{LAYOUTS[id].code}</span>
                  <small>{LAYOUTS[id].label}</small>
                </button>
              ))}
            </div>
          </RailSection>

          <RailSection title="02 Frame">
            <div className="frame-list">
              {FRAMES.map((item) => (
                <button
                  className={`frame-option ${props.frame === item.id ? "is-active" : ""}`}
                  key={item.id}
                  onClick={() => props.onFrame(item.id)}
                >
                  <span
                    className="frame-swatch"
                    style={
                      {
                        "--frame-paper": item.paper,
                        "--frame-ink": item.ink,
                        "--frame-accent": item.accent
                      } as React.CSSProperties
                    }
                  />
                  <span>{item.label}</span>
                  <small>{item.tone}</small>
                </button>
              ))}
            </div>
          </RailSection>

          <RailSection title="03 Customize">
            <label className="field">
              <span>Roll title</span>
              <input value={props.caption} onChange={(event) => props.onCaption(event.target.value)} maxLength={56} />
            </label>
            <label className="field">
              <span>Caption</span>
              <input value={props.note} onChange={(event) => props.onNote(event.target.value)} maxLength={48} />
            </label>
            <div className="preset-block">
              <div className="preset-head">
                <span>Caption presets</span>
                <button className="preset-action" onClick={props.onRandomCaption} type="button">
                  <Shuffle size={13} />
                  Shuffle
                </button>
              </div>
              <div className="caption-presets">
                {CAPTION_GROUPS.map((group) => (
                  <div key={group} className="caption-group">
                    <p>{group}</p>
                    <div className="caption-chip-grid">
                      {CAPTION_PRESETS.filter((item) => item.group === group).map((item) => (
                        <button
                          key={item.value}
                          className={`caption-chip ${props.caption === item.value ? "is-active" : ""}`}
                          onClick={() => props.onCaption(item.value)}
                          type="button"
                        >
                          {item.value}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <label className="field">
              <span>Text scale {Math.round(props.textScale * 100)}%</span>
              <input
                type="range"
                min="0.75"
                max="1.35"
                step="0.05"
                value={props.textScale}
                onChange={(event) => props.onTextScale(Number(event.target.value))}
              />
            </label>
          </RailSection>
        </aside>

        <section className="stage" aria-label="Camera and strip preview">
          <div className="stage-meta">
            <span>{layoutSpec.code}</span>
            <span>{frameSpec.label}</span>
            <span>{filterSpec.label}</span>
            <span>
              {String(filled).padStart(2, "0")} / {String(layoutSpec.frames).padStart(2, "0")}
            </span>
          </div>

          <div
            className="viewfinder-shell"
            style={
              {
                "--frame-paper": frameSpec.paper,
                "--frame-ink": frameSpec.ink,
                "--frame-accent": frameSpec.accent
              } as React.CSSProperties
            }
          >
            <div className="viewfinder-shell__bar">
              <span>Live preview</span>
              <span>
                {frameSpec.label} / {filterSpec.label}
              </span>
            </div>

            <div
              className={`viewfinder ${props.flash ? "is-flashing" : ""}`}
              style={{
                aspectRatio: getViewfinderAspect(layoutSpec).toString(),
                maxWidth: `${getViewfinderMaxWidth(layoutSpec)}px`
              }}
            >
              <ViewfinderGrid
                layout={props.layout}
                photos={props.photos}
                activeIndex={props.activeIndex}
                mirror={props.mirror}
                videoRef={props.videoRef}
                cameraState={props.cameraState}
                cameraMessage={props.cameraMessage}
                filterCss={filterSpec.css}
              />

              {props.countdown !== null && <div className="countdown">{props.countdown}</div>}
            </div>

            <div className="viewfinder-shell__bar viewfinder-shell__bar--foot">
              <span>{layoutSpec.code}</span>
              <span>{props.caption}</span>
            </div>
          </div>

          <div className="progress-row" aria-label="Capture progress">
            {props.photos.map((photo, index) => (
              <span
                className={photo ? "is-filled" : index === props.activeIndex ? "is-current" : ""}
                key={index}
              />
            ))}
          </div>

          <div className="mobile-capture-bar">
            <button className="mode-pill" onClick={() => props.onMode(props.mode === "AUTO" ? "MANUAL" : "AUTO")}>
              {props.mode}
            </button>
            <button
              className="shutter"
              onClick={props.autoRunning ? props.onStopAuto : props.onShutter}
              disabled={props.complete || (props.countdown !== null && !props.autoRunning)}
            >
              {props.autoRunning ? <Square size={18} /> : <Aperture size={22} />}
            </button>
            <button className="icon-plain" onClick={() => props.fileRef.current?.click()} aria-label="Upload photos">
              <Upload size={18} />
            </button>
          </div>

        </section>

        <aside className="rail rail-right" aria-label="Capture controls">
          <RailSection title="Capture">
            <div className="shutter-block">
              <button
                className="shutter"
                onClick={props.autoRunning ? props.onStopAuto : props.onShutter}
                disabled={props.complete || (props.countdown !== null && !props.autoRunning)}
                aria-label={props.autoRunning ? "Stop auto capture" : "Capture photo"}
              >
                {props.autoRunning ? <Square size={22} /> : <Aperture size={28} />}
              </button>
              <span>{props.autoRunning ? "Stop" : "Shutter"}</span>
            </div>

            <div className="segmented" role="group" aria-label="Capture mode">
              {(["MANUAL", "AUTO"] as const).map((item) => (
                <button
                  className={props.mode === item ? "is-active" : ""}
                  key={item}
                  onClick={() => props.onMode(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            <label className="field">
              <span className="field-head">
                <Timer size={12} />
                Count-in {props.timerSec}s
              </span>
              <input
                type="range"
                min="1"
                max="10"
                value={props.timerSec}
                onChange={(event) => props.onTimer(Number(event.target.value))}
              />
            </label>

            <div className="button-grid">
              <Button variant="secondary" icon={<Upload size={15} />} onClick={() => props.fileRef.current?.click()}>
                Upload
              </Button>
              <Button variant="secondary" icon={<Camera size={15} />} onClick={props.onSwitchCamera}>
                {props.cameraFacing === "user" ? "Front cam" : "Rear cam"}
              </Button>
              <Button variant="secondary" icon={<FlipHorizontal size={15} />} onClick={props.onMirror}>
                {props.mirror ? "Mirror" : "Normal"}
              </Button>
              <Button variant="secondary" icon={<Sparkles size={15} />} onClick={props.onDemoRoll}>
                Demo roll
              </Button>
            </div>

            <input
              ref={props.fileRef}
              className="sr-only"
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                props.onUpload(event.target.files);
                event.currentTarget.value = "";
              }}
            />
          </RailSection>

          <RailSection title="04 Filter" className="filter-rail">
            <div className="filter-groups">
              {FILTER_GROUPS.map((group) => (
                <div key={group} className="filter-group">
                  <p>{group}</p>
                  <div>
                    {FILTERS.filter((item) => item.group === group).map((item) => (
                      <button
                        className={`filter-option ${props.filter === item.id ? "is-active" : ""}`}
                        key={item.id}
                        onClick={() => props.onFilter(item.id)}
                        type="button"
                      >
                        <span className="filter-thumb" style={{ filter: item.css }} />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </RailSection>

          <RailSection title="Roll">
            <div className="button-stack">
              <Button variant="ghost" icon={<RotateCcw size={15} />} onClick={props.onRetakeLast}>
                Retake last
              </Button>
              <Button variant="ghost" icon={<Trash2 size={15} />} onClick={props.onRetakeAll}>
                Retake all
              </Button>
              <Button icon={<Check size={15} />} onClick={props.onDevelop} disabled={!props.complete}>
                Develop strip
              </Button>
            </div>
          </RailSection>

          <p className="notice">{props.notice}</p>
        </aside>
      </div>
    </section>
  );
}

function Intro({
  onBegin,
  onJumpSamples
}: {
  onBegin: () => void;
  onJumpSamples: () => void;
}) {
  const steps = [
    ["01", "Pick a layout", "Choose from single, strip, pair, quad, or contact sheet."],
    ["02", "Set the frame", "Select a paper tone, caption preset, and decide how much text belongs on the print."],
    ["03", "Shoot and develop", "Capture with count-in by webcam or upload, then export PNG, GIF, boomerang GIF, or QR."]
  ];

  const samples = [
    { layout: "B" as LayoutId, frame: "BROADSHEET" as FrameId, title: "CONTACT SHEET CLUB", note: "KODAK / BROADSHEET" },
    { layout: "A" as LayoutId, frame: "POLAROID" as FrameId, title: "PRESS, POSE, PRINT", note: "PORTRA / POLAROID" },
    { layout: "C" as LayoutId, frame: "PANEL" as FrameId, title: "AFTERLIGHT SESSION", note: "INK / PANEL" },
    { layout: "D" as LayoutId, frame: "MIDNIGHT" as FrameId, title: "NO RETAKE ENERGY", note: "NOIR / MIDNIGHT" },
    { layout: "S" as LayoutId, frame: "ALBUM" as FrameId, title: "LOCAL ONLY", note: "BRIGHT / ALBUM" },
    { layout: "B" as LayoutId, frame: "ZINE" as FrameId, title: "ONE MORE STRIP", note: "DUSK / ZINE" }
  ];

  return (
    <section className="intro-page">
      <div className="intro-hero">
        <div className="intro-copy">
          <p className="eyebrow">Browser darkroom / privacy-first / no account</p>
          <h1>Take a photo strip in thirty seconds.</h1>
          <p className="intro-lead">
            Snapbooth keeps the classic photobooth idea and strips away the clutter. Capture in the browser, keep
            the edit flow tight, and export only what you need.
          </p>
          <div className="intro-actions">
            <Button icon={<Aperture size={15} />} onClick={onBegin}>
              Begin roll
            </Button>
            <Button variant="secondary" icon={<Camera size={15} />} onClick={onJumpSamples}>
              View samples
            </Button>
          </div>
          <div className="intro-kpis">
            <div>
              <span>01</span>
              <strong>Layouts</strong>
            </div>
            <div>
              <span>02</span>
              <strong>Frames</strong>
            </div>
            <div>
              <span>03</span>
              <strong>Exports</strong>
            </div>
          </div>
        </div>

        <div className="intro-stage">
          <div className="intro-tilt">
            <StripPreview
              layout="B"
              frame="MIDNIGHT"
              photos={emptyPhotos("B")}
              caption="BROWSER DARKROOM"
              note="LAYOUT B / 3 FRAMES"
              textScale={1}
            />
          </div>
        </div>
      </div>

      <div className="intro-band">
        <p className="eyebrow">How it works</p>
        <div className="intro-steps">
          {steps.map(([number, title, copy]) => (
            <article key={number}>
              <span>{number}</span>
              <h2>{title}</h2>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="intro-band" id="intro-samples">
        <p className="eyebrow">Field samples</p>
        <div className="intro-samples-rail">
          {samples.map((sample, index) => (
            <div className="intro-sample" key={`${sample.title}-${index}`}>
              <StripPreview
                layout={sample.layout}
                frame={sample.frame}
                photos={emptyPhotos(sample.layout)}
                caption={sample.title}
                note={sample.note}
                textScale={0.92}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="intro-band intro-faq">
        <p className="eyebrow">Quick answers</p>
        <div className="intro-faq-grid">
          <details open>
            <summary>Is anything uploaded by default?</summary>
            <p>No. Capture and upload stay local unless you choose the QR share flow.</p>
          </details>
          <details open>
            <summary>Can I use my own photos?</summary>
            <p>Yes. Upload one or more images and the booth fills the remaining frames.</p>
          </details>
          <details open>
            <summary>What happens after export?</summary>
            <p>You get PNG and GIF downloads, plus an optional temporary link for another device.</p>
          </details>
        </div>
      </div>
    </section>
  );
}

function ViewfinderGrid({
  layout,
  photos,
  activeIndex,
  mirror,
  videoRef,
  cameraState,
  cameraMessage,
  filterCss
}: {
  layout: LayoutId;
  photos: PhotoSlot[];
  activeIndex: number;
  mirror: boolean;
  videoRef: RefObject<HTMLVideoElement>;
  cameraState: "idle" | "ready" | "error" | "unsupported";
  cameraMessage: string;
  filterCss: string;
}) {
  const layoutSpec = LAYOUTS[layout];
  const [cols, rows] = layoutSpec.grid;

  return (
    <div
      className="viewfinder-grid"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`
      }}
    >
      {Array.from({ length: layoutSpec.frames }, (_, index) => {
        const photo = photos[index];
        const active = index === activeIndex && !photo;
        return (
          <div className={`view-cell ${active ? "is-active" : ""}`} key={index}>
            {photo ? (
              <img src={photo} alt={`Captured frame ${index + 1}`} />
            ) : active ? (
              cameraState === "ready" || cameraState === "idle" ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    style={{ filter: filterCss, transform: mirror ? "scaleX(-1)" : "none" }}
                  />
                  {cameraState === "idle" && <div className="camera-message">{cameraMessage}</div>}
                </>
              ) : (
                <div className="camera-message">{cameraMessage}</div>
              )
            ) : (
              <span>{String(index + 1).padStart(2, "0")}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Develop({
  layout,
  frame,
  filter,
  photos,
  caption,
  note,
  textScale,
  onBack,
  onStartNew
}: {
  layout: LayoutId;
  frame: FrameId;
  filter: FilterId;
  photos: string[];
  caption: string;
  note: string;
  textScale: number;
  onBack: () => void;
  onStartNew: () => void;
}) {
  const [busy, setBusy] = useState<null | "png" | "gif" | "boomerang" | "qr">(null);
  const [gifProgress, setGifProgress] = useState(0);
  const [share, setShare] = useState<{ qr?: string; link?: string; error?: string }>({});
  const [shareOpen, setShareOpen] = useState(false);
  const timestamp = useMemo(nowStamp, []);
  const filename = useMemo(
    () => `snapbooth_${layout.toLowerCase()}_${frame.toLowerCase()}_${Date.now().toString(36)}.png`,
    [frame, layout]
  );

  const renderOptions = useMemo(
    () => ({
      layout,
      frame,
      filter,
      photos,
      caption,
      note,
      textScale,
      timestamp
    }),
    [caption, filter, frame, layout, note, photos, textScale, timestamp]
  );

  async function exportPng() {
    setBusy("png");
    try {
      const canvas = await renderStripCanvas(renderOptions);
      const blob = await canvasToBlob(canvas, "image/png");
      downloadBlob(blob, filename);
    } finally {
      setBusy(null);
    }
  }

  async function exportGif() {
    setBusy("gif");
    setGifProgress(0);
    const canvas = await renderStripCanvas(renderOptions);
    const gif = new GIF({
      workers: 2,
      quality: 10,
      width: canvas.width,
      height: canvas.height,
      workerScript: gifWorkerUrl
    });
    const frames = 18;

    for (let index = 0; index < frames; index += 1) {
      const temp = document.createElement("canvas");
      temp.width = canvas.width;
      temp.height = canvas.height;
      const ctx = temp.getContext("2d");
      if (!ctx) continue;
      const phase = Math.sin((index / (frames - 1)) * Math.PI);
      const scale = 1 + phase * 0.035;
      const width = canvas.width * scale;
      const height = canvas.height * scale;
      ctx.fillStyle = getFrame(frame).paper;
      ctx.fillRect(0, 0, temp.width, temp.height);
      ctx.drawImage(canvas, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
      gif.addFrame(temp, { delay: 90, copy: true });
    }

    gif.on("progress", (progress) => setGifProgress(progress));
    gif.on("finished", (blob) => {
      downloadBlob(blob, filename.replace(".png", ".gif"));
      setBusy(null);
      setGifProgress(1);
    });
    gif.render();
  }

  async function exportBoomerangGif() {
    setBusy("boomerang");
    setGifProgress(0);

    try {
      const images = await Promise.all(photos.map(loadImage));
      const keyedImages = images.map((image, index) => ({ image, index }));
      const sequence = keyedImages.length > 1 ? [...keyedImages, ...keyedImages.slice(1, -1).reverse()] : keyedImages;
      const first = renderPoseFrameCanvas({
        layout,
        frame,
        image: sequence[0].image,
        caption,
        note,
        textScale,
        timestamp,
        index: sequence[0].index + 1,
        total: images.length
      });
      const gif = new GIF({
        workers: 2,
        quality: 10,
        width: first.width,
        height: first.height,
        workerScript: gifWorkerUrl
      });

      sequence.forEach(({ image, index }) => {
        const canvas = renderPoseFrameCanvas({
          layout,
          frame,
          image,
          caption,
          note,
          textScale,
          timestamp,
          index: index + 1,
          total: images.length
        });
        gif.addFrame(canvas, { delay: index === 0 ? 320 : 170, copy: true });
      });

      gif.on("progress", (progress) => setGifProgress(progress));
      gif.on("finished", (blob) => {
        downloadBlob(blob, filename.replace(".png", "_boomerang.gif"));
        setBusy(null);
        setGifProgress(1);
      });
      gif.render();
    } catch (error) {
      console.error(error);
      setBusy(null);
      setGifProgress(0);
    }
  }

  async function createShareQr() {
    setShareOpen(true);
    setShare({});
    setBusy("qr");

    try {
      const canvas = await renderStripCanvas(renderOptions);
      const blob = await canvasToBlob(canvas, "image/png");
      const link = await uploadTemporary(blob, filename);
      const qr = await QRCode.toDataURL(link, {
        margin: 1,
        width: 260,
        color: {
          dark: "#141414",
          light: "#FFFFFF"
        }
      });
      setShare({ qr, link });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create a temporary share link.";
      setShare({ error: message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="develop-page">
      <div className="page-bar">
        <Button variant="ghost" onClick={onBack}>
          Back to studio
        </Button>
        <span>Develop / print room</span>
      </div>

      <div className="develop-grid">
        <div className="print-stage">
          <StripPreview
            layout={layout}
            frame={frame}
            photos={photos}
            caption={caption}
            note={note}
            textScale={textScale}
            resolved
          />

          <dl className="metadata">
            <div>
              <dt>Filename</dt>
              <dd>{filename}</dd>
            </div>
            <div>
              <dt>Layout</dt>
              <dd>{LAYOUTS[layout].code}</dd>
            </div>
            <div>
              <dt>Frame</dt>
              <dd>{getFrame(frame).label}</dd>
            </div>
            <div>
              <dt>Filter</dt>
              <dd>{getFilter(filter).label}</dd>
            </div>
            <div>
              <dt>Captured</dt>
              <dd>{timestamp}</dd>
            </div>
          </dl>
        </div>

        <aside className="export-panel">
          <RailSection title="Export">
            <div className="button-stack">
              <Button icon={<Download size={15} />} onClick={() => void exportPng()} disabled={busy !== null}>
                {busy === "png" ? "Rendering" : "Export image"}
              </Button>
              <Button variant="secondary" icon={<Download size={15} />} onClick={() => void exportGif()} disabled={busy !== null}>
                {busy === "gif" ? `GIF ${Math.round(gifProgress * 100)}%` : "Export GIF"}
              </Button>
              <Button variant="secondary" icon={<Download size={15} />} onClick={() => void exportBoomerangGif()} disabled={busy !== null}>
                {busy === "boomerang" ? `Boomerang ${Math.round(gifProgress * 100)}%` : "Boomerang GIF"}
              </Button>
              <Button variant="secondary" icon={<QrCode size={15} />} onClick={() => void createShareQr()} disabled={busy !== null}>
                {busy === "qr" ? "Uploading" : "Share QR"}
              </Button>
            </div>
          </RailSection>

          <RailSection title="Roll">
            <Button variant="ghost" icon={<RotateCcw size={15} />} onClick={onStartNew}>
              Start new roll
            </Button>
          </RailSection>
        </aside>
      </div>

      {shareOpen && (
        <ShareDialog
          share={share}
          loading={busy === "qr"}
          onClose={() => setShareOpen(false)}
        />
      )}
    </section>
  );
}

function StripPreview({
  layout,
  frame,
  photos,
  caption,
  note,
  textScale,
  resolved = false
}: {
  layout: LayoutId;
  frame: FrameId;
  photos: PhotoSlot[];
  caption: string;
  note: string;
  textScale: number;
  resolved?: boolean;
}) {
  const layoutSpec = LAYOUTS[layout];
  const frameSpec = getFrame(frame);
  const [cols, rows] = layoutSpec.grid;
  const scaleStyle = {
    "--frame-paper": frameSpec.paper,
    "--frame-ink": frameSpec.ink,
    "--frame-accent": frameSpec.accent,
    "--caption-scale": textScale.toString(),
    "--cell-aspect": layoutSpec.cellAspect.toString()
  } as CSSProperties;

  return (
    <div className={`strip-preview ${resolved ? "is-resolved" : ""}`} style={scaleStyle}>
      <div
        className="strip-grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`
        }}
      >
        {Array.from({ length: layoutSpec.frames }, (_, index) => {
          const photo = photos[index];
          return (
            <div className="strip-cell" key={index}>
              {photo ? <img src={photo} alt={`Frame ${index + 1}`} /> : <span>{String(index + 1).padStart(2, "0")}</span>}
            </div>
          );
        })}
      </div>
      {frame !== "BLANK" && (
        <div className="strip-caption">
          <strong>{caption}</strong>
          <span>{note}</span>
        </div>
      )}
      <div className="perf perf-left" />
      <div className="perf perf-right" />
    </div>
  );
}

function ShareDialog({
  share,
  loading,
  onClose
}: {
  share: { qr?: string; link?: string; error?: string };
  loading: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    if (!share.link) return;
    await navigator.clipboard.writeText(share.link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="share-dialog" onClick={(event) => event.stopPropagation()} aria-label="Share QR">
        <div className="dialog-head">
          <span>Share roll</span>
          <button onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {loading && <p className="dialog-message">Uploading a temporary PNG for the QR link.</p>}

        {share.error && <p className="dialog-error">{share.error}</p>}

        {share.qr && (
          <>
            <img className="qr-image" src={share.qr} alt="QR code for photo strip" />
            <div className="share-link">
              <span>{share.link}</span>
              <button onClick={() => void copyLink()} aria-label="Copy share link">
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
            <p className="dialog-message">Link expires in about 60 minutes via tmpfiles.org.</p>
          </>
        )}
      </section>
    </div>
  );
}

function TopBar({
  view,
  theme,
  onNavigate,
  onToggleTheme
}: {
  view: View;
  theme: Theme;
  onNavigate: (view: View) => void;
  onToggleTheme: () => void;
}) {
  const links: { view: View; label: string }[] = [
    { view: "intro", label: "Home" },
    { view: "studio", label: "Studio" },
    { view: "faq", label: "FAQ" },
    { view: "privacy", label: "Privacy" },
    { view: "contact", label: "Contact" }
  ];

  return (
    <header className="topbar">
      <button className="wordmark" onClick={() => onNavigate("intro")}>
        Snapbooth<span>.</span>
      </button>
      <nav aria-label="Primary navigation">
        {links.map((link) => (
          <button
            className={view === link.view ? "is-active" : ""}
            key={link.view}
            onClick={() => onNavigate(link.view)}
          >
            {link.label}
          </button>
        ))}
      </nav>
      <div className="topbar-actions">
        <a href={REPO_URL} target="_blank" rel="noreferrer" aria-label="Open GitHub repository">
          <Github size={17} />
          <span>Repo</span>
        </a>
        <button onClick={onToggleTheme} aria-label="Toggle theme">
          {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
        </button>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <span>SNAPBOOTH / 2026 / PRIVACY-FIRST / ALL RIGHTS RESERVED / v2.0</span>
    </footer>
  );
}

function RailSection({
  title,
  children,
  className = ""
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rail-section ${className}`}>
      <h2>{title}</h2>
      <div className="hairline" />
      <div className="rail-content">{children}</div>
    </section>
  );
}

function Button({
  children,
  icon,
  variant = "primary",
  disabled = false,
  onClick
}: {
  children: ReactNode;
  icon?: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button className={`btn btn-${variant}`} disabled={disabled} onClick={onClick}>
      {icon}
      <span>{children}</span>
    </button>
  );
}

function LayoutDiagram({ id }: { id: LayoutId }) {
  const layout = LAYOUTS[id];
  const [cols, rows] = layout.grid;
  return (
    <span
      className="layout-diagram"
      style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`
      }}
    >
      {Array.from({ length: layout.frames }, (_, index) => (
        <i key={index} />
      ))}
    </span>
  );
}

function StaticPage({ kind }: { kind: "faq" | "privacy" | "contact" }) {
  if (kind === "privacy") {
    return (
      <article className="editorial-page">
        <p className="eyebrow">Privacy</p>
        <h1>No account. No backend. No photo library.</h1>
        <p>
          Snapbooth processes camera captures, uploads, filters, and exports inside your browser. The app does not
          run a custom server and does not keep a copy of your images.
        </p>
        <p>
          The only network share flow is optional: when you press Share QR, the generated PNG is uploaded to
          tmpfiles.org so another device can download it for about 60 minutes. If you do not use that button, your
          roll remains local.
        </p>
        <p>
          Camera access is requested by the browser and can be revoked in browser settings. Uploaded files are read
          locally through the File API.
        </p>
      </article>
    );
  }

  if (kind === "contact") {
    return (
      <article className="editorial-page">
        <p className="eyebrow">Contact</p>
        <h1>Write or report.</h1>
        <div className="contact-grid">
          <a href="mailto:274720769+RealThanhNguyxn@users.noreply.github.com">
            <span>Write</span>
            <strong>Send a note</strong>
            <small>Use email for product questions or ownership updates.</small>
          </a>
          <a href={`${REPO_URL}/issues`} target="_blank" rel="noreferrer">
            <span>Report</span>
            <strong>Open an issue</strong>
            <small>Use GitHub Issues for bugs once the repo exists.</small>
          </a>
        </div>
      </article>
    );
  }

  return (
    <article className="editorial-page">
      <p className="eyebrow">FAQ</p>
      <h1>Small answers for a fast booth.</h1>
      {[
        ["Is this free?", "Yes. The app is client-side and has no account wall."],
        ["Where do my photos go?", "They stay in your browser unless you choose the temporary QR share flow."],
        ["Can I use a phone?", "Yes. The layout, controls, and shutter bar are designed for mobile capture."],
        ["Why did the camera fail?", "Browsers require camera permission and usually HTTPS, except localhost during development."],
        ["Can I upload instead?", "Yes. Upload one or more images and Snapbooth fills the remaining frames."]
      ].map(([question, answer], index) => (
        <details key={question}>
          <summary>
            <span>{String(index + 1).padStart(2, "0")}</span>
            {question}
          </summary>
          <p>{answer}</p>
        </details>
      ))}
    </article>
  );
}

function getViewfinderAspect(layout: LayoutSpec): number {
  const [cols, rows] = layout.grid;
  return (cols * layout.cellAspect) / rows;
}

function getViewfinderMaxWidth(layout: LayoutSpec): number {
  if (layout.id === "B" || layout.id === "C") return 360;
  if (layout.id === "S") return 520;
  return 760;
}

function createDemoPhoto(index: number, aspect: number, filterCss: string): string {
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

function captureSourceToDataUrl({
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

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not decode image."));
    image.src = src;
  });
}

async function renderStripCanvas(options: {
  layout: LayoutId;
  frame: FrameId;
  filter: FilterId;
  photos: string[];
  caption: string;
  note: string;
  textScale: number;
  timestamp: string;
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
    ctx.strokeStyle = "rgba(20,20,20,0.22)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, cellWidth, cellHeight);
  });

  if (options.frame !== "BLANK") {
    const textY = height - captionHeight + 50;
    ctx.fillStyle = frame.ink;
    ctx.textAlign = "center";
    ctx.font = `${Math.round(34 * options.textScale)}px Fraunces, Georgia, serif`;
    ctx.fillText(options.caption.toUpperCase(), width / 2, textY, width - pad * 2);
    ctx.font = `${Math.round(18 * options.textScale)}px JetBrains Mono, monospace`;
    ctx.fillText(
      `${options.note} / ${layout.code} / ${getFilter(options.filter).label} / ${options.timestamp}`.toUpperCase(),
      width / 2,
      textY + 40,
      width - pad * 2
    );
  }

  return canvas;
}

function renderPoseFrameCanvas(options: {
  layout: LayoutId;
  frame: FrameId;
  image: HTMLImageElement;
  caption: string;
  note: string;
  textScale: number;
  timestamp: string;
  index: number;
  total: number;
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
  ctx.strokeStyle = "rgba(20,20,20,0.22)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, imageWidth, imageHeight);

  if (options.frame !== "BLANK") {
    const textY = y + imageHeight + 48;
    ctx.fillStyle = frame.ink;
    ctx.textAlign = "center";
    ctx.font = `${Math.round(28 * options.textScale)}px Fraunces, Georgia, serif`;
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

function drawPerforations(
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

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error("Could not render export."));
      else resolve(blob);
    }, type);
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}

async function uploadTemporary(blob: Blob, filename: string): Promise<string> {
  const body = new FormData();
  body.append("file", blob, filename);
  const response = await fetch(TMPFILES_API, {
    method: "POST",
    body
  });
  if (!response.ok) {
    throw new Error(`Temporary upload failed with ${response.status}.`);
  }
  const data = (await response.json()) as { status?: string; data?: { url?: string } };
  if (data.status !== "success" || !data.data?.url) {
    throw new Error("Temporary upload did not return a link.");
  }
  return data.data.url.replace("tmpfiles.org/", "tmpfiles.org/dl/");
}
