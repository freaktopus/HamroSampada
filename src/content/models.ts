export interface SiteProfile {
  id: string;
  name: string;
  location: string;
}

export interface SplatModel {
  id: string;
  siteId: string;
  /** Short option label inside the dropdown group */
  optionLabel: string;
  /** Full accessible name */
  label: string;
  /** Optgroup heading */
  group: string;
  url: string;
  cameraUp?: [number, number, number];
  initialCameraPosition?: [number, number, number];
  initialCameraLookAt?: [number, number, number];
}

export const SITE_PROFILES: Record<string, SiteProfile> = {
  chandeswori: {
    id: "chandeswori",
    name: "Chandeswori Temple",
    location: "Banepa, Kavrepalanchok, Bagmati Province",
  },
  panauti: {
    id: "panauti",
    name: "Panauti Durbar Square",
    location: "Panauti, Kavrepalanchok, Bagmati Province",
  },
};

/** Production captures served from /public/3d_models */
export const SPLAT_MODELS: SplatModel[] = [
  {
    id: "chandeswori-clean",
    siteId: "chandeswori",
    optionLabel: "Curated capture",
    label: "Chandeswori Temple, Banepa — Curated capture",
    group: "Chandeswori Temple, Banepa",
    url: "/3d_models/chandesworiClean.ksplat",
    cameraUp: [0, -1, 0],
    initialCameraPosition: [0, 0, 13],
    initialCameraLookAt: [0, 0, 0],
  },
  {
    id: "chandeswori-raw",
    siteId: "chandeswori",
    optionLabel: "Full capture (uncleaned)",
    label: "Chandeswori Temple, Banepa — Full capture (uncleaned)",
    group: "Chandeswori Temple, Banepa",
    url: "/3d_models/chandeswori.ksplat",
    cameraUp: [0, -1, 0],
    initialCameraPosition: [0, 0, 13],
    initialCameraLookAt: [0, 0, 0],
  },
  {
    id: "panauti-clean",
    siteId: "panauti",
    optionLabel: "Curated capture",
    label: "Panauti Durbar Square — Curated capture",
    group: "Panauti Durbar Square",
    url: "/3d_models/panautiCleaned.ksplat",
    cameraUp: [0, -1, 0],
    initialCameraPosition: [0, 0, 3.68],
    initialCameraLookAt: [0, 0, 0],
  },
  {
    id: "panauti-raw",
    siteId: "panauti",
    optionLabel: "Full capture (uncleaned)",
    label: "Panauti Durbar Square — Full capture (uncleaned)",
    group: "Panauti Durbar Square",
    url: "/3d_models/panautiUncleaned.ksplat",
    cameraUp: [0, -1, 0],
    initialCameraPosition: [0, 0, 3.68],
    initialCameraLookAt: [0, 0, 0],
  },
];

export const DEFAULT_SPLAT_ID = "chandeswori-clean";

export function getSplatModel(id: string): SplatModel {
  return SPLAT_MODELS.find((m) => m.id === id) ?? SPLAT_MODELS[0]!;
}

export function getSiteForModel(modelId: string): SiteProfile {
  const model = getSplatModel(modelId);
  return SITE_PROFILES[model.siteId] ?? SITE_PROFILES.chandeswori!;
}

/** Compact location line for the selected monument (updates with dropdown). */
export function renderSiteBriefHtml(modelId: string): string {
  const site = getSiteForModel(modelId);

  return `
    <h2 class="site-brief__title">${site.name}</h2>
    <p class="site-brief__meta"><span class="site-brief__loc-label">Location</span> ${site.location}</p>
  `;
}
