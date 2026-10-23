# Grapple Mod Loader — website

GitHub Pages site for **Grapple Mod Loader**, a native C++ mod loader for *Just Cause 3*.

It ships as a static, dependency-free site: landing page, a features page, and a documentation section derived from the source repository (`D:\Projects\GrappleModLoader` / `https://github.com/FrostiestCode/GrappleModLoader`).

## Repository structure

```
index.html               landing page
features.html            verified features, controls, spawn catalog, config
docs/
  index.html             documentation overview + quick start
  getting-started.html   build, deploy, first launch, controls, troubleshooting
  mod-format.html        mod.json, ABI rules, events, commands, hot reload
  api.html               C++ ABI reference (core, memory, hooks, events, console,
                         player, vehicle, entity, world, content, prop, signatures, debug)
  architecture.html      loader, boot order, hooks, DispatchGate, input gates, overlay
  research.html          signature database, status ladder, research rules, tooling
  roadmap.html           working features, open leads, ideas, non-goals
assets/
  site.css               shared styles incl. the grapple scrollbar
  site.js                ASCII field + glow effect, copy buttons
  favicon.svg            favicon
  hook.svg               grapple hook artwork used by the scrollbar
.nojekyll                serve files exactly as-is (no Jekyll)
README.md                this file
```

## Publish with GitHub Pages

1. Push this repository to GitHub (branch `main`).
2. Open **Settings → Pages** in the repository.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Choose branch **main** and folder **/ (root)**, then **Save**.
5. The site appears at `https://<username>.github.io/<repository>/` after a minute or two.

`.nojekyll` is included so GitHub Pages serves the files exactly as-is.

## Links

The download/source buttons and footer point at the source repository:

```
https://github.com/FrostiestCode/GrappleModLoader
```

The docs pages link into that repository's Markdown files for the full reverse-engineering write-ups (`docs/ARCHITECTURE.md`, `docs/MOD_FORMAT.md`, `docs/SIGNATURES.md`, `docs/RE_PLAYER_CHAIN.md`, `docs/ROADMAP.md`, `docs/JC3_API_REFERENCE.md`).

## Local preview

Any static file server works:

```sh
python -m http.server 8000
# then open http://localhost:8000
```

Paths are relative, so the site also works as a GitHub Pages project subpath and from `file://`.

## What was optimised

- **Shared assets across pages.** `assets/site.css` and `assets/site.js` are cached once and reused by every page; the landing page no longer inlines its CSS/JS.
- **Two-layer ASCII background.** The ambient field is painted once per resize; only a small, pointer-sized patch animates on a separate canvas — instead of redrawing ~14k glyphs every frame.
- **Throttled to 30 fps**, paused when the tab is hidden, disabled on touch-only devices, and fully static under `prefers-reduced-motion`.
- **Capped canvas backing store** (max 1.5× device pixel ratio) to avoid huge retina/4K buffers.
- **Skipped buffer allocation** for the animated layer on touch-only devices and when reduced motion is requested.
- **Cheap clearing.** Only the previous glow rectangle is cleared each frame.
- **No per-glyph allocations.** Colours are pre-baked into a small palette.
- Responsive layout, skip link, focus styles, `scroll-padding-top`, and anchor links that work from the GitHub Pages project subpath.

## Scrollbar

The scrollbar is a grappling hook: a braided rope thumb with an SVG grapple hook at the bottom, running down a dark rail. It is pure CSS (`::-webkit-scrollbar-thumb`, art from `assets/hook.svg`), with a thin themed fallback for Firefox via `scrollbar-color`.

## Design notes

- Dark ASCII/orange theme is kept across every page; the docs pages share the same nav, footer, typography and scrollbar.
- Copy buttons are added progressively to code blocks (`navigator.clipboard`), with no build step required.
- Raw game addresses and full RE write-ups stay in the source repository; this site links to them rather than duplicating offsets that only make sense against one exe build.
