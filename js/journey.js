/* ============================================================
   journey.js — builds the year-by-year memory journey
   ============================================================ */
(function () {
  "use strict";

  const journey = document.getElementById("journey");
  if (!journey) return;

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }

  Promise.all([
    fetch("data/manifest.json").then((r) => r.json()),
    fetch("data/story.json").then((r) => r.json()),
  ]).then(([manifest, story]) => build(manifest, story));

  /* ---------------- lightbox state ---------------- */
  const LB = [];           // flat list of {src, cap, year, i, n}
  let lbIndex = 0;

  function cardHTML(photo, year, i, n, d) {
    const gi = LB.length;
    LB.push({ src: photo.src_full, year, i, n });
    return `
      <figure class="card reveal" style="--d:${d}ms">
        <button class="ph" data-lb="${gi}" aria-label="Open photograph ${i + 1} of ${n}, September ${year}">
          <img src="${photo.src_thumb}" alt="Family memory — Ganpati ${year}" width="${photo.w}" height="${photo.h}"
               loading="lazy" decoding="async" style="background-image:url(data:image/webp;base64,${photo.lqip})">
        </button>
        <figcaption>${year} · ${String(i + 1).padStart(2, "0")}</figcaption>
      </figure>`;
  }

  function galleryHTML(yearEntry, layout, d0) {
    const photos = yearEntry.photos;
    const n = photos.length;
    if (layout === "cinema") {
      const cover = photos[0];
      const gi = LB.length;
      LB.push({ src: cover.src_full, year: yearEntry.year, i: 0, n });
      let html = `
        <div class="cinema reveal" data-lb="${gi}" role="button" tabindex="0" aria-label="Open this photograph">
          <img src="${cover.src_full}" alt="Family memory — Ganpati ${yearEntry.year}" loading="lazy" decoding="async">
          <p class="cap">${esc(yearEntry.caption || "")}</p>
        </div>`;
      if (n > 1) {
        html += `<div class="grid--scatter" style="margin-top:clamp(24px,4vw,48px)">` +
          photos.slice(1).map((p, i) => cardHTML(p, yearEntry.year, i + 1, n, Math.min(i * 70, 350))).join("") + `</div>`;
      }
      return html;
    }
    const cls = layout === "filmstrip" ? "grid--filmstrip" : layout === "scatter" ? "grid--scatter" : "grid--masonry";
    return `<div class="${cls}">` +
      photos.map((p, i) => cardHTML(p, yearEntry.year, i, n, Math.min(i * 55, 380) + d0)).join("") +
      `</div>`;
  }

  function build(manifest, story) {
    document.title = `${story.title} · ${story.tagline}`;
    const byYear = {};
    manifest.years.forEach((y) => { byYear[y.year] = y; });

    let html = "";

    /* ---- prologue ---- */
    html += `
      <section class="prologue">
        <div>
          <p class="deva reveal">${esc(story.prologue.deva)}</p>
          <p class="stanza reveal" style="--d:150ms">${story.prologue.stanza}</p>
          <p class="hint reveal" style="--d:350ms">${esc(story.prologue.hint)}<span>🪔</span></p>
        </div>
      </section>`;

    /* ---- chapters ---- */
    story.years.forEach((yr) => {
      const entry = byYear[yr.year];
      if (!entry) return;
      const count = entry.photos.length;
      html += `
        <section class="chapter" id="y${yr.year}" data-year="${yr.year}"
                 style="--accent:${yr.accent}; --accent-soft:${rgba(yr.accent, .17)}; --dot:${yr.accent}">
          <div class="wrap">
            <header class="ch-head">
              <div class="ch-year" aria-hidden="true">${yr.year}</div>
              <div>
                <p class="ch-marathi reveal">${esc(yr.marathi)}</p>
                <h2 class="reveal" style="--d:90ms">${esc(yr.title)}</h2>
                <p class="ch-body reveal" style="--d:180ms">${esc(yr.body)}</p>
                <p class="ch-count reveal" style="--d:260ms">${count} photograph${count === 1 ? "" : "s"} · september ${yr.year}</p>
                <div class="ch-rule reveal" style="--d:300ms"></div>
              </div>
            </header>
            ${galleryHTML(Object.assign({}, entry, { caption: yr.cinema_caption }), yr.layout, 0)}
            ${yr.video ? `
              <figure class="card card--video reveal" style="max-width:520px;margin:26px auto 0">
                <div class="ph">
                  <video src="${yr.video}" preload="metadata" playsinline controls></video>
                  <span class="playcue">▶</span>
                </div>
                <figcaption>${esc(yr.video_caption || "a living memory")}</figcaption>
              </figure>` : ""}
          </div>
        </section>`;

      if (yr.year === 2016 && story.interlude_2017) {
        html += `
          <section class="interlude">
            <div class="wrap">
              <div class="frame reveal"><p>${story.interlude_2017}</p></div>
            </div>
          </section>`;
      }
    });

    /* ---- then & now ---- */
    const tn = story.thennow;
    const leftPhoto = byYear[tn.left] && byYear[tn.left].photos[0];
    const rightPhoto = byYear[tn.right] && byYear[tn.right].photos[0];
    if (leftPhoto && rightPhoto) {
      html += `
        <section class="thennow">
          <div class="wrap">
            <h2 class="reveal">${esc(tn.title)}</h2>
            <p class="lede reveal" style="--d:120ms">${esc(tn.lede)}</p>
            <div class="tn-frame reveal" style="--d:200ms" id="tnframe">
              <img src="${leftPhoto.src_full}" alt="Holding Bappa in ${tn.left}" loading="lazy">
              <img class="tn-after" src="${rightPhoto.src_full}" alt="Holding Bappa in ${tn.right}" loading="lazy">
              <span class="tn-split"></span>
              <span class="tn-tag left">${tn.left}</span>
              <span class="tn-tag right">${tn.right}</span>
              <input class="tn-range" type="range" min="0" max="100" value="50" aria-label="Compare ${tn.left} with ${tn.right}">
            </div>
            <p class="cap reveal" style="--d:280ms">${esc(tn.caption)}</p>
          </div>
        </section>`;
    }

    /* ---- counters ---- */
    html += `
      <section class="counters">
        <div class="wrap">
          <h2 class="reveal">${esc(story.counters.title)}</h2>
          <div class="row">
            ${story.counters.items.map((it, i) => `
              <div class="reveal" style="--d:${i * 120}ms">
                <div class="num" data-target="${it.value}">0</div>
                <div class="lbl">${esc(it.label)}</div>
              </div>`).join("")}
          </div>
        </div>
      </section>`;

    /* ---- finale ---- */
    html += `
      <section class="finale">
        <div>
          <div class="diya reveal" aria-hidden="true"><span class="flame"></span><span class="pot"></span></div>
          <p class="deva-big reveal" style="--d:120ms">${esc(story.finale.deva_big)}</p>
          <p class="deva-sub reveal" style="--d:240ms">${esc(story.finale.deva_sub)}</p>
          <p class="eng reveal" style="--d:340ms">${esc(story.finale.eng)}</p>
          <div class="actions reveal" style="--d:440ms">
            <button class="btn" id="again">Walk the journey again ↑</button>
            <button class="btn ghost" id="shuffle">Shuffle a memory ⤨</button>
          </div>
        </div>
      </section>
      <footer><span class="om">ॐ</span>${esc(story.finale.footer)}</footer>`;

    journey.innerHTML = html;

    /* ---- year rail ---- */
    const rail = document.getElementById("rail");
    rail.innerHTML = story.years.map((y) =>
      `<a href="#y${y.year}" style="--dot:${y.accent}" data-rail="${y.year}"><span class="lbl">${y.year}</span><span class="dot"></span></a>`
    ).join("");

    wire(manifest, story);
  }

  /* ============================================================
     wiring
     ============================================================ */
  function wire(manifest, story) {
    /* blur-up images */
    document.querySelectorAll(".card img").forEach((img) => {
      const done = () => img.classList.add("loaded");
      if (img.complete && img.naturalWidth) done();
      else img.addEventListener("load", done, { once: true });
    });

    /* video play cue */
    document.querySelectorAll(".card--video video").forEach((v) => {
      v.addEventListener("play", () => v.closest(".card--video").classList.add("playing"));
      v.addEventListener("pause", () => v.closest(".card--video").classList.remove("playing"));
    });

    /* reveals */
    const revealIO = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in-view"); revealIO.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    document.querySelectorAll(".reveal").forEach((el) => revealIO.observe(el));

    /* chapter presence → year numeral fill + rail + badge */
    const badge = document.getElementById("yearbadge");
    const chapterIO = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in-view");
          const y = e.target.dataset.year;
          document.querySelectorAll("#rail a").forEach((a) => a.classList.toggle("active", a.dataset.rail === y));
          if (badge) badge.textContent = y;
          if (window.FX && e.target.dataset.year !== chapterIO._last) { chapterIO._last = e.target.dataset.year; window.FX.chime(); }
        }
      });
    }, { rootMargin: "-42% 0px -42% 0px" });
    document.querySelectorAll(".chapter").forEach((el) => chapterIO.observe(el));

    /* lightbox */
    const lb = document.getElementById("lb");
    const lbImg = lb.querySelector("img");
    const lbCap = lb.querySelector("figcaption");
    const lbCount = lb.querySelector(".lb-count");

    function show(i) {
      lbIndex = (i + LB.length) % LB.length;
      const item = LB[lbIndex];
      lbImg.src = item.src;
      lbImg.alt = `Family photograph — Ganpati ${item.year}, frame ${item.i + 1}`;
      lbCap.innerHTML = `<b>${item.year}</b> &nbsp;·&nbsp; photograph ${item.i + 1} of ${item.n}`;
      lbCount.textContent = `${lbIndex + 1} / ${LB.length}`;
      const next = LB[(lbIndex + 1) % LB.length];
      const prev = LB[(lbIndex - 1 + LB.length) % LB.length];
      [next, prev].forEach((p) => { const im = new Image(); im.src = p.src; });
    }
    function open(i) { show(i); lb.classList.add("open"); document.body.classList.add("locked"); }
    function close() { lb.classList.remove("open"); document.body.classList.remove("locked"); }

    journey.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-lb]");
      if (btn) open(+btn.dataset.lb);
    });
    journey.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const btn = e.target.closest && e.target.closest("[data-lb]");
      if (btn && btn.tagName !== "BUTTON") { e.preventDefault(); open(+btn.dataset.lb); }
    });
    lb.querySelector(".lb-prev").addEventListener("click", () => show(lbIndex - 1));
    lb.querySelector(".lb-next").addEventListener("click", () => show(lbIndex + 1));
    lb.querySelector(".lb-close").addEventListener("click", close);
    lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
    window.addEventListener("keydown", (e) => {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") show(lbIndex + 1);
      if (e.key === "ArrowLeft") show(lbIndex - 1);
    });
    let tx = 0;
    lb.addEventListener("touchstart", (e) => { tx = e.changedTouches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - tx;
      if (Math.abs(dx) > 48) show(lbIndex + (dx < 0 ? 1 : -1));
    }, { passive: true });

    /* then & now split */
    const frame = document.getElementById("tnframe");
    if (frame) {
      const range = frame.querySelector(".tn-range");
      range.addEventListener("input", () => frame.style.setProperty("--split", range.value + "%"));
    }

    /* counters */
    const numIO = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        numIO.unobserve(e.target);
        const el = e.target, target = +el.dataset.target, t0 = performance.now();
        const step = (t) => {
          const k = Math.min(1, (t - t0) / 1500);
          el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3)));
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    document.querySelectorAll(".num").forEach((el) => numIO.observe(el));

    /* filmstrip drag-to-scroll */
    document.querySelectorAll(".grid--filmstrip").forEach((strip) => {
      let down = false, sx = 0, sl = 0;
      strip.addEventListener("pointerdown", (e) => { down = true; sx = e.clientX; sl = strip.scrollLeft; });
      window.addEventListener("pointerup", () => { down = false; });
      strip.addEventListener("pointermove", (e) => { if (down) strip.scrollLeft = sl - (e.clientX - sx); });
    });

    /* finale buttons */
    document.getElementById("again").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    document.getElementById("shuffle").addEventListener("click", () => open((Math.random() * LB.length) | 0));

    window.FX && window.FX.progressInit();
    window.FX && window.FX.soundToggleInit();
  }
})();
