# SwoVid — V1

A Chrome (Manifest V3) extension that detects AI-generated images on any webpage
and shows a small colour-coded badge on every image — **red = AI**, **green =
human/camera**, **grey = unknown**. Everything runs locally in the browser: no
server, no backend, no API keys.

## Detection layers

| Layer | Source | Status |
|------:|--------|--------|
| 1 | **C2PA Content Credentials** (`c2pa` WASM) — cryptographic proof | Implemented¹ |
| 2 | **EXIF / IPTC / XMP metadata** (`exifr`) — probabilistic fingerprints | Implemented |
| 3 | Stable Signature watermark | Stub — "Coming in V2" |
| 4 | Video Seal watermark | Stub — "Coming in V2" |
| 5 | SwoVid on-device model | Stub — "Coming in V3" |

¹ See **Known limitations** below.

## Monorepo layout

```
apps/extension        MV3 extension (Vite + CRXJS + Preact + Tailwind)
packages/detection    Provider-based detection engine (orchestrator + cache)
packages/ui           Shared Preact components + design tokens
```

## Requirements

- Node 18+ (developed on Node 26)
- pnpm 11+

## Build

```bash
pnpm install
pnpm build          # turbo build -> apps/extension/dist
```

`prebuild`/`predev` automatically:
- copy the C2PA WASM + worker into `apps/extension/public/wasm/`
  (`scripts/copy-wasm.mjs`).

The placeholder toolbar icons in `apps/extension/public/icons/` are generated
by `scripts/generate-icons.mjs`. **Replace them with real branded artwork before
publishing.**

## Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right)
3. **Load unpacked** → select `apps/extension/dist`
4. On first install an onboarding tab opens automatically.

## Dev mode

```bash
cd apps/extension && pnpm dev
```

Hot reload works for the popup / settings / onboarding pages. Content scripts and
the service worker require a rebuild + extension reload.

## Known limitations (V1)

These are intentionally deferred, not bugs to file:

1. **C2PA does not run inside the service worker.** Detection currently runs in
   the MV3 service worker, which cannot spawn the Web Worker / WASM that the C2PA
   SDK needs. As a result the Layer-1 cryptographic verdict falls back to "no
   credential." The fix is to run detection in an **offscreen document**; the
   `DetectionProvider` interface is unchanged by that move.
2. **Popup page-summary is inert.** Nothing writes per-page summaries yet, and the
   summary lookup keys off `sender.tab?.id` (undefined for popup messages), so the
   popup shows "No images scanned yet." Requires wiring `savePageSummary` from the
   content script and passing the tab id through.

## Manual test checklist

**Detection**
- [ ] Unsplash photo → "Human" or "Unknown"
- [ ] Adobe Firefly image → "Verified AI" (once C2PA runs — see limitation 1)
- [ ] Midjourney image with intact EXIF → "Likely/Possibly AI" (software tag)
- [ ] Metadata-stripped image → "Unknown"
- [ ] Right-click an image → "Check with SwoVid" context menu

**Badge behaviour**
- [ ] Images below `minImageSize` (default 100px) get no badge
- [ ] Same image repeated → scanned once (hash cache)
- [ ] Infinite scroll (X, Instagram) → new images get badged
- [ ] Click a badge → detail panel opens; click outside → closes
- [ ] `<img>` element itself is never modified (badge lives in a sibling wrapper)

**Settings**
- [ ] Scan mode → On Demand disables auto-badging
- [ ] Badge position / style changes apply after Save
- [ ] Settings persist across browser restarts

**Onboarding**
- [ ] Opens on first install; 3 steps navigable; Finish closes tab
- [ ] Does not reopen on later restarts
```
