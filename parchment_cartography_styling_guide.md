# Styling Guide: Hand-Drawn Parchment World Map (`Scratchmaps`)

## 1. Visual Direction & Mood
Design the map view to resemble an **illustrated, hand-drawn parchment adventure map** while keeping geographic boundaries, coastlines, and rivers legible for gameplay deduction.
- **Aesthetic:** Warm aged vellum, sepia/charcoal ink linework, subtle paper texture, shoreline wave/hatch accents, and muted earthy fills.
- **Avoid:** Harsh pure black (`#000000`), neon/high-saturation colors, overly crisp modern UI drop shadows on geographic features, or unapproved external runtime network calls inside Reddit Devvit.

---

## 2. Color Palette

### Core Surfaces & Ink
- **Parchment Base (Land / Vellum):** `#e8d5a8`
- **Aged Parchment Shadow / Edge:** `#c9a86a`
- **Deep Ocean / Water Tint:** `#d8c391` (warm antique sea) or `#b9cde0` (soft nautical blue-slate if distinguishing water from vellum)
- **Primary Ink (Borders, Coastlines, Icons):** `#2c1c0e`
- **Secondary Ink (Faint Graticules, Subtle Hatching, Secondary Rivers):** `#5a3d22`
- **Major Rivers Ink:** `#1f4e6e` or `#26180c` (deep ink/slate so rivers remain distinct from country borders)

### Muted Nation Fill Palette (Graph-Colored / Non-Adjacent)
Use low-saturation, earthy tones at ~`0.45`–`0.70` opacity so the underlying parchment texture remains visible and neighboring countries never share the same fill color:
1. Warm Sand: `#dfc28b`
2. Sage Moss: `#b7be96`
3. Dusty Terracotta: `#cf9678`
4. Pale Ochre: `#e3cf99`
5. Muted Slate: `#b4bec2`
6. Soft Olive: `#c5c38e`

---

## 3. Layer Hierarchy & Rendering Rules

Render layers in strict bottom-to-top order on an HTML5 `<canvas>` (scaled by `window.devicePixelRatio`) or MapLibre/D3 layer stack:

1. **Background & Parchment Grain:**
   - Fill canvas with warm vellum (`#e8d5a8`) and apply a subtle tileable paper grain / radial edge vignette (`rgba(44, 28, 14, 0.18)` around viewport edges).
2. **Water & Shoreline Accents:**
   - Render ocean/lake polygons with subtle shoreline ripple/hatch lines extending slightly outward along coastlines.
   - Optionally draw decorative wave curls (`~`) in open ocean areas at low density.
3. **Muted Nation Fills:**
   - Apply precomputed graph-coloring indices (`colorIndex`) to country polygons so touching nations have distinct muted fills.
   - Keep target/mystery country styling controlled by game state (e.g., hidden in scratch frame, highlighted with an ink outline or warm glow on guess/reveal).
4. **Administrative Borders:**
   - Stroke country borders in `#2c1c0e` with rounded joins/caps (`lineJoin = 'round'`, `lineCap = 'round'`).
   - Neighboring/context borders can use slightly lower stroke weight or opacity (`0.65`–`0.85`) when acting as hints.
5. **Rivers & Waterways:**
   - Render `1:10m` river vectors (avoiding `1:110m`'s 13-river limitation) with smooth, slightly organic stroke widths (`0.75px`–`2.0px` scaled by zoom/importance) and `lineCap = 'round'`.
6. **Illustrated Clue Icons & Ornaments:**
   - Place diegetic map icons (mountain peaks, volcanoes, pine/palm/canopy clusters, compass rose, sailing ship, sea motifs) anchored to geographic features or corners.
   - Ensure icons match the ink stroke weight and `#2c1c0e` color of the map.
7. **Viewport Vignette & Frame:**
   - Add a soft inner vignette or scroll border around the map view to tie the scene together.

---

## 4. Coloring Nations Without Adjacent Collisions

To color countries differently without adjacent countries blending together:
1. **Precompute Adjacency at Build Time:**
   - Using your country GeoJSON/TopoJSON dataset, detect shared border vertices/edges or bounding overlap between country polygons to build an adjacency graph.
2. **Assign Palette Indices:**
   - Run a greedy graph-coloring pass (ordering higher-degree / more-bordered countries first) using the 6 muted palette colors above.
   - Store `colorIndex` (e.g., `0`–`5`) directly in each country feature's properties in your bundled JSON.
3. **Handle Islands & Enclaves:**
   - Enclaves or tiny islands can fall back to a deterministic hash if needed, while contiguous mainland borders prioritize distinct neighbor colors.

---

## 5. Icon Sourcing & Asset Guidelines for the Agent

- **Sources:**
  - `game-icons.net` (clean SVG/PNG game icons—recolor to `#2c1c0e` or `#1f4e6e`).
  - Curated SVG/PNG sprite sheets (e.g., compass rose, mountain clusters, trees, ships, waves, markers).
- **Bundling for Reddit Devvit:**
  - Store all icon SVGs/PNGs and map data locally inside `webroot/` so no unapproved external network requests happen at runtime.
  - Pack small icons into a single sprite atlas or load cached `HTMLImageElement` / `Path2D` objects once on initialization.
- **Clutter Control:**
  - Limit clue icons per viewport/zoom level and tie optional/extra clue layers to progressive hints or difficulty settings so the map stays readable.

---

## 6. Coding Agent Deliverables Checklist
- [ ] Apply the parchment, ink, and muted nation color tokens.
- [ ] Implement build-time or load-time graph coloring (`colorIndex`) for country polygons.
- [ ] Render coastlines/shoreline accents, country borders, and high-detail rivers cleanly on `<canvas>` (with `devicePixelRatio` scaling).
- [ ] Support toggling clue layers (rivers, borders, terrain/icons) for gameplay hints.
- [ ] Keep all assets bundled locally under `webroot/` with smooth pan/zoom support for desktop and mobile Reddit clients.