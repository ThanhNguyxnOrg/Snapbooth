# Snapbooth

[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=000)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=fff)](https://vite.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=fff)](https://www.typescriptlang.org/)
[![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-live-222?logo=github)](https://thanhnguyxnorg.github.io/Snapbooth/)

Privacy-first browser photo booth with a clean studio UI, curated presets, and static Pages deployment.

Live site: [https://thanhnguyxnorg.github.io/Snapbooth/](https://thanhnguyxnorg.github.io/Snapbooth/)

> Browser-only. Count-in shutter. Filters, frames, GIFs, QR share.

## Sticker Wall

[![Browser only](https://img.shields.io/badge/Browser--only-yes-111111)](https://thanhnguyxnorg.github.io/Snapbooth/)
[![No backend](https://img.shields.io/badge/No_backend-required-222222)](https://github.com/ThanhNguyxnOrg/Snapbooth)
[![Count-in](https://img.shields.io/badge/Count--in-on-ffd166)](https://github.com/ThanhNguyxnOrg/Snapbooth)
[![Webcam](https://img.shields.io/badge/Webcam-ready-4cc9f0)](https://github.com/ThanhNguyxnOrg/Snapbooth)
[![Upload fallback](https://img.shields.io/badge/Upload_fallback-on-8ecae6)](https://github.com/ThanhNguyxnOrg/Snapbooth)
[![GIF export](https://img.shields.io/badge/GIF-export-ff6b6b)](https://github.com/ThanhNguyxnOrg/Snapbooth)
[![Boomerang](https://img.shields.io/badge/Boomerang-on-f72585)](https://github.com/ThanhNguyxnOrg/Snapbooth)
[![QR share](https://img.shields.io/badge/QR_share-ready-8338ec)](https://github.com/ThanhNguyxnOrg/Snapbooth)
[![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-live-222)](https://thanhnguyxnorg.github.io/Snapbooth/)
[![Smoke tested](https://img.shields.io/badge/Smoke_test-pass-2a9d8f)](https://github.com/ThanhNguyxnOrg/Snapbooth/actions)

## What It Is

Snapbooth is a single-page React app that turns the browser into a photobooth workflow:

- intro screen before the studio
- webcam capture and upload fallback
- count-in shutter delay for manual and auto capture
- live filter preview
- layout, frame, caption, and text-scale presets
- PNG, GIF, boomerang GIF, and QR export
- front/rear camera switching
- demo roll for camera-less preview

The app stays browser-only unless you use the temporary QR share flow.

## Capture Flow

| Step | What happens |
| --- | --- |
| 1 | Enter the intro screen and start a roll |
| 2 | Pick layout, frame, filter, and caption preset |
| 3 | Set the count-in delay |
| 4 | Capture manually or run an auto roll |
| 5 | Develop, export, and share from the browser |

## Preset Snapshot

| Area | Count | Notes |
| --- | ---: | --- |
| Layouts | 5 | single, pair, strip, quad, contact |
| Frames | 19 | from Classic to Polaroid, Zine, and Archive |
| Filters | 24 | daylight, mono, film, mood, and lab groups |
| Captions | 24 | editorial, analog, playful, and minimal groups |

See the full catalog in [PRESET_CATALOG.md](./PRESET_CATALOG.md).

## Quick Start

```bash
npm install
npm run dev
```

For the Pages build:

```bash
npm run build
```

The production output is written to `docs/`, and GitHub Pages is configured from `main` + `docs/`.

For a local smoke pass against the preview build:

```bash
npm run test:e2e
```

## What Changed

- Rebuilt the old multi-page HTML app into one React/Vite experience
- Added the intro/landing screen before the studio
- Added caption presets, more frames, more filters, and live camera filter preview
- Added front/rear switching, count-in capture, demo roll generation, and boomerang GIF export
- Kept the core booth flow: layout, frame, filter, capture, develop, share
- Added Dependabot automation for patch/minor updates
- Published the app from GitHub Pages

## Repo Map

| File | Role |
| --- | --- |
| `src/App.tsx` | App flow, presets, capture, export |
| `src/styles.css` | Visual system and responsive layout |
| `docs/` | Generated Pages output |
| `PRESET_CATALOG.md` | Caption, frame, and filter reference |
| `CONTRIBUTING.md` | Branch, build, and review workflow |

## Research Sources

Ideas were selected from real photobooth projects instead of being invented blindly:

- [photobooth-app/photobooth-app](https://github.com/photobooth-app/photobooth-app)
- [PhotoboothProject/photobooth](https://github.com/PhotoboothProject/photobooth)
- [AungMyoKyaw/photo-booth](https://sveltethemes.dev/AungMyoKyaw/photo-booth)
- [dwolters/photobooth](https://github.com/dwolters/photobooth)
- [reuterbal/photobooth](https://github.com/reuterbal/photobooth)

## Deploy

- Default branch: `main`
- Pages source: `main` + `docs/`
- Live URL: [thanhnguyxnorg.github.io/Snapbooth](https://thanhnguyxnorg.github.io/Snapbooth/)

## GitHub Topics

The repo metadata now carries the same tags as the product:

`photobooth` `browser` `webcam` `countdown` `gif` `boomerang` `frames` `filters` `qr-code` `react` `vite` `typescript` `github-pages` `privacy-first`

## Contributing

Read [CONTRIBUTING.md](./CONTRIBUTING.md) before changing the repo.
