export interface Chapter {
  id: string;
  rail: string;
  hud: string;
  title: string;
  kicker: string;
  html: string;
}

/** Technical commentary chapters — llm-viz style density, 3DGS focus only. */
export const CHAPTERS: Chapter[] = [
  {
    id: "intro",
    rail: "Intro",
    hud: "Overview",
    title: "How this walkthrough works",
    kicker: "HamroSampada · 3D Gaussian Splatting",
    html: `
      <p>
        <strong>HamroSampada</strong> reconstructs Nepali heritage monuments as
        photorealistic 3D captures using <em>3D Gaussian Splatting (3DGS)</em>
        (<a href="https://arxiv.org/abs/2308.04079" target="_blank" rel="noopener noreferrer">Kerbl et al., SIGGRAPH 2023 · arXiv:2308.04079</a>).
        It was developed under the
        <a href="https://moest.gov.np/" target="_blank" rel="noopener noreferrer">Ministry of Education, Science and Technology (MoEST)</a>
        to support the
        <a href="https://doa.gov.np" target="_blank" rel="noopener noreferrer">Department of Archaeology · पुरातत्त्व विभाग</a>
        — addressing the need for a proper public website, structured digital
        archiving, and clear documentation of temple architecture in today’s context.
        The monument brief above updates when you change the capture in the viewer.
      </p>
      <p>
        A public archive site is available at
        <a href="https://hamro-sampada.vercel.app/" target="_blank" rel="noopener noreferrer">hamro-sampada.vercel.app</a>
        — a reference the Department and related authorities can use when
        building a similar archive and monument-detail experience.
      </p>
      <p>
        Scroll for the pipeline guide. The right panel keeps both the schematic
        guide and the live Gaussian capture; scroll shifts which is in focus.
      </p>
      <ul class="doc-list">
        <li>3DGS paper: <a href="https://arxiv.org/abs/2308.04079" target="_blank" rel="noopener noreferrer">https://arxiv.org/abs/2308.04079</a></li>
        <li>Public archive site: <a href="https://hamro-sampada.vercel.app/" target="_blank" rel="noopener noreferrer">hamro-sampada.vercel.app</a></li>
        <li>Source: <a href="https://github.com/freaktopus/HamroSampada" target="_blank" rel="noopener noreferrer">github.com/freaktopus/HamroSampada</a></li>
        <li>Under: <a href="https://moest.gov.np/" target="_blank" rel="noopener noreferrer">Ministry of Education, Science and Technology (MoEST)</a></li>
        <li>Built to support: <a href="https://doa.gov.np" target="_blank" rel="noopener noreferrer">Department of Archaeology · पुरातत्त्व विभाग</a></li>
      </ul>
    `,
  },
  {
    id: "primitive",
    rail: "Gaussian",
    hud: "Primitive",
    title: "Anatomy of one 3D Gaussian",
    kicker: "Explicit scene primitive",
    html: `
      <p>
        Each Gaussian is an ellipsoid of light. Optimisation later nudges every
        parameter so that, when all Gaussians are projected and blended, the
        render matches the input photographs
        (<a href="https://arxiv.org/abs/2308.04079" target="_blank" rel="noopener noreferrer">Kerbl et al., 2023</a>).
      </p>
      <div class="formula-block" role="group" aria-label="Gaussian parameters">
        <div class="formula-row">
          <code class="formula-sym">μ = (x, y, z)</code>
          <span>Mean position in world space</span>
        </div>
        <div class="formula-row">
          <code class="formula-sym">Σ = R S Sᵀ Rᵀ</code>
          <span>Covariance from rotation <em>R</em> and anisotropic scale <em>S</em></span>
        </div>
        <div class="formula-row">
          <code class="formula-sym">α = σ(a)</code>
          <span>Opacity via sigmoid on a learnable logit <em>a</em></span>
        </div>
        <div class="formula-row">
          <code class="formula-sym">c(d) ← SH</code>
          <span>View-dependent colour from spherical harmonics</span>
        </div>
      </div>
      <p>
        Soft falloff (no hard triangle edges) is why fine timber carving and
        weathered brick read naturally when thousands of Gaussians overlap.
      </p>
    `,
  },
  {
    id: "capture",
    rail: "Capture",
    hud: "Capture",
    title: "Stage 1 — Photometric capture",
    kicker: "Input quality dominates",
    html: `
      <p>
        Capture is an orbit (or multi-height walk-around) with <strong>60–80% overlap</strong>
        between neighbouring frames. We typically keep 150–500+ sharp images after
        blur rejection (variance-of-Laplacian). Diffuse light and stable exposure
        matter more than exotic sensors.
      </p>
      <div class="table-wrap">
        <table class="tech-table">
          <thead><tr><th>Guideline</th><th>Target</th><th>Why</th></tr></thead>
          <tbody>
            <tr><td>Overlap</td><td>60–80%</td><td>Reliable feature matches for SfM</td></tr>
            <tr><td>Coverage</td><td>Multi-height orbit</td><td>Eaves, corners, occlusions</td></tr>
            <tr><td>Video → frames</td><td>1–3 fps + blur filter</td><td>Dense viewpoints without redundancy</td></tr>
            <tr><td>Hardware</td><td>CPU</td><td>No GPU required yet</td></tr>
          </tbody>
        </table>
      </div>
      <aside class="callout">Right: camera markers + photo planes appear around the monument.</aside>
    `,
  },
  {
    id: "sfm",
    rail: "SfM",
    hud: "SfM poses",
    title: "Stage 2 — Structure-from-Motion",
    kicker: "Camera poses + sparse cloud",
    html: `
      <p>
        SfM answers: <em>where was each photo taken?</em> and <em>what is the rough 3D shape?</em>
        3DGS requires both — poses for re-projection, sparse points as Gaussian seeds.
      </p>
      <ol class="steps">
        <li><strong>Feature extraction</strong> — SIFT / SuperPoint keypoints</li>
        <li><strong>Matching</strong> — exhaustive or sequential (video)</li>
        <li><strong>Incremental mapping</strong> — triangulate, grow model</li>
        <li><strong>Bundle adjustment</strong> — jointly refine poses, intrinsics, points</li>
        <li><strong>Undistort → PINHOLE</strong> — mandatory input for 3DGS trainers</li>
      </ol>
      <p>
        HamroSampada iterates <strong>COLMAP</strong> (open, reproducible) and
        <strong>Metashape</strong> (robust GUI). Mapper + BA are CPU-heavy; SIFT
        matching can use GPU.
      </p>
    `,
  },
  {
    id: "init",
    rail: "Init",
    hud: "Initialise",
    title: "Stage 3 — Seed the Gaussians",
    kicker: "Sparse points → ellipsoids",
    html: `
      <p>
        Every sparse SfM point becomes a Gaussian: colour from observing views,
        scale from local point spacing, modest initial opacity. Optional dense MVS
        can help thin structures, but classic 3DGS only needs the sparse init.
      </p>
      <p>
        At this stage the scene “exists” but looks blotchy — photometric training
        is what turns blotches into architecture.
      </p>
    `,
  },
  {
    id: "raster",
    rail: "Raster",
    hud: "Rasterize",
    title: "Differentiable splat rasterization",
    kicker: "Why it is real-time",
    html: `
      <p>
        Each 3D Gaussian projects to a 2D ellipse, is depth-sorted, and alpha-composited
        front-to-back
        (<a href="https://arxiv.org/abs/2308.04079" target="_blank" rel="noopener noreferrer">Eq. form in Kerbl et al.</a>):
      </p>
      <div class="formula" aria-label="Alpha compositing">
        <span class="formula-line">C = Σ<sub>i</sub> c<sub>i</sub> α′<sub>i</sub> · Π<sub>j&lt;i</sub> (1 − α′<sub>j</sub>)</span>
      </div>
      <p class="formula-note">
        <em>c<sub>i</sub></em> colour · <em>α′<sub>i</sub></em> projected opacity · product is transmittance of nearer splats
      </p>
      <p>
        Gradients flow from pixel error back to position, covariance, opacity, and SH.
        That is the learning signal — and why a trained scene still renders on a phone
        GPU via WebGL (<code>.splat</code> / <code>.ksplat</code>).
      </p>
    `,
  },
  {
    id: "train",
    rail: "Train",
    hud: "Optimise",
    title: "Stage 4 — Progressive training",
    kicker: "Adaptive density control",
    html: `
      <p>
        Loss is typically <code>L1 + λ · D-SSIM</code> with λ ≈ 0.2. Every few hundred
        iterations, densification clones/splits high-gradient Gaussians and prunes
        near-transparent ones; periodic opacity resets escape local minima.
      </p>
      <div class="table-wrap">
        <table class="tech-table">
          <thead><tr><th>Parameter</th><th>Default</th><th>Effect</th></tr></thead>
          <tbody>
            <tr><td><code>--iterations</code></td><td>30 000</td><td>7k preview · 30k full quality</td></tr>
            <tr><td><code>--sh_degree</code></td><td>3</td><td>0–1 for web size; 3 archival look</td></tr>
            <tr><td><code>--densify_grad_threshold</code></td><td>0.0002</td><td>Lower → more Gaussians</td></tr>
            <tr><td><code>--densify_from/until</code></td><td>500 / 15 000</td><td>Densify window</td></tr>
            <tr><td><code>--opacity_reset_interval</code></td><td>3 000</td><td>Cull transparent junk</td></tr>
          </tbody>
        </table>
      </div>
      <aside class="callout">Training needs an NVIDIA CUDA GPU — the pipeline bottleneck.</aside>
    `,
  },
  {
    id: "clean",
    rail: "Clean",
    hud: "Clean / export",
    title: "Stage 5 — Cleaning &amp; export",
    kicker: "Public asset vs archival master",
    html: `
      <p>
        Raw output contains floaters and background clutter. In SuperSplat we crop,
        delete outliers, re-centre, and optionally decimate for mobile bandwidth.
      </p>
      <dl class="spec">
        <div><dt>.ply</dt><dd>Archival / uncleaned master</dd></div>
        <div><dt>.splat</dt><dd>Compact binary for web viewers</dd></div>
        <div><dt>.ksplat</dt><dd>Compressed, progressive load</dd></div>
      </dl>
      <p>
        One cleaned asset feeds the public archive — capture once, present everywhere.
      </p>
    `,
  },
  {
    id: "temple",
    rail: "Capture",
    hud: "Live capture",
    title: "Live monument capture",
    kicker: "Production Gaussian asset",
    html: `
      <p>
        The viewer now emphasises the <strong>trained Gaussian splat</strong> for
        the monument selected above — the same class of asset served on the public
        archive. Use <strong>Monument capture</strong> to switch site and curated
        vs full (uncleaned) variants.
      </p>
      <p>
        Curated captures are cropped and cleaned for public viewing; full captures
        retain floaters and background for archival comparison.
      </p>
      <aside class="callout">
        Developed under
        <a href="https://moest.gov.np/" target="_blank" rel="noopener noreferrer">MoEST</a>
        to support the
        <a href="https://doa.gov.np" target="_blank" rel="noopener noreferrer">Department of Archaeology</a>
        with public web access, digital archiving, and detailed temple architecture records.
        Public archive site:
        <a href="https://hamro-sampada.vercel.app/" target="_blank" rel="noopener noreferrer">hamro-sampada.vercel.app</a>
      </aside>
    `,
  },
];
