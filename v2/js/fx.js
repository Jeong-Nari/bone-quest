/* Bone Quest 2.0 — 피드백: 토스트 · 오버레이 · 사운드
   사운드는 v1(본 어드벤처)의 8bit 효과음/BGM을 그대로 옮겼다. */

/* ---------- 토스트 (순서대로 하나씩) ---------- */
const queue = [];
let showing = false;

/** toast({ title, text, sub, icon }) — 여러 개를 넘기면 들어온 순서대로 */
export function toast(...items) {
  queue.push(...items.filter(Boolean));
  if (!showing) next();
}
function next() {
  const el = document.getElementById("toast");
  const t = queue.shift();
  if (!t || !el) { showing = false; return; }
  showing = true;
  el.innerHTML = `${t.icon ? `<img src="${t.icon}" alt="">` : ""}<b>${t.title}</b>${t.text ? `<span>${t.text}</span>` : ""}${t.sub ? `<em>${t.sub}</em>` : ""}`;
  el.classList.toggle("small", !!t.small);
  el.classList.add("show");
  setTimeout(() => { el.classList.remove("show"); setTimeout(next, 220); }, t.small ? 1100 : 1800);
}

/* ---------- 오버레이 (모달 / 시트) ---------- */
export function openOverlay(html, { kind = "modal", onClose } = {}) {
  closeOverlay();
  const wrap = document.createElement("div");
  wrap.className = `overlay ${kind}`;
  wrap.id = "overlay";
  wrap.innerHTML = `<div class="ov-card" role="dialog" aria-modal="true">${html}</div>`;
  wrap.addEventListener("click", (e) => { if (e.target === wrap && kind === "sheet") closeOverlay(); });
  wrap._onClose = onClose;
  document.body.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add("show"));
  return wrap;
}
export function closeOverlay() {
  const el = document.getElementById("overlay");
  if (!el) return;
  el._onClose?.();
  el.remove();
}

/* ---------- 사운드 (Web Audio, 8bit) ---------- */
const AUD = { ctx: null, master: null, timer: null, step: 0, next: 0, noise: null };
let settings = { sfx: true, bgm: false, track: 0 };
export const setSoundSettings = (s) => { settings = s; };

function ac() {
  if (!AUD.ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    AUD.ctx = new C();
    AUD.master = AUD.ctx.createGain();
    AUD.master.gain.value = 0.62;
    AUD.master.connect(AUD.ctx.destination);
  }
  if (AUD.ctx.state === "suspended") AUD.ctx.resume();
  return AUD.ctx;
}
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
function blip(freq, dur, type, vol, when, slide) {
  const c = ac(); if (!c) return;
  const t = when ?? c.currentTime;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type || "square";
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(AUD.master);
  o.start(t); o.stop(t + dur + 0.03);
}
function noise(dur, vol, when, hp) {
  const c = ac(); if (!c) return;
  if (!AUD.noise) {
    const n = Math.floor(c.sampleRate * 0.4);
    AUD.noise = c.createBuffer(1, n, c.sampleRate);
    const d = AUD.noise.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource(); src.buffer = AUD.noise;
  const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp || 5000;
  const g = c.createGain(); g.gain.setValueAtTime(vol, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  src.connect(f); f.connect(g); g.connect(AUD.master);
  src.start(when); src.stop(when + dur + 0.02);
}

export function sfx(name) {
  if (!settings.sfx) return;
  const c = ac(); if (!c) return;
  const t = c.currentTime;
  if (name === "check") { blip(mtof(76), 0.07, "square", 0.1, t); blip(mtof(83), 0.11, "square", 0.1, t + 0.07); }
  else if (name === "uncheck") { blip(mtof(71), 0.07, "square", 0.06, t); blip(mtof(64), 0.1, "square", 0.06, t + 0.07); }
  else if (name === "level") { [72, 76, 79, 84].forEach((n, i) => blip(mtof(n), 0.13, "square", 0.11, t + i * 0.09)); blip(mtof(84), 0.4, "square", 0.11, t + 0.37); }
  else if (name === "clear") { [79, 79, 79, 84].forEach((n, i) => blip(mtof(n), 0.11, "square", 0.11, t + i * 0.1)); }
  else if (name === "boss") { blip(mtof(64), 0.18, "square", 0.11, t); blip(mtof(59), 0.18, "square", 0.11, t + 0.16); blip(mtof(52), 0.7, "sawtooth", 0.1, t + 0.32, mtof(28)); }
  else if (name === "camp") { [67, 71, 74, 79].forEach((n, i) => blip(mtof(n), 0.12, "triangle", 0.12, t + i * 0.08)); }
  else if (name === "soft") { blip(mtof(67), 0.14, "triangle", 0.08, t); blip(mtof(62), 0.22, "triangle", 0.07, t + 0.12); }
  else if (name === "tab") { blip(mtof(88), 0.035, "square", 0.05, t); }
}

export const TRACKS = [
  { name: "ROUTE", st: 0.26, m: [79,79,84,0, 83,81,79,81, 76,76,81,0, 79,76,72,0, 77,77,81,0, 79,77,76,74, 72,76,79,81, 79,0,0,0], ch: [[48,52,55],[45,48,52],[41,45,48],[43,47,50]] },
  { name: "SUNNY", st: 0.26, m: [72,74,76,77, 79,0,79,81, 79,77,76,74, 76,0,0,0, 77,79,81,83, 84,0,84,81, 79,77,76,77, 79,0,0,0], ch: [[48,52,55],[43,47,50],[45,48,52],[41,45,48]] },
  { name: "MEADOW", st: 0.28, m: [76,0,79,81, 79,0,76,0, 74,0,76,79, 76,0,0,0, 77,0,81,84, 81,0,79,0, 76,0,79,76, 72,0,0,0], ch: [[48,52,55],[41,45,48],[43,47,50],[48,52,55]] },
  { name: "TOWN", st: 0.30, m: [72,0,0,76, 79,0,0,81, 79,0,77,0, 76,0,0,0, 74,0,0,77, 81,0,0,83, 84,0,81,0, 79,0,0,0], ch: [[41,45,48],[48,52,55],[43,47,50],[48,52,55]] },
  { name: "BATTLE", st: 0.19, m: [81,81,80,81, 84,81,79,76, 77,77,76,77, 81,77,74,72, 69,72,76,79, 81,84,86,88, 86,84,81,79, 81,0,0,0], ch: [[45,48,52],[41,45,48],[43,47,50],[40,44,47]] },
];
function bgmTick() {
  const c = ac(); if (!c) return;
  const T = TRACKS[settings.track] ?? TRACKS[0], st = T.st;
  while (AUD.next < c.currentTime + 0.45) {
    const i = AUD.step % 32, t = AUD.next, ch = T.ch[Math.floor(i / 8) % T.ch.length], n = T.m[i];
    if (n) {
      blip(mtof(n), st * 0.72, "square", 0.042, t);
      blip((mtof(n) / 2) * 1.004, st * 0.72, "square", 0.022, t);
      blip(mtof(n), st * 0.4, "square", 0.014, t + st * 2);
    }
    blip(mtof(ch[i % 3] + 12), st * 0.42, "square", 0.012, t);
    if (i % 4 === 0) blip(mtof(ch[0]), st * 1.5, "triangle", 0.09, t);
    else if (i % 4 === 2) blip(mtof(ch[0] + 12), st * 1.3, "triangle", 0.055, t);
    if (i % 2 === 1) noise(0.026, 0.02, t, 7000);
    if (i % 8 === 4) noise(0.055, 0.042, t, 2400);
    AUD.next += st; AUD.step++;
  }
}
export function bgmStart() {
  const c = ac(); if (!c) return;
  bgmStop();
  AUD.next = c.currentTime + 0.08; AUD.step = 0;
  AUD.timer = setInterval(bgmTick, 70); bgmTick();
}
export function bgmStop() { if (AUD.timer) { clearInterval(AUD.timer); AUD.timer = null; } }
