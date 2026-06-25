// Marp 엔진 확장 — markdown-it 플러그인 3종.
// build.mjs 가 marp 호출 시 -c 로 이 파일을 넘긴다(빌드 파이프라인이 자동 적용).
//   1) attrs     : 마크다운 요소에 {.class #id key=val} 인라인 부여
//   2) container : `::: 클래스명` … `:::` → <div class="클래스명"> (임의 클래스 지원)
//   3) mark      : ==하이라이트== → <mark>
// 룩(색·여백)은 themes/tech.css 가 정의. 플러그인은 클래스를 '연결'만 한다.
import attrs from 'markdown-it-attrs';
import container from 'markdown-it-container';
import mark from 'markdown-it-mark';

export default {
  engine: ({ marp }) => {
    marp
      .use(attrs)
      .use(mark)
      // 이름을 'block'으로 등록하되 validate를 항상 통과시켜 `::: 무엇이든` 을 받는다.
      // info(::: 뒤 문자열)를 그대로 class 로 출력 → `::: box accent` → <div class="box accent">.
      .use(container, 'block', {
        validate: () => true,
        render(tokens, idx) {
          if (tokens[idx].nesting !== 1) return '</div>\n';
          const cls = tokens[idx].info.trim();
          return `<div class="${marp.markdown.utils.escapeHtml(cls)}">\n`;
        },
      });
    // 빌드가 인라인한 data:image base64 를 ![](…) 이미지로 허용한다.
    // (markdown-it 기본 validateLink 가 보안상 data: 를 막아 `![](data:…)` 가 텍스트로 새던 버그)
    const origValidate = marp.markdown.validateLink.bind(marp.markdown);
    marp.markdown.validateLink = (url) => /^data:image\//i.test(url) || origValidate(url);
    return marp;
  },
};
