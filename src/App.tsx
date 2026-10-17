import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode, RefObject } from "react";
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
  Volume2,
  VolumeX,
  X,
  History,
  Menu,
  Grid
} from "lucide-react";
import { saveRoll, getAllRolls, deleteRoll, pruneRolls } from "./galleryDb";
import type { SavedRoll } from "./galleryDb";
import { CAPTION_GROUPS, CAPTION_PRESETS, FILTERS, FILTER_GROUPS, FRAMES, LAYOUTS, LAYOUT_ORDER, REPO_URL, STICKER_TEMPLATES, emptyPhotos, getFilter, getFrame } from "./presets";
import type { CameraFacing, FilterId, FilterSpec, FrameId, LayoutId, PhotoSlot, StickerInstance } from "./presets";
import { captureSourceToDataUrl, createDemoPhoto, downscaleForGif, canvasToBlob, getFontFamilyCSS, getViewfinderAspect, getViewfinderMaxWidth, loadImage, readFileAsDataUrl, renderPoseFrameCanvas, renderStripCanvas } from "./render";
import { downloadBlob, nowStamp, persistSession, uploadTemporary, wait } from "./utils";
import { sounds } from "./sound";

type Theme = "light" | "dark";
type View = "intro" | "studio" | "develop" | "faq" | "privacy" | "contact" | "gallery";



const handleMouseMove3D = (e: React.MouseEvent<HTMLDivElement>) => {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  const x = e.clientX - rect.left - rect.width / 2;
  const y = e.clientY - rect.top - rect.height / 2;
  const rotateX = -(y / (rect.height / 2)) * 8;
  const rotateY = (x / (rect.width / 2)) * 8;
  el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
  el.style.boxShadow = `${-rotateY * 1.5}px ${rotateX * 1.5}px 32px rgba(0, 0, 0, 0.25)`;
};

const handleMouseLeave3D = (e: React.MouseEvent<HTMLDivElement>) => {
  const el = e.currentTarget;
  el.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)";
  el.style.boxShadow = "";
};

export default function App() {
  const [view, setView] = useState<View>(() => {
    const saved = window.sessionStorage.getItem("snapbooth-view");
    if (saved === "studio" || saved === "develop" || saved === "gallery") return saved as View;
    return "intro";
  });
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = window.localStorage.getItem("snapbooth-theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [layout, setLayout] = useState<LayoutId>(() => {
    const saved = window.sessionStorage.getItem("snapbooth-layout");
    return (saved as LayoutId) || "B";
  });
  const [frame, setFrame] = useState<FrameId>(() => {
    const saved = window.sessionStorage.getItem("snapbooth-frame");
    return (saved as FrameId) || "CLASSIC";
  });
  const [filter, setFilter] = useState<FilterId>(() => {
    const saved = window.sessionStorage.getItem("snapbooth-filter");
    return (saved as FilterId) || "BARE";
  });
  const [photos, setPhotos] = useState<PhotoSlot[]>(() => {
    const saved = window.sessionStorage.getItem("snapbooth-photos");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    const currentLayout = (window.sessionStorage.getItem("snapbooth-layout") as LayoutId) || "B";
    return emptyPhotos(currentLayout);
  });
  const [mode, setMode] = useState<"MANUAL" | "AUTO">(() => {
    const saved = window.sessionStorage.getItem("snapbooth-mode");
    return saved === "AUTO" ? "AUTO" : "MANUAL";
  });
  const [timerSec, setTimerSec] = useState(() => {
    const saved = window.sessionStorage.getItem("snapbooth-timerSec");
    return saved ? parseInt(saved, 10) : 3;
  });
  const [mirror, setMirror] = useState(() => {
    const saved = window.sessionStorage.getItem("snapbooth-mirror");
    return saved !== "false";
  });
  const [cameraFacing, setCameraFacing] = useState<CameraFacing>("user");
  const [caption, setCaption] = useState(() => {
    const saved = window.sessionStorage.getItem("snapbooth-caption");
    return saved !== null ? saved : "BROWSER DARKROOM";
  });
  const [note, setNote] = useState(() => {
    const saved = window.sessionStorage.getItem("snapbooth-note");
    return saved !== null ? saved : "SNAPBOOTH / ROLL 001";
  });
  const [textScale, setTextScale] = useState(() => {
    const saved = window.sessionStorage.getItem("snapbooth-textScale");
    return saved ? parseFloat(saved) : 1;
  });
  const [cameraState, setCameraState] = useState<"idle" | "ready" | "error" | "unsupported">("idle");
  const [cameraMessage, setCameraMessage] = useState("Camera is warming up.");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const [notice, setNotice] = useState("Use webcam or upload images. Processing stays in this browser.");
  const [autoRunning, setAutoRunning] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = window.localStorage.getItem("snapbooth-sound");
    return saved !== "false";
  });
  const [showGrid, setShowGrid] = useState(() => {
    const saved = window.sessionStorage.getItem("snapbooth-showGrid");
    return saved === "true";
  });
  const [captionFont, setCaptionFont] = useState(() => {
    const saved = window.sessionStorage.getItem("snapbooth-captionFont");
    return saved || "Fraunces";
  });
  const [vignette, setVignette] = useState(() => {
    const saved = window.sessionStorage.getItem("snapbooth-vignette");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [grain, setGrain] = useState(() => {
    const saved = window.sessionStorage.getItem("snapbooth-grain");
    return saved ? parseInt(saved, 10) : 0;
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const photosRef = useRef<PhotoSlot[]>(photos);
  const autoRef = useRef(false);
  const countdownRef = useRef(0);

  const total = LAYOUTS[layout].frames;
  // Stable identity between photo changes so Develop/Studio memoization works.
  const filledPhotos = useMemo(() => photos.filter(Boolean) as string[], [photos]);
  const filled = filledPhotos.length;
  const complete = filled === total;
  const nextIndex = photos.findIndex((photo) => !photo);
  const activeIndex = selectedSlot !== null ? selectedSlot : (nextIndex === -1 ? total - 1 : nextIndex);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("snapbooth-theme", theme);
  }, [theme]);

  useEffect(() => {
    sounds.enabled = soundEnabled;
    window.localStorage.setItem("snapbooth-sound", String(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    persistSession("snapbooth-view", view);
  }, [view]);

  useEffect(() => {
    persistSession("snapbooth-layout", layout);
  }, [layout]);

  useEffect(() => {
    persistSession("snapbooth-frame", frame);
  }, [frame]);

  useEffect(() => {
    persistSession("snapbooth-filter", filter);
  }, [filter]);

  useEffect(() => {
    persistSession("snapbooth-photos", JSON.stringify(photos));
  }, [photos]);

  useEffect(() => {
    persistSession("snapbooth-mode", mode);
  }, [mode]);

  useEffect(() => {
    persistSession("snapbooth-timerSec", String(timerSec));
  }, [timerSec]);

  useEffect(() => {
    persistSession("snapbooth-mirror", String(mirror));
  }, [mirror]);

  useEffect(() => {
    persistSession("snapbooth-caption", caption);
  }, [caption]);

  useEffect(() => {
    persistSession("snapbooth-note", note);
  }, [note]);

  useEffect(() => {
    persistSession("snapbooth-textScale", String(textScale));
  }, [textScale]);

  useEffect(() => {
    persistSession("snapbooth-showGrid", String(showGrid));
  }, [showGrid]);

  useEffect(() => {
    persistSession("snapbooth-captionFont", captionFont);
  }, [captionFont]);

  useEffect(() => {
    persistSession("snapbooth-vignette", String(vignette));
  }, [vignette]);

  useEffect(() => {
    persistSession("snapbooth-grain", String(grain));
  }, [grain]);

  useEffect(() => {
    const expectedFrames = LAYOUTS[layout].frames;
    if (photosRef.current.length !== expectedFrames) {
      const next = emptyPhotos(layout);
      photosRef.current = next;
      setPhotos(next);
    }
    autoRef.current = false;
    setAutoRunning(false);
    countdownRef.current += 1;
    setCountdown(null);
    setSelectedSlot(null);
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
    // Re-attach only when the video element remounted (slot/layout changes can
    // move it between cells). Re-assigning the same stream restarts the
    // preview, which shows up as a stutter after every capture.
    if (videoRef.current && streamRef.current && videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [activeIndex, layout, photos, view]);

  const addPhoto = useCallback((dataUrl: string, targetSlot: number | null = null) => {
    // Compute the slot from the synced ref so the result is deterministic.
    // React does not run state updaters synchronously, so a flag set inside
    // setPhotos would read as false whenever an update is already queued.
    const current = photosRef.current;
    const index = targetSlot !== null ? targetSlot : current.findIndex((photo) => !photo);
    if (index === -1) return false;
    const next = [...current];
    next[index] = dataUrl;
    photosRef.current = next;
    setPhotos(next);
    setSelectedSlot(null);
    return true;
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

    const inserted = addPhoto(dataUrl, selectedSlot);
    if (!inserted) return false;
    sounds.playShutter();
    setFlash(true);
    window.setTimeout(() => setFlash(false), 250);
    setNotice("Frame captured.");
    return true;
  }, [addPhoto, filter, layout, mirror, selectedSlot]);

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
        sounds.playBeep();
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

  const handleSelectSlot = useCallback((index: number) => {
    setSelectedSlot((current) => (current === index ? null : index));
  }, []);

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

      if (selectedSlot !== null) {
        const file = files[0];
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
          }),
          selectedSlot
        );
        setNotice("Slot updated via upload.");
      } else {
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
      }
    },
    [addPhoto, cancelCountdown, filter, layout, total, selectedSlot]
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
    sounds.playChime();
    setView("develop");
  }, [cancelCountdown, complete]);

  const setCaptureMode = useCallback(
    (nextMode: "MANUAL" | "AUTO") => {
      cancelCountdown();
      setMode(nextMode);
    },
    [cancelCountdown]
  );

  // Keyboard Shortcuts (Phase 5)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if the user is typing in an input/textarea
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = e.key;

      // Global shortcuts
      if (key === "d" || key === "D") {
        setTheme((current) => (current === "light" ? "dark" : "light"));
        e.preventDefault();
        return;
      }

      if (key === "Escape") {
        // Close modal dialogs / go back
        if (view === "develop" || view === "gallery") {
          setView("studio");
          e.preventDefault();
        }
        return;
      }

      // Studio-only shortcuts
      if (view === "studio") {
        if (key === " ") {
          // Space: Capture photo
          if (autoRunning) {
            stopAuto();
          } else if (!complete) {
            void handleShutter();
          }
          e.preventDefault();
          return;
        }

        if (key === "Enter") {
          // Enter: Develop strip (if complete)
          if (complete) {
            startDevelop();
            e.preventDefault();
          }
          return;
        }

        // Layouts 1-5
        if (key >= "1" && key <= "5") {
          const layoutsMap: LayoutId[] = ["S", "A", "B", "C", "D"];
          const selectedLayoutId = layoutsMap[parseInt(key, 10) - 1];
          if (selectedLayoutId) {
            setLayout(selectedLayoutId);
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [view, autoRunning, complete, handleShutter, stopAuto, startDevelop, setLayout, setTheme]);

  return (
    <div className="app-shell">
      {flash && <div className="fullscreen-flash" />}
      <TopBar
        view={view}
        theme={theme}
        soundEnabled={soundEnabled}
        onNavigate={setView}
        onToggleTheme={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
        onToggleSound={() => setSoundEnabled((current) => !current)}
      />

      <main className="page-enter" key={view}>
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
            selectedSlot={selectedSlot}
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
            onSelectSlot={handleSelectSlot}
            showGrid={showGrid}
            captionFont={captionFont}
            vignette={vignette}
            grain={grain}
            onShowGrid={setShowGrid}
            onCaptionFont={setCaptionFont}
            onVignette={setVignette}
            onGrain={setGrain}
          />
        )}

        {view === "develop" && (
          <Develop
            layout={layout}
            frame={frame}
            filter={filter}
            photos={filledPhotos}
            caption={caption}
            note={note}
            textScale={textScale}
            captionFont={captionFont}
            vignette={vignette}
            grain={grain}
            onBack={() => setView("studio")}
            onStartNew={() => {
              retakeAll();
              setView("intro");
            }}
          />
        )}

        {view === "gallery" && (
          <GalleryView
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
  selectedSlot: number | null;
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
  onSelectSlot: (index: number) => void;
  showGrid: boolean;
  captionFont: string;
  vignette: number;
  grain: number;
  onShowGrid: (value: boolean) => void;
  onCaptionFont: (value: string) => void;
  onVignette: (value: number) => void;
  onGrain: (value: number) => void;
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
          <RailSection title="01 Layout" defaultOpen={true}>
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

          <RailSection title="02 Frame" defaultOpen={false}>
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

          <RailSection title="03 Customize" defaultOpen={false}>
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
            <label className="field">
              <span>Title Font</span>
              <select
                value={props.captionFont}
                onChange={(event) => props.onCaptionFont(event.target.value)}
              >
                <option value="Fraunces">Fraunces (Default Serif)</option>
                <option value="Playfair">Playfair Display (Classic Serif)</option>
                <option value="Cormorant">Cormorant Garamond (Elegant Serif)</option>
                <option value="Bebas">Bebas Neue (Condensed Impact)</option>
                <option value="Outfit">Outfit (Modern Sans)</option>
                <option value="Syne">Syne (Artistic Sans)</option>
                <option value="Mono">JetBrains Mono (Technical Mono)</option>
              </select>
            </label>
            <label className="field">
              <span>Vignette {props.vignette}%</span>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={props.vignette}
                onChange={(event) => props.onVignette(Number(event.target.value))}
              />
            </label>
            <label className="field">
              <span>Grain / Noise {props.grain}%</span>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={props.grain}
                onChange={(event) => props.onGrain(Number(event.target.value))}
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
            onMouseMove={handleMouseMove3D}
            onMouseLeave={handleMouseLeave3D}
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
                selectedSlot={props.selectedSlot}
                mirror={props.mirror}
                videoRef={props.videoRef}
                cameraState={props.cameraState}
                cameraMessage={props.cameraMessage}
                filterCss={filterSpec.css}
                onSelectSlot={props.onSelectSlot}
                showGrid={props.showGrid}
                vignette={props.vignette}
                grain={props.grain}
              />

              {props.countdown !== null && <div className="countdown countdown-anim">{props.countdown}</div>}
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
          <RailSection title="Capture" defaultOpen={true}>
            <div className="shutter-block">
              <button
                className="shutter"
                onClick={props.autoRunning ? props.onStopAuto : props.onShutter}
                disabled={props.complete || (props.countdown !== null && !props.autoRunning)}
                aria-label={props.autoRunning ? "Stop auto capture" : "Capture photo"}
              >
                {props.autoRunning ? <Square size={22} /> : <Aperture size={28} />}
              </button>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                {props.autoRunning ? "Stop" : "Shutter"}
                <kbd style={{ fontSize: "10px", opacity: 0.5, border: "1px solid var(--rule)", padding: "2px 4px", borderRadius: "2px", textTransform: "none" }}>Space</kbd>
              </span>
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
              <Button variant={props.showGrid ? "primary" : "secondary"} icon={<Grid size={15} />} onClick={() => props.onShowGrid(!props.showGrid)}>
                {props.showGrid ? "Grid On" : "Grid Off"}
              </Button>
              <Button variant="secondary" icon={<Sparkles size={15} />} onClick={props.onDemoRoll} style={{ gridColumn: "span 2" }}>
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

          <RailSection title="04 Filter" className="filter-rail" defaultOpen={false}>
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

          <RailSection title="Roll" defaultOpen={true}>
            <div className="button-stack">
              <Button variant="ghost" icon={<RotateCcw size={15} />} onClick={props.onRetakeLast}>
                Retake last
              </Button>
              <Button variant="ghost" icon={<Trash2 size={15} />} onClick={props.onRetakeAll}>
                Retake all
              </Button>
              <Button icon={<Check size={15} />} onClick={props.onDevelop} disabled={!props.complete}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  Develop strip
                  {props.complete && <kbd style={{ fontSize: "10px", opacity: 0.7, border: "1px solid currentColor", padding: "1px 4px", borderRadius: "2px", textTransform: "none" }}>Enter</kbd>}
                </span>
              </Button>
            </div>
          </RailSection>

          <p className="notice">{props.notice}</p>
        </aside>
      </div>
    </section>
  );
}

const INTRO_STEPS = [
  ["01", "Pick a layout", "Choose from single, strip, pair, quad, or contact sheet."],
  ["02", "Set the frame", "Select a paper tone, caption preset, and decide how much text belongs on the print."],
  ["03", "Shoot and develop", "Capture with count-in by webcam or upload, then export PNG, GIF, boomerang GIF, or QR."]
];

const INTRO_SAMPLES = [
  { layout: "B" as LayoutId, frame: "BROADSHEET" as FrameId, title: "CONTACT SHEET CLUB", note: "KODAK / BROADSHEET" },
  { layout: "A" as LayoutId, frame: "POLAROID" as FrameId, title: "PRESS, POSE, PRINT", note: "PORTRA / POLAROID" },
  { layout: "C" as LayoutId, frame: "PANEL" as FrameId, title: "AFTERLIGHT SESSION", note: "INK / PANEL" },
  { layout: "D" as LayoutId, frame: "MIDNIGHT" as FrameId, title: "NO RETAKE ENERGY", note: "NOIR / MIDNIGHT" },
  { layout: "S" as LayoutId, frame: "ALBUM" as FrameId, title: "LOCAL ONLY", note: "BRIGHT / ALBUM" },
  { layout: "B" as LayoutId, frame: "ZINE" as FrameId, title: "ONE MORE STRIP", note: "DUSK / ZINE" }
];

// Stable placeholder arrays: emptyPhotos() returns a fresh array each call,
// which would defeat StripPreview's React.memo shallow compare on every render.
const INTRO_PLACEHOLDER_PHOTOS: Record<string, PhotoSlot[]> = {
  ...Object.fromEntries(LAYOUT_ORDER.map((id) => [id, emptyPhotos(id)])),
  hero: emptyPhotos("B")
};

function Intro({
  onBegin,
  onJumpSamples
}: {
  onBegin: () => void;
  onJumpSamples: () => void;
}) {
  const steps = INTRO_STEPS;
  const samples = INTRO_SAMPLES;

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
              photos={INTRO_PLACEHOLDER_PHOTOS.hero}
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
                photos={INTRO_PLACEHOLDER_PHOTOS[sample.layout]}
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

const ViewfinderGrid = memo(function ViewfinderGrid({
  layout,
  photos,
  activeIndex,
  selectedSlot,
  mirror,
  videoRef,
  cameraState,
  cameraMessage,
  filterCss,
  onSelectSlot,
  showGrid = false,
  vignette = 0,
  grain = 0
}: {
  layout: LayoutId;
  photos: PhotoSlot[];
  activeIndex: number;
  selectedSlot: number | null;
  mirror: boolean;
  videoRef: RefObject<HTMLVideoElement>;
  cameraState: "idle" | "ready" | "error" | "unsupported";
  cameraMessage: string;
  filterCss: string;
  onSelectSlot: (index: number) => void;
  showGrid?: boolean;
  vignette?: number;
  grain?: number;
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
        const active = index === activeIndex;
        const isSelected = index === selectedSlot;
        const showPhoto = photo && !isSelected;

        return (
          <div
            className={`view-cell ${active ? "is-active" : ""} ${isSelected ? "is-selected" : ""}`}
            key={index}
            onClick={() => onSelectSlot(index)}
          >
            {showPhoto ? (
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
                  {/* Rule of Thirds Guides */}
                  {showGrid && (
                    <div className="viewfinder-grid-lines">
                      <div className="grid-line grid-line-h1" />
                      <div className="grid-line grid-line-h2" />
                      <div className="grid-line grid-line-v1" />
                      <div className="grid-line grid-line-v2" />
                    </div>
                  )}
                  {cameraState === "idle" && <div className="camera-message">{cameraMessage}</div>}
                </>
              ) : (
                <div className="camera-message">{cameraMessage}</div>
              )
            ) : (
              <span>{String(index + 1).padStart(2, "0")}</span>
            )}

            {/* Vignette Overlay */}
            {vignette > 0 && <div className="vignette-overlay" style={{ opacity: vignette / 100 }} />}
            {/* Grain Overlay */}
            {grain > 0 && <div className="grain-overlay" style={{ opacity: grain / 100 }} />}
          </div>
        );
      })}
    </div>
  );
});

function Develop({
  layout,
  frame,
  filter,
  photos,
  caption,
  note,
  textScale,
  onBack,
  onStartNew,
  captionFont,
  vignette,
  grain
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
  captionFont: string;
  vignette: number;
  grain: number;
}) {
  const [busy, setBusy] = useState<null | "png" | "gif" | "boomerang" | "qr">(null);
  const [gifProgress, setGifProgress] = useState(0);
  const [share, setShare] = useState<{ qr?: string; link?: string; error?: string }>({});
  const [shareOpen, setShareOpen] = useState(false);

  const [stickers, setStickers] = useState<StickerInstance[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [customText, setCustomText] = useState("");
  const [textColor, setTextColor] = useState("#e84a2a");
  const [textFont, setTextFont] = useState("JetBrains Mono");

  const timestamp = useMemo(nowStamp, []);
  // One stable id + creation time per developed roll: repeated auto-saves
  // (caption edits, sticker drags) update the same record instead of
  // appending a new gallery entry, and same-second saves cannot collide.
  const rollId = useMemo(
    () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    []
  );
  const rollCreatedRef = useRef<number>(Date.now());
  const filename = useMemo(
    () => `snapbooth_${layout.toLowerCase()}_${frame.toLowerCase()}_${Date.now().toString(36)}.png`,
    [frame, layout]
  );

  const addSvgSticker = (typeId: string) => {
    const newSticker: StickerInstance = {
      id: Math.random().toString(36).substring(2, 9),
      type: "svg",
      value: typeId,
      color: textColor,
      x: 50,
      y: 30 + Math.random() * 20,
      scale: 1.2,
      rotation: (Math.random() - 0.5) * 15
    };
    setStickers((prev) => [...prev, newSticker]);
    setSelectedStickerId(newSticker.id);
  };

  const addTextSticker = () => {
    if (!customText.trim()) return;
    const newSticker: StickerInstance = {
      id: Math.random().toString(36).substring(2, 9),
      type: "text",
      value: customText,
      font: textFont === "JetBrains Mono" ? "var(--font-mono)" : textFont === "Fraunces" ? "var(--font-serif)" : "var(--font-sans)",
      color: textColor,
      x: 50,
      y: 30 + Math.random() * 20,
      scale: 1.2,
      rotation: 0
    };
    setStickers((prev) => [...prev, newSticker]);
    setSelectedStickerId(newSticker.id);
    setCustomText("");
  };

  const handleUpdateSticker = (id: string, updates: Partial<StickerInstance>) => {
    setStickers((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const handleDeleteSticker = (id: string) => {
    setStickers((prev) => prev.filter((s) => s.id !== id));
    if (selectedStickerId === id) {
      setSelectedStickerId(null);
    }
  };

  const renderOptions = useMemo(
    () => ({
      layout,
      frame,
      filter,
      photos,
      caption,
      note,
      textScale,
      timestamp,
      stickers,
      captionFont,
      vignette,
      grain
    }),
    [caption, filter, frame, layout, note, photos, textScale, timestamp, stickers, captionFont, vignette, grain]
  );

  useEffect(() => {
    let active = true;
    const saveTimer = setTimeout(async () => {
      try {
        const canvas = await renderStripCanvas(renderOptions);
        const image = canvas.toDataURL("image/png");
        if (!active) return;
        await saveRoll({
          id: rollId,
          layout,
          frame,
          filter,
          photos,
          caption,
          note,
          textScale,
          timestamp,
          stickers,
          created: rollCreatedRef.current,
          image,
          captionFont,
          vignette,
          grain
        });
        await pruneRolls();
      } catch (err) {
        console.error("Failed to auto-save to gallery:", err);
      }
    }, 1000);

    return () => {
      active = false;
      clearTimeout(saveTimer);
    };
  }, [renderOptions, layout, frame, filter, photos, caption, note, textScale, timestamp, stickers]);

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
    try {
      // Lazy-load the encoder so the ~50KB gif.js + qrcode libs stay out of
      // the initial bundle.
      const { default: GIF } = await import("gif.js");
      const fullCanvas = await renderStripCanvas(renderOptions);
      // GIF is a 256-color sharing format: cap frame width so the encoder
      // does not hold hundreds of MB of full-resolution ImageData.
      const canvas = downscaleForGif(fullCanvas);
      const gif = new GIF({
        workers: 2,
        quality: 10,
        width: canvas.width,
        height: canvas.height,
        workerScript: gifWorkerUrl
      });
      const frames = 18;

      // One reusable canvas: addFrame({ copy: true }) snapshots the pixels
      // immediately, so 18 separate canvases are never needed.
      const temp = document.createElement("canvas");
      temp.width = canvas.width;
      temp.height = canvas.height;
      const ctx = temp.getContext("2d");

      for (let index = 0; index < frames; index += 1) {
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
    } catch (error) {
      console.error(error);
      setBusy(null);
      setGifProgress(0);
    }
  }

  async function exportBoomerangGif() {
    setBusy("boomerang");
    setGifProgress(0);

    try {
      const { default: GIF } = await import("gif.js");
      const images = await Promise.all(photos.map(loadImage));
      const keyedImages = images.map((image, index) => ({ image, index }));
      const sequence = keyedImages.length > 1 ? [...keyedImages, ...keyedImages.slice(1, -1).reverse()] : keyedImages;
      const renderPose = (image: HTMLImageElement, index: number) =>
        downscaleForGif(
          renderPoseFrameCanvas({
            layout,
            frame,
            image,
            caption,
            note,
            textScale,
            timestamp,
            index: index + 1,
            total: images.length,
            captionFont,
            vignette,
            grain
          })
        );
      const first = renderPose(sequence[0].image, sequence[0].index);
      const gif = new GIF({
        workers: 2,
        quality: 10,
        width: first.width,
        height: first.height,
        workerScript: gifWorkerUrl
      });

      sequence.forEach(({ image, index }) => {
        gif.addFrame(renderPose(image, index), { delay: index === 0 ? 320 : 170, copy: true });
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

  async function exportSocial(ratio: "story" | "post") {
    setBusy("png");
    try {
      const stripCanvas = await renderStripCanvas(renderOptions);
      const targetWidth = 1080;
      const targetHeight = ratio === "story" ? 1920 : 1350;
      
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      const frameSpec = getFrame(frame);
      
      const gradient = ctx.createLinearGradient(0, 0, targetWidth, targetHeight);
      gradient.addColorStop(0, frameSpec.paper);
      gradient.addColorStop(0.5, frameSpec.paper);
      gradient.addColorStop(1, ratio === "story" ? frameSpec.accent : frameSpec.paper);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      
      ctx.fillStyle = "rgba(20,20,20,0.03)";
      for (let dot = 0; dot < 300; dot += 1) {
        const x = (dot * 47) % targetWidth;
        const y = (dot * 71) % targetHeight;
        ctx.fillRect(x, y, 3, 3);
      }
      
      const padY = ratio === "story" ? targetHeight * 0.12 : targetHeight * 0.1;
      const maxStripHeight = targetHeight - padY * 2;
      
      const scale = maxStripHeight / stripCanvas.height;
      const stripW = stripCanvas.width * scale;
      const stripH = stripCanvas.height * scale;
      
      const stripX = (targetWidth - stripW) / 2;
      const stripY = (targetHeight - stripH) / 2;
      
      ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
      ctx.shadowBlur = 24;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 12;
      
      ctx.drawImage(stripCanvas, stripX, stripY, stripW, stripH);
      
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
      if (ratio === "story") {
        ctx.fillStyle = frameSpec.ink;
        ctx.textAlign = "center";
        ctx.font = "bold 24px JetBrains Mono, monospace";
        ctx.fillText("SNAPBOOTH / BROWSER DARKROOM", targetWidth / 2, targetHeight - 80);
      } else {
        ctx.fillStyle = frameSpec.ink;
        ctx.textAlign = "center";
        ctx.font = "bold 20px JetBrains Mono, monospace";
        ctx.fillText("SNAPBOOTH", targetWidth / 2, targetHeight - 50);
      }
      
      const blob = await canvasToBlob(canvas, "image/png");
      downloadBlob(blob, filename.replace(".png", `_${ratio}.png`));
    } catch (error) {
      console.error(error);
    } finally {
      setBusy(null);
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
      const { default: QRCode } = await import("qrcode");
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
            stickers={stickers}
            selectedStickerId={selectedStickerId}
            onSelectSticker={setSelectedStickerId}
            onUpdateSticker={handleUpdateSticker}
            onDeleteSticker={handleDeleteSticker}
            captionFont={captionFont}
            vignette={vignette}
            grain={grain}
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
              <Button variant="secondary" icon={<Download size={15} />} onClick={() => void exportSocial("story")} disabled={busy !== null}>
                {busy === "png" ? "Rendering" : "Social Story (9:16)"}
              </Button>
              <Button variant="secondary" icon={<Download size={15} />} onClick={() => void exportSocial("post")} disabled={busy !== null}>
                {busy === "png" ? "Rendering" : "Social Post (4:5)"}
              </Button>
              <Button variant="secondary" icon={<QrCode size={15} />} onClick={() => void createShareQr()} disabled={busy !== null}>
                {busy === "qr" ? "Uploading" : "Share QR"}
              </Button>
            </div>
          </RailSection>

          <RailSection title="Stickers" defaultOpen={true}>
            <div className="field">
              <span className="field-head">Select Sticker</span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "12px" }}>
                {STICKER_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => addSvgSticker(tpl.id)}
                    style={{
                      height: "44px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid var(--rule)",
                      borderRadius: "4px",
                      background: "var(--bg-elevated)",
                      fontSize: "20px"
                    }}
                    title={tpl.label}
                  >
                    <svg viewBox={tpl.viewBox} style={{ width: "24px", height: "24px", color: "var(--ink-primary)" }}>
                      <path d={tpl.path} fill="currentColor" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <span className="field-head">Add Custom Text</span>
              <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                <input
                  type="text"
                  placeholder="Type text..."
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addTextSticker();
                  }}
                  style={{ flex: 1, minWidth: 0 }}
                />
                <Button variant="secondary" onClick={addTextSticker}>Add</Button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <select
                  value={textFont}
                  onChange={(e) => setTextFont(e.target.value)}
                  style={{
                    height: "40px",
                    border: "0",
                    borderBottom: "1px solid var(--rule)",
                    background: "transparent",
                    color: "var(--ink-primary)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px"
                  }}
                >
                  <option value="JetBrains Mono">MONO</option>
                  <option value="Inter">SANS</option>
                  <option value="Fraunces">SERIF</option>
                </select>
              </div>
            </div>

            <div className="field" style={{ borderTop: "1px solid var(--rule)", paddingTop: "14px", marginTop: "14px" }}>
              <span className="field-head">Sticker Color</span>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
                {["#141414", "#FFFFFF", "#e84a2a", "#2f6f4e", "#3b82f6", "#ec4899", "#eab308"].map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setTextColor(c);
                      if (selectedStickerId) {
                        handleUpdateSticker(selectedStickerId, { color: c });
                      }
                    }}
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      background: c,
                      border: textColor === c ? "2px solid var(--accent)" : "1px solid var(--rule)",
                      cursor: "pointer",
                      boxShadow: "inset 0 0 2px rgba(0,0,0,0.2)"
                    }}
                  />
                ))}
              </div>
            </div>

            {selectedStickerId && (
              <div style={{ display: "grid", gap: "8px", borderTop: "1px solid var(--rule)", paddingTop: "14px", marginTop: "14px" }}>
                <span className="field-head">Selected Controls</span>
                
                <label className="field" style={{ marginBottom: "8px" }}>
                  <span className="field-head">Scale: {Math.round((stickers.find(s => s.id === selectedStickerId)?.scale || 1) * 10) / 10}x</span>
                  <input
                    type="range"
                    min="0.2"
                    max="4"
                    step="0.1"
                    value={stickers.find(s => s.id === selectedStickerId)?.scale || 1}
                    onChange={(e) => handleUpdateSticker(selectedStickerId, { scale: parseFloat(e.target.value) })}
                  />
                </label>

                <label className="field" style={{ marginBottom: "12px" }}>
                  <span className="field-head">Rotate: {Math.round(stickers.find(s => s.id === selectedStickerId)?.rotation || 0)}°</span>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    value={stickers.find(s => s.id === selectedStickerId)?.rotation || 0}
                    onChange={(e) => handleUpdateSticker(selectedStickerId, { rotation: parseFloat(e.target.value) })}
                  />
                </label>

                <Button variant="ghost" icon={<Trash2 size={15} />} onClick={() => handleDeleteSticker(selectedStickerId)}>
                  Delete selected
                </Button>
              </div>
            )}
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


const StripPreview = memo(function StripPreview({
  layout,
  frame,
  photos,
  caption,
  note,
  textScale,
  resolved = false,
  stickers = [],
  selectedStickerId = null,
  onSelectSticker,
  onUpdateSticker,
  onDeleteSticker,
  captionFont = "Fraunces",
  vignette = 0,
  grain = 0
}: {
  layout: LayoutId;
  frame: FrameId;
  photos: PhotoSlot[];
  caption: string;
  note: string;
  textScale: number;
  resolved?: boolean;
  stickers?: StickerInstance[];
  selectedStickerId?: string | null;
  onSelectSticker?: (id: string | null) => void;
  onUpdateSticker?: (id: string, updates: Partial<StickerInstance>) => void;
  onDeleteSticker?: (id: string) => void;
  captionFont?: string;
  vignette?: number;
  grain?: number;
}) {
  const layoutSpec = LAYOUTS[layout];
  const frameSpec = getFrame(frame);
  const [cols, rows] = layoutSpec.grid;
  const scaleStyle = {
    "--frame-paper": frameSpec.paper,
    "--frame-ink": frameSpec.ink,
    "--frame-accent": frameSpec.accent,
    "--caption-scale": textScale.toString(),
    "--cell-aspect": layoutSpec.cellAspect.toString(),
    "--caption-font-family": getFontFamilyCSS(captionFont)
  } as CSSProperties;

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, sticker: StickerInstance) => {
    e.stopPropagation();
    onSelectSticker?.(sticker.id);

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const startX = sticker.x;
    const startY = sticker.y;

    const rect = e.currentTarget.parentElement?.getBoundingClientRect();
    if (!rect) return;

    const handleMouseMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentX = "touches" in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const currentY = "touches" in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;

      const deltaX = ((currentX - clientX) / rect.width) * 100;
      const deltaY = ((currentY - clientY) / rect.height) * 100;

      onUpdateSticker?.(sticker.id, {
        x: Math.max(0, Math.min(100, startX + deltaX)),
        y: Math.max(0, Math.min(100, startY + deltaY))
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleMouseMove);
      window.removeEventListener("touchend", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleMouseMove, { passive: false });
    window.addEventListener("touchend", handleMouseUp);
  };

  const handleScaleRotateStart = (e: React.MouseEvent | React.TouchEvent, sticker: StickerInstance) => {
    e.stopPropagation();

    const rect = e.currentTarget.parentElement?.getBoundingClientRect();
    if (!rect) return;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const startDx = clientX - centerX;
    const startDy = clientY - centerY;
    const startDist = Math.sqrt(startDx * startDx + startDy * startDy);
    const startAngle = Math.atan2(startDy, startDx);

    const startScale = sticker.scale;
    const startRotation = sticker.rotation;

    const handleMouseMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentX = "touches" in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const currentY = "touches" in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;

      const dx = currentX - centerX;
      const dy = currentY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      const newScale = Math.max(0.2, Math.min(4, startScale * (dist / startDist)));
      const angleDiff = angle - startAngle;
      const newRotation = startRotation + (angleDiff * 180) / Math.PI;

      onUpdateSticker?.(sticker.id, {
        scale: newScale,
        rotation: newRotation
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleMouseMove);
      window.removeEventListener("touchend", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleMouseMove, { passive: false });
    window.addEventListener("touchend", handleMouseUp);
  };

  return (
    <div
      className={`strip-preview ${resolved ? "is-resolved" : ""}`}
      style={scaleStyle}
      onClick={() => onSelectSticker?.(null)}
      onMouseMove={handleMouseMove3D}
      onMouseLeave={handleMouseLeave3D}
    >
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
              {vignette > 0 && <div className="vignette-overlay" style={{ opacity: vignette / 100 }} />}
              {grain > 0 && <div className="grain-overlay" style={{ opacity: grain / 100 }} />}
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

      {/* Render Stickers */}
      {stickers.map((sticker) => {
        const isSelected = sticker.id === selectedStickerId;
        const template = STICKER_TEMPLATES.find((t) => t.id === sticker.value);

        return (
          <div
            key={sticker.id}
            className={`sticker-instance ${isSelected ? "is-selected" : ""}`}
            style={{
              left: `${sticker.x}%`,
              top: `${sticker.y}%`,
              transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg) scale(${sticker.scale})`,
              color: sticker.color || "var(--frame-ink)"
            }}
            onMouseDown={(e) => handleDragStart(e, sticker)}
            onTouchStart={(e) => handleDragStart(e, sticker)}
            onClick={(e) => e.stopPropagation()}
          >
            {sticker.type === "svg" && template ? (
              <svg
                viewBox={template.viewBox}
                className="sticker-svg"
                style={{ width: "60px", height: "60px" }}
              >
                <path d={template.path} fill="currentColor" />
              </svg>
            ) : (
              <span
                className="sticker-text"
                style={{
                  fontFamily: sticker.font || "var(--font-mono)",
                  fontSize: `${sticker.fontSize || 16}px`,
                  fontWeight: "bold",
                  color: sticker.color || "var(--frame-ink)"
                }}
              >
                {sticker.value}
              </span>
            )}

            {isSelected && (
              <>
                <button
                  className="sticker-btn-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSticker?.(sticker.id);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  title="Delete sticker"
                >
                  ×
                </button>
                <div
                  className="sticker-handle-rotate"
                  onMouseDown={(e) => handleScaleRotateStart(e, sticker)}
                  onTouchStart={(e) => handleScaleRotateStart(e, sticker)}
                  title="Scale & Rotate"
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
});

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
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(!!navigator.share);
  }, []);

  async function copyLink() {
    if (!share.link) return;
    await navigator.clipboard.writeText(share.link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function shareLink() {
    if (!share.link) return;
    try {
      await navigator.share({
        title: "Snapbooth Photo Strip",
        text: "Check out my photo strip from Snapbooth!",
        url: share.link
      });
    } catch (err) {
      console.warn("Share failed:", err);
    }
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
            
            <div style={{ display: "flex", gap: "8px", width: "100%", marginTop: "12px" }}>
              <Button style={{ flex: 1 }} onClick={() => void copyLink()} icon={copied ? <Check size={15} /> : <Copy size={15} />}>
                {copied ? "Copied!" : "Copy URL"}
              </Button>
              {canShare && (
                <Button variant="secondary" style={{ flex: 1 }} onClick={() => void shareLink()} icon={<Upload size={15} />}>
                  Share...
                </Button>
              )}
            </div>

            <div style={{
              background: "rgba(232, 74, 42, 0.08)",
              border: "1px solid rgba(232, 74, 42, 0.22)",
              color: "#e84a2a",
              padding: "10px 14px",
              borderRadius: "4px",
              fontSize: "11px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "16px",
              width: "100%",
              boxSizing: "border-box"
            }}>
              <Timer size={14} style={{ flexShrink: 0 }} />
              <span>This link and QR code will expire in 60 minutes (hosted temporarily via tmpfiles.org).</span>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function TopBar({
  view,
  theme,
  soundEnabled,
  onNavigate,
  onToggleTheme,
  onToggleSound
}: {
  view: View;
  theme: Theme;
  soundEnabled: boolean;
  onNavigate: (view: View) => void;
  onToggleTheme: () => void;
  onToggleSound: () => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const links: { view: View; label: string }[] = [
    { view: "intro", label: "Home" },
    { view: "studio", label: "Studio" },
    { view: "gallery", label: "Gallery" },
    { view: "faq", label: "FAQ" },
    { view: "privacy", label: "Privacy" },
    { view: "contact", label: "Contact" }
  ];

  const handleNavigate = (targetView: View) => {
    onNavigate(targetView);
    setMobileOpen(false);
  };

  return (
    <header className="topbar">
      <button className="wordmark" onClick={() => handleNavigate("intro")}>
        <img
          src={theme === "light" ? "./logo-light.svg" : "./logo-dark.svg"}
          alt="Snapbooth Logo"
        />
        Snapbooth
      </button>

      <button
        className="mobile-menu-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
        style={{
          display: "none",
          border: 0,
          background: "transparent",
          cursor: "pointer",
          padding: "8px",
          color: "var(--ink-primary)"
        }}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <nav className={mobileOpen ? "mobile-open" : ""} aria-label="Primary navigation">
        {links.map((link) => (
          <button
            className={view === link.view ? "is-active" : ""}
            key={link.view}
            onClick={() => handleNavigate(link.view)}
          >
            {link.label}
          </button>
        ))}
      </nav>
      <div className="topbar-actions">
        <button onClick={onToggleSound} aria-label="Toggle sound" title={soundEnabled ? "Mute sounds" : "Unmute sounds"}>
          {soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
        </button>
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
  className = "",
  defaultOpen = true
}: {
  title: string;
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`rail-section ${open ? "is-active" : ""} ${className}`}>
      <h2 onClick={() => setOpen(!open)} style={{ cursor: "pointer", userSelect: "none" }}>
        {title}
      </h2>
      <div className="rail-content">{children}</div>
    </section>
  );
}

function Button({
  children,
  icon,
  variant = "primary",
  disabled = false,
  style,
  onClick
}: {
  children: ReactNode;
  icon?: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  style?: CSSProperties;
  onClick?: () => void;
}) {
  return (
    <button className={`btn btn-${variant}`} disabled={disabled} onClick={onClick} style={style}>
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




function GalleryView({
  onBack,
  onStartNew
}: {
  onBack: () => void;
  onStartNew: () => void;
}) {
  const [rolls, setRolls] = useState<SavedRoll[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoll, setSelectedRoll] = useState<SavedRoll | null>(null);

  const loadGallery = useCallback(async () => {
    try {
      const data = await getAllRolls();
      setRolls(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGallery();
  }, [loadGallery]);

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this developed roll from your gallery?")) return;
    try {
      await deleteRoll(id);
      if (selectedRoll?.id === id) {
        setSelectedRoll(null);
      }
      void loadGallery();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownload = (roll: SavedRoll, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const anchor = document.createElement("a");
    anchor.href = roll.image;
    anchor.download = `snapbooth_${roll.layout.toLowerCase()}_${roll.frame.toLowerCase()}_${roll.id.replace(/[: -]/g, "_")}.png`;
    anchor.click();
  };

  return (
    <section className="editorial-page" style={{ position: "relative" }}>
      <div className="page-bar">
        <Button variant="ghost" onClick={onBack}>
          Back to studio
        </Button>
        <span>Your Developed Photo Gallery</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "48px" }}>Gallery</h1>
          <p className="eyebrow" style={{ marginTop: "8px" }}>History of developed strips</p>
        </div>
        <Button variant="secondary" icon={<RotateCcw size={15} />} onClick={onStartNew}>
          New Session
        </Button>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "64px 0", fontFamily: "var(--font-mono)", fontSize: "14px" }}>
          Loading your developed rolls...
        </div>
      ) : rolls.length === 0 ? (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "96px 24px",
          border: "2px dashed var(--rule)",
          borderRadius: "8px",
          textAlign: "center"
        }}>
          <History size={48} style={{ color: "var(--ink-secondary)", marginBottom: "20px" }} />
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "28px", margin: "0 0 10px", fontWeight: "500" }}>Your darkroom is empty</h2>
          <p style={{ color: "var(--ink-secondary)", maxWidth: "420px", margin: "0 0 24px" }}>
            Strips you develop and customize in the print room will be saved here automatically.
          </p>
          <Button onClick={onBack}>Capture some poses</Button>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "32px"
        }}>
          {rolls.map((roll) => (
            <div
              key={roll.id}
              onClick={() => setSelectedRoll(roll)}
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--rule)",
                borderRadius: "16px",
                overflow: "hidden",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                flexDirection: "column"
              }}
              className="gallery-card"
              onMouseMove={handleMouseMove3D}
              onMouseLeave={handleMouseLeave3D}
            >
              <div style={{
                position: "relative",
                aspectRatio: "2 / 3",
                background: "rgba(0,0,0,0.05)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                padding: "16px"
              }}>
                <img
                  src={roll.image}
                  alt={roll.caption}
                  style={{
                    maxHeight: "100%",
                    maxWidth: "100%",
                    objectFit: "contain",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.12)"
                  }}
                />
              </div>
              <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  color: "var(--ink-secondary)",
                  textTransform: "uppercase"
                }}>{roll.timestamp}</span>
                <strong style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "16px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontWeight: "600"
                }}>{roll.caption || "Untitled"}</strong>
                
                <div style={{ display: "flex", gap: "8px", marginTop: "auto", paddingTop: "8px", borderTop: "1px solid var(--rule)" }}>
                  <button
                    onClick={(e) => handleDownload(roll, e)}
                    style={{
                      flex: 1,
                      height: "30px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      fontSize: "11px",
                      fontFamily: "var(--font-mono)",
                      textTransform: "uppercase",
                      border: "1px solid var(--rule)",
                      borderRadius: "4px",
                      background: "transparent",
                      color: "var(--ink-primary)"
                    }}
                  >
                    <Download size={12} /> DL
                  </button>
                  <button
                    onClick={(e) => handleDelete(roll.id, e)}
                    style={{
                      width: "30px",
                      height: "30px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid var(--rule)",
                      borderRadius: "4px",
                      background: "transparent",
                      color: "#ff4d4d"
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedRoll && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedRoll(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px"
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--rule)",
              borderRadius: "8px",
              padding: "24px",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "90vh",
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 240px",
              gap: "24px",
              overflow: "auto",
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", background: "rgba(0,0,0,0.03)", padding: "16px", borderRadius: "6px" }}>
              <img
                src={selectedRoll.image}
                alt={selectedRoll.caption}
                style={{ maxHeight: "65vh", maxWidth: "100%", objectFit: "contain", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
              />
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div>
                  <h3 style={{ margin: "0 0 4px 0", fontFamily: "var(--font-serif)", fontSize: "24px", fontWeight: "600" }}>
                    {selectedRoll.caption || "Untitled"}
                  </h3>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--ink-secondary)" }}>
                    {selectedRoll.timestamp}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedRoll(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                    color: "var(--ink-secondary)"
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ borderTop: "1px solid var(--rule)", paddingTop: "16px", display: "grid", gap: "10px" }}>
                <span className="eyebrow" style={{ fontSize: "10px" }}>Specifications</span>
                <dl style={{ margin: 0, display: "grid", gap: "8px", fontSize: "12px", fontFamily: "var(--font-mono)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <dt style={{ color: "var(--ink-secondary)" }}>Layout</dt>
                    <dd style={{ margin: 0, fontWeight: "bold" }}>{selectedRoll.layout}</dd>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <dt style={{ color: "var(--ink-secondary)" }}>Frame</dt>
                    <dd style={{ margin: 0, fontWeight: "bold" }}>{selectedRoll.frame}</dd>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <dt style={{ color: "var(--ink-secondary)" }}>Filter</dt>
                    <dd style={{ margin: 0, fontWeight: "bold" }}>{selectedRoll.filter}</dd>
                  </div>
                </dl>
              </div>

              <div style={{ marginTop: "auto", display: "grid", gap: "8px" }}>
                <Button icon={<Download size={15} />} onClick={() => handleDownload(selectedRoll)}>
                  Download image
                </Button>
                <Button variant="secondary" icon={<Trash2 size={15} />} onClick={() => handleDelete(selectedRoll.id)}>
                  Delete Roll
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
