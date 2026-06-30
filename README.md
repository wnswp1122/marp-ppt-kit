# 📊 marp-ppt-kit

> 마크다운으로 쓰고, **테마를 갈아끼우고**, HTML·PDF·PPTX로 빌드하는 발표자료 제작 툴킷.
> [Marp](https://marp.app) 위에 **디자인 시스템 + Claude Code 워크플로우**를 얹었다.

기술/개발 발표를 빠르게 만들기 위한 작업 환경이다. 슬라이드는 평범한 마크다운으로 쓰고,
디자인은 CSS 테마가 책임진다. 출력은 **HTML(기본)** · PDF · PPTX 세 가지.

```bash
npm install
node build.mjs example         # → dist/example.html (레이아웃·컴포넌트 카탈로그, 기본 tech)
```

---

## 왜 이걸 쓰나

PowerPoint처럼 도형을 픽셀 단위로 미는 도구가 **아니다.** 내용은 마크다운, 디자인은 시스템(테마)이 맡는다.

- **장당 파일** — 슬라이드 1장 = 파일 1개(`slides/NN-name.md`). 병렬 작성·순서 변경·단일 수정이 쉽다.
- **내용 ↔ 디자인 분리** — 한 파일 안에서 '말'(마크다운)과 '디자인'(Marp 지시·HTML 클래스)을 구역으로 나눈다.
- **2계층 디자인** — `레이아웃`(슬라이드당 1개) + `컴포넌트`(여러 개). PPT의 "슬라이드 레이아웃 + 도형"과 같은 모델.
- **테마 = 팔레트 교체** — 구조는 그대로 두고 색·폰트만 바꾸면 테마가 바뀐다. 기본 5종 제공.

---

## ✅ 요구사항

| 항목 | 필요 | 비고 |
|------|------|------|
| **Node.js** | 18+ (권장 20+) | ESM 기반. 빌드 파이프라인 실행 |
| **npm 패키지** | `npm install` 한 번 | Marp CLI + 마크다운 플러그인 + mermaid |
| **Chrome/Chromium** | PDF·PPTX 출력 시에만 | HTML 출력은 **브라우저 불필요** |

> HTML만 쓸 거라면 Node와 `npm install`이면 끝. PDF/PPTX는 아래 [OS별 설정](#-os별-설정) 참고.

---

## 🚀 빠른 시작

```bash
git clone <이 레포 주소>
cd marp-ppt-kit
npm install

# 데모 빌드 — 살아있는 스타일가이드 (레이아웃·컴포넌트 카탈로그)
node build.mjs example              # 기본 테마(tech) → dist/example.html
node build.mjs example editorial    # 덱 뒤에 테마명만 → dist/example.editorial.html (--theme=editorial·PPT_THEME 도 동일)

# 편집 중엔 라이브 뷰어 (저장 시 자동 재빌드 + 브라우저 새로고침)
node build.mjs example --serve            # 다른 테마 라이브: node build.mjs example editorial --serve · --port=N

# 출력
node build.mjs <덱> pdf             # PDF  (Chrome 필요)
node build.mjs <덱> pptx            # PPTX (Chrome 필요)
node build.mjs <덱> png             # 슬라이드별 PNG → dist/<덱>.shots/ (시각 검토·미리보기, Chrome 필요)
node build.mjs all                  # decks/** 전부
```

빌드된 `dist/<덱>.html`은 **self-contained** — 이미지·JS가 전부 인라인이라 파일 하나만 열거나 공유하면 된다.

---

## 💻 OS별 설정

빌드 자체는 모든 OS에서 동일하게 동작한다. OS 차이는 **① PDF/PPTX용 브라우저 탐색**과 **② 결과 HTML 열기** 두 군데뿐이며, 빌드 스크립트가 대부분 자동 처리한다.

### PDF / PPTX 브라우저 (출력 시에만)

Marp가 headless 브라우저로 렌더한다. 빌드는 `CHROME_PATH` → PATH의 chromium/chrome → (WSL이면) Windows Chrome/Edge 순으로 **자동 탐색**한다. 못 찾으면 cryptic 트레이스 대신 설치 안내를 띄우고 멈춘다.

<details>
<summary><b>🐧 Linux</b></summary>

```bash
sudo apt install chromium-browser      # 또는 Google Chrome 설치
# 경로를 직접 잡고 싶으면:
export CHROME_PATH=/usr/bin/chromium-browser
```
가장 안정적인 조합이다.
</details>

<details>
<summary><b>🍎 macOS</b></summary>

Google Chrome이 설치돼 있으면 보통 자동 인식된다. 안 되면:
```bash
export CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```
HTML 열기는 `open dist/<덱>.html`.
</details>

<details>
<summary><b>🪟 Windows (네이티브)</b></summary>

설치된 Chrome/Edge를 보통 자동 인식한다. 안 되면 환경변수로 경로 지정:
```powershell
$env:CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
```
HTML 열기는 `start dist\<덱>.html`.
</details>

<details>
<summary><b>🧩 WSL (Windows + Linux)</b></summary>

빌드가 `/mnt/c/Program Files/...`의 Windows Chrome/Edge를 자동 탐색한다. 다만 WSL→Windows 브라우저는 네트워크 이슈로 실패할 수 있어 **리눅스 chromium 설치가 가장 안정적**이다.
```bash
sudo apt install chromium-browser
# 또는 Windows 브라우저를 명시:
export CHROME_PATH="/mnt/c/Program Files/Google/Chrome/Application/chrome.exe"
```
HTML 열기는 `explorer.exe dist/<덱>.html`.
</details>

### 결과 HTML 열기

| OS | 명령 |
|----|------|
| Windows | `start dist\<덱>.html` |
| macOS | `open dist/<덱>.html` |
| Linux | `xdg-open dist/<덱>.html` |
| WSL | `explorer.exe dist/<덱>.html` |

> `--serve` 모드는 시작 시 **브라우저 새 창을 자동으로 연다**(OS 자동 감지, WSL이면 `explorer.exe`). 끄려면 `--no-open`.

### (선택) 셸 별칭

`~/.bashrc`에 함수로 넣으면 짧아진다(덱·테마 Tab 자동완성도 가능). 예:

```bash
ppt() { node ~/경로/marp-ppt-kit/build.mjs "$@"; }   # ppt <덱> [테마|fmt]   예: ppt example editorial
pv()  { ppt "$@" --serve --port=1122 --no-open; }    # 라이브 뷰어 (새창 안 띄움)  예: pv example editorial
```
> `po`(빌드된 HTML 열기)·`use`/`deck`(활성 덱) 같은 함수도 취향껏. 저장소엔 개인 별칭을 커밋하지 않는다 — 본인 환경에서만.

---

## 🤖 Claude Code 워크플로우 (선택)

이 저장소는 [Claude Code](https://claude.com/claude-code)로 발표를 만드는 데 최적화돼 있다. `.claude/commands/`에 슬래시 커맨드가 들어있어, 채팅에서 모드처럼 호출한다. **Claude Code 없이도 수동으로 마크다운을 쓰고 빌드하면 그대로 동작한다.**

| 커맨드 | 모드 | 핵심 |
|--------|------|------|
| `/brainstorm <주제>` | 같이 기획 | 슬라이드별 내용+디자인 계획 → `brief.md` |
| `/generate [deck]` | 병렬 생성 | brief 맵 기준 장당 1에이전트 fan-out |
| `/slide <deck> <n>` | 한 장 작업 | 특정 슬라이드 생성·수정 |
| `/content <deck> [n]` | 내용만 | 디자인 동결, 말만 수정 |
| `/design <deck> [n]` | 디자인만 | 내용 동결, 레이아웃·클래스·테마만 |
| `/diagram <deck> <n>` | 다이어그램 | Mermaid/CSS 박스, 시각 품질 규칙 강제 |
| `/animate <deck> <n>` | 동적만 | 전환·카운트업·막대 등 동적 컴포넌트 |
| `/notes <deck> [n]` | 대본만 | `notes.md`에 발표 대본 → 발표자 노트 주입 |
| `/review <deck>` | 검토만 | 별도 패스 — 슬라이드를 **이미지로 렌더해** 서사·과밀·정렬·대비 시각 진단(리포트만) |
| `/build <deck> [fmt]` | 빌드 | `node build.mjs` 호출 |
| `/reference <파일>` | 레퍼런스 흡수 | PDF/HTML/PPTX/이미지 분석 → 색·컴포넌트·패턴을 디자인 시스템에 반영 |

전형적 흐름: `/brainstorm` → `/generate` → (`/slide`·`/content`·`/design` 다듬기) → `/review` → `/build`

> 일부 커맨드는 [oh-my-claudecode](https://github.com/) 같은 에이전트 오케스트레이션 레이어를 참조하지만, 없어도 Claude Code 기본 기능으로 동작한다.

---

## 📁 구조

```
marp-ppt-kit/
├── themes/base.css          # 디자인 시스템 구조 (레이아웃+컴포넌트) — 색 없음, var()만
├── themes/<name>.css        # 팔레트 = 색·폰트(:root)만. tech·light·mono·aurora·editorial
├── patterns/PATTERNS.md     # 레이아웃·컴포넌트 카탈로그 ← 작성 전 필독
├── templates/               # _header.md · brief.md · slide.md · notes.md 템플릿
├── build.mjs                # 빌드 파이프라인 (HTML/PDF/PPTX + serve 뷰어)
├── marp.config.mjs          # Marp 엔진 확장 (markdown-it 플러그인 3종)
├── decks/example/           # 레이아웃·컴포넌트 카탈로그(스타일가이드 = 옛 showcase)
│                            #   기본 테마로 빌드, --theme=/PPT_THEME 로 테마 바꿔 확인 = 테마 검증 하니스
└── decks/<발표이름>/         # 발표 1개 = slides/ 를 가진 디렉토리
    ├── _header.md           #   Marp 전역 설정 (theme·paginate·title)
    ├── brief.md             #   상담 결과 = 슬라이드별 내용+디자인 계획표
    ├── slides/NN-name.md    #   슬라이드 1장 = 파일 1개
    ├── notes.md             #   발표 대본 (선택)
    └── assets/              #   이미지 (빌드가 base64 인라인)
```

**덱 = `slides/` 폴더를 가진 디렉토리.** 그룹핑을 위해 깊이 제한 없이 중첩 가능(`decks/study/docker/week1/`). 출력도 구조를 미러링한다(`dist/study/docker/week1.html`).

---

## 🎨 테마

테마는 **팔레트 교체**다. 구조(`themes/base.css`)는 그대로 두고 색·폰트만 담은 팔레트(`themes/<name>.css`의 `:root`)를 갈아끼운다. 빌드가 `[팔레트 + base]`를 합쳐 Marp 테마를 만들고, 덱의 `_header.md` `theme:`가 하나를 고른다.

| 테마 | 성격 |
|------|------|
| `tech` | 다크 (기본) |
| `light` | 화이트 |
| `mono` | 에디토리얼 / 세리프 |
| `aurora` | 비비드 |
| `editorial` | 라이트 · 네이비 잉크 + 오렌지 1포인트 |

**새 테마 만들기:** `tech.css` 복사 → `/* @theme 새이름 */` 와 `:root` 색만 수정. 끝.

---

## 📐 작성 규칙 (요약)

- 새 슬라이드는 **먼저 `patterns/PATTERNS.md`에서 레이아웃·컴포넌트를 찾아** 적용한다.
- 한 슬라이드 = 한 메시지. 불릿 6개 이하, 한 줄 2줄 이내.
- 슬라이드 파일 안에 front matter(`---`)를 넣지 않는다 — 빌드가 슬라이드 구분자로 오인한다. 전역 설정은 `_header.md`에만.
- 강조: `**파랑**`(strong) · `*초록*`(em) · `==형광펜==`(mark). 클래스는 `텍스트 {.box .accent}` 또는 `::: box warn … :::`.
- 다이어그램 3택: ① CSS 박스 체인(의존성0·전 포맷) ② ` ```mermaid `(HTML 런타임 렌더) ③ SVG/PNG 미리렌더.
- 동적 컴포넌트(`.count`·`.bar`)는 **HTML 전용** — 빌드가 애니메이션 JS를 자동 주입. PDF/PPTX에선 정지.

자세한 카탈로그와 문법은 [`patterns/PATTERNS.md`](patterns/PATTERNS.md), 전체 작업 규칙은 [`CLAUDE.md`](CLAUDE.md) 참고.

---

## 🛠 빌드 가드 / 경고

빌드가 출력 전 정적 점검을 한다 — 슬라이드별 렌더 높이를 추정해 **오버플로 위험**을 경고하고, 본문 속 수평선(`---`)·NN 번호 불일치·`.sim` 수식 오류 등 **빌드 가드 3종**을 잡아준다. 경고가 뜨면 해당 슬라이드를 고친 뒤 재빌드한다.

---

## 📄 라이선스

[MIT](LICENSE)
