(() => {
  "use strict";

  /* ---- ASCII field + pointer glow ---- */
  const fieldCanvas = document.getElementById("field");
  const glowCanvas = document.getElementById("glow");
  if (fieldCanvas && glowCanvas) {
    const fieldCtx = fieldCanvas.getContext("2d");
    const glowCtx = glowCanvas.getContext("2d", { desynchronized: true });
    if (fieldCtx && glowCtx) initField(fieldCtx, glowCtx);
  }

  function initField(fieldCtx, glowCtx) {
    const GLYPHS = " .·:+*#%@";
    const LAST = GLYPHS.length - 1;
    const CELL = 14;
    const RADIUS = 300;
    const RADIUS_SQ = RADIUS * RADIUS;
    const FRAME_MS = 1000 / 30;
    const FONT = "12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    const FIELD_TONE = "rgba(255, 152, 92, 0.16)";
    const rootStyle = document.documentElement.style;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fineQuery = window.matchMedia("(hover: hover) and (pointer: fine)");

    // Pre-rendered colour buckets: no per-glyph string allocation while drawing.
    const PALETTE = [];
    for (let i = 0; i < 20; i++) {
      const k = i / 19;
      PALETTE.push("rgba(255," + Math.round(116 + k * 68) + "," + Math.round(42 + k * 38) + "," + (0.18 + k * 0.58).toFixed(3) + ")");
    }

    let width = 0, height = 0, dpr = 1, cols = 0, rows = 0;
    let noise = null;
    let pointerX = -1e4, pointerY = -1e4;
    let glowX = -1e4, glowY = -1e4;
    let hasPointer = false;
    let lastBox = null;
    let glowEnabled = false;
    let raf = 0, lastFrame = 0, clock = 0;
    let cssX = 0, cssY = 0, cssQueued = false;
    let resizeQueued = false;

    function applyMedia() {
      glowEnabled = fineQuery.matches && !motionQuery.matches;
      glowCanvas.hidden = !glowEnabled;
      if (!glowEnabled) {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        resetGlow();
        // Touch-only / reduced-motion: don't keep a full-screen buffer around.
        glowCanvas.width = 1;
        glowCanvas.height = 1;
      } else if (width) {
        setCanvasSize(glowCanvas);
        resetGlow();
      }
    }

    function setCanvasSize(canvas) {
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
    }

    function resetGlow() {
      glowCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      glowCtx.clearRect(0, 0, width, height);
      lastBox = null;
    }

    function paintField() {
      fieldCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fieldCtx.clearRect(0, 0, width, height);
      fieldCtx.font = FONT;
      fieldCtx.textBaseline = "top";
      fieldCtx.fillStyle = FIELD_TONE;
      for (let y = 0; y < rows; y++) {
        const py = y * CELL + 1;
        const row = y * cols;
        for (let x = 0; x < cols; x++) {
          const g = noise[row + x];
          if (g === 0) continue;
          fieldCtx.fillText(GLYPHS[g], x * CELL + 1, py);
        }
      }
    }

    function resize() {
      width = document.documentElement.clientWidth || window.innerWidth;
      height = document.documentElement.clientHeight || window.innerHeight;

      // Cap the backing store: crisp enough, but no giant 4K/retina buffers.
      const rawDpr = window.devicePixelRatio || 1;
      dpr = Math.max(1, Math.min(rawDpr, 1.5, Math.sqrt(6e6 / Math.max(1, width * height))));

      cols = Math.ceil(width / CELL);
      rows = Math.ceil(height / CELL);
      noise = new Uint8Array(cols * rows);

      let seed = 0x9e3779b9;
      for (let i = 0; i < noise.length; i++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const r = seed / 4294967296;
        noise[i] = r > 0.62 ? (r > 0.92 ? 2 : 1) : 0;
      }

      setCanvasSize(fieldCanvas);
      if (glowEnabled) {
        setCanvasSize(glowCanvas);
        resetGlow();
      } else {
        glowCanvas.width = 1;
        glowCanvas.height = 1;
      }
      paintField();
      if (glowEnabled && hasPointer) start();
    }

    function paintGlow(time) {
      glowCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Only clear the area painted last frame; every glow pixel lives inside it.
      if (lastBox) {
        glowCtx.clearRect(lastBox.x, lastBox.y, lastBox.w, lastBox.h);
        lastBox = null;
      }
      if (!hasPointer) return;

      const cx = glowX, cy = glowY;
      if (cx < -RADIUS || cy < -RADIUS || cx > width + RADIUS || cy > height + RADIUS) return;

      const startX = Math.max(0, Math.floor((cx - RADIUS) / CELL));
      const endX = Math.min(cols - 1, Math.ceil((cx + RADIUS) / CELL));
      const startY = Math.max(0, Math.floor((cy - RADIUS) / CELL));
      const endY = Math.min(rows - 1, Math.ceil((cy + RADIUS) / CELL));

      glowCtx.font = FONT;
      glowCtx.textBaseline = "top";

      for (let y = startY; y <= endY; y++) {
        const py = y * CELL + 1;
        const dy = y * CELL + CELL * 0.5 - cy;
        const dy2 = dy * dy;
        for (let x = startX; x <= endX; x++) {
          const dx = x * CELL + CELL * 0.5 - cx;
          const d2 = dx * dx + dy2;
          if (d2 > RADIUS_SQ) continue;

          const falloff = 1 - Math.sqrt(d2) / RADIUS;
          const wave = Math.sin(x * 0.22 + y * 0.17 + time * 2.6) * 0.5 + 0.5;
          const v = falloff * (0.42 + 0.58 * wave);
          const glyph = (v * LAST) | 0;
          if (glyph === 0) continue;

          glowCtx.fillStyle = PALETTE[(v * 19) | 0];
          glowCtx.fillText(GLYPHS[glyph], x * CELL + 1, py);
        }
      }

      const bx = Math.max(0, cx - RADIUS - CELL);
      const by = Math.max(0, cy - RADIUS - CELL);
      lastBox = {
        x: bx,
        y: by,
        w: Math.min(width, cx + RADIUS + CELL) - bx,
        h: Math.min(height, cy + RADIUS + CELL) - by
      };
    }

    function frame(ts) {
      raf = 0;
      if (document.hidden || !glowEnabled) return;

      if (ts - lastFrame < FRAME_MS) {
        raf = requestAnimationFrame(frame);
        return;
      }
      lastFrame = ts;
      clock = ts * 0.001;

      if (hasPointer) {
        glowX += (pointerX - glowX) * 0.22;
        glowY += (pointerY - glowY) * 0.22;
        if (Math.abs(pointerX - glowX) < 0.5) glowX = pointerX;
        if (Math.abs(pointerY - glowY) < 0.5) glowY = pointerY;
      }

      paintGlow(clock);
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (!raf && glowEnabled && !document.hidden) raf = requestAnimationFrame(frame);
    }

    function applyPointerCss() {
      cssQueued = false;
      rootStyle.setProperty("--mx", cssX + "px");
      rootStyle.setProperty("--my", cssY + "px");
    }

    function onPointerMove(e) {
      if (!fineQuery.matches) return;
      pointerX = e.clientX;
      pointerY = e.clientY;
      if (!hasPointer) {
        hasPointer = true;
        glowX = pointerX;
        glowY = pointerY;
      }
      cssX = pointerX;
      cssY = pointerY;
      if (!cssQueued) {
        cssQueued = true;
        requestAnimationFrame(applyPointerCss);
      }
      start();
    }

    function onResize() {
      if (resizeQueued) return;
      resizeQueued = true;
      requestAnimationFrame(() => {
        resizeQueued = false;
        resize();
      });
    }

    applyMedia();
    resize();

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
      } else {
        start();
      }
    });

    const onMediaChange = () => {
      applyMedia();
      start();
    };
    if (fineQuery.addEventListener) fineQuery.addEventListener("change", onMediaChange);
    if (motionQuery.addEventListener) motionQuery.addEventListener("change", onMediaChange);
  }

  /* ---- copy buttons for docs code blocks ---- */
  const blocks = document.querySelectorAll(".prose pre");
  if (blocks.length && navigator.clipboard) {
    blocks.forEach((pre) => {
      const code = pre.querySelector("code");
      if (!code) return;

      const wrap = document.createElement("div");
      wrap.className = "code-wrap";
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(pre);

      const btn = document.createElement("button");
      btn.className = "copy-btn";
      btn.type = "button";
      btn.textContent = "COPY";
      btn.setAttribute("aria-label", "Copy code to clipboard");

      btn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(code.innerText);
          btn.textContent = "COPIED";
        } catch {
          btn.textContent = "SELECT";
          const range = document.createRange();
          range.selectNodeContents(code);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
        setTimeout(() => { btn.textContent = "COPY"; }, 1500);
      });

      wrap.appendChild(btn);
    });
  }
})();
