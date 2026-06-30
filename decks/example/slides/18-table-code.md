<!-- _class: content -->
## 표 · 코드블록

| 포맷 | 동적 | 용도 |
|------|------|------|
| HTML | ✅ | 발표(기본) |
| PDF | ❌ | 공유·인쇄 |
| PPTX | ❌ | 편집 |

```python
def build(deck, theme="tech"):
    return render(deck, palette=theme)   # 핵심 라인만 10줄 이내
```

표는 마크다운 그대로 · 코드는 **언어 명시** {.src}
