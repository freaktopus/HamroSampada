declare module "@mkkellogg/gaussian-splats-3d" {
  export const RenderMode: {
    Always: number;
    OnChange: number;
    Never: number;
  };

  export const SceneRevealMode: {
    Default: number;
    Gradual: number;
    Instant: number;
  };

  export class Viewer {
    constructor(options?: Record<string, unknown>);
    addSplatScene(url: string, opts?: Record<string, unknown>): Promise<void>;
    start(): void;
    stop(): void;
    dispose(): Promise<void> | void;
    setRenderMode(mode: number): void;
    forceRenderNextFrame(): void;
    renderer?: {
      setClearColor: (color: number, alpha?: number) => void;
      setPixelRatio?: (ratio: number) => void;
      setSize?: (w: number, h: number, updateStyle?: boolean) => void;
    };
  }
}
