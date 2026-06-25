<!-- _class: content -->
## 표 + 코드 블록

| 포맷 | 용도 | 동적 |
|------|------|:----:|
| HTML | 발표 (기본) | ✅ |
| PDF | 배포·인쇄 | ❌ |
| PPTX | 호환 | ❌ |

```bash
node build.mjs example          # HTML (self-contained)
node build.mjs example pdf      # PDF (정지)
```
