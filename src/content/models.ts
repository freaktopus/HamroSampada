export type SplatFormat = "splat" | "ply" | "ksplat";

export type CaptureKind = "curated" | "full";

export interface SiteProfile {
  id: string;
  name: string;
  localName: string;
  category: string;
  province: string;
  district: string;
  municipality: string;
  address: string;
  latitude: number;
  longitude: number;
  summary: string;
  facts: { label: string; value: string }[];
  needToKnow: string[];
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
  capture: CaptureKind;
  url: string;
  format: SplatFormat;
  cameraUp?: [number, number, number];
  initialCameraPosition?: [number, number, number];
  initialCameraLookAt?: [number, number, number];
  note?: string;
}

export const SITE_PROFILES: Record<string, SiteProfile> = {
  chandeswori: {
    id: "chandeswori",
    name: "Chandeswori Temple",
    localName: "चण्डेश्वरी मन्दिर, बनेपा",
    category: "Hindu temple · three-tier Newar pagoda",
    province: "Bagmati Province",
    district: "Kavrepalanchok",
    municipality: "Banepa Municipality",
    address: "Chandeswori, Banepa, Kavrepalanchok 45210",
    latitude: 27.6286,
    longitude: 85.521,
    summary:
      "A living three-storey pagoda on the eastern edge of Banepa, dedicated to the goddess Chandeswori — tutelary deity of the town — and HamroSampada’s reference 3D Gaussian Splatting capture.",
    facts: [
      { label: "Location", value: "Banepa, Kavrepalanchok, Bagmati Province" },
      { label: "Coordinates", value: "27.6286° N, 85.5210° E (approx.)" },
      { label: "Period", value: "Medieval shrine; repaired across generations" },
      { label: "Condition", value: "Active temple and pilgrimage site" },
      { label: "UNESCO", value: "Not inscribed" },
    ],
    needToKnow: [
      "Chandeswori (a form of the Mother Goddess) is Banepa’s principal deity; the annual Chandeswori Jatra centres on this precinct.",
      "The western exterior wall carries a large Bhairava fresco — among the most prominent wall paintings in the valley.",
      "The precinct includes votive shrines, pati/sattal rest-houses and water spouts typical of a Newar settlement.",
      "Banepa was a medieval trading town on the route toward Tibet; this shrine anchors its ritual calendar.",
    ],
  },
  panauti: {
    id: "panauti",
    name: "Panauti Durbar Square",
    localName: "पनौती दरबार क्षेत्र",
    category: "Medieval Newar town square",
    province: "Bagmati Province",
    district: "Kavrepalanchok",
    municipality: "Panauti Municipality",
    address: "Panauti Durbar Square, Kavrepalanchok 45209",
    latitude: 27.5847,
    longitude: 85.5147,
    summary:
      "The compact Durbar Square of Panauti — one of the best-preserved medieval Newar townscapes in the valley — centred on the Indreshwar Mahadev pagoda at the Roshi–Punyamati confluence.",
    facts: [
      { label: "Location", value: "Panauti, Kavrepalanchok, Bagmati Province" },
      { label: "Coordinates", value: "27.5847° N, 85.5147° E (approx.)" },
      { label: "Period", value: "Malla-era square; Indreshwar core attributed to 1294" },
      { label: "Condition", value: "Well preserved; restored after the 2015 earthquake" },
      { label: "UNESCO", value: "On Nepal’s Tentative List (medieval townscape)" },
    ],
    needToKnow: [
      "Indreshwar Mahadev’s core is traditionally dated to 1294 — among the oldest surviving temple structures in the valley.",
      "The square sits at the sacred confluence of the Roshi and Punyamati rivers, with riverside ghats.",
      "Panauti hosts the Makar Mela pilgrimage at the confluence once every twelve years.",
      "The ensemble includes Indreshwar Mahadev, Unmatta Bhairava, Brahmayani shrine, and fine carved wooden struts (tunala).",
    ],
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
    capture: "curated",
    url: "/3d_models/chandesworiClean.splat",
    format: "splat",
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
    capture: "full",
    url: "/3d_models/chandeswori.splat",
    format: "splat",
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
    capture: "curated",
    url: "/3d_models/panautiCleaned.splat",
    format: "splat",
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
    capture: "full",
    url: "/3d_models/panautiUncleaned.ksplat",
    format: "ksplat",
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
  const location =
    site.facts.find((f) => f.label === "Location")?.value ?? site.address;

  return `
    <h2 class="site-brief__title">${site.name}</h2>
    <p class="site-brief__meta"><span class="site-brief__loc-label">Location</span> ${location}</p>
  `;
}
