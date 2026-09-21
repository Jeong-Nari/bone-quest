/* Bone Quest 빌드
   node tools/build.mjs
   1) sw.js  — 오프라인용 서비스워커. 앱 파일 목록과 버전(파일 내용 해시)을 새로 적는다.
   2) dist/bone-quest.html — 단일 파일판. JS·CSS·폰트·이미지를 모두 한 파일에 넣는다.
      인터넷 없이, 파일을 더블클릭해서도 열린다. (esbuild 필요: npm i -g esbuild) */
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const walk = (d) => readdirSync(join(ROOT, d)).flatMap((f) => {
  const p = join(d, f);
  return statSync(join(ROOT, p)).isDirectory() ? walk(p) : [p];
});

/* ---------- 1) 서비스워커 ---------- */
const APP_FILES = [
  "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png",
  "css/app.css", ...walk("js"), ...walk("fonts"), ...walk("assets"),
].filter((f) => !f.endsWith(".map")).sort();

const hash = createHash("sha256");
for (const f of APP_FILES) hash.update(f).update(readFileSync(join(ROOT, f)));
const VERSION = hash.digest("hex").slice(0, 10);

const sw = readFileSync(join(ROOT, "tools/sw.template.js"), "utf8")
  .replace("__VERSION__", VERSION)
  .replace("__FILES__", JSON.stringify(["./", ...APP_FILES.map((f) => "./" + f)], null, 2));
writeFileSync(join(ROOT, "sw.js"), sw);
console.log(`sw.js  version ${VERSION}  (${APP_FILES.length + 1} files)`);

/* ---------- 2) 단일 파일 ---------- */
const MIME = { png: "image/png", woff2: "font/woff2" };
const dataURI = (f) => `data:${MIME[f.split(".").pop()]};base64,${readFileSync(join(ROOT, f)).toString("base64")}`;

let js;
try {
  js = execFileSync("esbuild", ["js/ui.js", "--bundle", "--format=iife", "--minify", "--target=es2020"], { cwd: ROOT, encoding: "utf8" });
} catch (e) {
  console.log("dist 건너뜀: esbuild가 없습니다 (npm i -g esbuild)");
  process.exit(0);
}

const assets = Object.fromEntries(walk("assets").map((f) => ["./" + f, dataURI(f)]));
const css = readFileSync(join(ROOT, "css/app.css"), "utf8")
  .replace(/url\(\.\.\/(fonts|assets)\/([^)]+)\)/g, (_, dir, f) => `url(${dataURI(`${dir}/${f}`)})`);

// 화면을 그릴 때 쓰는 ./assets/… 경로를 data URI로 바꿔 끼운다 (innerHTML 대입 시점에 동기 치환)
const shim = `(()=>{const A=${JSON.stringify(assets)};const fix=v=>String(v).replace(/\\.\\/assets\\/[\\w\\-\\/]+\\.png/g,m=>A[m]||m);
const d=Object.getOwnPropertyDescriptor(Element.prototype,"innerHTML");
Object.defineProperty(Element.prototype,"innerHTML",{get(){return d.get.call(this)},set(v){d.set.call(this,fix(v))},configurable:true});
window.__fixAssets=fix;})();`;

let html = readFileSync(join(ROOT, "index.html"), "utf8")
  .replace(/<link rel="manifest"[^>]*>\n?/, "")
  .replace(/<link rel="(apple-touch-icon|icon)" href="\.\/([^"]+)">/g, (_, rel, f) => `<link rel="${rel}" href="${dataURI(f)}">`)
  .replace('<link rel="stylesheet" href="./css/app.css">', () => `<style>\n${css}\n</style>`)
  .replace(/src="(\.\/assets\/[^"]+)"/g, (_, p) => `src="${assets[p]}"`)
  .replace(/<script type="module" src="\.\/js\/ui\.js"><\/script>/, () =>
    `<script>${shim}</script>\n<script>window.__SINGLE_FILE__=true;\n${js.replace(/<\/script/gi, "<\\/script")}</script>`);

mkdirSync(join(ROOT, "dist"), { recursive: true });
writeFileSync(join(ROOT, "dist/bone-quest.html"), html);
console.log(`dist/bone-quest.html  ${(html.length / 1024 / 1024).toFixed(1)} MB`);
