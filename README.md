## Devvit Vibe Coding Template

> Experimental! Template may change!

A starter to build web applications on Reddit's developer platform

- [Devvit](https://developers.reddit.com/): A way to build and deploy immersive games on Reddit
- [Vite](https://vite.dev/): For compiling the webView
- [React](https://react.dev/): For UI
- [Hono](https://hono.dev/): For backend logic
- [TRPC](https://trpc.io/): Type safe RPCs from server to client
- [Tailwind](https://tailwindcss.com/): For styles
- [TypeScript](https://www.typescriptlang.org/): For type safety

## Getting Started

> Make sure you have Node 22 downloaded on your machine before running!

1. Run `npm create devvit@latest --template=vibe-coding`
2. Go through the installation wizard. You will need to create a Reddit account and connect it to Reddit developers
3. Copy the command on the success page into your terminal

## Commands

- `npm run dev`: Starts a development server where you can develop your application live on Reddit.
- `npm run build`: Builds your client and server projects
- `npm run deploy`: Uploads a new version of your app
- `npm run launch`: Publishes your app for review
- `npm run login`: Logs your CLI into Reddit
- `npm run type-check`: Type checks, lints, and prettifies your app

## Map data

- Mountain locations: [Natural Earth 1:10m elevation points](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_geography_regions_elevation_points.geojson), public domain. The bundled points are filtered to named mountains and ordered by Natural Earth's scale rank and elevation.
- Forest locations: [RESOLVE Ecoregions 2017](https://ecoregions.appspot.com/), Dinerstein et al., [An Ecoregion-Based Approach to Protecting Half the Terrestrial Realm](https://doi.org/10.1093/biosci/bix014), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The bundled locations are representative points of ecoregions in the six forest biomes, not exact tree-cover observations. Points are ranked by approximate ecoregion area; forest biomes include dry forests.
- River names: [Natural Earth 1:10m rivers and lake centerlines](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_rivers_lake_centerlines.geojson), public domain. Named river label locations are sampled along the source lines.

The datasets are reduced to local point data; the map makes no runtime requests for them. Below zoom 5, markers are spaced according to the viewport and appear progressively as you zoom in. At zoom 5 and above, all onscreen landmark records are shown.

The **Names** filter controls country names and, above zoom 5, river and landmark names. River and landmark names follow their respective layer filters. Country and river labels are spaced to limit overlap.

## Location challenge

The splash uses Plop UI components and fonts; Leaflet's native map controls use matching Plop UI colors and sticker styling.

The location challenge shows a random land snippet covering a zoom-5 map area, excluding Antarctica, all-ocean snippets, and snippets crossing the date line. The enlarged snippet shows icon clues for the approximate whole-number percentage covered by ocean, intersecting countries, mountain and forest landmark centers, and intersecting river features. Lakes count as land, and river features can be sections rather than distinct named rivers. Hints include features even if their map layers are hidden. Its zoom-6 image is stitched off-screen for each combination of country colors, rivers, and landmarks; changing a filter switches the image. The cover starts with a small opening around the X. Drag across the striped red cover to scratch it away. Click the snippet to enlarge it, choose an eraser size using the circles, or select **Reveal map** to uncover it entirely. Then click the world map and submit your guess to reveal the location and distance. The red outline keeps the snippet's geographic footprint as you zoom. Choose **New snippet** in the enlarged view for another round.

The base score is 5,000 within 30 km of the target; beyond that it decays as `round(5000 × e^(-(distance in km - 30) / 2000))`. The striped bar above the enlarged snippet shows the remaining cover relative to the initially covered area; the opening around the X does not reduce the initial multiplier. The multiplier is `1 + remaining fraction`, rounded to two decimal places. It falls from 2x when untouched to 1x when fully revealed. Submitting locks in the displayed multiplier and multiplies the base score, for a final score of up to 10,000.

## MCP Integration

If you'd like to use the Devvit MCP server, please visit: https://developers.reddit.com/docs/next/guides/ai
