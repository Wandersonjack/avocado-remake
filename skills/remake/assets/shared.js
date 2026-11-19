/* Shared drawing helpers for the audio-models rebuild.
 * Everything here is a pure function of the time it is given, so any frame can be drawn on its own. */
(function () {
  const HFX = (window.HFX = {});

  // ---------- deterministic randomness ----------
  HFX.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  function hash(n) {
    const s = Math.sin(n * 127.1) * 43758.5453;
    return s - Math.floor(s);
  }
  // smooth 1D value noise in [-1, 1]
  HFX.noise1 = function (x) {
    const i = Math.floor(x);
    const f = x - i;
    const u = f * f * (3 - 2 * f);
    return (hash(i) * (1 - u) + hash(i + 1) * u) * 2 - 1;
  };

  HFX.lerp = (a, b, t) => a + (b - a) * t;
  HFX.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  HFX.mixColor = function (c1, c2, t) {
    return [0, 1, 2].map((i) => Math.round(c1[i] + (c2[i] - c1[i]) * t));
  };

  // ---------- dotted sphere ----------
  // A sphere drawn as columns of dots along its meridians, with a wavy opening in the front
  // that shows the inside. state: {cx, cy, r, rot, tilt, open, wob, top:[r,g,b], bottom:[r,g,b], left, right, alpha}
  HFX.sphere = function (canvas, opts) {
    const ctx = canvas.getContext("2d");
    const cols = (opts && opts.cols) || 40;
    const rows = (opts && opts.rows) || 36;
    return function draw(t, s) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!s || s.alpha <= 0) return;
      const pts = [];
      const rot = s.rot;
      const tilt = s.tilt == null ? -0.32 : s.tilt;
      const ct = Math.cos(tilt);
      const st = Math.sin(tilt);
      const wob = s.wob == null ? 1 : s.wob;
      for (let i = 0; i < cols; i++) {
        const lon = (i / cols) * Math.PI * 2 + rot;
        for (let j = 0; j < rows; j++) {
          const lat = -1.05 + ((j + 0.5) / rows) * 2.15;
          // breathing displacement
          const d =
            1 +
            wob *
              (0.05 * Math.sin(lon * 3 + t * 2.1) * Math.cos(lat * 2 + t * 1.3) +
                0.035 * Math.sin(lat * 5 - t * 2.7 + lon));
          let x = Math.cos(lat) * Math.sin(lon) * d;
          let y = Math.sin(lat) * d;
          let z = Math.cos(lat) * Math.cos(lon) * d;
          // tilt around X (camera looks slightly down)
          const y2 = y * ct - z * st;
          const z2 = y * st + z * ct;
          y = y2;
          z = z2;
          // front opening: hide front points under a moving wavy rim
          if (z > -0.15) {
            const rim =
              (s.open == null ? 0.05 : s.open) +
              0.22 * Math.sin(x * 3.2 + t * 1.7) +
              0.12 * Math.sin(x * 6.1 - t * 2.3);
            const low = (s.low == null ? 0.7 : s.low) + 0.08 * Math.sin(x * 4 + t * 1.1);
            if (y > rim && y < low) continue;
          }
          pts.push([x, y, z]);
        }
      }
      pts.sort((a, b) => a[2] - b[2]);
      const persp = 3.2;
      ctx.globalAlpha = 1;
      for (const p of pts) {
        const k = persp / (persp - p[2]);
        const sx = s.cx + p[0] * s.r * k;
        const sy = s.cy + p[1] * s.r * k;
        const front = (p[2] + 1) / 2; // 0 back .. 1 front
        const vy = HFX.clamp((p[1] + 1) / 2, 0, 1);
        const vx = HFX.clamp((p[0] + 1) / 2, 0, 1);
        let c = HFX.mixColor(s.top, s.bottom, vy);
        if (s.left && s.right) c = HFX.mixColor(c, HFX.mixColor(s.left, s.right, vx), 0.45);
        // dots stretch along the meridian where the surface faces the camera
        const dotR = s.r * (0.007 + 0.012 * front) * k;
        const stretch = 1 + 0.55 * Math.pow(front, 2);
        const a = s.alpha * (0.16 + 0.84 * Math.pow(front, 1.4));
        ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${a})`;
        ctx.beginPath();
        ctx.ellipse(sx, sy, dotR, dotR * stretch, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    };
  };

  // ---------- horizontal waveform of rounded bars ----------
  // state: {cy, spacing, width, amp, phase, env:[center, widthPx], alpha, left:[r,g,b], right:[r,g,b], level}
  HFX.wave = function (canvas) {
    const ctx = canvas.getContext("2d");
    return function draw(t, s) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!s || s.alpha <= 0) return;
      const W = canvas.width;
      const n = Math.ceil(W / s.spacing) + 2;
      const off = ((s.scroll || 0) % s.spacing + s.spacing) % s.spacing;
      ctx.globalAlpha = s.alpha;
      for (let i = -1; i < n; i++) {
        const x = i * s.spacing + off + (s.x0 || 0);
        const idx = Math.round((x - off) / s.spacing);
        const ex = (x - s.env[0]) / s.env[1];
        const env = Math.exp(-ex * ex);
        const nz =
          0.55 + 0.45 * HFX.noise1(idx * 0.73 + t * 6.3 + (s.phase || 0)) * (0.6 + 0.4 * HFX.noise1(t * 2.1 + idx * 0.11));
        const h = Math.max(s.width, s.amp * (s.level == null ? 1 : s.level) * env * nz);
        const c = HFX.mixColor(s.left, s.right, HFX.clamp(x / W, 0, 1));
        ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
        const w = s.width;
        const r = w / 2;
        ctx.beginPath();
        ctx.roundRect(x - r, s.cy - h / 2, w, h, r);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
  };

  // ---------- slow dust particles ----------
  HFX.dust = function (canvas, count, seed) {
    const ctx = canvas.getContext("2d");
    const r = HFX.rng(seed || 7);
    const P = [];
    for (let i = 0; i < count; i++)
      P.push({ x: r() * canvas.width, y: r() * canvas.height, s: 1 + r() * 2.2, vx: (r() - 0.5) * 14, vy: -4 - r() * 10, a: 0.15 + r() * 0.45, ph: r() * 6 });
    return function draw(t, alpha) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (alpha <= 0) return;
      for (const p of P) {
        const x = (p.x + p.vx * t + canvas.width) % canvas.width;
        const y = (p.y + p.vy * t + canvas.height * 10) % canvas.height;
        ctx.fillStyle = `rgba(255,255,255,${alpha * p.a * (0.6 + 0.4 * Math.sin(t * 1.3 + p.ph))})`;
        ctx.beginPath();
        ctx.arc(x, y, p.s, 0, Math.PI * 2);
        ctx.fill();
      }
    };
  };

  // loudness of the original soundtrack at absolute time t (0..1)
  HFX.level = function (t) {
    const E = window.HFX_ENV || [];
    const f = t * 30;
    const i = Math.floor(f);
    if (i < 0 || i >= E.length - 1) return 0;
    return E[i] + (E[i + 1] - E[i]) * (f - i);
  };

  // Keyframe track: points [[time, value, ease?], ...]; the ease shapes the segment that ends at that point.
  HFX.kf = function (points) {
    const P = points.map((p) => [p[0], p[1], p[2] ? gsap.parseEase(p[2]) : (x) => x]);
    return function (t) {
      if (t <= P[0][0]) return P[0][1];
      for (let i = 1; i < P.length; i++) {
        if (t <= P[i][0]) {
          const u = (t - P[i - 1][0]) / (P[i][0] - P[i - 1][0] || 1);
          return P[i - 1][1] + (P[i][1] - P[i - 1][1]) * P[i][2](u);
        }
      }
      return P[P.length - 1][1];
    };
  };

  // Drive a draw function from a GSAP timeline so it is seek-safe.
  HFX.drive = function (tl, duration, fn) {
    const proxy = { t: 0 };
    tl.fromTo(proxy, { t: 0 }, { t: duration, duration: duration, ease: "none", onUpdate: () => fn(proxy.t) }, 0);
    fn(0);
  };

  // Word-by-word highlight: words go from dim to lit at given times (seconds, scene-local).
  HFX.karaoke = function (tl, el, times, lit, dim) {
    const words = el.querySelectorAll(".w");
    words.forEach((w, i) => {
      tl.set(w, { color: dim }, 0);
      if (times[i] != null) tl.to(w, { color: lit, duration: 0.12, ease: "none" }, times[i]);
    });
  };

  // navigation-arrow cursor: Avocado lime fill, ink outline; tip at (10,6) of a 64 box
  HFX.cursorSVG =
    '<svg viewBox="0 0 64 64" width="100%" height="100%" style="overflow:visible">' +
    '<path d="M10 6 L53 41 L31 43.5 L13 61 Z" fill="#d4f877" stroke="#0a0a0a" stroke-width="6" stroke-linejoin="round"/></svg>';
  const I = (d, w) => `<svg viewBox="0 0 24 24" width="${w || 16}" height="${w || 16}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  HFX.icon = {
    heart: (w) => I('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>', w),
    heartFill: (w) => `<svg viewBox="0 0 24 24" width="${w || 16}" height="${w || 16}"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="currentColor"/></svg>`,
    copy: (w) => I('<rect x="8" y="8" width="12" height="12" rx="3"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>', w),
    download: (w) => I('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', w),
    captions: (w) => I('<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M7 11h4M7 15h7M14 11h3"/>', w),
    more: (w) => I('<circle cx="6" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="18" cy="12" r="1"/>', w),
    ext: (w) => I('<path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>', w),
    spark: (w) => I('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z"/>', w),
    mic: (w) => I('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>', w),
    person: (w) => I('<circle cx="12" cy="5" r="2"/><path d="M9 21l1-7-3-3 5-2 5 2-3 3 1 7"/>', w),
    phone: (w) => I('<rect x="3" y="5" width="11" height="15" rx="2"/><rect x="16" y="9" width="5" height="11" rx="1.5"/>', w),
    gauge: (w) => I('<path d="M4 16a8 8 0 1 1 16 0"/><path d="M12 16l4-5"/>', w),
    clock: (w) => I('<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>', w),
    chev: (w) => I('<path d="M7 10l5 5 5-5"/>', w),
    imgplus: (w) => I('<rect x="3" y="5" width="14" height="14" rx="3"/><path d="M3 15l4-4 4 4 2-2 4 4M19 3v6M16 6h6"/>', w),
    user: (w) => I('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', w),
    userplus: (w) => I('<circle cx="10" cy="8" r="4"/><path d="M3 21a7 7 0 0 1 14 0M19 8v6M16 11h6"/>', w),
    video: (w) => I('<rect x="3" y="6" width="13" height="12" rx="3"/><path d="M16 10l5-3v10l-5-3"/>', w),
    search: (w) => I('<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>', w),
    grid: (w) => I('<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>', w),
    list: (w) => I('<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>', w),
    vol: (w) => I('<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9a4 4 0 0 1 0 6"/>', w),
    x: (w) => I('<path d="M6 6l12 12M18 6L6 18"/>', w),
    check: (w) => I('<path d="M5 12l5 5 9-10"/>', w),
    bell: (w) => I('<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>', w),
    play: (w) => `<svg viewBox="0 0 24 24" width="${w || 16}" height="${w || 16}"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>`,
    pause: (w) => `<svg viewBox="0 0 24 24" width="${w || 16}" height="${w || 16}"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/></svg>`,
    trash: (w) => I('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', w),
    plus: (w) => I('<path d="M12 5v14M5 12h14"/>', w),
    wave: (w) => I('<path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2"/>', w),
  };
  // fill every [data-icon] element in a scene once at build time
  HFX.icons = function (root) {
    (root || document).querySelectorAll("[data-icon]").forEach((el) => {
      const fn = HFX.icon[el.getAttribute("data-icon")];
      if (fn && !el.innerHTML) el.innerHTML = fn(+el.getAttribute("data-size") || 16);
    });
  };
})();
