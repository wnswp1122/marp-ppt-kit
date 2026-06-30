<!-- _class: content -->
## 동적 컴포넌트 (HTML 전용 · `/animate`)

가용성 <span class="count" data-to="99.9" data-suffix="%">0</span> · 지연 <span class="count" data-to="-40" data-suffix="%">0</span>

<div class="bar" data-pct="80" data-label="Python"></div>
<div class="bar warn" data-pct="55" data-label="Go"></div>

<div class="sim" data-var="slides" data-min="3" data-max="30" data-value="7">
<label class="sim-ctrl">슬라이드 수 <span class="sim-now"></span>장<input type="range"></label>
<div class="sim-row"><span>예상 시간</span><div class="bar" data-expr="min(100, slides*5.5)"></div><b class="sim-out" data-expr="round(slides*50/60)" data-suffix=" 분"></b></div>
</div>

카운트업·막대는 등장 시 1회 · **슬라이더는 드래그하면 실시간**. PDF/PPTX는 정지. {.src}
