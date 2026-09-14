/* jsdom smoke test: executes the real page scripts against the real data */
const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = (function(){ try { return require("jsdom"); } catch (e) { return require("/tmp/node_modules/jsdom"); } })();

const ROOT = "/home/user/Ganpati-Project";
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

const errors = [];
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => errors.push("jsdomError: " + e.message));
vc.on("error", (...a) => errors.push("console.error: " + a.join(" ")));

const IO_INSTANCES = [];

const dom = new JSDOM(html, {
  url: "file://" + ROOT + "/index.html",
  runScripts: "dangerously",
  resources: "usable",
  pretendToBeVisual: true,
  virtualConsole: vc,
  beforeParse(window) {
    window.matchMedia = window.matchMedia || ((q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
    window.IntersectionObserver = class {
      constructor(cb) { this.cb = cb; IO_INSTANCES.push(this); }
      observe(el) { (this.els = this.els || []).push(el); }
      unobserve(el) { this.els = (this.els || []).filter((e) => e !== el); }
      disconnect() { this.els = []; }
      fireAll() { if (this.els && this.els.length) this.cb(this.els.map((e) => ({ isIntersecting: true, target: e })), this); }
    };
    window.HTMLCanvasElement.prototype.getContext = function () {
      const noop = () => {};
      return new Proxy({}, { get: (t, k) => (k === "canvas" ? this : noop), set: () => true });
    };
    window.fetch = (url) => {
      const p = path.join(ROOT, String(url).replace(/^\//, ""));
      return Promise.resolve({ json: () => Promise.resolve(JSON.parse(fs.readFileSync(p, "utf8"))) });
    };
    window.SVGElement.prototype.getTotalLength = function () { return 300; };
    window.Element.prototype.animate = function () {
      const a = { cancel() {}, finish() {}, onfinish: null };
      setTimeout(() => a.onfinish && a.onfinish(), 0);
      return a;
    };
    window.addEventListener("error", (e) => errors.push("window error: " + e.message));
  },
});

const { window } = dom;
const { document } = window;

function flush(ms) { return new Promise((r) => setTimeout(r, ms)); }

(async () => {
  await flush(900); // let scripts + fetches resolve

  const report = {};
  report.chapters = document.querySelectorAll(".chapter").length;
  report.cards = document.querySelectorAll(".card:not(.card--video)").length;
  report.videoCards = document.querySelectorAll(".card--video").length;
  report.railLinks = document.querySelectorAll("#rail a").length;
  report.reveals = document.querySelectorAll(".reveal").length;
  report.cinema = document.querySelectorAll(".cinema").length;
  report.filmstrips = document.querySelectorAll(".grid--filmstrip").length;
  report.masonries = document.querySelectorAll(".grid--masonry").length;
  report.scatters = document.querySelectorAll(".grid--scatter").length;
  report.tnFrame = !!document.getElementById("tnframe");
  report.counters = document.querySelectorAll(".num").length;
  report.finale = !!document.querySelector(".finale");
  report.footer = (document.querySelector("footer") || {}).textContent ? "yes" : "no";
  report.title = document.title;

  // per-year card counts vs manifest
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "data/manifest.json"), "utf8"));
  report.perYear = {};
  manifest.years.forEach((y) => {
    const sec = document.getElementById("y" + y.year);
    const n = sec ? sec.querySelectorAll(".card:not(.card--video)").length + (y.year === 2018 ? 0 : 0) : -1;
    // cinema year shows cover inside .cinema, not as card
    const cinema = sec ? sec.querySelectorAll(".cinema").length : 0;
    report.perYear[y.year] = { manifest: y.photos.length, rendered: n + cinema };
  });

  // simulate scrolling: fire all intersection observers
  IO_INSTANCES.forEach((io) => io.fireAll && io.fireAll());
  await flush(300);
  report.revealsInView = document.querySelectorAll(".reveal.in-view").length;
  report.chaptersInView = document.querySelectorAll(".chapter.in-view").length;
  await flush(1700);
  report.counterSample = Array.from(document.querySelectorAll(".num")).map((n) => n.textContent);

  // intro: click begin
  const begin = document.getElementById("begin");
  begin.click();
  await flush(200);
  report.introDone = document.getElementById("intro").classList.contains("done");
  report.bodyUnlocked = !document.body.classList.contains("locked");

  // lightbox: open 5th photo, next, prev, escape
  const btns = document.querySelectorAll("[data-lb]");
  btns[4].click();
  await flush(120);
  const lb = document.getElementById("lb");
  report.lbOpen = lb.classList.contains("open");
  report.lbSrc = (lb.querySelector("img").getAttribute("src") || "").slice(0, 40);
  report.lbCap = lb.querySelector("figcaption").textContent.trim();
  lb.querySelector(".lb-next").click();
  await flush(60);
  report.lbCapAfterNext = lb.querySelector("figcaption").textContent.trim();
  window.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape" }));
  await flush(60);
  report.lbClosed = !lb.classList.contains("open");

  // then/now slider
  const range = document.querySelector(".tn-range");
  if (range) { range.value = 30; range.dispatchEvent(new window.Event("input", { bubbles: true })); }
  report.split = document.getElementById("tnframe") ? document.getElementById("tnframe").style.getPropertyValue("--split") : "n/a";

  // shuffle + again buttons exist
  report.shuffleBtn = !!document.getElementById("shuffle");
  document.getElementById("shuffle").click();
  await flush(80);
  report.shuffleOpensLb = lb.classList.contains("open");
  window.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape" }));

  // image srcs all exist on disk
  let missing = 0;
  document.querySelectorAll(".card img").forEach((img) => {
    const src = img.getAttribute("src");
    if (!fs.existsSync(path.join(ROOT, src))) { missing++; if (missing < 4) errors.push("missing file: " + src); }
  });
  report.missingImages = missing;

  console.log(JSON.stringify(report, null, 1));
  console.log(errors.length ? "\nERRORS:\n" + errors.slice(0, 12).join("\n") : "\nNO RUNTIME ERRORS");
  window.close();
  process.exit(0);
})();
