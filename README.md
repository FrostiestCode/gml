# Grapple Mod Loader — website

A single-file, dependency-free landing page for **Grapple Mod Loader**, a native C++ mod
loader for *Just Cause 3*.

No build step, no package manager, no external fonts/CDNs — just `index.html`.

## Publish with GitHub Pages

1. Push this repository to GitHub (branch `main`).
2. Open **Settings → Pages** in the repository.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Choose branch **main** and folder **/ (root)**, then **Save**.
5. The site appears at `https://<username>.github.io/<repository>/` after a minute or two.

`.nojekyll` is included so GitHub Pages serves the files exactly as-is (no Jekyll
processing).

### Update the links

The download/source buttons and footer point at:

```
https://github.com/FrostiestCode/GrappleModLoaderRam
```

If your repository has a different owner or name, update those URLs in `index.html`
(section `#download` and the `<footer>`).

## Local preview

Any static file server works:

```sh
python -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` directly with `file://` also works, since everything is inline.

## What was optimised

- **Zero extra requests.** CSS, JS, favicon and the scrollbar artwork are inlined.
- **Two-layer ASCII background.** The ambient field is painted once per resize; only a
  small, pointer-sized patch animates on a separate canvas — instead of redrawing ~14k
  glyphs every frame.
- **Throttled to 30 fps**, paused when the tab is hidden, disabled on touch-only devices,
  and fully static under `prefers-reduced-motion`.
- **Capped canvas backing store** (max 1.5× device pixel ratio) to avoid huge retina/4K buffers.
- **Skipped buffer allocation** for the animated layer on touch-only devices and when reduced
  motion is requested.
- **Cheap clearing.** Only the previous glow rectangle is cleared each frame.
- **No per-glyph allocations.** Colours are pre-baked into a small palette.
- **Fewer expensive paints.** Removed `backdrop-filter` from cards; kept it only on the nav.
- Responsive layout, skip link, focus styles, `scroll-padding-top`, and anchor links that
  work from the GitHub Pages project subpath (all paths are relative/anchors).

## Scrollbar

The scrollbar is a grappling hook: a braided rope thumb with an SVG grapple claw at the
bottom, running down a dark rail. It is pure CSS (`::-webkit-scrollbar-thumb`), with a
thin themed fallback for Firefox via `scrollbar-color`.
