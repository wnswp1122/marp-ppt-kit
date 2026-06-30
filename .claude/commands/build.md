---
description: 슬라이드 파일들을 합쳐 HTML/PDF/PPTX/PNG로 빌드한다
argument-hint: <deck-name> [html|pdf|pptx|png|테마]
---

# 빌드: $ARGUMENTS

`build.mjs`로 `_header.md` + `slides/*.md`를 합쳐 발표물을 생성한다.

## 진행
1. deck-name 확인(없으면 `decks/`에서 결정). 포맷 기본 html.
2. 실행:
   - HTML: `node build.mjs <deck-name>`
   - PDF: `node build.mjs <deck-name> pdf` · PPTX: `… pptx` · PNG(시각검토): `… png` (셋 다 headless 브라우저 필요)
   - 다른 테마로: `node build.mjs <deck-name> <테마>` (덱 뒤에 테마명 바로, 예: `… editorial`) → `dist/<deck-name>.<테마>.html`. `--theme=`/`PPT_THEME`도 동일.
   - 전체: `node build.mjs all`
3. 에러 없이 `dist/<deck-name>.<ext>` 생성됐는지 + 넘침·가드 경고 없는지 확인하고 경로를 보고한다.
4. 빌드 에러가 나면 원인(보통 잘못된 HTML 태그, 파일 내 `---` front matter 오삽입)을 찾아 고친 뒤 재빌드한다.
