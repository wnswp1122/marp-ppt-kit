---
description: 슬라이드에 전환 애니메이션·동적 컴포넌트(카운트업·막대·인터랙티브 슬라이더)를 넣는다
argument-hint: [deck] <슬라이드 번호> <무엇을 어떻게 — 자연어>
---

# 애니메이션 작업: $ARGUMENTS

슬라이드에 **전환(transition)** 또는 **동적 컴포넌트**를 추가·수정한다. 동적은 두 종류:
전환(장 넘길 때) · 등장 애니메이션(.count·.bar) · 인터랙티브(.sim 슬라이더).

## 덱 결정 (중요)
1. 인자에 덱 이름이 있으면 그것.
2. 없으면 `decks/.active` 파일을 읽어 기본 덱으로 사용 (`use <덱>`으로 설정됨).
3. 그래도 없으면 `decks/`에 덱이 하나뿐이면 그것, 여러 개면 사용자에게 확인.
→ "12번 슬라이드 ~~해줘"는 **활성 덱의 12번**(`slides/12-*.md`)으로 해석.

## 동결 규칙
- ✅ 수정 허용: 전환 지시(`<!-- transition: x -->`), 동적 마크업(`.count`·`.bar`·`.sim`·`data-*`), 필요한 `themes/tech.css` 동적 클래스.
- 🚫 건드리지 않음: 그 슬라이드의 **말(텍스트 내용)**·레이아웃 의미. 동적 표현만 더한다. (수치 더미는 사용자 요청대로)

## 어떤 걸 쓸지 (의도 → 컴포넌트)
`patterns/PATTERNS.md`의 "동적·애니메이션 카탈로그" 참고. 매핑:
- "전환 / 넘어갈 때" → 슬라이드 상단 `<!-- transition: fade|slide|cover|… -->` (그 장에 들어올 때 적용). 전역은 `_header.md`의 `transition:`.
- "숫자가 차오르게 / 등장 시" → `<span class="count" data-to="값" data-suffix="…">0</span>` (그 장 활성화 시 1회).
- "막대가 차오르게" → `<div class="bar" data-pct="80" data-label="…"></div>`.
- "슬라이더로 조절하며 변화" (예: 커넥션 풀) → `.sim` 인터랙티브:
  ```html
  <div class="sim" data-var="x" data-min="1" data-max="50" data-value="10">
  <label class="sim-ctrl">라벨 <span class="sim-now"></span><input type="range"></label>
  <div class="sim-row"><span>지표</span><div class="bar" data-expr="식(x)"></div><b class="sim-out" data-expr="식(x)" data-suffix=" 단위"></b></div>
  </div>
  ```
  `data-expr`는 Math 함수 + 변수(data-var)로 계산. 막대는 0~100 백분율, `.sim-out`은 숫자.

## 진행
1. 덱·슬라이드 번호 결정(위 규칙). 대상 파일 `decks/<덱>/slides/NN-*.md` 읽기.
2. 자연어 요청을 위 컴포넌트로 번역해 디자인 구역에 마크업 추가. 슬라이드 1장만 건드린다.
3. `node build.mjs <덱>` 빌드 → 에러 없는지 확인. (동적은 HTML 발표 전용 — PDF/PPTX는 정지)
4. 무엇을 어떤 컴포넌트로 넣었는지 보고. 확인은 `pv <덱>` → 해당 장에서 동작.

> 전환·동적은 **HTML 출력에서만** 움직인다. 새 동적 '종류'가 필요하면(게이지 등) `build.mjs`/`tech.css` 엔진 확장이 필요하다고 알린다.
