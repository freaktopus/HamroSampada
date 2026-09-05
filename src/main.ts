import "./styles/main.scss";
import { CHAPTERS } from "./content/chapters";
import {
  DEFAULT_SPLAT_ID,
  getSiteForModel,
  renderSiteBriefHtml,
  SPLAT_MODELS,
} from "./content/models";
import {
  createSidebarTracker,
  mountChapters,
  mountPhaseBar,
  scrollToChapter,
  scrollToOverview,
  setActiveUi,
} from "./ui/scroll";
import { PipelineViz } from "./viz/PipelineViz";
import { fillModelSelect, SplatViewer } from "./viz/SplatViewer";
import { mountSplitResizer } from "./ui/splitResizer";

type FocusMode = "guide" | "temple";

function focusForChapter(chapterId: string | undefined): FocusMode {
  if (chapterId === "intro" || chapterId === "temple" || chapterId === "clean") {
    return "temple";
  }
  return "guide";
}

function nextFrame(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => r()));
}

async function main(): Promise<void> {
  const docs = document.getElementById("docs");
  const siteBrief = document.getElementById("site-brief");
  const walkthrough = document.getElementById("walkthrough");
  const canvasWrap = document.getElementById("canvas-wrap");
  const canvas = document.getElementById("gs-canvas") as HTMLCanvasElement | null;
  const splatRoot = document.getElementById("splat-root");
  const paneGuide = document.getElementById("pane-guide");
  const paneTemple = document.getElementById("pane-temple");
  const phaseBar = document.getElementById("phase-bar");
  const chapterTitle = document.getElementById("chapter-title");
  const hudStep = document.getElementById("hud-step");
  const hudTitle = document.getElementById("hud-title");
  const btnPrev = document.getElementById("btn-prev");
  const btnNext = document.getElementById("btn-next");
  const modelSelect = document.getElementById("model-select") as HTMLSelectElement | null;
  const splatStatus = document.getElementById("splat-status");
  const canvasHint = document.getElementById("canvas-hint");
  const view = document.querySelector(".view") as HTMLElement | null;
  const sidebar = document.querySelector(".sidebar") as HTMLElement | null;
  const splitResizer = document.getElementById("split-resizer");
  const app = document.getElementById("app");
  const boot = document.getElementById("boot");

  const revealApp = () => {
    document.body.classList.add("is-ready");
    app?.setAttribute("aria-hidden", "false");
    boot?.setAttribute("aria-busy", "false");
    window.setTimeout(() => boot?.remove(), 400);
  };

  if (!docs || !walkthrough || !canvas || !splatRoot || !modelSelect || !canvasWrap || !siteBrief) {
    console.error("[HamroSampada] Missing required DOM nodes");
    revealApp();
    return;
  }

  const chapters = mountChapters(docs);
  let activeIndex = 0;
  let pinnedFocus: FocusMode | null = null;
  let selectedModelId = DEFAULT_SPLAT_ID;
  let currentFocus: FocusMode = "temple";
  let navLockIndex: number | null = null;
  let navLockUntil = 0;

  const splat = new SplatViewer(splatRoot, (status, detail) => {
    if (!splatStatus) return;
    if (status === "ready" || status === "idle") {
      splatStatus.hidden = true;
      return;
    }
    splatStatus.hidden = false;
    splatStatus.textContent = detail ?? status;
    splatStatus.dataset.state = status;
  });

  fillModelSelect(modelSelect, SPLAT_MODELS, selectedModelId);
  splat.setVisible(true);

  const updateSiteBrief = (modelId: string) => {
    const site = getSiteForModel(modelId);
    siteBrief.innerHTML = renderSiteBriefHtml(modelId);
    siteBrief.dataset.site = site.id;
    const label = paneTemple?.querySelector(".pane-label");
    if (label) label.textContent = site.name;
  };

  canvasWrap.dataset.focus = "temple";
  updateSiteBrief(DEFAULT_SPLAT_ID);
  setActiveUi(chapters, 0, {
    titleEl: chapterTitle,
    hudStep,
    hudTitle,
    phaseBar,
  });
  if (phaseBar) mountPhaseBar(phaseBar, () => undefined);

  // Boot only waits for stylesheet + shell layout — not the temple splat.
  await nextFrame();
  await nextFrame();
  revealApp();

  // Monument WebGL must init before the pipeline guide (second context).
  await splat.load(DEFAULT_SPLAT_ID);

  const viz = new PipelineViz(canvas);
  viz.setPriority("secondary");
  viz.start();

  const refreshLayouts = () => {
    viz.resize();
    window.dispatchEvent(new Event("resize"));
  };

  if (view && sidebar && splitResizer) {
    mountSplitResizer(view, sidebar, splitResizer, refreshLayouts, {
      minSidebar: 300,
      minViewer: 360,
      maxSidebar: 880,
    });
  }

  const applyRenderBudget = (focus: FocusMode) => {
    const guidePrimary = focus === "guide";
    viz.setPriority(guidePrimary ? "primary" : "secondary");
    splat.setActive(!guidePrimary && !document.hidden);
  };

  const setFocus = (focus: FocusMode, opts?: { hint?: string }) => {
    if (currentFocus !== focus) {
      currentFocus = focus;
      canvasWrap.dataset.focus = focus;
      window.setTimeout(refreshLayouts, 480);
      refreshLayouts();
    }
    applyRenderBudget(focus);
    if (canvasHint) {
      canvasHint.textContent =
        opts?.hint ??
        (focus === "temple"
          ? "monument capture in focus · pipeline guide preview bottom-right"
          : "pipeline guide in focus · monument preview bottom-right");
    }
  };

  const syncFocus = (index: number) => {
    const auto = focusForChapter(CHAPTERS[index]?.id);
    setFocus(pinnedFocus ?? auto);
  };

  const sync = (index: number, local: number) => {
    activeIndex = index;
    viz.setChapter(index, local);
    setActiveUi(chapters, index, {
      titleEl: chapterTitle,
      hudStep,
      hudTitle,
      phaseBar,
    });
    if (pinnedFocus && focusForChapter(CHAPTERS[index]?.id) === pinnedFocus) {
      pinnedFocus = null;
    }
    syncFocus(index);
  };

  if (phaseBar) {
    mountPhaseBar(phaseBar, (i) => {
      pinnedFocus = null;
      navLockIndex = i;
      navLockUntil = performance.now() + 550;
      scrollToChapter(walkthrough, chapters, i);
      sync(i, 0);
    });
  }

  createSidebarTracker(walkthrough, chapters, (index, local) => {
    if (navLockIndex !== null && performance.now() < navLockUntil) {
      sync(navLockIndex, local);
      return;
    }
    navLockIndex = null;
    sync(index, local);
  });

  const onPaneActivate = (pane: FocusMode) => {
    if (currentFocus === pane) return;
    pinnedFocus = pane;
    setFocus(pane, {
      hint:
        pane === "temple"
          ? "monument pinned · scroll or click guide preview to switch"
          : "guide pinned · scroll or click monument preview to switch",
    });
  };

  const brand = document.querySelector(".brand");
  brand?.addEventListener("click", (ev) => {
    ev.preventDefault();
    pinnedFocus = null;
    navLockIndex = 0;
    navLockUntil = performance.now() + 550;
    scrollToOverview(walkthrough);
    sync(0, 0);
  });

  paneGuide?.addEventListener("click", (ev) => {
    if (currentFocus === "temple") {
      ev.preventDefault();
      onPaneActivate("guide");
    }
  });
  paneTemple?.addEventListener("click", (ev) => {
    if (currentFocus === "guide") {
      ev.preventDefault();
      onPaneActivate("temple");
    }
  });

  modelSelect.addEventListener("change", () => {
    const id = modelSelect.value || DEFAULT_SPLAT_ID;
    selectedModelId = id;
    pinnedFocus = "temple";
    updateSiteBrief(id);
    walkthrough.scrollTo({ top: 0, behavior: "smooth" });
    activeIndex = 0;
    setActiveUi(chapters, 0, {
      titleEl: chapterTitle,
      hudStep,
      hudTitle,
      phaseBar,
    });
    setFocus("temple");
    void splat.load(id);
  });

  btnPrev?.addEventListener("click", () => {
    pinnedFocus = null;
    const i = Math.max(0, activeIndex - 1);
    navLockIndex = i;
    navLockUntil = performance.now() + 550;
    scrollToChapter(walkthrough, chapters, i);
  });
  btnNext?.addEventListener("click", () => {
    pinnedFocus = null;
    const i = Math.min(chapters.length - 1, activeIndex + 1);
    navLockIndex = i;
    navLockUntil = performance.now() + 550;
    scrollToChapter(walkthrough, chapters, i);
  });

  walkthrough.addEventListener("keydown", (ev) => {
    if (ev.key === "ArrowLeft") {
      ev.preventDefault();
      pinnedFocus = null;
      const i = Math.max(0, activeIndex - 1);
      navLockIndex = i;
      navLockUntil = performance.now() + 550;
      scrollToChapter(walkthrough, chapters, i);
    } else if (ev.key === "ArrowRight") {
      ev.preventDefault();
      pinnedFocus = null;
      const i = Math.min(chapters.length - 1, activeIndex + 1);
      navLockIndex = i;
      navLockUntil = performance.now() + 550;
      scrollToChapter(walkthrough, chapters, i);
    }
  });

  document.addEventListener("visibilitychange", () => {
    applyRenderBudget(currentFocus);
  });

  sync(0, 0);
  applyRenderBudget("temple");
  refreshLayouts();
  requestAnimationFrame(refreshLayouts);

  console.info(`[HamroSampada] dual-view ready · ${CHAPTERS.length} chapters · ${SPLAT_MODELS.length} captures`);
}

void main();
