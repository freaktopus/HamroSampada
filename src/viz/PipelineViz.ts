import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CHAPTERS } from "../content/chapters";
import { clamp, lerp, smoothstep } from "./math";
import { buildTemplePoints, makeCameraRing, type TemplePoint } from "./temple";

export type StageId =
  | "intro"
  | "primitive"
  | "capture"
  | "sfm"
  | "init"
  | "raster"
  | "train"
  | "clean"
  | "temple";

export type VizPriority = "primary" | "secondary";

/**
 * Pipeline guide renderer — skips heavy instance rebuilds unless stage state
 * changes, and throttles when shown as a PiP preview.
 */
export class PipelineViz {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;

  private readonly root = new THREE.Group();
  private readonly camsGroup = new THREE.Group();
  private readonly raysGroup = new THREE.Group();
  private readonly photoGroup = new THREE.Group();
  private readonly splats: THREE.InstancedMesh;
  private readonly sparsePoints: THREE.Points;
  private readonly singleGaussian: THREE.Mesh;
  private readonly ground: THREE.Mesh;
  private readonly axes: THREE.AxesHelper;
  private readonly dummy = new THREE.Object3D();
  private readonly color = new THREE.Color();
  private readonly gray = new THREE.Color(0x8a93a3);
  private readonly points: TemplePoint[];
  private readonly camPositions: THREE.Vector3[];
  private readonly camMeshes: THREE.Mesh[] = [];
  private readonly photoMeshes: THREE.Mesh[] = [];
  private readonly clock = new THREE.Clock();
  private readonly resizeObserver: ResizeObserver;

  private chapterIndex = 0;
  private local = 0;
  private animFrame = 0;
  private disposed = false;
  private userOrbiting = false;
  private priority: VizPriority = "secondary";
  private frameCount = 0;
  private lastSplatKey = "";
  private lastW = 0;
  private lastH = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
      stencil: false,
      depth: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.setClearColor(0xe8e8e8, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.info.autoReset = true;

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 80);
    this.camera.position.set(6.5, 3.8, 7.2);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 2.5;
    this.controls.maxDistance = 18;
    this.controls.target.set(0, 2.0, 0);
    this.controls.addEventListener("start", () => {
      this.userOrbiting = true;
    });

    this.scene.background = new THREE.Color(0xe8e8e8);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 0.85);
    key.position.set(5, 10, 4);
    this.scene.add(key);

    // Fewer instances — still reads as a dense temple, much cheaper CPU upload
    this.points = buildTemplePoints(1600);
    this.camPositions = [
      ...makeCameraRing(10, 3.8, 1.5),
      ...makeCameraRing(6, 3.1, 2.7),
    ];

    this.ground = new THREE.Mesh(
      new THREE.CircleGeometry(6, 32),
      new THREE.MeshLambertMaterial({ color: 0xd9d9d9 }),
    );
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.frustumCulled = true;
    this.root.add(this.ground);

    const grid = new THREE.GridHelper(10, 16, 0xb0b0b0, 0xd0d0d0);
    grid.position.y = 0.001;
    this.root.add(grid);

    this.axes = new THREE.AxesHelper(1.2);
    this.axes.position.set(-2.8, 0.05, -2.8);
    this.root.add(this.axes);

    const geo = new THREE.SphereGeometry(1, 6, 4);
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    this.splats = new THREE.InstancedMesh(geo, mat, this.points.length);
    this.splats.frustumCulled = true;
    this.splats.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < this.points.length; i++) {
      this.splats.setColorAt(i, this.points[i]!.color);
    }
    if (this.splats.instanceColor) {
      this.splats.instanceColor.setUsage(THREE.DynamicDrawUsage);
    }
    this.root.add(this.splats);

    const sparsePos: number[] = [];
    const sparseCol: number[] = [];
    for (const p of this.points) {
      if (p.isFloater) continue;
      sparsePos.push(p.position.x, p.position.y, p.position.z);
      sparseCol.push(0.82, 0.56, 0.18);
    }
    const sparseGeo = new THREE.BufferGeometry();
    sparseGeo.setAttribute("position", new THREE.Float32BufferAttribute(sparsePos, 3));
    sparseGeo.setAttribute("color", new THREE.Float32BufferAttribute(sparseCol, 3));
    this.sparsePoints = new THREE.Points(
      sparseGeo,
      new THREE.PointsMaterial({
        size: 0.06,
        vertexColors: true,
        sizeAttenuation: true,
      }),
    );
    this.sparsePoints.visible = false;
    this.root.add(this.sparsePoints);

    this.singleGaussian = new THREE.Mesh(
      new THREE.SphereGeometry(1, 24, 16),
      new THREE.MeshLambertMaterial({
        color: 0xd18e2f,
        transparent: true,
        opacity: 0.75,
      }),
    );
    this.singleGaussian.scale.set(0.7, 1.15, 0.45);
    this.singleGaussian.position.set(0, 2.1, 0);
    this.singleGaussian.visible = false;
    this.root.add(this.singleGaussian);

    const wire = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.SphereGeometry(1, 12, 8)),
      new THREE.LineBasicMaterial({ color: 0x8a5c18 }),
    );
    this.singleGaussian.add(wire);

    const camGeo = new THREE.ConeGeometry(0.14, 0.32, 4);
    const camMat = new THREE.MeshLambertMaterial({ color: 0xd18e2f });
    for (const p of this.camPositions) {
      const m = new THREE.Mesh(camGeo, camMat);
      m.position.copy(p);
      m.lookAt(0, 1.8, 0);
      m.rotateX(Math.PI / 2);
      this.camMeshes.push(m);
      this.camsGroup.add(m);
    }
    this.camsGroup.visible = false;
    this.root.add(this.camsGroup);

    const rayMat = new THREE.LineBasicMaterial({
      color: 0xd18e2f,
      transparent: true,
      opacity: 0.45,
    });
    for (let i = 0; i < this.camPositions.length; i++) {
      const a = this.camPositions[i]!;
      const b = this.points[Math.floor((i * 97) % Math.max(1, this.points.length - 200))]!.position;
      const geom = new THREE.BufferGeometry().setFromPoints([a.clone(), b.clone()]);
      this.raysGroup.add(new THREE.Line(geom, rayMat));
    }
    this.raysGroup.visible = false;
    this.root.add(this.raysGroup);

    const photoGeo = new THREE.PlaneGeometry(0.62, 0.42);
    for (let i = 0; i < this.camPositions.length; i++) {
      const p = this.camPositions[i]!;
      const plane = new THREE.Mesh(
        photoGeo,
        new THREE.MeshBasicMaterial({
          color: new THREE.Color().setHSL(0.08 + (i % 6) * 0.04, 0.45, 0.62),
          side: THREE.DoubleSide,
        }),
      );
      plane.position.copy(p);
      plane.lookAt(0, 1.8, 0);
      this.photoMeshes.push(plane);
      this.photoGroup.add(plane);
    }
    this.photoGroup.visible = false;
    this.root.add(this.photoGroup);

    this.scene.add(this.root);
    this.applySplats(0.35, 0.2, 0.55, 0);

    const parent = canvas.parentElement ?? canvas;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(parent);
    this.resize();
  }

  setChapter(index: number, local = 0): void {
    this.chapterIndex = clamp(index, 0, CHAPTERS.length - 1);
    this.local = clamp(local, 0, 1);
  }

  /** Primary = full quality; secondary = PiP (throttled). */
  setPriority(priority: VizPriority): void {
    if (this.priority === priority) return;
    this.priority = priority;
    const dpr = priority === "primary" ? Math.min(window.devicePixelRatio || 1, 1.75) : 1;
    this.renderer.setPixelRatio(dpr);
    this.resize();
  }

  getStageId(): StageId {
    return (CHAPTERS[this.chapterIndex]?.id ?? "intro") as StageId;
  }

  resize(): void {
    const canvas = this.renderer.domElement;
    const parent = canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    if (w === this.lastW && h === this.lastH) return;
    this.lastW = w;
    this.lastH = h;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  start(): void {
    const tick = () => {
      if (this.disposed) return;
      this.animFrame = requestAnimationFrame(tick);
      if (document.hidden) return;

      this.frameCount++;

      // PiP: render every 3rd frame — still smooth enough for a preview
      if (this.priority === "secondary" && this.frameCount % 3 !== 0) {
        return;
      }

      this.update();
      this.renderer.render(this.scene, this.camera);
    };
    tick();
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.animFrame);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.renderer.dispose();
  }

  private update(): void {
    const id = this.getStageId();
    // Quantize local so tiny scroll jitter does not rebuild instances
    const local = Math.round(this.local * 20) / 20;
    const t = this.clock.elapsedTime;
    const progress = (this.chapterIndex + local) / CHAPTERS.length;
    const primary = this.priority === "primary";

    this.camsGroup.visible = id === "capture" || id === "sfm";
    this.photoGroup.visible = id === "capture";
    this.raysGroup.visible = id === "sfm";
    this.singleGaussian.visible = id === "primitive";
    this.sparsePoints.visible = id === "sfm" || id === "init";
    this.splats.visible = id !== "primitive";
    this.axes.visible = id === "intro" || id === "primitive" || id === "raster";

    if (!this.userOrbiting) {
      // Slower orbit in PiP to cut motion work
      const speed = primary ? 0.15 : 0.06;
      const angle = t * speed + progress * Math.PI * 0.4;
      const radius = lerp(7.2, 5.0, smoothstep(0.4, 1, progress));
      const elev = lerp(3.9, 2.8, progress);
      this.camera.position.set(Math.cos(angle) * radius, elev, Math.sin(angle) * radius);
      this.controls.target.set(0, 2.0, 0);
      this.camera.lookAt(this.controls.target);
    }
    if (primary || this.userOrbiting) {
      this.controls.update();
    }

    if (this.singleGaussian.visible) {
      const sx = 0.65 + Math.sin(t * 1.3) * 0.12;
      this.singleGaussian.scale.set(sx, 1.1, 0.4 + local * 0.25);
      this.singleGaussian.rotation.y = t * 0.5;
      (this.singleGaussian.material as THREE.MeshLambertMaterial).opacity = 0.55 + local * 0.35;
    }

    if (this.camsGroup.visible) {
      const reveal = id === "capture" ? smoothstep(0, 0.9, local) : 1;
      this.camMeshes.forEach((m, i) => {
        const a = clamp(reveal * this.camMeshes.length - i, 0, 1);
        m.visible = a > 0.02;
        m.scale.setScalar(0.4 + a * 0.8);
      });
    }

    if (this.photoGroup.visible) {
      const reveal = smoothstep(0, 0.95, local);
      this.photoMeshes.forEach((m, i) => {
        const a = clamp(reveal * this.photoMeshes.length - i, 0, 1);
        m.visible = a > 0.02;
        m.scale.setScalar(0.6 + a * 0.5);
      });
    }

    if (this.raysGroup.visible) {
      const mat = (this.raysGroup.children[0] as THREE.Line | undefined)
        ?.material as THREE.LineBasicMaterial | undefined;
      if (mat) mat.opacity = 0.2 + local * 0.45;
    }

    if (this.sparsePoints.visible) {
      const pm = this.sparsePoints.material as THREE.PointsMaterial;
      pm.size = id === "sfm" ? 0.05 + local * 0.04 : 0.04;
    }

    let density = 0.4;
    let colorMix = 0.35;
    let sizeBoost = 0.7;
    let floaterMix = 0;
    let trainLocal = 0;

    switch (id) {
      case "intro":
        density = 0.55 + local * 0.2;
        colorMix = 0.45 + local * 0.3;
        sizeBoost = 0.75;
        break;
      case "capture":
        density = 0.12;
        colorMix = 0.2;
        sizeBoost = 0.45;
        break;
      case "sfm":
        density = 0.08 + local * 0.1;
        colorMix = 0.15;
        sizeBoost = 0.3;
        break;
      case "init":
        density = 0.4 + local * 0.35;
        colorMix = 0.35 + local * 0.35;
        sizeBoost = 0.55 + local * 0.25;
        floaterMix = 0.4;
        break;
      case "raster":
        density = 0.85;
        colorMix = 0.7 + local * 0.2;
        sizeBoost = 0.75;
        floaterMix = 0.5;
        break;
      case "train":
        density = 0.75 + local * 0.25;
        colorMix = 0.75 + local * 0.25;
        sizeBoost = lerp(0.7, 1.05, local);
        floaterMix = 1;
        trainLocal = primary ? local : 1; // skip jitter animation in PiP
        break;
      case "clean":
        density = 1;
        colorMix = 1;
        sizeBoost = 1;
        floaterMix = 1 - smoothstep(0.1, 0.85, local);
        break;
      case "temple":
        density = 1;
        colorMix = 1;
        sizeBoost = 1.05;
        break;
      case "primitive":
        density = 0;
        break;
    }

    if (this.splats.visible) {
      // Rebuild instance buffer only when visual state changes (or rare train pulse)
      const pulse = trainLocal > 0 && trainLocal < 1 && primary ? Math.floor(t * 8) : 0;
      const key = `${id}|${local}|${density.toFixed(2)}|${colorMix.toFixed(2)}|${sizeBoost.toFixed(2)}|${floaterMix.toFixed(2)}|${pulse}`;
      if (key !== this.lastSplatKey) {
        this.lastSplatKey = key;
        this.applySplats(density, colorMix, sizeBoost, floaterMix, t, trainLocal);
      }
    }
  }

  private applySplats(
    density: number,
    colorMix: number,
    sizeBoost: number,
    floaterMix: number,
    time = 0,
    trainLocal = 0,
  ): void {
    const n = this.points.length;
    const showCount = Math.max(1, Math.floor(n * clamp(density, 0, 1)));
    const hideScale = 0.0001;

    for (let i = 0; i < n; i++) {
      const p = this.points[i]!;
      const hide = (p.isFloater && floaterMix < 0.03) || i >= showCount;

      if (hide) {
        this.dummy.position.set(0, -50, 0);
        this.dummy.scale.setScalar(hideScale);
        this.dummy.updateMatrix();
        this.splats.setMatrixAt(i, this.dummy.matrix);
        continue;
      }

      let y = p.position.y;
      if (trainLocal > 0 && trainLocal < 1 && !p.isFloater) {
        y += Math.sin(time * 2.5 + i * 0.02) * 0.025 * (1 - trainLocal);
      }

      const f = p.isFloater ? Math.max(floaterMix, 0.05) : 1;
      const s = Math.max(0.04, sizeBoost) * f;
      this.dummy.position.set(p.position.x, y, p.position.z);
      this.dummy.scale.set(p.scale.x * s, p.scale.y * s, p.scale.z * s);
      this.dummy.updateMatrix();
      this.splats.setMatrixAt(i, this.dummy.matrix);

      this.color.copy(this.gray).lerp(p.color, colorMix);
      if (p.isFloater) this.color.offsetHSL(0.08, 0.25, 0.08);
      this.splats.setColorAt(i, this.color);
    }

    this.splats.instanceMatrix.needsUpdate = true;
    if (this.splats.instanceColor) this.splats.instanceColor.needsUpdate = true;
  }
}
