# Brief: Marp 발표 툴킷 — 기능 종합 데모

> 이 툴킷의 **모든 기능을 한 덱에서** 보여주는 데모. 각 슬라이드 = 한 기능 시연(내용도 그 기능 설명).

## 맥락
- 청중: 이 툴킷을 처음 보는 사람
- 시간: 약 7~8분 (14장)
- 목적: 무엇이 가능한지 한 번에 보여주기 (레이아웃·컴포넌트·동적·전환·노트)
- 핵심 메시지(딱 1개): "마크다운 한 벌로 동적 HTML 발표가 다 나온다"

## 슬라이드 맵
| # | 파일 | 내용(무엇을) | 디자인(어떻게) / 시연 기능 |
|---|------|------------|--------------------------|
| 1 | [[01-cover]] | 제목 | `cover` |
| 2 | [[02-agenda]] | 목차 | `agenda` |
| 3 | [[03-section]] | 챕터 구분 | `section` |
| 4 | [[04-emphasis]] | 강조·제목·코드 | `content` + **파랑**·*초록*·==형광펜==·`code`·인용 |
| 5 | [[05-plugins]] | 플러그인 문법 | `content` + attrs `{.class}`·container `::: box`(accent/warn/danger) |
| 6 | [[06-two]] | 설명↔코드 | `two` 2단 |
| 7 | [[07-compare]] | PPT vs 마크다운 | `compare` 패널 |
| 8 | [[08-table-code]] | 포맷 비교 | `content` + 표 + 코드블록 |
| 9 | [[09-metrics]] | 도입 효과 | `metrics` + `.count` 카운트업(동적) |
| 10 | [[10-blank]] | 파이프라인 | `blank` + `.bar` 막대(동적) + `.cols3` 박스 |
| 11 | [[11-imgtext]] | 이미지 인라인 | `imgtext` + SVG(`assets/flow.svg`) |
| 12 | [[12-full]] | 임팩트 한 줄 | `full` + `transition: slide` 오버라이드 |
| 13 | [[13-quote]] | 핵심 인용 | `quote` |
| 14 | [[14-end]] | 마무리 | `end` |

> 전환: 전역 `transition: fade`(_header.md), 12장만 `slide`. 발표자 노트: `notes.md`에 마크다운 스타일 데모.
