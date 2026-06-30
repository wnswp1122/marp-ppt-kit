#!/usr/bin/env node
// 장당 슬라이드 파일(slides/NN-*.md)을 _header.md와 합쳐 Marp로 빌드한다.
//   node build.mjs <deck>            → HTML  (예: docker/week1)
//   node build.mjs <deck> pdf|pptx   → 해당 포맷
//   node build.mjs <deck> png        → 슬라이드별 PNG (dist/<deck>.shots/slide.NNN.png) — 시각 검토용
//   node build.mjs <group>           → 그룹 하위 덱 전부 (예: docker → docker/week1, week2 …)
//   node build.mjs all [fmt]         → decks/** 전부 빌드 (중첩 폴더 재귀 탐색)
//   node build.mjs <deck> --serve    → 라이브 뷰어: 자동 재빌드 + 브라우저 자동 새로고침
//
// 덱 = slides/ 폴더를 가진 디렉토리. slides/ 없는 폴더는 그룹으로 간주해 더 깊이 탐색.
// 덱 식별자 = decks/ 기준 상대경로(예: "docker/week1"). 출력은 폴더 구조를 미러링.
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync, statSync, watch } from 'node:fs';
import { createServer } from 'node:http';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';
import MarkdownIt from 'markdown-it';
import mdMark from 'markdown-it-mark';

const root = dirname(fileURLToPath(import.meta.url));
const THEMES_DIR = join(root, 'themes');
const BASE_CSS = join(THEMES_DIR, 'base.css');   // 공용 구조(레이아웃·컴포넌트). 단독 테마 아님.
const CONFIG = join(root, 'marp.config.mjs');   // markdown-it 플러그인 엔진 확장

// 테마 = 팔레트(themes/<name>.css, :root 색만) + base.css(구조)를 합친 것.
// 각 팔레트를 base와 합쳐 .build/themes/<name>.css 로 쓰고, marp에 전부 등록한다.
// 슬라이드의 `theme:` 지시가 그중 하나를 고른다. (base.css 자체는 팔레트가 아니라 제외)
function buildThemeSet() {
  const base = readFileSync(BASE_CSS, 'utf8');
  const outDir = join(root, '.build', 'themes');
  mkdirSync(outDir, { recursive: true });
  const palettes = readdirSync(THEMES_DIR).filter(f => f.endsWith('.css') && f !== 'base.css');
  for (const p of palettes) {
    // 팔레트(@theme·@import·:root) 먼저, 구조를 뒤에. @import 'default'가 맨 앞이라 CSS 유효.
    writeFileSync(join(outDir, p), readFileSync(join(THEMES_DIR, p), 'utf8').trimEnd() + '\n\n' + base);
  }
  return outDir;
}
// 합쳐진 테마들이 모인 디렉토리를 --theme-set 으로 통째 등록 → 슬라이드 `theme:` 가 하나를 고른다.
const THEME_ARGS = ['--theme-set', buildThemeSet()];
// 발표자 노트 전용 렌더러 — Marp는 노트를 평문으로 넣으므로, 노트 마크다운을 직접 HTML로 렌더해 주입.
const mdNote = new MarkdownIt({ breaks: true }).use(mdMark);
const DEFAULT_HEADER = '---\nmarp: true\ntheme: tech\npaginate: true\n---';

const FMT = { html: ['--html'], pdf: ['--html', '--pdf'], pptx: ['--html', '--pptx'], png: ['--html', '--images', 'png'] };

const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp' };

// HTML 출력 끝에 주입할 동적 스크립트. ES5 호환.
//  · .count : 슬라이드 활성화 시 숫자 카운트업(1회)  · .bar[data-pct] : 막대 차오름(1회)
//  · .sim   : 슬라이더(input range)로 변수를 바꾸면 내부 data-expr 요소가 실시간 갱신(인터랙티브)
const ANIM_JS = `<script>
(function(){
  function ease(p){return 1-Math.pow(1-p,3);}
  function count(el){
    var raw=el.getAttribute('data-to')||'0';
    var to=parseFloat(raw)||0,from=parseFloat(el.getAttribute('data-from'))||0;
    var dur=parseInt(el.getAttribute('data-dur'))||1200;
    var dec=raw.indexOf('.')>=0?raw.split('.')[1].length:0;
    var pre=el.getAttribute('data-prefix')||'',suf=el.getAttribute('data-suffix')||'',t0=null;
    function step(ts){t0=t0||ts;var p=Math.min((ts-t0)/dur,1);
      el.textContent=pre+(from+(to-from)*ease(p)).toFixed(dec)+suf;if(p<1)requestAnimationFrame(step);}
    requestAnimationFrame(step);
  }
  function bar(el){var p=parseFloat(el.getAttribute('data-pct'))||0;
    requestAnimationFrame(function(){el.style.setProperty('--pct',p+'%');});}
  function run(s){
    s.querySelectorAll('.count').forEach(function(el){if(!el.__d){el.__d=1;count(el);}});
    s.querySelectorAll('.bar[data-pct]').forEach(function(el){if(!el.__d){el.__d=1;bar(el);}});
  }
  // 인터랙티브 시뮬레이터: data-expr 은 Math 함수 + 슬라이더 변수로 계산된다(예: "min(100, pool*6)").
  function compute(expr,vars){ try{ return new Function('v','with(Math){with(v){return ('+expr+');}}')(vars); }catch(e){ return 0; } }
  function initSim(sim){
    var name=sim.getAttribute('data-var')||'x';
    var input=sim.querySelector('input[type=range]');
    if(!input)return;
    ['min','max','value','step'].forEach(function(a){ if(sim.hasAttribute('data-'+a)) input.setAttribute(a,sim.getAttribute('data-'+a)); });
    function update(){
      var vars={}; vars[name]=parseFloat(input.value);
      var now=sim.querySelector('.sim-now'); if(now) now.textContent=input.value;
      sim.querySelectorAll('[data-expr]').forEach(function(el){
        var val=compute(el.getAttribute('data-expr'),vars);
        if(el.classList.contains('bar')){ el.style.setProperty('--pct',Math.max(0,Math.min(100,val))+'%'); }
        else { var d=parseInt(el.getAttribute('data-dec'))||0,m=Math.pow(10,d);
          el.textContent=(el.getAttribute('data-prefix')||'')+(Math.round(val*m)/m)+(el.getAttribute('data-suffix')||''); }
      });
    }
    input.addEventListener('input',update); update();
  }
  function init(){
    document.querySelectorAll('.sim').forEach(initSim);
    var secs=[].slice.call(document.querySelectorAll('section'));
    if(document.querySelector('.bespoke-marp-parent')){
      // 활성 슬라이드를 주기적으로 확인해 등장 애니메이션 실행(run 은 __d 로 1회만). bespoke DOM 재구성에 견고.
      // active 클래스는 <section>이 아니라 슬라이드 래퍼 <svg.bespoke-marp-slide> 에 붙는다 → '.bespoke-marp-active' 로 잡고 그 하위를 run.
      setInterval(function(){var a=document.querySelector('.bespoke-marp-active'); if(a)run(a);},300);
    } else if('IntersectionObserver' in window){
      var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)run(e.target);});},{threshold:0.4});
      secs.forEach(function(s){io.observe(s);});
    } else { secs.forEach(run); }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(init,250);});
  else setTimeout(init,250);
})();
</script>`;

// ── Mermaid (HTML 전용 · 런타임 렌더) ──────────────────────────
// Marp 코어는 Mermaid 미지원 → ```mermaid 코드블록을 <div class="mermaid">로 바꾸고
// mermaid.js를 HTML에 주입해 브라우저가 그린다(.count·.bar·.sim과 같은 HTML 전용 패턴).
// PDF/PPTX엔 안 나온다. 쓰는 덱에만 주입.
function unescapeHtml(s) {
  return s.replace(/<[^>]+>/g, '')      // 하이라이터가 끼운 span 등 제거
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'").replace(/&amp;/g, '&');
}
// mermaid.js: 로컬 설치돼 있으면 인라인(self-contained), 없으면 CDN(ESM) + 안내.
// 로컬 dist/mermaid.min.js(esbuild iife)는 window.mermaid 대신 __esbuild_…_nm 네임스페이스에 넣으므로
// 그 이름을 추출해 window.mermaid 로 다리를 놓는다(전부 번들돼 dynamic import 없음 = 오프라인 OK).
function mermaidLib() {
  const local = join(root, 'node_modules', 'mermaid', 'dist', 'mermaid.min.js');
  if (existsSync(local)) {
    const js = readFileSync(local, 'utf8');
    const ns = (js.match(/var (__esbuild[A-Za-z0-9_]*)/) || [])[1];
    // 번들에 <!-- 등 HTML 파서를 깨는 시퀀스가 있어 raw <script>로 인라인하면 코드가 텍스트로 샌다.
    // base64로 실으면 꺾쇠(<)가 사라져 파서가 못 깬다 → 런타임에 디코드해 <script>로 주입(동기 실행).
    const b64 = Buffer.from(js, 'utf8').toString('base64');
    const bridge = ns ? `var M=window.${ns};window.mermaid=M&&(M.mermaid.default||M.mermaid.mermaid||M.mermaid);` : '';
    return `<script>(function(){var s=document.createElement('script');s.textContent=atob("${b64}");(document.head||document.documentElement).appendChild(s);${bridge}})();</script>`;
  }
  console.warn('  · mermaid: CDN(ESM) 로드(오프라인 발표 대비하려면 `npm i mermaid`로 인라인됨)');
  return `<script type="module">import m from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';window.mermaid=m;</script>`;
}
// bespoke는 비활성 슬라이드를 content-visibility:hidden(크기 0)으로 둔다 → 숨은 채 렌더하면 깨진다.
// 그래서 .count·.bar처럼 '활성 슬라이드가 될 때' 그 안의 미처리 .mermaid만 렌더한다.
const MERMAID_INIT = `<script>
(function(){function boot(){if(!window.mermaid){return setTimeout(boot,50);}
  // 활성 팔레트의 CSS 변수에서 색을 읽어 mermaid에 넘긴다 → 어느 테마든 자동으로 맞는 다이어그램.
  var cs=getComputedStyle(document.documentElement);
  function v(n,d){var x=cs.getPropertyValue(n).trim();return x||d;}
  mermaid.initialize({startOnLoad:false,securityLevel:'loose',theme:'base',
    fontFamily:v('--font-sans','Pretendard, Inter, sans-serif'),
    themeVariables:{
      background:v('--bg','#0d1117'),
      primaryColor:v('--bg-soft','#161b22'), mainBkg:v('--bg-soft','#161b22'),
      secondaryColor:v('--bg','#0d1117'), tertiaryColor:v('--bg','#0d1117'),
      primaryBorderColor:v('--accent','#58a6ff'), nodeBorder:v('--accent','#58a6ff'),
      primaryTextColor:v('--fg','#e6edf3'), textColor:v('--fg','#e6edf3'),
      lineColor:v('--fg-muted','#9aa7b4'),
      clusterBkg:v('--bg','#0d1117'), clusterBorder:v('--border','#30363d'),
      edgeLabelBackground:v('--bg','#0d1117'), titleColor:v('--accent','#58a6ff')}});
  function render(scope){var n=[].slice.call((scope||document).querySelectorAll('.mermaid:not([data-processed])'));
    if(n.length){try{window.mermaid.run({nodes:n});}catch(e){}}}
  if(document.querySelector('.bespoke-marp-parent')){
    setInterval(function(){var a=document.querySelector('.bespoke-marp-active');if(a)render(a);},300);
  } else { render(document); }
}setTimeout(boot,300);})();
</script>`;
// HTML 안의 ```mermaid 결과(<pre><code class="language-mermaid">…)를 <div class="mermaid">로 치환.
function renderMermaid(html) {
  if (!/language-mermaid/.test(html)) return { html, used: false };
  const out = html.replace(/<pre[^>]*>\s*<code class="language-mermaid">([\s\S]*?)<\/code>\s*<\/pre>/g,
    (m, code) => `<div class="mermaid">${unescapeHtml(code)}</div>`);
  return { html: out, used: true };
}

// 슬라이드 안의 로컬 이미지(assets/...)를 base64로 HTML에 직접 박는다(self-contained).
// → dist/*.html 한 파일만 열거나 공유해도 이미지가 항상 보임. 경로는 덱 루트 기준.
// http(s)·data:·절대경로(/)는 건드리지 않는다.
function inlineImages(body, deckDir, stats) {
  const toData = (raw) => {
    const url = raw.trim();
    if (/^(https?:|data:|\/)/.test(url)) return null;     // 외부/이미 인라인/절대 → 그대로
    const file = url.split(/[?#]/)[0];
    const abs = join(deckDir, file);
    const ext = file.split('.').pop().toLowerCase();
    if (!MIME[ext]) return null;
    if (!existsSync(abs)) { console.warn(`  ⚠ 이미지 없음: ${url}`); return null; }
    const b64 = readFileSync(abs).toString('base64');
    if (stats) {                                          // 인라인 용량 누적(크기 경고용)
      stats.total += b64.length;
      if (b64.length > 1_500_000) stats.big.push({ file, kb: Math.round(b64.length / 1024) });
    }
    return `data:${MIME[ext]};base64,${b64}`;
  };
  const transform = (seg) => {
    // 마크다운: ![alt 또는 w:200 등](path)   ·   HTML: <img ... src="path">
    seg = seg.replace(/(!\[[^\]]*\]\()([^)\s]+)(\))/g, (m, pre, url, post) => {
      const d = toData(url); return d ? pre + d + post : m;
    });
    return seg.replace(/(<img\b[^>]*\bsrc=["'])([^"']+)(["'])/gi, (m, pre, url, post) => {
      const d = toData(url); return d ? pre + d + post : m;
    });
  };
  // 코드는 건드리지 않는다: 펜스(```...```)·인라인(`...`)을 분리해 그 바깥만 치환.
  // (split 캡처그룹 → [바깥, 코드, 바깥, 코드, …]; 짝수 인덱스만 변환)
  return body.split(/(```[\s\S]*?```|`[^`]*`)/g)
    .map((part, i) => (i % 2 === 0 ? transform(part) : part))
    .join('');
}

// 덱 루트의 notes.md(있으면)를 '## NN…' 섹션으로 쪼개 번호→대본 맵을 만든다.
// 빌드가 각 슬라이드 앞에 <!-- 대본 --> 주석으로 주입 → Marp 발표자뷰(P키)·PPTX 발표자 노트로 노출.
// 매칭은 앞자리 숫자 기준(01-cover ↔ "## 01-cover" 또는 "## 1"). 본문/디자인과 분리된 제3구역.
function readNotes(deckDir) {
  const p = join(deckDir, 'notes.md');
  const map = new Map();
  if (!existsSync(p)) return map;
  let cur = null, buf = [];
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^##\s+(\d+)/);
    if (m) { if (cur) map.set(cur, buf.join('\n').trim()); cur = String(parseInt(m[1], 10)); buf = []; }
    else if (cur) buf.push(line);
  }
  if (cur) map.set(cur, buf.join('\n').trim());
  return map;
}

// ── 오버플로(내용 넘침) 정적 검사 ──────────────────────────────
// Marp 캔버스는 고정 크기(1280×720). 내용이 넘쳐도 빌드는 성공하고 화면만 잘린다.
// headless 브라우저 없이, 슬라이드 소스에서 렌더 높이를 '추정'해 캔버스를 넘으면 ⚠ 경고한다.
// 정밀하지 않다(추정) — 명백한 과밀을 잡는 게 목적. 계수는 tech.css 기준으로 보정.
const CANVAS_W = 1280, CANVAS_H = 720, FS = 26, LH = 1.55;
const PAD_V = { blank: 40, full: 0 };                       // 세로 패딩(기본 70). full/blank는 다름
const CENTERED = new Set(['cover', 'section', 'quote', 'end', 'metrics', 'full']);  // 세로 중앙정렬·여백 큰 레이아웃
const H1_EM = { cover: 2.6, section: 2.4, full: 3, end: 2.2 };   // 레이아웃별 h1 크기(tech.css)

// 문자열의 렌더 폭(px) 추정 — CJK/한글은 전각(≈1em), 라틴은 ≈0.52em, 공백은 ≈0.28em.
function advance(str, fs) {
  let w = 0;
  for (const ch of str) {
    if (/[ᄀ-ᇿ　-鿿가-힯＀-￯]/.test(ch)) w += fs;
    else if (/\s/.test(ch)) w += fs * 0.28;
    else w += fs * 0.52;
  }
  return w;
}
// 텍스트 한 덩이의 높이(px): 폭 W에서 줄바꿈 줄 수 × 줄높이 + 블록 여백.
function blockH(text, em, W, marginEm) {
  const fs = FS * em;
  if (!text.trim()) return 0;
  const lines = Math.max(1, Math.ceil(advance(text, fs) / W));
  return lines * fs * LH + marginEm * FS;
}

// 슬라이드 소스 1장 → { ratio, fill%, detail } 추정.
function estimateSlide(raw) {
  const klass = (raw.match(/_class:\s*([\w-]+)/) || [])[1] || 'content';
  let s = raw.replace(/<!--[\s\S]*?-->/g, '');               // Marp 지시·주석 제거
  // 단 수: cols3 → 3, two/compare/imgtext 또는 .cols → 2, 그 외 1
  const ncols = /cols3/.test(s) ? 3
    : (['two', 'compare', 'imgtext'].includes(klass) || /\bcols\b/.test(s)) ? 2 : 1;
  const gap = ncols > 1 ? 24 * (ncols - 1) : 0;
  const W = (CANVAS_W - 80 * 2 - gap) / ncols;               // 단 1개의 본문 폭
  // HTML 태그·attrs·container 마커 제거(텍스트만 남김)
  s = s.replace(/<\/?[a-z][^>]*>/gi, '').replace(/\{[.#][^}]*\}/g, '').replace(/^:::.*$/gm, '');

  const counts = { 불릿: 0, 코드: 0, 문단: 0, 표: 0 };
  let h = 0, inFence = false, fenceLang = '';
  for (const line of s.split('\n')) {
    if (/^\s*```/.test(line)) {
      if (!inFence) { inFence = true; fenceLang = line.replace(/`/g, '').trim().toLowerCase(); h += fenceLang === 'mermaid' ? 380 : 22; }
      else { inFence = false; fenceLang = ''; }                                          // mermaid는 SVG로 렌더되므로 고정 높이 1회
      continue;
    }
    if (inFence) { if (fenceLang === 'mermaid') continue; h += FS * 0.85 * 1.45; counts.코드++; continue; }  // 코드 한 줄
    const t = line.trim();
    if (!t) continue;
    let m;
    if ((m = t.match(/^#\s+(.*)/))) h += blockH(m[1], H1_EM[klass] || 1.9, W, 0.7);
    else if ((m = t.match(/^##\s+(.*)/))) h += blockH(m[1], 1.4, W, 0.9);       // h2: border+padding 포함
    else if ((m = t.match(/^###\s+(.*)/))) h += blockH(m[1], 1.1, W, 0.5);
    else if ((m = t.match(/^[-*+]\s+(.*)/))) { h += blockH(m[1], CENTERED.has(klass) ? 1.3 : 1, W, 0.35); counts.불릿++; }
    else if ((m = t.match(/^\d+\.\s+(.*)/))) { h += blockH(m[1], klass === 'agenda' ? 1.25 : 1, W, 0.4); counts.불릿++; }
    else if (/^\|/.test(t)) { h += FS * 0.9 * LH + 16; counts.표++; }            // 표 행
    else if (/^>/.test(t)) h += blockH(t.replace(/^>\s*/, ''), klass === 'quote' ? 1.8 : 1, W, 0.5);
    else if (/^(---|\*\*\*|___)\s*$/.test(t)) h += 24;                            // 수평선
    else if (/class="bar"|"bar"|\bbar\b/.test(t)) h += FS * 2.1;                  // 동적 막대
    else { h += blockH(t, CENTERED.has(klass) ? 1.4 : 1, W, 0.5); counts.문단++; }
  }
  if (ncols > 1) h /= ncols;                                  // 단 분할 → 대략 가장 높은 단
  const budget = CENTERED.has(klass) ? CANVAS_H - 80 : CANVAS_H - 2 * (PAD_V[klass] ?? 70);
  const detail = Object.entries(counts).filter(([, v]) => v > 0)
    .map(([k, v]) => `${k} ${v}${k === '코드' ? '줄' : ''}`).join(' · ');
  return { ratio: h / budget, fill: Math.round(h / budget * 100), detail, klass };
}

// 덱 슬라이드들을 검사해 캔버스를 넘길 위험이 있는 장을 경고로 출력.
function warnOverflow(slidesDir, files) {
  const over = [];
  for (const f of files) {
    const e = estimateSlide(readFileSync(join(slidesDir, f), 'utf8'));
    if (e.ratio > 1.0) over.push({ f, ...e });
  }
  if (!over.length) return;
  console.warn(`  ⚠ 넘침 위험 ${over.length}장 (캔버스 720px 초과 추정):`);
  for (const o of over) console.warn(`    · ${o.f}: 채움 ~${o.fill}%${o.detail ? ` (${o.detail})` : ''}`);
  console.warn('    → 불릿/코드 줄이기 · 2단(two/cols)으로 분할 · 폰트 줄이기. (추정치라 실물 확인 권장)');
}

// ── PDF/PPTX용 headless 브라우저 탐색 ──────────────────────────
// marp(puppeteer-core)는 CHROME_PATH 로 브라우저를 찾는다. 없으면 cryptic하게 죽으므로
// 환경변수 → PATH의 리눅스/맥 브라우저 → (WSL이면) Windows Chrome/Edge 순으로 찾아 자동 지정한다.
const WIN_BROWSERS = [
  '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe',
  '/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/mnt/c/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
];
// `npx @puppeteer/browsers install chrome`로 받은 로컬 chromium (chrome/<plat-ver>/chrome-*/chrome).
// WSL의 Windows chrome는 headless 실행이 자주 실패 → 받아둔 리눅스 chrome을 그보다 우선한다.
function localChrome() {
  const dir = join(root, 'chrome');
  if (!existsSync(dir)) return null;
  for (const d of readdirSync(dir)) {
    for (const rel of ['chrome-linux64/chrome', 'chrome-win64/chrome.exe', 'chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing']) {
      const p = join(dir, d, rel);
      if (existsSync(p)) return p;
    }
  }
  return null;
}
function findBrowser() {
  for (const e of [process.env.CHROME_PATH, process.env.PUPPETEER_EXECUTABLE_PATH])
    if (e && existsSync(e)) return e;
  for (const bin of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge']) {
    try {
      const p = execFileSync('which', [bin], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
      if (p) return p;
    } catch { /* 없음 → 다음 후보 */ }
  }
  const local = localChrome();
  if (local) return local;            // 받아둔 리눅스 chrome (Windows chrome보다 안정적)
  for (const p of WIN_BROWSERS) if (existsSync(p)) return p;
  return null;
}
// 라이브 뷰어 URL을 브라우저 새 창으로 연다(서버를 막지 않게 detached 실행).
// 크로미움 계열이면 --new-window 로 깔끔한 새 창, 못 찾으면 OS 기본 열기로 폴백.
function openBrowser(url) {
  const launch = (cmd, args) => { try { spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref(); return true; } catch { return false; } }
  const b = findBrowser();
  if (b && launch(b, ['--new-window', url])) return true;
  if (process.platform === 'darwin') return launch('open', [url]);
  const isWSL = existsSync('/proc/version') && /microsoft/i.test(readFileSync('/proc/version', 'utf8'));
  if (isWSL) return launch('explorer.exe', [url]);   // Windows 기본 브라우저
  return launch('xdg-open', [url]);
}
function browserHelp() {
  console.error('✗ PDF/PPTX는 headless 브라우저(Chrome/Chromium)가 필요한데 찾지 못했거나 실행에 실패했습니다.');
  console.error('  해결 (택1):');
  console.error('   · 리눅스: sudo apt install chromium-browser   (또는 Google Chrome 설치)');
  console.error('   · 경로 직접 지정: export CHROME_PATH=/path/to/chrome  후 다시 빌드');
  console.error('   · WSL: export CHROME_PATH="/mnt/c/Program Files/Google/Chrome/Application/chrome.exe"');
  console.error('  ※ HTML 출력은 브라우저 없이 됩니다: node build.mjs <deck>');
}

// ── 빌드 가드 3종: 에러 없이 성공하지만 결과가 틀리는 케이스를 경고 ──
//  (가) 본문 속 `---`/`***`/`___` → Marp가 슬라이드로 쪼개 빈 장 발생
//  (나) NN 번호: 0채움 불일치(문자열 정렬 ≠ 숫자 정렬)·중복 번호
//  (다) .sim data-expr 수식 구문 오류 → 런타임에 조용히 0으로 표시
function exprValid(expr) {
  try {
    // 변수는 1로 가정하되, Math 함수명(min·round 등)은 변수로 가로채지 않고 with(Math)로 넘긴다.
    const v = new Proxy({}, { has: (t, k) => typeof k === 'string' && !(k in Math), get: () => 1 });
    new Function('v', 'with(Math){with(v){return (' + expr + ');}}')(v);
    return true;
  } catch { return false; }
}
function lintSlides(slidesDir, files) {
  const warn = [];
  // (나) 번호 검증 — 정렬 순서가 숫자 순서와 다르면 0채움 불일치
  const numOrder = [...files].sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));
  if (files.join() !== numOrder.join())
    warn.push(`번호 정렬 불일치(0채움 권장): 파일명순 ${files.join(', ')} ≠ 숫자순 ${numOrder.join(', ')}`);
  const seenNum = {};
  for (const f of files) {
    const m = (f.match(/^(\d+)/) || [])[1];
    if (!m) continue;
    const n = String(parseInt(m, 10));
    if (seenNum[n]) warn.push(`번호 중복 ${n}: ${seenNum[n]} ↔ ${f} (노트 매칭·순서 충돌)`);
    else seenNum[n] = f;
  }
  // (가)·(다) 파일별 스캔 (코드 펜스 바깥만)
  for (const f of files) {
    const raw = readFileSync(join(slidesDir, f), 'utf8');
    let inFence = false, ln = 0;
    for (const line of raw.split('\n')) {
      ln++;
      if (/^\s*```/.test(line)) { inFence = !inFence; continue; }
      if (inFence) continue;
      if (/^(---|\*\*\*|___)\s*$/.test(line.trim()))
        warn.push(`${f}:${ln} 본문에 \`${line.trim()}\` → Marp가 빈 슬라이드로 쪼갬(수평선은 쓰지 말 것)`);
    }
    for (const m of raw.matchAll(/data-expr=["']([^"']*)["']/g))
      if (!exprValid(m[1])) warn.push(`${f} data-expr 수식 오류 "${m[1]}" → 화면에 조용히 0 표시`);
  }
  if (!warn.length) return;
  console.warn(`  ⚠ 빌드 가드 ${warn.length}건:`);
  for (const w of warn) console.warn(`    · ${w}`);
}

function buildDeck(deck, fmt, theme = null) {
  const deckDir = join(root, 'decks', deck);
  const slidesDir = join(deckDir, 'slides');
  if (!existsSync(slidesDir)) { console.error(`✗ slides 폴더 없음: ${slidesDir}`); return false; }
  mkdirSync(join(deckDir, 'assets'), { recursive: true });  // 이미지 둘 폴더 자동 보장(수동 생성 불필요)

  const headerPath = join(deckDir, '_header.md');
  let header = existsSync(headerPath) ? readFileSync(headerPath, 'utf8').trim() : DEFAULT_HEADER;
  // 테마 override(--theme=·PPT_THEME·_themes.txt): _header의 theme: 줄을 덮어쓴다(없으면 marp: true 뒤에 주입).
  if (theme) header = /^theme:\s*\S+/m.test(header)
    ? header.replace(/^theme:\s*\S+.*$/m, `theme: ${theme}`)
    : header.replace(/^(marp:\s*true.*)$/mi, `$1\ntheme: ${theme}`);

  // slides/ 안의 .md를 이름순으로(번호 prefix 기준) 정렬, _로 시작하는 건 제외
  const files = readdirSync(slidesDir)
    .filter(f => f.endsWith('.md') && !f.startsWith('_'))
    .sort();
  if (files.length === 0) { console.error(`✗ 슬라이드 파일 없음: ${slidesDir}`); return false; }

  const notes = readNotes(deckDir);
  const imgStats = { total: 0, big: [] };
  const bodies = files.map(f => {
    let body = inlineImages(readFileSync(join(slidesDir, f), 'utf8').trim(), deckDir, imgStats);
    const nn = String(parseInt((f.match(/^\d+/) || ['0'])[0], 10));
    const note = notes.get(nn);
    // 대본을 슬라이드 맨 앞 비지시 주석으로 주입 → Marp가 그 장의 발표자 노트로 인식.
    // 주석 종료 토큰(-->)이 대본에 있으면 깨지므로 치환.
    if (note) body = `<!--\n${note.replace(/-->/g, '--›')}\n-->\n\n` + body;
    return body;
  });
  // front matter(헤더)는 맨 앞 1회, 이후 슬라이드는 --- 로 구분
  const combined = header + '\n\n' + bodies.join('\n\n---\n\n') + '\n';

  // 중첩 덱(docker/week1)을 위해 부모 디렉토리까지 재귀 생성
  const tmp = join(root, '.build', `${deck}.md`);
  mkdirSync(dirname(tmp), { recursive: true });
  writeFileSync(tmp, combined);

  const ext = fmt === 'html' ? 'html' : fmt;
  // 테마 override 시 파일명에 테마를 붙여 공존(dist/<deck>.<theme>.html). 기본은 dist/<deck>.<ext>.
  const name = theme ? `${deck}.${theme}` : deck;
  // png(--images)은 슬라이드 1장 = 파일 1개 → 전용 폴더에 slide.NNN.png 로. 그 외는 단일 파일.
  const out = fmt === 'png' ? join(root, 'dist', `${name}.shots`, 'slide.png') : join(root, 'dist', `${name}.${ext}`);
  const outLabel = fmt === 'png' ? `dist/${name}.shots/slide.NNN.png` : `dist/${name}.${ext}`;
  mkdirSync(dirname(out), { recursive: true });
  console.log(`▸ ${deck}${theme ? ` [${theme}]` : ''}: ${files.length}장 → ${outLabel}`);
  warnOverflow(slidesDir, files);   // 내용 넘침 정적 검사 (추정 경고만, 빌드는 진행)
  lintSlides(slidesDir, files);     // 빌드 가드 3종 (---·번호·data-expr)
  // 이미지 인라인 용량 경고: self-contained HTML이 너무 무거워지면(공유·로딩 부담) 알림
  if (imgStats.total > 4_000_000 || imgStats.big.length) {
    console.warn(`  ⚠ 인라인 이미지 ~${Math.round(imgStats.total / 1024 / 1024 * 10) / 10}MB (self-contained HTML에 박힘):`);
    for (const b of imgStats.big) console.warn(`    · ${b.file} ${b.kb}KB — 리사이즈/압축 권장(예: 폭 1600px, WebP)`);
    if (imgStats.total > 4_000_000) console.warn('    → 공유·로딩이 무거워짐. 큰 이미지는 줄이거나 http(s) URL로 외부 참조 고려.');
  }

  // PDF/PPTX는 브라우저 필요 → 먼저 탐색해 CHROME_PATH로 넘긴다(없으면 친절히 중단).
  const env = { ...process.env };
  if (fmt !== 'html') {
    const browser = findBrowser();
    if (!browser) { browserHelp(); return false; }
    env.CHROME_PATH = browser;
    if (/^\/mnt\/[a-z]\//.test(browser)) console.log(`  · WSL: Windows 브라우저 사용 (${browser.split('/').pop()})`);
  }
  try {
    execFileSync('npx', ['marp', tmp, '-c', CONFIG, ...THEME_ARGS, ...FMT[fmt], '-o', out], { stdio: ['ignore', 'inherit', 'inherit'], env });
  } catch (e) {
    if (fmt !== 'html') { browserHelp(); return false; }   // 브라우저 실행 실패 → cryptic 대신 안내
    throw e;
  }

  // HTML 출력 후처리
  if (fmt === 'html') {
    let html = readFileSync(out, 'utf8');
    // 발표자 노트(P키)에 마크다운 스타일 적용: Marp가 평문으로 넣은 노트 div를 렌더된 HTML로 교체.
    // 노트 '평문' 주입은 마크다운 단계 주석(robust)이고, 여기선 '스타일'만 입힌다(best-effort).
    // 속성 순서에 안 휘둘리게 lookahead로 class·data-index 둘 다 요구. 치환 수를 세서 조용한 실패를 경고로.
    let noteExpected = 0, noteDone = 0;
    files.forEach((f, i) => {
      const nn = String(parseInt((f.match(/^\d+/) || ['0'])[0], 10));
      const note = notes.get(nn);
      if (!note) return;
      noteExpected++;
      const re = new RegExp(`(<div\\b(?=[^>]*\\bclass="[^"]*\\bbespoke-marp-note\\b)(?=[^>]*\\bdata-index="${i}")[^>]*>)[\\s\\S]*?(</div>)`);
      html = html.replace(re, (mAll, p1, p3) => { noteDone++; return p1 + mdNote.render(note) + p3; });
    });
    if (noteExpected > 0 && noteDone < noteExpected)
      console.warn(`  ⚠ 발표자 노트 스타일 주입 ${noteDone}/${noteExpected}장만 성공 — Marp 노트 마크업(.bespoke-marp-note) 변경 의심. 노트 자체는 평문으로 보이나 스타일은 안 입혀짐 → build.mjs 노트 정규식 점검.`);
    // 노트는 있는데 매칭되는 슬라이드 번호가 없으면(고아 노트) 알린다.
    const slideNums = new Set(files.map(f => String(parseInt((f.match(/^\d+/) || ['0'])[0], 10))));
    for (const k of notes.keys())
      if (!slideNums.has(k)) console.warn(`  ⚠ notes.md의 '## ${k}…' 노트가 매칭되는 슬라이드 없음(고아) → 번호 확인.`);
    // Mermaid: ```mermaid → <div class="mermaid"> 치환 + 쓰는 덱에만 mermaid.js 주입
    const mm = renderMermaid(html);
    html = mm.html;
    // 애니메이터 JS 주입(PDF/PPTX는 정적이라 제외)
    if (html.includes('</body>')) {
      let inject = ANIM_JS;
      if (mm.used) inject += '\n' + mermaidLib() + '\n' + MERMAID_INIT;
      html = html.replace('</body>', inject + '\n</body>');
    }
    writeFileSync(out, html);
  }
  return true;
}

// 라이브 뷰어: 덱을 HTML로 빌드해 로컬 서버로 띄우고, 소스 변경 시 자동 재빌드 + 브라우저 자동 새로고침.
// 새로고침해도 Marp가 현재 슬라이드를 URL 해시(#번호)에 저장하므로 보던 자리로 복귀한다.
function serve(deck, port, open = true, theme = null) {
  const out = join(root, 'dist', `${theme ? `${deck}.${theme}` : deck}.html`);
  // 서버 응답에만 끼우는 라이브리로드 클라이언트(빌드 산출물은 깨끗하게 유지)
  const LIVE = `<script>
new EventSource('/__reload').addEventListener('reload',function(){location.reload();});
</script>
</body>`;
  const clients = [];

  if (!buildDeck(deck, 'html', theme)) process.exit(1);

  const server = createServer((req, res) => {
    if (req.url === '/__reload') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write(': connected\n\n');
      clients.push(res);
      req.on('close', () => { const i = clients.indexOf(res); if (i >= 0) clients.splice(i, 1); });
      return;
    }
    if (!existsSync(out)) { res.writeHead(404); res.end('아직 빌드 안 됨'); return; }
    const html = readFileSync(out, 'utf8').replace('</body>', LIVE);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  });
  const url = `http://localhost:${port}`;
  server.listen(port, () => {
    console.log(`\n▸ 라이브 뷰어: ${url}`);
    console.log(`  소스 저장 시 자동 재빌드 + 새로고침. 종료는 Ctrl+C.`);
    if (open) {
      const ok = openBrowser(url);
      console.log(ok ? `  ↗ 브라우저 새 창으로 열었습니다 (안 열려면 --no-open)\n`
                     : `  · 브라우저 자동 열기 실패 — 위 주소를 직접 여세요\n`);
    } else console.log('');
  });

  // slides/·_header.md·themes/·build.mjs 변경을 감시 → 디바운스 후 재빌드 + 클라이언트에 reload 신호
  let timer = null;
  const rebuild = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        if (buildDeck(deck, 'html', theme)) {
          clients.forEach(c => c.write('event: reload\ndata: 1\n\n'));
          console.log('  ↻ 재빌드 완료 → 새로고침');
        }
      } catch (e) { console.error('  ✗ 빌드 실패:', e.message); }
    }, 150);
  };
  for (const t of [join(root, 'decks', deck), join(root, 'themes'), join(root, 'build.mjs')]) {
    if (existsSync(t)) { try { watch(t, { recursive: true }, rebuild); } catch { watch(t, rebuild); } }
  }
}

const rawArgs = process.argv.slice(2);
const serveMode = rawArgs.includes('--serve');
const noOpen = rawArgs.includes('--no-open');   // --serve 시 브라우저 자동 열기 끄기
const portArg = rawArgs.find(a => a.startsWith('--port='));
const PORT = portArg ? (parseInt(portArg.split('=')[1]) || 4000) : 4000;
// 테마 override: --theme=<이름> > PPT_THEME 환경변수. 있으면 _header·_themes 무시하고 이 테마로.
const themeArg = rawArgs.find(a => a.startsWith('--theme='));
const cliTheme = themeArg ? themeArg.split('=')[1] : (process.env.PPT_THEME || null);
const positional = rawArgs.filter(a => !a.startsWith('--'));
const arg = positional[0];
const fmt = (positional[1] || 'html').toLowerCase();
if (!FMT[fmt]) { console.error(`✗ 알 수 없는 포맷: ${fmt} (html|pdf|pptx|png)`); process.exit(1); }

// decks/ 이하에서 slides/ 폴더를 가진 디렉토리(=덱)를 재귀로 찾는다.
// slides/가 없으면 그룹 폴더로 보고 더 깊이 탐색. .으로 시작하는 폴더(.obsidian 등)는 건너뜀.
function findDecks(dir, rel = '') {
  if (!existsSync(dir)) return [];
  let decks = [];
  for (const e of readdirSync(dir)) {
    if (e.startsWith('.')) continue;
    const full = join(dir, e);
    if (!statSync(full).isDirectory()) continue;
    const r = rel ? `${rel}/${e}` : e;
    if (existsSync(join(full, 'slides'))) decks.push(r);
    else decks = decks.concat(findDecks(full, r));
  }
  return decks;
}

const decksDir = join(root, 'decks');

// 덱이 빌드될 테마 목록: --theme/PPT_THEME override > _themes.txt(한 줄에 하나) > [null](=_header 기본 테마로 단일 빌드).
function deckThemes(deck) {
  if (cliTheme) return [cliTheme];
  const f = join(decksDir, deck, '_themes.txt');
  if (existsSync(f)) {
    const list = readFileSync(f, 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'));
    if (list.length) return list;
  }
  return [null];
}
let targets;
if (!arg || arg === 'all') {
  targets = findDecks(decksDir);
} else if (existsSync(join(decksDir, arg, 'slides'))) {
  targets = [arg];                          // 단일 덱 (docker/week1)
} else if (existsSync(join(decksDir, arg))) {
  targets = findDecks(join(decksDir, arg), arg);  // 그룹 폴더 (docker → 하위 덱 전부)
} else {
  console.error(`✗ 덱/그룹을 찾을 수 없음: decks/${arg}`); process.exit(1);
}
if (targets.length === 0) { console.error('✗ 빌드할 덱이 없습니다.'); process.exit(1); }

// 라이브 뷰어 모드: 덱 1개만 대상. (서버는 종료될 때까지 살아있으므로 process.exit 안 함)
if (serveMode) {
  if (targets.length !== 1) { console.error(`✗ --serve는 덱 1개만 가능합니다 (대상: ${targets.length}개)`); process.exit(1); }
  serve(targets[0], PORT, !noOpen, cliTheme);
} else {
  let ok = true;
  for (const d of targets) for (const t of deckThemes(d)) ok = buildDeck(d, fmt, t) && ok;
  process.exit(ok ? 0 : 1);
}
