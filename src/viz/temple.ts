import * as THREE from "three";
import { mulberry32 } from "./math";

export interface TemplePoint {
  position: THREE.Vector3;
  color: THREE.Color;
  scale: THREE.Vector3;
  isFloater: boolean;
}

const BRICK = new THREE.Color("#b65a3c");
const TIMBER = new THREE.Color("#6b4423");
const ROOF = new THREE.Color("#3d2a1f");
const GOLD = new THREE.Color("#d18e2f");
const STONE = new THREE.Color("#9aa3b0");
const WHITE = new THREE.Color("#e8edf4");

/**
 * Procedural Nepali-style multi-tier pagoda sampled as anisotropic "Gaussians".
 * Used for the end-to-end scroll animation (not a trained splat file).
 */
export function buildTemplePoints(count = 4200): TemplePoint[] {
  const rand = mulberry32(42);
  const points: TemplePoint[] = [];

  const pushBox = (
    cx: number,
    cy: number,
    cz: number,
    sx: number,
    sy: number,
    sz: number,
    color: THREE.Color,
    density: number,
    jitter = 0.08,
  ) => {
    const n = Math.floor(density * sx * sy * sz * 18);
    for (let i = 0; i < n; i++) {
      const x = cx + (rand() - 0.5) * sx;
      const y = cy + (rand() - 0.5) * sy;
      const z = cz + (rand() - 0.5) * sz;
      const s = 0.07 + rand() * 0.1;
      points.push({
        position: new THREE.Vector3(
          x + (rand() - 0.5) * jitter,
          y + (rand() - 0.5) * jitter,
          z + (rand() - 0.5) * jitter,
        ),
        color: color.clone().offsetHSL((rand() - 0.5) * 0.04, (rand() - 0.5) * 0.08, (rand() - 0.5) * 0.08),
        scale: new THREE.Vector3(s * (0.8 + rand() * 0.6), s * (0.6 + rand() * 1.2), s * (0.8 + rand() * 0.6)),
        isFloater: false,
      });
    }
  };

  // Plinth
  pushBox(0, 0.15, 0, 2.4, 0.3, 2.4, STONE, 1.1);
  pushBox(0, 0.4, 0, 2.1, 0.25, 2.1, STONE, 0.9);

  // Tier 1 body + roof
  pushBox(0, 1.1, 0, 1.7, 1.1, 1.7, BRICK, 1.35);
  pushBox(0, 1.7, 0, 2.2, 0.12, 2.2, TIMBER, 1.4);
  // sloping roof ring
  for (let a = 0; a < Math.PI * 2; a += 0.12) {
    const r = 1.15;
    pushBox(Math.cos(a) * r, 1.95, Math.sin(a) * r, 0.35, 0.18, 0.35, ROOF, 0.55, 0.05);
  }

  // Tier 2
  pushBox(0, 2.45, 0, 1.15, 0.85, 1.15, BRICK, 1.3);
  pushBox(0, 2.9, 0, 1.55, 0.1, 1.55, TIMBER, 1.2);
  for (let a = 0; a < Math.PI * 2; a += 0.14) {
    const r = 0.85;
    pushBox(Math.cos(a) * r, 3.1, Math.sin(a) * r, 0.28, 0.15, 0.28, ROOF, 0.5, 0.04);
  }

  // Tier 3 / pinnacle
  pushBox(0, 3.55, 0, 0.7, 0.7, 0.7, BRICK, 1.2);
  pushBox(0, 4.05, 0, 0.25, 0.55, 0.25, GOLD, 1.6);
  pushBox(0, 4.4, 0, 0.35, 0.08, 0.35, GOLD, 1.2);

  // Door niche
  pushBox(0, 0.85, 0.88, 0.35, 0.7, 0.12, TIMBER, 1.1);
  pushBox(0, 1.15, 0.9, 0.12, 0.12, 0.08, GOLD, 1.4);

  // Window accents
  pushBox(0.75, 1.25, 0.88, 0.22, 0.28, 0.08, WHITE, 0.8);
  pushBox(-0.75, 1.25, 0.88, 0.22, 0.28, 0.08, WHITE, 0.8);

  // Floaters (will be culled in cleaning stage)
  for (let i = 0; i < 180; i++) {
    points.push({
      position: new THREE.Vector3(
        (rand() - 0.5) * 6,
        0.5 + rand() * 5.5,
        (rand() - 0.5) * 6,
      ),
      color: new THREE.Color().setHSL(rand(), 0.35, 0.55),
      scale: new THREE.Vector3(0.08 + rand() * 0.14, 0.08 + rand() * 0.14, 0.08 + rand() * 0.14),
      isFloater: true,
    });
  }

  // Trim / pad to exact count
  if (points.length > count) {
    return points.slice(0, count);
  }
  while (points.length < count) {
    const src = points[Math.floor(rand() * Math.max(1, points.length - 180))]!;
    points.push({
      position: src.position.clone().add(
        new THREE.Vector3((rand() - 0.5) * 0.08, (rand() - 0.5) * 0.08, (rand() - 0.5) * 0.08),
      ),
      color: src.color.clone(),
      scale: src.scale.clone().multiplyScalar(0.9 + rand() * 0.2),
      isFloater: src.isFloater,
    });
  }
  return points;
}

export function makeCameraRing(n: number, radius: number, y: number): THREE.Vector3[] {
  const cams: THREE.Vector3[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    cams.push(new THREE.Vector3(Math.cos(a) * radius, y + Math.sin(a * 2) * 0.25, Math.sin(a) * radius));
  }
  return cams;
}
