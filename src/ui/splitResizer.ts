const STORAGE_KEY = "hamrosampada-sidebar-pct";

export interface SplitLimits {
  /** Minimum sidebar width in px */
  minSidebar: number;
  /** Minimum viewer width in px */
  minViewer: number;
  /** Absolute max sidebar width in px */
  maxSidebar: number;
}

const DEFAULT_LIMITS: SplitLimits = {
  minSidebar: 300,
  minViewer: 320,
  maxSidebar: 900,
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function readSavedPct(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function savePct(pct: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(Math.round(pct * 10) / 10));
  } catch {
    /* ignore */
  }
}

/**
 * Drag handle between commentary sidebar and viewer.
 * Both panes stretch within min/max limits; width is persisted.
 */
export function mountSplitResizer(
  view: HTMLElement,
  sidebar: HTMLElement,
  resizer: HTMLElement,
  onResize?: () => void,
  limits: SplitLimits = DEFAULT_LIMITS,
): () => void {
  const applyWidth = (px: number) => {
    const viewW = view.getBoundingClientRect().width;
    const handleW = Math.max(resizer.getBoundingClientRect().width, 8);
    const maxByViewer = viewW - limits.minViewer - handleW;
    const maxW = Math.max(limits.minSidebar, Math.min(limits.maxSidebar, maxByViewer));
    const minW = Math.min(limits.minSidebar, maxW);
    const width = clamp(Math.round(px), minW, maxW);

    sidebar.style.flex = `0 0 ${width}px`;
    sidebar.style.width = `${width}px`;
    sidebar.style.maxWidth = "none";
    sidebar.style.minWidth = "0";

    const pct = viewW > 0 ? (width / viewW) * 100 : 44;
    savePct(pct);
    onResize?.();
    return width;
  };

  const applyPct = (pct: number) => {
    const viewW = view.getBoundingClientRect().width;
    if (viewW <= 0) return;
    applyWidth((pct / 100) * viewW);
  };

  const saved = readSavedPct();
  requestAnimationFrame(() => applyPct(saved ?? 44));

  let dragging = false;
  let activePointerId: number | null = null;

  const onPointerDown = (ev: PointerEvent) => {
    if (window.matchMedia("(max-width: 860px)").matches) return;
    dragging = true;
    activePointerId = ev.pointerId;
    resizer.classList.add("is-dragging");
    view.classList.add("is-resizing");
    resizer.setPointerCapture(ev.pointerId);
    // Apply immediately so first pixel of drag feels responsive
    const viewRect = view.getBoundingClientRect();
    applyWidth(ev.clientX - viewRect.left);
    ev.preventDefault();
  };

  const onPointerMove = (ev: PointerEvent) => {
    if (!dragging || (activePointerId !== null && ev.pointerId !== activePointerId)) return;
    const viewRect = view.getBoundingClientRect();
    applyWidth(ev.clientX - viewRect.left);
  };

  const endDrag = (ev: PointerEvent) => {
    if (!dragging) return;
    if (activePointerId !== null && ev.pointerId !== activePointerId) return;
    dragging = false;
    activePointerId = null;
    resizer.classList.remove("is-dragging");
    view.classList.remove("is-resizing");
    try {
      resizer.releasePointerCapture(ev.pointerId);
    } catch {
      /* ignore */
    }
    onResize?.();
  };

  const onKeyDown = (ev: KeyboardEvent) => {
    if (window.matchMedia("(max-width: 860px)").matches) return;
    const step = ev.shiftKey ? 48 : 24;
    const current = sidebar.getBoundingClientRect().width;
    if (ev.key === "ArrowLeft") {
      ev.preventDefault();
      applyWidth(current - step);
    } else if (ev.key === "ArrowRight") {
      ev.preventDefault();
      applyWidth(current + step);
    } else if (ev.key === "Home") {
      ev.preventDefault();
      applyWidth(limits.minSidebar);
    } else if (ev.key === "End") {
      ev.preventDefault();
      applyWidth(limits.maxSidebar);
    }
  };

  const onWindowResize = () => {
    if (window.matchMedia("(max-width: 860px)").matches) {
      sidebar.style.flex = "";
      sidebar.style.width = "";
      sidebar.style.maxWidth = "";
      sidebar.style.minWidth = "";
      return;
    }
    applyPct(readSavedPct() ?? 44);
  };

  resizer.addEventListener("pointerdown", onPointerDown);
  resizer.addEventListener("pointermove", onPointerMove);
  resizer.addEventListener("pointerup", endDrag);
  resizer.addEventListener("pointercancel", endDrag);
  resizer.addEventListener("lostpointercapture", endDrag);
  resizer.addEventListener("keydown", onKeyDown);
  window.addEventListener("resize", onWindowResize);

  return () => {
    resizer.removeEventListener("pointerdown", onPointerDown);
    resizer.removeEventListener("pointermove", onPointerMove);
    resizer.removeEventListener("pointerup", endDrag);
    resizer.removeEventListener("pointercancel", endDrag);
    resizer.removeEventListener("lostpointercapture", endDrag);
    resizer.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("resize", onWindowResize);
  };
}
