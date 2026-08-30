#!/usr/bin/env node
// One-off: rasterise favicon.svg -> PNGs, and centre-crop the hero to an OG image.
// Manual helper (not a build step). Needs headless Google Chrome + sips (macOS).
// favicon.svg = charcoal rounded square + an embedded PNG crop of the RAT PMC rat
// skull (imgs/brand/rat-skull.png, cut from imgs/brand/RAT_Single.png). To re-cut the
// skull crop, see the canvas drawImage snippet in git history / scratchpad.
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9360;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJSON = async (p) => (await fetch(`http://localhost:${PORT}${p}`)).json();
let id = 0;
function rpc(ws, method, params = {}, sessionId) {
  const mid = ++id;
  return new Promise((res, rej) => {
    const on = (e) => { const m = JSON.parse(e.data); if (m.id === mid) { ws.removeEventListener('message', on); m.error ? rej(new Error(method)) : res(m.result); } };
    ws.addEventListener('message', on);
    ws.send(JSON.stringify({ id: mid, method, params, sessionId }));
  });
}

const svg = readFileSync(join(ROOT, 'favicon.svg'), 'utf8');
const sizes = [[32, 'favicon-32.png'], [180, 'apple-touch-icon.png'], [512, 'favicon-512.png']];

const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
  `--remote-debugging-port=${PORT}`, 'about:blank'], { stdio: 'ignore' });

try {
  for (let i = 0; i < 40; i++) { try { await getJSON('/json/version'); break; } catch { await sleep(150); } }
  const ver = await getJSON('/json/version');
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' });
  const { sessionId: s } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true });
  await rpc(ws, 'Page.enable', {}, s);

  for (const [px, name] of sizes) {
    await rpc(ws, 'Emulation.setDeviceMetricsOverride', { width: px, height: px, deviceScaleFactor: 1, mobile: false }, s);
    const html = `<!doctype html><meta charset=utf8><style>*{margin:0}html,body{width:${px}px;height:${px}px}svg{width:100%;height:100%;display:block}</style>${svg}`;
    await rpc(ws, 'Page.navigate', { url: 'data:text/html;charset=utf-8,' + encodeURIComponent(html) }, s);
    await sleep(400);
    const { data } = await rpc(ws, 'Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: px, height: px, scale: 1 } }, s);
    writeFileSync(join(ROOT, name), Buffer.from(data, 'base64'));
    console.log('wrote', name, px + 'x' + px);
  }
  ws.close();
} finally {
  chrome.kill();
}

// --- OG image: centre-crop hero-wide (1280x720) -> 1200x630 -----------------
const hero = join(ROOT, 'imgs/hero-wide.jpg');
const tmp = join(ROOT, 'imgs/.og-tmp.jpg');
const og = join(ROOT, 'imgs/og-cover.jpg');
execFileSync('sips', ['-c', '672', '1280', hero, '--out', tmp], { stdio: 'ignore' });     // crop to 1280x672
execFileSync('sips', ['-z', '630', '1200', '-s', 'formatOptions', 'normal', tmp, '--out', og], { stdio: 'ignore' }); // -> 1200x630
execFileSync('rm', ['-f', tmp]);
console.log('wrote imgs/og-cover.jpg', execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', og]).toString().match(/\d+/g).join('x'));
