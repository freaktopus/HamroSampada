export interface Chapter {
  id: string;
  rail: string;
  hud: string;
  title: string;
  kicker: string;
  html: string;
}

export const CHAPTERS: Chapter[] = [
  {
    id: "intro",
    rail: "Intro",
    hud: "Overview",
    title: "Walkthrough on 3D Gaussian Splatting Reconstruction",
    kicker: "",
    html: `
      <p>
        <strong>HamroSampada</strong> reconstructs Nepali heritage monuments from photorealistic 3D captures using <em>3D Gaussian Splatting (3DGS)</em>
        (<a href="https://arxiv.org/abs/2308.04079" target="_blank" rel="noopener noreferrer">Kerbl et al., SIGGRAPH 2023 · arXiv:2308.04079</a>).
        It was developed under the
        <a href="https://moest.gov.np/" target="_blank" rel="noopener noreferrer">Ministry of Education, Science and Technology (MoEST)</a>
        to support the
        <a href="https://doa.gov.np" target="_blank" rel="noopener noreferrer">Department of Archaeology · पुरातत्त्व विभाग</a>
        - addressing the need for a proper public website, structured digital
        archiving, and clear documentation of temple architecture in today’s context.
          <p>
        The monument name and location gets updated above as you change the capture in the viewer.
          </p>
      </p>
      <p>
        A public archive site that we imagined should be look like is available at
        <a href="https://hamro-sampada.vercel.app/" target="_blank" rel="noopener noreferrer">hamro-sampada.vercel.app</a>
        - built with help of LLM, and it could be a reference the Department and related authorities can use when
        building a similar archive and monument-detail experience.
      </p>
        <p>
  <strong style="display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
    How this walkthrough works?
    <a
      href="https://github.com/freaktopus/HamroSampada"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="GitHub"
      title="GitHub"
      style="display: inline-flex; align-items: center; color: #000; text-decoration: none;"
      onmouseover="this.style.color='#d18e2f'"
      onmouseout="this.style.color='#000'"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 2C6.477 2 2 6.584 2 12.253c0 4.526 2.865 8.363 6.839 9.722.5.094.682-.222.682-.482 0-.237-.009-.866-.014-1.7-2.782.619-3.369-1.37-3.369-1.37-.455-1.18-1.11-1.495-1.11-1.495-.908-.635.069-.622.069-.622 1.004.072 1.532 1.057 1.532 1.057.892 1.566 2.341 1.114 2.91.852.091-.662.35-1.114.636-1.37-2.22-.258-4.555-1.14-4.555-5.074 0-1.12.39-2.037 1.029-2.756-.103-.259-.446-1.3.098-2.71 0 0 .84-.275 2.75 1.052A9.35 9.35 0 0 1 12 7.14a9.35 9.35 0 0 1 2.504.345c1.909-1.327 2.748-1.052 2.748-1.052.546 1.41.203 2.451.1 2.71.64.719 1.028 1.636 1.028 2.756 0 3.944-2.339 4.813-4.566 5.066.359.317.679.943.679 1.901 0 1.371-.012 2.477-.012 2.814 0 .263.18.58.688.481A10.02 10.02 0 0 0 22 12.253C22 6.584 17.523 2 12 2Z"
        />
      </svg>
    </a>
  </strong>
</p>
      <p>
        As you scroll, left panel (this) shows the detailed pipeline, whereas the right panel shows both the schematic
        guide and the live Gaussian capture. Both panel sync with the content. You can also play along side.
      </p>
    `,
  },
  {
    id: "primitive",
    rail: "Gaussian",
    hud: "Primitive",
    title: "Anatomy of one 3D Gaussian",
    kicker: "",
    html: `
      <p>
        <strong>Fundamental Primitive: </strong>Each Gaussian is basic, fundamental geometric shape that is a soft volumetric scence whose parameter describe its spatial extent and appearance. Mathematically, it is a function that describes spatial distribution around a center.
      </p>
        <p>
        Thousands of Gaussian (blobs) are there together to represent the scence (temple). During the process/optimization, gaussian parameters are adjusted. The rendered images are checked to match the input photographs, and try to reduce the error. They do cloning, splitting, pruning, and densify the gaussians to make the later 3D model look like input photographs.
        </p>
      <div class="formula-block" role="group" aria-label="Gaussian parameters">
        <div class="formula-row">
          <code class="formula-sym">μ = (x, y, z)</code>
          <span>Mean position in world space. Location of Gaussian. Think it as a center of Gaussian</span>
        </div>
        <div class="formula-row">
          <code class="formula-sym">Σ = R S Sᵀ Rᵀ</code>
          <span>Covariance from rotation <em>R</em> and anisotropic scale <em>S</em>. S is size of gaussian along local X,Y and Z. S is how big/stretched and R is direction. Covariance describes how gaussian's spatial distribution spreads through 3D spaces. (not ML convariance)</span>
        </div>
        <div class="formula-row">
          <code class="formula-sym">α = σ(a)</code>
          <span>Opacity via sigmoid on a learnable logit <em>a</em>. Value of <em>a</em> is passed through sigmoid to get value between 0 to 1 for opacity. It controls how much a gaussian contributes to the rendered image.  </span>
        </div>
        <div class="formula-row">
          <code class="formula-sym">c(d) ← SH</code>
          <span>View-dependent colour from spherical harmonics. Learned spherical-harmonic coefficients, that represents the gaussian's view-dependent color, fucntion of viewing direction d. Since, gaussian can appear slightly different when view from different direction.</span>
        </div>
      </div>
<p>
  Overlapping Gaussians can contribute smoothly to the same pixels,
  helping produce a continuous-looking scene because each Gaussian's
  contribution gradually decreases with distance from its center.
</p>
    `,
  },
  {
    id: "capture",
    rail: "Capture",
    hud: "Capture",
    title: "Stage 1 : Photometric capture",
    kicker: "",
    html: `
      <p>
        With <strong>60–80%</strong>
 overlap of image for a particular scene, it could be useful for robust reconstruction. Better to capture the scene from continuous orbit or multi-height walk-around while also keeping substantial overlap between neighbouring images. We typically keep 150–500+ sharp images after
        blur rejection (variance-of-Laplacian, not a part of 3DGS, external work). The number of images to send for training depends upon the site's size and complexity. Diffuse light and stable exposure
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
      <aside class="callout">Right Panel: Pyramid Shapes (Brown Color) are Cameras | Pyramid Intersecting Planes are Photo Planes </aside>
    `,
  },
  {
    id: "sfm",
    rail: "SfM",
    hud: "SfM poses",
    title: "Stage 2 : Structure-from-Motion",
    kicker: "",
    html: `
      <p>
        SfM answers: <em>where was each photo taken?</em> and <em>what is the rough 3D shape?</em> SFM is use to estimate the location of the camera & its pose in 3D space when the photo was taken, and along with that, it estimate the feature points of the scene (i.e monuments common points seen in multiple image frame). It creates 3D sparse point clouds. SfM uses multi-view geometry, particularly epipolar geometry and the essential/fundamental matrix, to estimate relative camera poses; triangulation reconstructs 3D points, and bundle adjustment jointly refines the cameras and points.
        The resulting camera poses provide the viewpoints needed to project Gaussians back into the training images, while the sparse SfM points provide initial locations for the Gaussian primitives in the original 3DGS initialization.
      </p>
      <ol class="steps">
        <li><strong>Feature extraction</strong> : SIFT (Scale-Invariant Feature Transdorm) - Used to create numerical descriptor for each common points (feature)/ SuperPoint keypoints are what COLMAP uses together for feature extraction. Here, Common points of the scene in multiple image frame are marked.</li>
        <li><strong>Matching</strong> : exhaustive(random frame checker) or sequential (frame 1-2, 2-3 , ... e.g. in video) are method for finding matched feature point (common points).</li>
        <li><strong>Incremental mapping</strong> : Does triangulation for 3D points and grow model (sparse reconstruction)</li>
        <li><strong>Bundle adjustment</strong> : Jointly refine poses, intrinsics, camera parameters, and points position by minimizing the reprojection error.</li>
        <li><strong>Undistort & PINHOLE (Optional)</strong> : Fixing the image when bending/wrapping occurs (undistort) & a mathematical model can be assing when training for 3DGS to describe the camera meaning how a 3D points becomes a 2D pixel given that camera (PINHOLE) </li>
      </ol>
      <p>
        HamroSampada iterates <strong>COLMAP</strong> and
        <strong>Metashape</strong> (robust GUI). Mapper + BA are CPU-heavy, whereas SIFT
        matching can use GPU.
      </p>
    `,
  },
  {
    id: "init",
    rail: "Init",
    hud: "Initialise",
    title: "Stage 3 : Seed the Gaussians",
    kicker: "",
    html: `
      <p>
        After SFM, every sparse SfM point becomes a Gaussian. Gaussians position comes from the SfM point, while appearance, size, shape, and opacity are initialized from the available image and point-cloud information. These parameters are then optimized during training. Optional dense Multi-View Stereo (MVS)
        can help create many more 3D points, particularly in areas where sparse reconstruction has few points, but classic 3DGS only needs the sparse init (MVS not required as 3DGS learns/densifies the Gaussian representation itself). MVS is done after SFM to increase the sparse points. 
      </p>
      <p>
        At this stage the scene “exists” but with low-fidelity. For that, photometric training is what it turns that low-fidelity scene into detailed architecture.
      </p>
    `,
  },
  {
    id: "raster",
    rail: "Raster",
    hud: "Rasterize",
    title: "Differentiable splat (gaussian) rasterization",
    kicker: "",
    html: `
      <p>
        Each 3D Gaussian projects into a 2D elliptical footprint on the image plane. The visible Gaussians are processed in depth order (wheater to keep far or near) and combined using front-to-back alpha compositing to blend their colors and opacities.
      </p>
      <div class="formula" aria-label="Alpha compositing">
        <span class="formula-line">C = Σ<sub>i</sub> c<sub>i</sub> α′<sub>i</sub> · Π<sub>j&lt;i</sub> (1 − α′<sub>j</sub>)</span>
      </div>
      <p class="formula-note">
        <em>c<sub>i</sub></em> colour · <em>α′<sub>i</sub></em> projected opacity · product: remaining visibility after nearer Gaussians (transmittance)</p>
      <p>
The final pixel color is the sum of contributions from the Gaussians in front-to-back order, where each Gaussian's contribution is reduced by how much nearer Gaussians have already covered the pixel.
During training, image reconstruction error produces gradients that update Gaussian parameters such as position, covariance, opacity, and spherical-harmonic appearance.

      <p>
        Once trained, the resulting Gaussian scene can be rendered interactively on supported devices, including phones, using GPU-based renderers such as WebGL. Formats such as <code>.splat</code> and <code>.ksplat</code> can be used to store the trained Gaussian data for viewing.
      </p>

      </p>

    `,
  },
  {
    id: "train",
    rail: "Train",
    hud: "Optimise",
    title: "Stage 4 : Progressive training",
    kicker: "",
    html: `
      <p>
        The Loss during training is typically <code>L1(absolute difference between pred and target) + λ · D-SSIM</code> with λ (loss weighting factor) ≈ 0.2. At regular intervals during training, the renderer evaluates which Gaussians need refinement and adjusts the scene density. After gaussian initialization, adaptive density control is used to dynamically clones, splits, and prunes Gaussians based on gradient and opacity signals to add detail where needed and remove unnecessary Gaussians.      </p>
      <div class="table-wrap">
        <table class="tech-table">
          <thead><tr><th>Parameter</th><th>Default</th><th>Effect</th></tr></thead>
          <tbody>
            <tr><td><code>--iterations</code></td><td>30 000</td><td> Ours is 7k for preview · 30k for full quality</td></tr>
            <tr><td><code>--sh_degree</code></td><td>3</td><td>0–1 for web size; It controls view-dependent effects</td></tr>
            <tr><td><code>--densify_grad_threshold</code></td><td>0.0002</td><td>Lower → more Gaussians</td></tr>
            <tr><td><code>--densify_from/until</code></td><td>500 / 15 000</td><td>Densify window. Says when ADC is allowed to add/split Gaussians during training. </td></tr>
            <tr><td><code>--opacity_reset_interval</code></td><td>3 000</td><td>Cull transparent junk, Says how often Gaussian opacity is reset during training so optimization can continue refining the representation.</td></tr>
          </tbody>
        </table>
      </div>
      <aside class="callout">Training needs GPU (generally NVIDIA CUDA)</aside>
    `,
  },

  {
    id: "clean",
    rail: "Clean",
    hud: "Clean / export",
    title: "Stage 5 : Cleaning & Export",
    kicker: "",
    html: `
      <p>
        Once the training is over, we get the raw output containing floaters and background clutter. 
      </p>
      <p>
          Using SuperSplat as a tool for gaussian splat scenes (output from the training), we crop,
        delete outliers, re-centre, and optionally decimate (reducing the number of gaussians while trying to preserve visual quality) for mobile bandwidth.
      </p>
      <dl class="spec">
        <div><dt>.splat</dt><dd>Compact binary for web viewers</dd></div>
        <div><dt>.ksplat</dt><dd>Compressed, progressive load</dd></div>
      </dl>
    `,
  },

  {
    id: "temple",
    rail: "Capture",
    hud: "Live capture",
    title: "Live 3D Model Rendering",
    kicker: "",
    html: `
      <p>
        The viewer on the right emphasises the <strong>trained Gaussian splat</strong> for
        the monument selected. Use <strong>Monument capture</strong> to switch site, which includes curated
        vs full (uncleaned) variants of a monument.
      </p>
      <p>
        Curated captures are cropped and cleaned, whereas full captures
        have floaters and background as a noise.
      </p>
      <aside class="callout">
        Developed under
        <a href="https://moest.gov.np/" target="_blank" rel="noopener noreferrer">MoEST</a>
        to support the
        <a href="https://doa.gov.np" target="_blank" rel="noopener noreferrer">Department of Archaeology</a>
        with public web access, digital archiving, and detailed temple architecture records.
        Public Archive Protoype:
        <a href="https://hamro-sampada.vercel.app/" target="_blank" rel="noopener noreferrer">hamro-sampada.vercel.app</a>
      </aside>
    `,
  },
];
