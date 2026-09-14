/* ============================================================
   intro.js — black screen → the drawing → colour → bloom → welcome
   ============================================================ */
(function () {
  "use strict";

  const intro = document.getElementById("intro");
  if (!intro) return;

  const svg = document.getElementById("ganesha-svg");
  const inks = Array.from(svg.querySelectorAll(".ink"))
    .sort((a, b) => (+a.dataset.i) - (+b.dataset.i));
  const washes = Array.from(svg.querySelectorAll(".wash"))
    .sort((a, b) => (+a.dataset.i) - (+b.dataset.i));

  const beginBtn = document.getElementById("begin");
  const skipBtn = document.getElementById("skip-intro");
  const replayBtn = document.getElementById("replay-draw");

  let animations = [];
  let begun = false;

  const ssGet = (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } };
  const ssSet = (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { /* private mode */ } };

  const num = (el) => +el.dataset.i;

  function prep() {
    animations.forEach((a) => a.cancel());
    animations = [];
    intro.classList.remove("bloom", "welcome");
    skipBtn.style.display = "";
    inks.forEach((el) => {
      const len = el.getTotalLength();
      el.dataset.len = len;
      el.style.strokeDasharray = len;
      el.style.strokeDashoffset = len + 3;
      el.style.visibility = "visible";
    });
    washes.forEach((el) => {
      el.dataset.target = el.getAttribute("opacity");
      el.style.opacity = 0;
    });
  }

  function finalState() {
    inks.forEach((el) => { el.style.strokeDashoffset = 0; });
    washes.forEach((el) => { el.style.opacity = el.dataset.target; });
    intro.classList.add("bloom", "welcome");
    skipBtn.style.display = "none";
  }

  function draw() {
    prep();
    let t = 350;

    /* phase 1 — the pen: outline, stroke by stroke */
    inks.forEach((el) => {
      const len = +el.dataset.len;
      const dur = Math.max(150, Math.min(680, len * 1.1));
      const a = el.animate(
        [{ strokeDashoffset: len + 3 }, { strokeDashoffset: 0 }],
        { duration: dur, delay: t, easing: "cubic-bezier(.45,.05,.35,1)", fill: "both" }
      );
      animations.push(a);
      t += dur * 0.6;
    });
    const linesEnd = t + 320;

    /* phase 2 — the paint: watercolor washes bloom in */
    let tw = linesEnd;
    washes.forEach((el) => {
      const target = parseFloat(el.dataset.target);
      const a = el.animate(
        [
          { opacity: 0, transform: "scale(.72)" },
          { opacity: target, transform: "scale(1)" },
        ],
        { duration: 700, delay: tw, easing: "cubic-bezier(.2,.7,.3,1)", fill: "both" }
      );
      a.onfinish = () => { el.style.opacity = target; };
      animations.push(a);
      tw += 75;
    });
    const paintEnd = tw + 420;

    /* phase 3 — the world: background blooms around Him */
    setTimeout(() => {
      intro.classList.add("bloom");
      window.FX && window.FX.petalsOn();
    }, paintEnd);

    /* phase 4 — welcome */
    setTimeout(() => {
      intro.classList.add("welcome");
      skipBtn.style.display = "none";
      window.FX && window.FX.bell();
    }, paintEnd + 1200);
  }

  function skip() {
    animations.forEach((a) => a.cancel());
    finalState();
    window.FX && window.FX.petalsOn();
  }

  function start() {
    document.body.classList.add("locked");
    const seen = ssGet("bappa-intro-seen");
    if (seen || (window.FX && window.FX.reduce)) {
      finalState();
      window.FX && window.FX.petalsOn();
    } else {
      draw();
    }
  }

  beginBtn.addEventListener("click", () => {
    if (begun) return;
    begun = true;
    ssSet("bappa-intro-seen", "1");
    window.FX && window.FX.bell();
    intro.classList.add("done");
    document.body.classList.remove("locked");
    window.dispatchEvent(new CustomEvent("journey:begin"));
  });

  skipBtn.addEventListener("click", skip);

  replayBtn.addEventListener("click", (e) => {
    e.preventDefault();
    intro.classList.remove("welcome");
    draw();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !intro.classList.contains("done")) skip();
  });

  start();
})();
