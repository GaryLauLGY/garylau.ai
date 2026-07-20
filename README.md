# GaryLau CRT motion hero

A full-screen React + TypeScript + Vite + Tailwind motion page. The isolated CRT-headed figure is controlled by horizontal mouse movement: move right to scrub the turn forward and move left to scrub it backward.

To view it without starting a server, double-click `index.html`. File mode automatically opens the generated `mainframe-standalone.html` build.

```bash
npm install
npm run dev
```

Create the production build with `npm run build`. The output is written to `dist/`, and a double-clickable `mainframe-standalone.html` is generated at the project root.

## Main assets

- `public/assets/mainframe-robot-motion.webm` — 928×976, 24fps, VP9 video with alpha for Chromium
- `public/assets/mainframe-robot-motion.mp4` — 928×976, 24fps, H.264 fallback composited on the page background
- `public/assets/mainframe-robot-poster.png` — transparent loading poster
- `tools/source-assets/garylau-turn-motion-source.mp4` — original Grok-generated green-screen source

The shipped page has no video-processing runtime dependency. The chroma-key conversion is already baked into the WebM and fallback MP4 assets.
