# PPT 제작 디렉토리 — 작업 가이드

마크다운 기반 발표자료를 만드는 작업 환경. 도구는 **Marp**, 주 용도는 **기술/개발 발표**.
출력: **HTML(기본)** / PDF / PPTX. 진입점은 `홈.md`.

**설계 철학:** 동적 HTML 발표 우선, PDF/PPTX 휴대성은 포기. Marp는 픽셀 단위 자유 배치 도구가 아니다 — **내용 + 시스템(테마) 디자인** 중심.

## 구조

```
ppt/                         ← 작업 루트 (테마·패턴·빌드 공유)
├── themes/base.css          # 디자인 시스템 구조 (레이아웃 + 컴포넌트 + 동적) — 색 없음·var()만
├── themes/<name>.css        # 팔레트 = 색·폰트(:root)만. tech(다크)·light·mono·aurora
│                            #   빌드가 [팔레트 + base]를 합쳐 Marp 테마 생성 → 슬라이드 `theme:`로 선택
├── patterns/PATTERNS.md     # 레이아웃·컴포넌트 카탈로그 ← 작성 전 필독
├── templates/               # _header.md · brief.md · slide.md 템플릿
├── build.mjs                # 빌드 파이프라인 (HTML/PDF/PPTX + serve 뷰어)
├── decks/example/           # 레이아웃·컴포넌트 카탈로그(살아있는 스타일가이드 = 옛 showcase)
│                            #   기본 테마로 빌드, --theme=/PPT_THEME 로 테마 바꿔 확인 (테마 검증 하니스)
└── decks/<발표이름>/         ← 발표 1개 = slides/ 를 가진 디렉토리
    ├── _header.md           #  Marp 전역 설정 (theme·paginate·title) — 빌드가 맨 앞 1회 주입
    ├── brief.md             #  상담 결과 = 슬라이드별 내용+디자인 계획표
    ├── slides/NN-name.md    #  슬라이드 1장 = 파일 1개
    ├── notes.md             #  발표 대본 (선택) — `## NN` 섹션이 빌드 시 각 슬라이드 발표자 노트로 주입(P키)
    └── assets/              #  이미지 (빌드가 자동 생성)
```

**덱 = `slides/` 폴더를 가진 디렉토리.** 그룹핑 위해 깊이 제한 없이 중첩 가능: `decks/study/docker/week1/`.
`slides/` 없는 폴더는 **그룹**으로 간주 → 빌드가 재귀 탐색. 덱 식별자 = `decks/` 기준 상대경로(`study/docker/week1`),
출력도 구조 미러링(`dist/study/docker/week1.html`). 중간 그룹을 지정하면 하위 덱 전부 빌드.

## 핵심 원칙 2가지

### 1. 장당 파일
슬라이드 1장 = `slides/NN-name.md` 파일 1개. 번호 prefix로 순서 결정.
→ 병렬 생성(충돌 없음)·단일 수정·순서 변경이 쉽다.
**슬라이드 파일 안에 front matter(`---`)를 넣지 않는다.** 빌드가 슬라이드 구분자로 오인한다. 전역 설정은 `_header.md`에만.

### 2. 한 파일 2구역 (내용 ↔ 디자인 분리)
```markdown
<!-- _class: content -->     ← ① 디자인 구역: Marp 지시 + HTML 태그·클래스
# 제목                        ← ② 내용 구역: 제목·불릿·코드 = '말'
- 불릿
```
- **디자인 구역** = `<!-- _class -->`/`<!-- _* -->` Marp 지시, `<div class>` 등 HTML 래퍼, `themes/*.css`
- **내용 구역** = 마크다운 텍스트(제목·불릿·문단·코드의 글자)
- `/content`는 ②만, `/design`은 ①만 건드린다(동결 규칙).

## 디자인 = 2계층 (레이아웃 + 컴포넌트)

PowerPoint의 "슬라이드 레이아웃 + 도형"과 같은 모델. 둘 다 구조는 `themes/base.css`(색은 var()로만 참조)에 있고 카탈로그는 `patterns/PATTERNS.md`.

**테마 = 팔레트 교체.** 구조(`base.css`)는 그대로 두고 색·폰트만 담은 팔레트(`themes/<name>.css`의 `:root`)를 갈아끼우면 테마가 바뀐다. 빌드가 `[팔레트 + base]`를 합쳐 `.build/themes/`에 Marp 테마를 만들고 전부 등록 → 덱의 `_header.md` `theme:` 가 하나를 고른다. 기본 5종: `tech`(다크)·`light`(화이트)·`mono`(에디토리얼/세리프)·`aurora`(비비드)·`editorial`(네이비+오렌지 1포인트). **새 테마 = `tech.css` 복사 → `/* @theme 새이름 */` + `:root` 색만 수정.** 같은 내용을 테마별로 확인하는 하니스가 `decks/example/`(덱 하나): 기본 테마로 빌드하거나 `--theme=<이름>`/`PPT_THEME`로 테마를 바꿔 본다(`node build.mjs example --theme=editorial` → `dist/example.editorial.html`, `pv example --theme=editorial`로 라이브). 테마 지정은 `_header.md`의 `theme:`(기본) 또는 `--theme=`/`PPT_THEME`(override) 한 곳.

- **레이아웃** = `<!-- _class: 이름 -->` 한 줄, **슬라이드당 1개**. (CSS: `section.이름`) — 12종:
  `cover`(표지) · `section`(챕터구분) · `agenda`(목차) · `content`(기본본문) · `two`(좌우2단) ·
  `compare`(비교) · `imgtext`(이미지+설명) · `full`(풀스크린) · `quote`(인용) · `metrics`(지표) · `blank`(빈/자유) · `end`(마무리)
- **컴포넌트** = `<div class="이름">`, 한 슬라이드에 **여러 개**. (CSS: `.이름`) — `.box`(accent/warn/danger) · `.metric`+`.cols3` · `.cols` · 표 · 코드블록 · 동적(`.count`·`.bar`)
- 전체 데모: `decks/example` (`node build.mjs example` → 5테마 빌드, `dist/example.<테마>.html`).
- **컴포넌트 승격 기준:** 내용 빠진 채 다른 발표에서도 또 쓸 일반적 모양이면 공용으로(2~3번 반복·이름 가치 있을 때). 1회성은 슬라이드 인라인.

## 워크플로우 (스킬 = 모드)

| 스킬 | 모드 | 핵심 |
|------|------|------|
| `/brainstorm <주제>` | 같이 고민 | 슬라이드별 내용+디자인 계획 → `brief.md`. 슬라이드는 아직 안 만듦 |
| `/generate [deck]` | 병렬 생성 | brief 맵 기준 장당 1에이전트(`executor`) fan-out |
| `/slide <deck> <n>` | 한 장 작업 | 특정 슬라이드 생성·수정(동결 없음) |
| `/content <deck> [n]` | 내용만 | 디자인 동결, 말만 수정 |
| `/design <deck> [n]` | 디자인만 | 내용 동결, 레이아웃·클래스·테마만 |
| `/notes <deck> [n]` | 대본만 | 슬라이드 동결, `notes.md`에 발표 대본 작성 → 발표자 노트로 주입 |
| `/animate [deck] <n>` | 동적만 | 전환·동적 컴포넌트(.count·.bar·.sim) 추가. 슬라이드 말·레이아웃 동결 |
| `/diagram [deck] <n> <설명>` | 다이어그램 | Mermaid/CSS 박스로 그래프 작성. 시각 품질 규칙 강제(LR 기본·노드≤8·짧은 라벨·눈 검증) |
| `/review <deck>` | 검토만 | 별도 패스로 `critic`이 서사·과밀·동결·흐름·디자인 진단(고치지 않음) |
| `/build <deck> [fmt]` | 빌드 | `node build.mjs` 호출 |
| `/reference <파일>` | 레퍼런스 흡수 | 참고자료(PDF/HTML/PPTX/이미지) 분석 → 추출 메뉴 질문 → 색·컴포넌트·패턴을 `themes/`·`base.css`·`PATTERNS.md`에 반영(제안→승인). 덱 제작과 별개의 **메타** 스킬 |

전형적 흐름: `/brainstorm` → `/generate` → (`/slide`·`/content`·`/design` 다듬기) → `/review` → `/build`
작성과 검토는 **다른 패스**로 분리한다 — 검토는 `/review`(내부적으로 `critic`/`code-reviewer`에 위임).

**`/reference` 자연어 트리거(ppt 안에서만):** 사용자가 **PDF/HTML/PPTX/이미지 파일을 주면** → "reference 스킬로 분석·추출할까요?"를 **먼저 묻고** 예일 때 실행. 사용자가 **"추출해·레퍼런스로·이 스타일 가져와·흡수해"** 등 명시적 의도를 말하면 → 바로 `/reference` 실행. (단순 "이 파일 뭐야?" 내용 질문엔 발동 안 함.)

## 슬라이드 작성 규칙

- 새 슬라이드는 **먼저 `patterns/PATTERNS.md`에서 레이아웃·컴포넌트를 찾아** 적용.
- 한 슬라이드 = 한 메시지. 불릿 6개 이하, 한 줄 2줄 이내.
- 코드 블록은 언어 명시, 핵심 라인만 10줄 이내.
- 강조: `**파랑**`(strong), `*초록*`(em), `==형광펜==`(mark, 주황). 박스: `.box accent/warn/danger`.
- **마크다운 친화 문법(플러그인 켜짐, `marp.config.mjs`)**: 클래스는 HTML 래퍼 대신 `텍스트 {.box .accent}`(attrs)나 `::: box warn … :::`(container) 블록으로. 결과는 `<div class>`와 동일. 상세 `PATTERNS.md` B-2.
- 한국어 덱은 한국어로 일관되게.
- 다이어그램 3택(`PATTERNS.md` B): ① CSS 박스 체인(의존성0·전 포맷·간단) ② ```` ```mermaid ````(빌드가 mermaid.js 주입해 HTML 런타임 렌더·분기/시퀀스 등 복잡한 그래프·**HTML 전용**) ③ SVG/PNG 미리렌더(전 포맷). mermaid는 `npm i mermaid` 시 인라인(self-contained).
- **이미지**: `decks/<덱>/assets/`에 두고 **덱 루트 기준** `![](assets/이름.png)`(크기 `![w:400](...)`)으로 참조.
  빌드가 base64로 HTML에 인라인(self-contained) → `dist/*.html` 한 파일만 열거나 공유해도 보임.
  `assets/`는 빌드 시 자동 생성. 없는 파일은 `⚠ 이미지 없음` 경고. http(s) URL은 그대로 링크.
  인라인 총량이 크거나(>4MB) 단일 이미지가 크면(>1.5MB) `⚠ 인라인 이미지 …MB` 경고 → 리사이즈/압축(폭 ~1600px·WebP)하거나 큰 건 http(s) 외부 참조 고려.
- **동적 컴포넌트(HTML 전용)**: `.count`(카운트업)·`.bar`(막대)는 빌드가 애니메이션 JS를 HTML에 자동 주입.
  슬라이드엔 데이터 속성만(`data-to`·`data-pct` 등). 전환 효과는 `<!-- transition: fade -->`. PDF/PPTX는 정지. 상세 `PATTERNS.md` 11.

## 빌드 & 뷰어

```bash
node build.mjs <덱>            # HTML → dist/<덱>.html (기본, self-contained)
node build.mjs <덱> pdf        # PDF  (headless 브라우저 필요)
node build.mjs <덱> pptx       # PPTX (headless 브라우저 필요)
node build.mjs <덱> png        # 슬라이드별 PNG → dist/<덱>.shots/slide.NNN.png (시각 검토·미리보기, 브라우저 필요)
node build.mjs <그룹>          # 그룹 하위 덱 전부 (예: study/docker)
node build.mjs all             # decks/** 전부 (중첩 재귀)
node build.mjs <덱> --serve    # 라이브 뷰어 (--port=N, 기본 4000 · --no-open 으로 자동 열기 끄기)
node build.mjs <덱> --theme=editorial  # _header 테마 무시·그 테마로 → dist/<덱>.editorial.html (PPT_THEME=editorial 도 동일)
```
- **`--serve`**: 로컬 서버 + `slides/`·`themes/`·`_header.md` 감시 → 저장 시 자동 재빌드 + 브라우저 자동 새로고침.
  **시작 시 브라우저 새 창을 자동으로 연다**(크로미움 계열 `--new-window`, 못 찾으면 OS 기본 열기 폴백 — WSL이면 `explorer.exe`). 끄려면 `--no-open`.
  현재 슬라이드는 URL 해시로 유지(1페이지로 안 튕김). 디스크의 `dist/*.html`은 항상 깨끗(리로드 코드는 서버 응답에만).
  덱 1개만 대상. **편집 중엔 `--serve`, 내보낼 땐 일반 빌드.**
- **PDF/PPTX/PNG 브라우저**: 빌드가 `CHROME_PATH` → PATH의 chromium/chrome → **로컬 `./chrome/`**(`npx @puppeteer/browsers install chrome`로 받은 것·gitignore) → (WSL이면) Windows Chrome/Edge 순으로 자동 탐색해 marp에 넘긴다. 못 찾거나 실행 실패 시 cryptic 트레이스 대신 **설치/`CHROME_PATH` 안내**를 띄우고 중단(HTML은 브라우저 없이 됨). WSL→Windows 브라우저는 headless 실행이 자주 실패하니, 안 되면 `npx @puppeteer/browsers install chrome`로 리눅스 chromium을 받으면 자동 탐색된다(가장 안정적). `png`는 `/review`의 시각 검토 패스가 쓴다.
- **출력 HTML 직접 수정 금지**(빌드 시 덮어쓰임). 미세조정은 브라우저 DevTools로 실험 후 값을 옮겨 적기 — 구조는 `themes/base.css`, 색은 팔레트(`themes/<name>.css`), 1회성은 슬라이드.
- 단축 별칭(개인 `~/.bashrc`): `ppt <덱> [fmt]`(빌드) · `pv <덱> [--theme=N]`(라이브 뷰어, 기본 포트 1122) · `po <덱> [테마]`(빌드된 `dist/<덱>[.테마].html` 열기) · `pptime <덱>`(예상 발표 시간) · `use <덱>`(활성 덱 지정) · `deck`(현재 활성 덱). 덱 이름 Tab 자동완성.
- **활성 덱(`decks/.active`)**: `use <덱>`으로 지정. 스킬·대화에서 덱을 생략하면("12번 슬라이드 …") 이 파일을 기본 대상으로 읽는다(없으면 유일/최근 덱, 그래도 모호하면 확인). `.active`는 `.`으로 시작해 빌드 탐색에서 제외됨.
- **발표자 노트(대본)**: `decks/<덱>/notes.md`에 `## NN-이름` 섹션으로 쓰면 빌드가 해당 슬라이드 발표자 노트로 주입. `/notes`로 작성. 슬라이드 본문과 분리된 제4구역.
  - P키 발표자뷰는 **별도 창**으로 열림 → 화면공유 시 슬라이드 창만 공유하면 대본은 안 보임(발표자만 봄).
  - 노트는 **줄글 대본이 아니라 키포인트 요약**(불릿·`**굵게**`). 빌드가 노트 마크다운을 P키 노트에 렌더해 넣음(`**`·`-`·`>`·`==형광펜==`·코드 표시됨).
- **오버플로 경고**: 빌드가 슬라이드별 렌더 높이를 정적 추정해 캔버스(720px)를 넘길 위험이 있으면 `⚠ 넘침 위험 … 채움 ~124% (불릿 8 · 코드 7줄)`로 경고(빌드는 그대로 진행). headless 불필요·추정치 → 실물 확인 권장. 경고가 뜨면 불릿/코드 줄이기·2단 분할·폰트 축소로 대응.
- **빌드 가드 3종**(`⚠ 빌드 가드 N건`): ① 본문 속 `---`/`***`/`___`(수평선 → 빈 슬라이드로 쪼개짐, 쓰지 말 것) ② NN 번호 0채움 불일치·중복(정렬·노트 매칭 깨짐) ③ `.sim`의 `data-expr` 수식 구문 오류(런타임에 조용히 0). 경고가 뜨면 해당 슬라이드를 고친 뒤 재빌드.
- 빌드 후 에러 없이 산출물이 생성됐는지 + 넘침·가드 경고가 없는지 확인하고 완료를 보고한다.

## 발표 / 열기

빌드 HTML은 Marp bespoke 인터랙티브 발표 화면. **키보드**: `←`/`→` 이동 · `Space` 다음 · `F` 전체화면 · `P` 발표자뷰 · `O` 전체보기.
OS별 열기: Win `start dist\<덱>.html` · Mac `open ...` · Linux `xdg-open ...` · WSL `explorer.exe dist/<덱>.html`.
발표는 **완성된 `dist/<덱>.html`** 로(서버 의존 없이 안정적). 전환효과는 Chrome 권장.
