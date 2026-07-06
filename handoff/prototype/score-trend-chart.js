// <score-trend-chart> — renders a stacked area "score trend" chart into its own root.
// Prefers Recharts (loaded from CDN after app mount) for a polished area-stack; if Recharts
// isn't available within a short window, falls back to an equivalent native SVG stacked-area
// chart so a chart ALWAYS renders (offline / CDN-blocked environments included).
// Reads a JSON `data` attribute:
//   { data:[{name, <domainLabel>:pts,...}], keys:[{key,label,color}], target, targetLabel,
//     targetColor, axisColor, gridColor, tooltipBg, tooltipBorder, tooltipInk, height }
(function () {
  function parse(el) { try { return JSON.parse(el.getAttribute('data') || '{}'); } catch (e) { return {}; } }

  // ---- Recharts path ----
  function drawRecharts(el, cfg) {
    var R = window.Recharts, React = window.React, ReactDOM = window.ReactDOM;
    if (!R || !React || !ReactDOM || !ReactDOM.createRoot) return false;
    var data = cfg.data || [], keys = cfg.keys || [], h = React.createElement;
    var defs = h('defs', null, keys.map(function (k) {
      return h('linearGradient', { id: 'stc_' + k.key, key: k.key, x1: 0, y1: 0, x2: 0, y2: 1 },
        h('stop', { offset: '5%', stopColor: k.color, stopOpacity: 0.3 }),
        h('stop', { offset: '95%', stopColor: k.color, stopOpacity: 0 }));
    }));
    var areas = keys.map(function (k) {
      return h(R.Area, { key: k.key, type: 'monotone', dataKey: k.label, stackId: '1', stroke: k.color, strokeWidth: 1.5, fill: 'url(#stc_' + k.key + ')', isAnimationActive: false, dot: false, activeDot: { r: 3 } });
    });
    var children = [
      defs,
      h(R.CartesianGrid, { key: 'g', strokeDasharray: '3 3', stroke: cfg.gridColor, vertical: false }),
      h(R.XAxis, { key: 'x', dataKey: 'name', tick: { fontSize: 10, fill: cfg.axisColor }, axisLine: { stroke: cfg.gridColor }, tickLine: false, interval: 'preserveStartEnd' }),
      h(R.YAxis, { key: 'y', domain: [0, 100], ticks: [0, 25, 50, 75, 100], tick: { fontSize: 10, fill: cfg.axisColor }, axisLine: false, tickLine: false, width: 30 }),
      h(R.Tooltip, { key: 't', contentStyle: { background: cfg.tooltipBg, border: '1px solid ' + cfg.tooltipBorder, borderRadius: 10, fontSize: 12, fontFamily: 'Public Sans, sans-serif', color: cfg.tooltipInk }, labelStyle: { color: cfg.tooltipInk, fontWeight: 600 }, formatter: function (v, n) { return [Math.round(v) + ' pts', n]; } })
    ];
    if (cfg.target != null) children.push(h(R.ReferenceLine, { key: 'tg', y: cfg.target, stroke: cfg.targetColor, strokeDasharray: '4 3', strokeWidth: 1, label: { value: cfg.targetLabel || ('TARGET ' + cfg.target), position: 'insideTopLeft', fontSize: 9, fill: cfg.axisColor, fontFamily: 'IBM Plex Mono, monospace' } }));
    children = children.concat(areas);
    var chart = h(R.ResponsiveContainer, { width: '100%', height: cfg.height || 240 },
      h(R.AreaChart, { data: data, margin: { top: 10, right: 22, left: 4, bottom: 0 } }, children));
    if (!el.__root) el.__root = ReactDOM.createRoot(el);
    el.__native = false;
    el.__root.render(chart);
    return true;
  }

  // ---- Native SVG fallback: the previous single-color BAR chart (bars colored by
  //      performance vs target: Strong green / Developing amber / Weak red). ----
  function drawNative(el, cfg) {
    var data = cfg.data || [], keys = cfg.keys || [];
    var VBW = 600, padL = 30, padR = 12, padT = 12, chartH = (cfg.height || 240) - 46, axisY = padT + chartH;
    var n = data.length, innerW = VBW - padL - padR;
    var target = cfg.target != null ? cfg.target : 70;
    function xAt(i) { return n > 1 ? padL + i * (innerW / (n - 1)) : padL + innerW / 2; }
    function yAt(v) { return padT + (100 - Math.max(0, Math.min(100, v))) / 100 * chartH; }
    function overall(row) { var s = 0; for (var j = 0; j < keys.length; j++) s += (row[keys[j].label] || 0); return s; }
    function barColor(v) { if (v >= target) return cfg.barStrong; if (v >= target - 15) return cfg.barMid; return cfg.barWeak; }
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + VBW + ' ' + (cfg.height || 240));
    svg.setAttribute('width', '100%'); svg.setAttribute('height', (cfg.height || 240));
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.style.display = 'block'; svg.style.overflow = 'hidden'; svg.style.width = '100%'; svg.style.height = (cfg.height || 240) + 'px';
    function el2(tag, attrs, txt) { var e = document.createElementNS(NS, tag); for (var a in attrs) e.setAttribute(a, attrs[a]); if (txt != null) e.textContent = txt; return e; }
    // gridlines + y-axis labels
    [0, 25, 50, 75, 100].forEach(function (v) { svg.appendChild(el2('line', { x1: padL, x2: VBW - padR, y1: yAt(v), y2: yAt(v), stroke: cfg.gridColor, 'stroke-width': 0.75, 'stroke-dasharray': '3 3' })); svg.appendChild(el2('text', { x: padL - 6, y: yAt(v) + 3, 'text-anchor': 'end', 'font-size': 10, fill: cfg.axisColor, 'font-family': 'Public Sans, sans-serif' }, '' + v)); });
    // bars
    var slot = n > 1 ? innerW / (n - 1) : innerW;
    var bw = Math.max(10, Math.min(34, slot * 0.5));
    data.forEach(function (row, ix) {
      var v = Math.round(overall(row));
      var x = xAt(ix) - bw / 2, y = yAt(v), hgt = Math.max(2, axisY - y);
      svg.appendChild(el2('rect', { x: x.toFixed(1), y: y.toFixed(1), width: bw.toFixed(1), height: hgt.toFixed(1), rx: 5, fill: barColor(v) }));
      if (n <= 1 || ix % Math.ceil(n / 6) === 0 || ix === n - 1) svg.appendChild(el2('text', { x: xAt(ix).toFixed(1), y: axisY + 16, 'text-anchor': 'middle', 'font-size': 10, fill: cfg.axisColor, 'font-family': 'Public Sans, sans-serif' }, row.name));
    });
    // target line
    if (cfg.target != null) { svg.appendChild(el2('line', { x1: padL, x2: VBW - padR, y1: yAt(target), y2: yAt(target), stroke: cfg.barMid, 'stroke-width': 1.25, 'stroke-dasharray': '4 3', opacity: 0.85 })); svg.appendChild(el2('text', { x: VBW - padR, y: yAt(target) - 4, 'text-anchor': 'end', 'font-size': 9, fill: cfg.axisColor, 'font-family': 'IBM Plex Mono, monospace' }, cfg.targetLabel || ('TARGET ' + target))); }
    if (el.__root) { try { el.__root.unmount(); } catch (e) {} el.__root = null; }
    el.innerHTML = ''; el.appendChild(svg); el.__native = true;
    return true;
  }

  function boot(el) {
    var cfg = parse(el);
    if (drawRecharts(el, cfg)) return;      // Recharts already available
    var tries = 0;
    var tick = function () {
      if (drawRecharts(el, cfg)) return;    // Recharts arrived
      if (tries++ < 22) { setTimeout(tick, 140); return; }  // ~3s window
      drawNative(el, cfg);                  // fall back
    };
    // paint the native chart immediately so there's never an empty gap, then upgrade if Recharts loads
    drawNative(el, cfg);
    tick();
  }

  var ScoreTrendChart = class extends HTMLElement {
    static get observedAttributes() { return ['data']; }
    connectedCallback() { this.style.display = 'block'; boot(this); }
    attributeChangedCallback() { if (this.isConnected) boot(this); }
    disconnectedCallback() { if (this.__root) { try { this.__root.unmount(); } catch (e) {} this.__root = null; } }
  };
  if (!customElements.get('score-trend-chart')) customElements.define('score-trend-chart', ScoreTrendChart);
})();
