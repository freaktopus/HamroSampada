import { CHAPTERS } from "../content/chapters";
import { clamp } from "../viz/math";

export function mountChapters(container: HTMLElement): HTMLElement[] {
  container.innerHTML = "";
  return CHAPTERS.map((ch, i) => {
    const section = document.createElement("section");
    section.className = "chapter";
    section.id = ch.id;
    section.dataset.index = String(i);
    section.innerHTML = `
      <p class="chapter__kicker">${ch.kicker}</p>
      <h2 class="chapter__title">${ch.title}</h2>
      ${ch.html}
    `;
    container.appendChild(section);
    return section;
  });
}

export function mountPhaseBar(bar: HTMLElement, onSelect: (index: number) => void): void {
  bar.innerHTML = "";
  CHAPTERS.forEach((ch, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "phase-chip";
    btn.textContent = ch.rail;
    btn.dataset.index = String(i);
    btn.addEventListener("click", () => onSelect(i));
    bar.appendChild(btn);
  });
}

export function setActiveUi(
  chapters: HTMLElement[],
  index: number,
  opts: {
    titleEl?: HTMLElement | null;
    hudStep?: HTMLElement | null;
    hudTitle?: HTMLElement | null;
    phaseBar?: HTMLElement | null;
  },
): void {
  const ch = CHAPTERS[index];
  if (!ch) return;

  chapters.forEach((el, i) => el.classList.toggle("is-active", i === index));
  opts.phaseBar?.querySelectorAll(".phase-chip").forEach((chip, i) => {
    chip.classList.toggle("is-active", i === index);
  });
  if (opts.titleEl) opts.titleEl.textContent = ch.hud;
  if (opts.hudStep) opts.hudStep.textContent = String(index).padStart(2, "0");
  if (opts.hudTitle) opts.hudTitle.textContent = ch.hud;
}

/**
 * Track which chapter is in view inside the sidebar scroller.
 * Uses viewport-relative geometry and snaps to the last chapter near the bottom
 * so the final section reliably receives the active title highlight on tall screens.
 */
export function createSidebarTracker(
  scroller: HTMLElement,
  chapters: HTMLElement[],
  onChange: (index: number, local: number, progress: number) => void,
): () => void {
  let ticking = false;

  const measure = () => {
    ticking = false;
    const maxScroll = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
    const progress = clamp(scroller.scrollTop / maxScroll, 0, 1);
    const scrollerRect = scroller.getBoundingClientRect();
    // Focus band: upper third of the visible commentary column
    const focusY = scrollerRect.top + scroller.clientHeight * 0.22;

    let bestIdx = 0;
    let bestScore = Infinity;

    chapters.forEach((el, i) => {
      const rect = el.getBoundingClientRect();
      // Prefer the chapter whose title band is nearest the focus line
      const titleY = rect.top + Math.min(48, rect.height * 0.15);
      const dist = Math.abs(titleY - focusY);
      // Slightly prefer chapters that have already entered the focus band
      const penalty = titleY > focusY + 8 ? 24 : 0;
      const score = dist + penalty;
      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    });

    // Near end of scroll: always activate the last chapter
    const distanceFromBottom = maxScroll - scroller.scrollTop;
    if (distanceFromBottom < Math.max(96, scroller.clientHeight * 0.18) || progress >= 0.97) {
      bestIdx = chapters.length - 1;
    }

    const el = chapters[bestIdx]!;
    const rect = el.getBoundingClientRect();
    const local = clamp((focusY - rect.top) / Math.max(1, rect.height), 0, 1);
    onChange(bestIdx, local, progress);
  };

  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(measure);
    }
  };

  scroller.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  measure();
  return () => {
    scroller.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
  };
}

export function scrollToChapter(scroller: HTMLElement, chapters: HTMLElement[], index: number): void {
  const i = clamp(index, 0, chapters.length - 1);
  const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);

  // Overview (first chapter): keep the monument name / site-brief in view.
  if (i === 0) {
    scroller.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  const el = chapters[i];
  if (!el) return;

  // Position relative to the scroll container (not offsetParent), so the
  // site-brief above #docs does not push chapters out of view.
  const scrollerRect = scroller.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  const absoluteTop = elRect.top - scrollerRect.top + scroller.scrollTop;
  const topPad = 16;
  const target = clamp(absoluteTop - topPad, 0, maxScroll);

  scroller.scrollTo({ top: target, behavior: "smooth" });
}

/** Scroll commentary to the top overview (site brief + intro visible). */
export function scrollToOverview(scroller: HTMLElement): void {
  scroller.scrollTo({ top: 0, behavior: "smooth" });
}
