import { CHAPTERS } from "../content/chapters";
import { clamp } from "../viz/math";

/** Focus band inside the commentary scroller (matches scrollToChapter alignment). */
const FOCUS_RATIO = 0.22;
const SCROLL_END_EPS = 3;

function focusOffset(scroller: HTMLElement): number {
  return scroller.clientHeight * FOCUS_RATIO;
}

export function mountChapters(container: HTMLElement): HTMLElement[] {
  container.innerHTML = "";
  return CHAPTERS.map((ch, i) => {
    const section = document.createElement("section");
    section.className = "chapter";
    section.id = ch.id;
    section.dataset.index = String(i);
    section.innerHTML = `
      <header class="chapter__head" tabindex="0" aria-label="Jump to ${ch.title}">
        <p class="chapter__kicker">${ch.kicker}</p>
        <h2 class="chapter__title">${ch.title}</h2>
      </header>
      <div class="chapter__body">
        ${ch.html}
      </div>
    `;
    container.appendChild(section);
    return section;
  });
}

/** Click an inactive commentary section to jump there — links stay clickable. */
export function bindChapterNav(
  chapters: HTMLElement[],
  onSelect: (index: number) => void,
): void {
  chapters.forEach((section, i) => {
    const activate = (ev: Event) => {
      if (section.classList.contains("is-active")) return;
      const target = ev.target as HTMLElement;
      if (target.closest("a, button, input, select, textarea, label")) return;
      onSelect(i);
    };

    section.addEventListener("click", activate);
    section.querySelector(".chapter__head")?.addEventListener("keydown", (ev) => {
      if (section.classList.contains("is-active")) return;
      const ke = ev as KeyboardEvent;
      if (ke.key === "Enter" || ke.key === " ") {
        ke.preventDefault();
        onSelect(i);
      }
    });
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
    siteBrief?: HTMLElement | null;
  },
): void {
  const ch = CHAPTERS[index];
  if (!ch) return;

  chapters.forEach((el, i) => {
    const active = i === index;
    el.classList.toggle("is-active", active);
    const head = el.querySelector<HTMLElement>(".chapter__head");
    if (head) {
      head.tabIndex = active ? -1 : 0;
    }
  });
  opts.siteBrief?.classList.toggle("is-active", index === 0);
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
    const focusY = scrollerRect.top + focusOffset(scroller);
    const distanceFromBottom = maxScroll - scroller.scrollTop;
    const lastIdx = chapters.length - 1;

    let bestIdx = 0;
    let bestScore = Infinity;

    // Fully scrolled — last section must win
    if (distanceFromBottom <= SCROLL_END_EPS) {
      bestIdx = lastIdx;
    } else {
      chapters.forEach((el, i) => {
        const rect = el.getBoundingClientRect();
        if (focusY >= rect.top - 4 && focusY <= rect.bottom + 4) {
          bestIdx = i;
          bestScore = -1;
          return;
        }

        const anchorY = rect.top + Math.min(56, rect.height * 0.22);
        const dist = Math.abs(anchorY - focusY);
        const penalty = anchorY > focusY + 8 ? 16 : 0;
        const score = dist + penalty;
        if (score < bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      });

      // Near the end: prefer the last visible section when it fills the lower viewport
      const lastEl = chapters[lastIdx];
      if (lastEl && distanceFromBottom < focusOffset(scroller)) {
        const lastRect = lastEl.getBoundingClientRect();
        if (lastRect.top < scrollerRect.bottom - 24 && lastRect.bottom > scrollerRect.top) {
          if (focusY >= lastRect.top - 4 || lastRect.bottom >= scrollerRect.bottom - 8) {
            bestIdx = lastIdx;
          }
        }
      }
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

  const scrollerRect = scroller.getBoundingClientRect();
  const headEl = el.querySelector<HTMLElement>(".chapter__head") ?? el;
  const headRect = headEl.getBoundingClientRect();
  const headAbsoluteTop = headRect.top - scrollerRect.top + scroller.scrollTop;
  const topPad = 16;
  const target = clamp(headAbsoluteTop - focusOffset(scroller) + topPad, 0, maxScroll);

  scroller.scrollTo({ top: target, behavior: "smooth" });
}

/** Scroll commentary to the top overview (site brief + intro visible). */
export function scrollToOverview(scroller: HTMLElement): void {
  scroller.scrollTo({ top: 0, behavior: "smooth" });
}
