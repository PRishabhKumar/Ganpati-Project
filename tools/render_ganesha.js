// Dev-time preview rasteriser for the intro Ganesha (not used by the site).
// usage: node tools/render_ganesha.js [lines|washes|full|bg] out.png
const sharp = require('/tmp/node_modules/sharp');
const fs = require('fs');
const mode = process.argv[2] || 'full';
const out = process.argv[3] || '/home/user/_review/g.png';
let svg = fs.readFileSync('/home/user/Ganpati-Project/site-src/ganesha.svg', 'utf8');
svg = svg.replace('<svg ', '<svg width="520" height="640" ');
if (mode === 'lines') {
  svg = svg.replace('<g id="wash-layer"', '<g style="display:none" id="wash-layer"')
           .replace('<g id="wash-detail"', '<g style="display:none" id="wash-detail"');
}
if (mode === 'washes') {
  svg = svg.replace('<g id="line-layer"', '<g style="display:none" id="line-layer"');
}
const bgc = mode === 'lines' || mode === 'washes' ? '#0a0505' : '#0a0505';
svg = svg.replace('<defs>', `<defs><rect id="bgrect" x="0" y="0" width="520" height="640" fill="${bgc}"/>`)
         .replace('</defs>', '</defs><use href="#bgrect"/>');
sharp(Buffer.from(svg)).png().toFile(out).then(() => console.log('rendered', mode, '->', out));
