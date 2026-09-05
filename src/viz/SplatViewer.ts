import { getSplatModel, type SplatModel } from "../content/models";

type GsControls = {
  autoRotate: boolean;
  autoRotateSpeed?: number;
  addEventListener: (type: string, listener: () => void) => void;
};

type GsViewer = {
  addSplatScene: (url: string, opts: Record<string, unknown>) => Promise<void>;
  start: () => void;
  stop?: () => void;
  dispose?: () => Promise<void> | void;
  forceRenderNextFrame?: () => void;
  controls?: GsControls | null;
  perspectiveControls?: GsControls | null;
  orthographicControls?: GsControls | null;
};

export type SplatStatus = "idle" | "loading" | "ready" | "error";

/**
 * Minimal wrapper matching hamrosampada ModelViewer — avoid touching renderer
 * DPR / clear / renderMode after construct (those desync the splat mesh).
 */
export class SplatViewer {
  private readonly root: HTMLElement;
  private viewer: GsViewer | null = null;
  private loadToken = 0;
  private currentId: string | null = null;
  private status: SplatStatus = "idle";
  private onStatus?: (s: SplatStatus, detail?: string) => void;

  constructor(root: HTMLElement, onStatus?: (s: SplatStatus, detail?: string) => void) {
    this.root = root;
    this.onStatus = onStatus;
  }

  get modelId(): string | null {
    return this.currentId;
  }

  get isReady(): boolean {
    return this.status === "ready";
  }

  setVisible(visible: boolean): void {
    this.root.classList.toggle("is-hidden", !visible);
    this.root.setAttribute("aria-hidden", visible ? "false" : "true");
    if (visible && this.status === "idle") {
      this.showPlaceholder();
    }
  }

  /** Kept for focus-budget API; does not alter the Gaussian viewer. */
  setActive(_active: boolean): void {
    if (this.viewer && this.status === "ready") {
      this.viewer.forceRenderNextFrame?.();
    }
  }

  async load(modelId: string): Promise<void> {
    if (this.currentId === modelId && (this.status === "ready" || this.status === "loading")) {
      return;
    }

    const model = getSplatModel(modelId);
    const token = ++this.loadToken;
    this.currentId = modelId;
    await this.disposeViewer();
    this.setStatus("loading", `Loading ${model.optionLabel}… (may take few minutes)`);

    try {
      const GS = await import("@mkkellogg/gaussian-splats-3d");
      if (token !== this.loadToken) return;

      this.root.innerHTML = "";

      const viewer = new GS.Viewer({
        rootElement: this.root,
        sharedMemoryForWorkers: false,
        useBuiltInControls: true,
        selfDrivenMode: true,
        dynamicScene: false,
        sphericalHarmonicsDegree: 0,
        sceneRevealMode: GS.SceneRevealMode?.Instant ?? 2,
        cameraUp: model.cameraUp ?? [0, -1, 0],
        initialCameraPosition: model.initialCameraPosition ?? [0, -1, -5],
        initialCameraLookAt: model.initialCameraLookAt ?? [0, 0, 0],
      }) as GsViewer;

      this.viewer = viewer;

      let progressComplete = false;
      await viewer.addSplatScene(model.url, {
        showLoadingUI: false,
        splatAlphaRemovalThreshold: 5,
        progressiveLoad: true,
        onProgress: (percent: number) => {
          if (token !== this.loadToken || progressComplete) return;
          if (typeof percent === "number" && Number.isFinite(percent)) {
            const roundedPercent = Math.min(100, Math.round(percent));
            this.setStatus(
              "loading",
              `Loading ${model.optionLabel}… ${roundedPercent}% (may take few minutes if it's first visit)`,
            );
            if (roundedPercent >= 100) {
              progressComplete = true;
            }
          } else {
            // Server sent no Content-Length — show an indeterminate but alive message
            this.setStatus(
              "loading",
              `Loading ${model.optionLabel}… (may take few minutes if it's first visit)`,
            );
          }
        },
      });

      if (token !== this.loadToken) {
        await this.safeDispose(viewer);
        return;
      }

      progressComplete = true; // Stop any remaining progress callbacks
      viewer.start();
      this.enableAutoRotate(viewer);
      viewer.forceRenderNextFrame?.();
      this.setStatus("ready", model.label);

      // Pane transitions / dual layout — nudge a resize after paint
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event("resize"));
        this.viewer?.forceRenderNextFrame?.();
      });
    } catch (err) {
      if (token !== this.loadToken) return;
      console.error("[SplatViewer]", err);
      this.setStatus(
        "error",
        err instanceof Error ? err.message : "Failed to load Gaussian splat.",
      );
    }
  }

  async dispose(): Promise<void> {
    this.loadToken++;
    await this.disposeViewer();
    this.currentId = null;
    this.setStatus("idle");
  }

  private async disposeViewer(): Promise<void> {
    const v = this.viewer;
    this.viewer = null;
    if (!v) {
      this.root.innerHTML = "";
      return;
    }
    await this.safeDispose(v);
    this.root.innerHTML = "";
  }

  private async safeDispose(v: GsViewer): Promise<void> {
    try {
      v.stop?.();
      await v.dispose?.();
    } catch {
      /* ignore */
    }
  }

  private setStatus(s: SplatStatus, detail?: string): void {
    this.status = s;
    this.onStatus?.(s, detail);
  }

  /** Show a simple 3D placeholder while models load. */
  private showPlaceholder(): void {
    if (this.viewer || this.status !== "idle") return;
    
    this.root.innerHTML = `
      <div class="splat-placeholder">
        <div class="splat-placeholder__cube">
          <div class="face front"></div>
          <div class="face back"></div>
          <div class="face left"></div>
          <div class="face right"></div>
          <div class="face top"></div>
          <div class="face bottom"></div>
        </div>
        <p class="splat-placeholder__text">Monument viewer ready · loading may take a minute</p>
      </div>
    `;
  }

  private getOrbitControls(viewer: GsViewer): GsControls[] {
    return [viewer.controls, viewer.perspectiveControls, viewer.orthographicControls].filter(
      (c): c is GsControls => c != null,
    );
  }

  /** Auto-orbit until the user drags, zooms, or pans the capture. */
  private enableAutoRotate(viewer: GsViewer): void {
    const controlsList = this.getOrbitControls(viewer);
    const stopAutoRotate = () => {
      for (const controls of controlsList) {
        controls.autoRotate = false;
      }
    };
    for (const controls of controlsList) {
      controls.autoRotateSpeed = 1.2;
      controls.autoRotate = true;
      controls.addEventListener("start", stopAutoRotate);
    }
  }
}

export function fillModelSelect(
  select: HTMLSelectElement,
  models: SplatModel[],
  selectedId: string,
): void {
  select.innerHTML = "";
  const groups = new Map<string, SplatModel[]>();
  for (const m of models) {
    const list = groups.get(m.group) ?? [];
    list.push(m);
    groups.set(m.group, list);
  }
  for (const [group, list] of groups) {
    const og = document.createElement("optgroup");
    og.label = group;
    for (const m of list) {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.optionLabel;
      opt.title = m.label;
      if (m.id === selectedId) opt.selected = true;
      og.appendChild(opt);
    }
    select.appendChild(og);
  }
}
