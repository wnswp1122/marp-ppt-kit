<!-- _class: blank -->
## 슬라이드 수 → 예상 발표 (직접 조절)

<div class="sim" data-var="slides" data-min="3" data-max="30" data-value="7">
<label class="sim-ctrl">슬라이드 수 <span class="sim-now"></span>장<input type="range"></label>
<div class="sim-row"><span>예상 시간</span><div class="bar" data-expr="min(100, slides*5.5)"></div><b class="sim-out" data-expr="round(slides*50/60)" data-suffix=" 분"></b></div>
<div class="sim-row"><span>불릿 한도</span><div class="bar warn" data-expr="min(100, slides*3.3)"></div><b class="sim-out" data-expr="slides*6" data-suffix=" 개"></b></div>
<div class="sim-row"><span>생성 에이전트</span><div class="bar danger" data-expr="min(100, slides*3.3)"></div><b class="sim-out" data-expr="slides" data-suffix=" 명"></b></div>
</div>

슬라이더를 드래그하면 1장당 50초·불릿6개 기준으로 실시간 환산 {.src}
