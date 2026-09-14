// Dev-time: render progressive frames of the intro "pen" phase to verify choreography.
// usage: node tools/draw_sequence.js out.jpg
const sharp = (function(){ try { return require("sharp"); } catch (e) { return require("/tmp/node_modules/sharp"); } })();
const fs = require("fs");

function parseNums(s) { return s.match(/-?\d*\.?\d+(?:e-?\d+)?/g).map(Number); }

function pathLength(d) {
  const tokens = d.match(/[MmCcLlQqZzHhVvSsTtAa]|-?\d*\.?\d+(?:e-?\d+)?/g);
  let i = 0, x = 0, y = 0, sx = 0, sy = 0, len = 0;
  const P = () => [parseFloat(tokens[i++]), parseFloat(tokens[i++])];
  const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  const sample = (x1, y1, f, n) => {
    let px = x1, py = y1, L = 0;
    for (let s = 1; s <= n; s++) {
      const [cx, cy] = f(s / n);
      L += dist(px, py, cx, cy); px = cx; py = cy;
    }
    return L;
  };
  while (i < tokens.length) {
    const c = tokens[i++];
    if (c === "M" || c === "m") {
      let [dx, dy] = P();
      if (c === "m") { dx += x; dy += y; }
      x = sx = dx; y = sy = dy;
    } else if (c === "L" || c === "l") {
      let [dx, dy] = P();
      if (c === "l") { dx += x; dy += y; }
      len += dist(x, y, dx, dy); x = dx; y = dy;
    } else if (c === "H" || c === "h") {
      let dx = parseFloat(tokens[i++]); if (c === "h") dx += x;
      len += Math.abs(dx - x); x = dx;
    } else if (c === "V" || c === "v") {
      let dy = parseFloat(tokens[i++]); if (c === "v") dy += y;
      len += Math.abs(dy - y); y = dy;
    } else if (c === "C" || c === "c") {
      let [x1, y1] = P(), [x2, y2] = P(), [dx, dy] = P();
      if (c === "c") { x1 += x; y1 += y; x2 += x; y2 += y; dx += x; dy += y; }
      const ox = x, oy = y;
      len += sample(ox, oy, (t) => {
        const mt = 1 - t;
        return [
          mt * mt * mt * ox + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * dx,
          mt * mt * mt * oy + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * dy,
        ];
      }, 24);
      x = dx; y = dy;
    } else if (c === "Q" || c === "q") {
      let [x1, y1] = P(), [dx, dy] = P();
      if (c === "q") { x1 += x; y1 += y; dx += x; dy += y; }
      const ox = x, oy = y;
      len += sample(ox, oy, (t) => {
        const mt = 1 - t;
        return [mt * mt * ox + 2 * mt * t * x1 + t * t * dx, mt * mt * oy + 2 * mt * t * y1 + t * t * dy];
      }, 24);
      x = dx; y = dy;
    } else if (c === "Z" || c === "z") {
      len += dist(x, y, sx, sy); x = sx; y = sy;
    } else {
      // unsupported command: skip its numbers gracefully
      i += parseNums(tokens.slice(i, i + 6).join(" ")).length;
    }
  }
  return len;
}

let base = fs.readFileSync("/home/user/Ganpati-Project/site-src/ganesha.svg", "utf8");
base = base.replace('<g id="wash-layer"', '<g style="display:none" id="wash-layer"')
           .replace('<g id="wash-mid"', '<g style="display:none" id="wash-mid"')
           .replace('<g id="wash-detail"', '<g style="display:none" id="wash-detail"')
           .replace("<defs>", '<defs><rect id="bg" width="520" height="566" fill="#070404"/>')
           .replace("</defs>", '</defs><use href="#bg"/>')
           .replace("<svg ", '<svg width="400" height="435" ');

const frames = [7, 17, 27, 39, 50, 57];

(async () => {
  const bufs = [];
  for (const k of frames) {
    const s = base.replace(/<(path|circle) class="ink" data-i="(\d+)"([^>]*)\/>/g, (m, tg, i, rest) => {
      const n = +i;
      const dMatch = rest.match(/ d="([^"]+)"/);
      const L = tg === "circle" ? 2 * Math.PI * parseFloat(rest.match(/ r="([\d.]+)"/)[1]) : pathLength(dMatch[1]);
      let off;
      if (n < k) off = 0;
      else if (n === k) off = L * 0.45;
      else off = L;
      rest = rest.replace(/\/\s*$/, "");
      return `<${tg} class="ink" data-i="${i}"${rest} style="stroke-dasharray:${L};stroke-dashoffset:${off}"/>`;
    });
    bufs.push(await sharp(Buffer.from(s)).png().toBuffer());
  }
  await sharp({ create: { width: 400 * frames.length, height: 435, channels: 3, background: "#070404" } })
    .composite(bufs.map((b, i) => ({ input: b, left: 400 * i, top: 0 })))
    .jpeg({ quality: 82 }).toFile(process.argv[2] || "/home/user/_review/draw_seq.jpg");
  console.log("sequence rendered");
})();
