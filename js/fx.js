/* ============================================================
   fx.js — petals, temple-bell audio, scroll thread
   ============================================================ */
(function () {
  "use strict";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- floating marigold petals + embers ---------------- */
  const canvas = document.getElementById("petals");
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, parts = [], running = false, raf = 0;

  const PETAL_COLORS = ["#e8862a", "#f2a75f", "#d43d2a", "#e9b949", "#c96a2a"];

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function spawn(initial) {
    const ember = Math.random() < 0.3;
    return {
      ember,
      x: Math.random() * W,
      y: initial ? Math.random() * H : ember ? H + 12 : -14,
      r: ember ? 1 + Math.random() * 1.6 : 3 + Math.random() * 4.5,
      vy: ember ? -(0.18 + Math.random() * 0.4) : 0.28 + Math.random() * 0.6,
      sway: 0.4 + Math.random() * 1.1,
      phase: Math.random() * Math.PI * 2,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.02,
      color: ember ? "#ffd76a" : PETAL_COLORS[(Math.random() * PETAL_COLORS.length) | 0],
      alpha: 0.35 + Math.random() * 0.5,
    };
  }

  function tick(t) {
    if (!running) return;
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      p.y += p.vy;
      p.x += Math.sin(t / 1600 + p.phase) * p.sway * 0.4;
      p.rot += p.vr;
      if (p.y > H + 20 || p.y < -20) parts[i] = p = spawn(false);
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (p.ember) {
        ctx.shadowColor = "#ffb648";
        ctx.shadowBlur = 8;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    raf = requestAnimationFrame(tick);
  }

  function petalsOn() {
    if (reduce || running) return;
    resize();
    const n = Math.max(10, Math.min(34, Math.round((W * H) / 52000)));
    parts = Array.from({ length: n }, () => spawn(true));
    running = true;
    canvas.classList.add("on");
    raf = requestAnimationFrame(tick);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) { cancelAnimationFrame(raf); running = false; }
      else if (canvas.classList.contains("on") && !running) { running = true; raf = requestAnimationFrame(tick); }
    });
    window.addEventListener("resize", resize);
  }

  /* ---------------- synthesised temple bell ---------------- */
  let actx = null, master = null;
  const SOUND_KEY = "bappa-sound";
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } };
  let soundOn = lsGet(SOUND_KEY) !== "0";

  function audio() {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      actx = new AC();
      master = actx.createGain();
      master.gain.value = 0.16;
      master.connect(actx.destination);
    }
    if (actx.state === "suspended") actx.resume();
    return actx;
  }

  function strike(freq, when, gain, dur) {
    const c = audio(); if (!c || !soundOn) return;
    const t = c.currentTime + when;
    const partials = [1, 2.02, 2.98, 4.16, 5.4];
    partials.forEach((mult, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "sine";
      o.frequency.value = freq * mult;
      const peak = gain / Math.pow(1.9, i);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur * (1 - i * 0.14));
      o.connect(g).connect(master);
      o.start(t); o.stop(t + dur + 0.1);
    });
  }

  const bell = () => { strike(524, 0, 0.5, 3.4); strike(392, 0.06, 0.28, 4.2); };
  const chime = () => { strike(1046, 0, 0.12, 1.4); strike(1568, 0.09, 0.07, 1.1); };

  function soundToggleInit() {
    const btn = document.getElementById("snd");
    if (!btn) return;
    const paint = () => { btn.textContent = soundOn ? "🔔" : "🔕"; btn.setAttribute("aria-label", soundOn ? "mute the bells" : "let the bells ring"); };
    paint();
    btn.addEventListener("click", () => {
      soundOn = !soundOn;
      lsSet(SOUND_KEY, soundOn ? "1" : "0");
      paint();
      if (soundOn) chime();
    });
  }

  /* ---------------- golden scroll thread ---------------- */
  function progressInit() {
    const fill = document.getElementById("progress-fill");
    if (!fill) return;
    let ticking = false;
    const paint = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      fill.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + "%";
      ticking = false;
    };
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }, { passive: true });
    window.addEventListener("resize", paint);
    paint();
  }

  window.FX = { petalsOn, bell, chime, soundToggleInit, progressInit, reduce };
})();
