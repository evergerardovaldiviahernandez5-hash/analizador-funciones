/* =========================================================
   modules-extra.js — v10
   + mathExpr(parsed) para derivada simbólica
   + latex(parsed) para render KaTeX
   + presets extendidos
   ========================================================= */
(function () {
  'use strict';

  if (!window.CoreUtils || !window.CORES) {
    console.error('[modules-extra] Faltan CoreUtils o CORES.'); return;
  }

  var CU = window.CoreUtils, C = window.CORES;
  var PE = window.mathParser, fmtN = window.formatNumber;

  function toNum(s, fallback) {
    if (s === '' || s == null) return fallback;
    var clean = (PE && PE.preprocessExpr) ? PE.preprocessExpr(String(s)) : String(s);
    clean = clean.replace(/\bsqrt\s*\(/g, 'Math.sqrt(')
      .replace(/\bcbrt\s*\(/g, 'Math.cbrt(')
      .replace(/\bpi\b/g, 'Math.PI')
      .replace(/\be\b/g, 'Math.E');
    try { var v = Function('"use strict";return (' + clean + ');')(); return isFinite(v) ? v : fallback; }
    catch (e) { return fallback; }
  }
  function parseList(raw, keys) {
    var out = {};
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (!(k in raw)) return { ok: false, error: 'Falta el parámetro "' + k + '".' };
      var v = toNum(raw[k], NaN);
      if (isNaN(v)) return { ok: false, error: 'Valor inválido para "' + k + '": ' + raw[k] };
      out[k] = v;
    }
    return { ok: true, params: out };
  }

  function _shift(h) { if (Math.abs(h) < 1e-12) return '(x)'; return h > 0 ? '(x − ' + fmtN(h) + ')' : '(x + ' + fmtN(-h) + ')'; }
  function _shiftInner(h) { var s = _shift(h); return s.slice(1, -1); }
  function _trigArg(b, h) {
    var sh = _shift(h);
    if (Math.abs(b - 1) < 1e-12) return sh;
    if (Math.abs(b + 1) < 1e-12) return '−' + sh;
    return fmtN(b) + sh;
  }
  function _withCoef(a, body, k) {
    var s;
    if (Math.abs(a - 1) < 1e-12) s = body;
    else if (Math.abs(a + 1) < 1e-12) s = '−' + body;
    else s = fmtN(a) + '·' + body;
    if (Math.abs(k) > 1e-12) s += (k > 0 ? ' + ' : ' − ') + fmtN(Math.abs(k));
    return s;
  }
  function _poly(terms) {
    var s = '';
    for (var i = 0; i < terms.length; i++) {
      var coef = terms[i][0], sym = terms[i][1];
      if (Math.abs(coef) < 1e-12) continue;
      var absC = Math.abs(coef);
      var sign = (s === '') ? (coef < 0 ? '−' : '') : (coef < 0 ? ' − ' : ' + ');
      var mag;
      if (sym === '') mag = fmtN(absC);
      else if (Math.abs(absC - 1) < 1e-12) mag = sym;
      else mag = fmtN(absC) + sym;
      s += sign + mag;
    }
    return s || '0';
  }

  // -------- LaTeX helpers --------
  function _lshift(h) {
    if (Math.abs(h) < 1e-12) return 'x';
    return h > 0 ? 'x - ' + fmtN(h) : 'x + ' + fmtN(-h);
  }
  function _polyLatex(terms) {
    var s = '';
    for (var i = 0; i < terms.length; i++) {
      var c = terms[i][0], sym = terms[i][1];
      if (Math.abs(c) < 1e-12) continue;
      var absC = Math.abs(c);
      var sign = (s === '') ? (c < 0 ? '-' : '') : (c < 0 ? ' - ' : ' + ');
      var mag;
      if (sym === '') mag = fmtN(absC);
      else if (Math.abs(absC - 1) < 1e-12) mag = sym;
      else mag = fmtN(absC) + sym;
      s += sign + mag;
    }
    return s || '0';
  }

  function rngTrig() { return [-Math.PI * 2, Math.PI * 2]; }
  function rngExp()  { return [-5, 5]; }
  function rngHyp()  { return [-10, 10]; }

  // =========================================================
  // 1. LINEAL
  // =========================================================
  CU.createModule({
    id: 'Lineal', title: 'Función Lineal', accent: '#4be1ec',
    inputs: [
      { key: 'm', label: 'm (pendiente)', labelKey: 'field.m_pendiente', default: '1' },
      { key: 'b', label: 'b (ordenada)', labelKey: 'field.b_ordenada',  default: '0' }
    ],
    presets: [
      { name: 'y = x',      params: { m: '1', b: '0' } },
      { name: 'y = 2x − 3', params: { m: '2', b: '-3' } },
      { name: 'Constante',  params: { m: '0', b: '2' } }
    ],
    parseParams: function (raw) { return parseList(raw, ['m', 'b']); },
    equation: function (p) { return 'f(x) = ' + _poly([[p.m, 'x'], [p.b, '']]); },
    latex: function (p) { return 'f(x) = ' + _polyLatex([[p.m, 'x'], [p.b, '']]); },
    mathExpr: function (p) { return '(' + p.m + ')*x + (' + p.b + ')'; },
    calculate: function (p) { return C.Lineal(p.m, p.b); },
    getFn: function (p) { return function (x) { return p.m * x + p.b; }; },
    range: rngHyp
  });

  // =========================================================
  // 2. CUADRÁTICA
  // =========================================================
  CU.createModule({
    id: 'Cuadratica', title: 'Función Cuadrática', accent: '#b892ff',
    inputs: [
      { key: 'a', label: 'a', default: '1' },
      { key: 'b', label: 'b', default: '0' },
      { key: 'c', label: 'c', default: '0' }
    ],
    presets: [
      { name: 'y = x²',       params: { a: '1',  b: '0', c: '0' } },
      { name: 'y = x² − 4',   params: { a: '1',  b: '0', c: '-4' } },
      { name: 'y = −x² + 2x', params: { a: '-1', b: '2', c: '0' } }
    ],
    parseParams: function (raw) { return parseList(raw, ['a', 'b', 'c']); },
    equation: function (p) { return 'f(x) = ' + _poly([[p.a, 'x²'], [p.b, 'x'], [p.c, '']]); },
    latex: function (p) { return 'f(x) = ' + _polyLatex([[p.a, 'x^2'], [p.b, 'x'], [p.c, '']]); },
    mathExpr: function (p) { return '(' + p.a + ')*x^2 + (' + p.b + ')*x + (' + p.c + ')'; },
    calculate: function (p) { return C.Cuadratica(p.a, p.b, p.c); },
    getFn: function (p) { return function (x) { return p.a * x * x + p.b * x + p.c; }; },
    range: rngHyp
  });

  // =========================================================
  // 3. CÚBICA
  // =========================================================
  CU.createModule({
    id: 'Cubica', title: 'Función Cúbica', accent: '#ff6b81',
    inputs: [
      { key: 'a', label: 'a', default: '1' },
      { key: 'b', label: 'b', default: '0' },
      { key: 'c', label: 'c', default: '0' },
      { key: 'd', label: 'd', default: '0' }
    ],
    presets: [
      { name: 'y = x³',           params: { a: '1', b: '0', c: '0',  d: '0' } },
      { name: 'y = x³ − 3x',      params: { a: '1', b: '0', c: '-3', d: '0' } },
      { name: 'y = x³+6x²+11x−6', params: { a: '1', b: '6', c: '11', d: '-6' } }
    ],
    parseParams: function (raw) { return parseList(raw, ['a', 'b', 'c', 'd']); },
    equation: function (p) { return 'f(x) = ' + _poly([[p.a, 'x³'], [p.b, 'x²'], [p.c, 'x'], [p.d, '']]); },
    latex: function (p) { return 'f(x) = ' + _polyLatex([[p.a, 'x^3'], [p.b, 'x^2'], [p.c, 'x'], [p.d, '']]); },
    mathExpr: function (p) { return '(' + p.a + ')*x^3 + (' + p.b + ')*x^2 + (' + p.c + ')*x + (' + p.d + ')'; },
    calculate: function (p) { return C.Cubica(p.a, p.b, p.c, p.d); },
    getFn: function (p) { return function (x) { return p.a*x*x*x + p.b*x*x + p.c*x + p.d; }; },
    range: rngHyp
  });

  // =========================================================
  // 4. RAÍZ CUADRADA
  // =========================================================
  CU.createModule({
    id: 'RaizCuadrada', title: 'Raíz Cuadrada', accent: '#4be1ec',
    inputs: [
      { key: 'a', label: 'a', default: '1' },
      { key: 'h', label: 'h (despl. x)', labelKey: 'field.h_desplx', default: '0' },
      { key: 'k', label: 'k (despl. y)', labelKey: 'field.k_desply', default: '0' }
    ],
    presets: [
      { name: 'y = √x',       params: { a: '1',  h: '0', k: '0' } },
      { name: 'y = √(x − 2)', params: { a: '1',  h: '2', k: '0' } },
      { name: 'y = −√x + 2',  params: { a: '-1', h: '0', k: '2' } }
    ],
    parseParams: function (raw) { return parseList(raw, ['a', 'h', 'k']); },
    equation: function (p) { return 'f(x) = ' + _withCoef(p.a, '√(' + _shiftInner(p.h) + ')', p.k); },
    latex: function (p) { return 'f(x) = ' + _withCoef(p.a, '\\sqrt{' + _lshift(p.h) + '}', p.k); },
    mathExpr: function (p) { return '(' + p.a + ')*sqrt(x - (' + p.h + ')) + (' + p.k + ')'; },
    calculate: function (p) { return C.RaizCuadrada(p.a, p.h, p.k); },
    getFn: function (p) { return function (x) { return x < p.h ? NaN : p.a * Math.sqrt(x - p.h) + p.k; }; },
    range: function (p) { return [p.h - 2, p.h + 12]; }
  });

  // =========================================================
  // 5. RAÍZ CÚBICA
  // =========================================================
  CU.createModule({
    id: 'RaizCubica', title: 'Raíz Cúbica', accent: '#b892ff',
    inputs: [
      { key: 'a', label: 'a', default: '1' },
      { key: 'h', label: 'h', default: '0' },
      { key: 'k', label: 'k', default: '0' }
    ],
    presets: [
      { name: 'y = ∛x',       params: { a: '1', h: '0',  k: '0' } },
      { name: 'y = ∛(x + 1)', params: { a: '1', h: '-1', k: '0' } },
      { name: 'y = 2∛x − 1',  params: { a: '2', h: '0',  k: '-1' } }
    ],
    parseParams: function (raw) { return parseList(raw, ['a', 'h', 'k']); },
    equation: function (p) { return 'f(x) = ' + _withCoef(p.a, '∛(' + _shiftInner(p.h) + ')', p.k); },
    latex: function (p) { return 'f(x) = ' + _withCoef(p.a, '\\sqrt[3]{' + _lshift(p.h) + '}', p.k); },
    mathExpr: function (p) { return '(' + p.a + ')*cbrt(x - (' + p.h + ')) + (' + p.k + ')'; },
    calculate: function (p) { return C.RaizCubica(p.a, p.h, p.k); },
    getFn: function (p) {
      return function (x) {
        var d = x - p.h;
        var c = d < 0 ? -Math.pow(-d, 1/3) : Math.pow(d, 1/3);
        return p.a * c + p.k;
      };
    },
    range: rngHyp
  });

  // =========================================================
  // 6. MODULAR
  // =========================================================
  CU.createModule({
    id: 'Modular', title: 'Función Modular', accent: '#ffd166',
    inputs: [
      { key: 'a', label: 'a', default: '1' },
      { key: 'h', label: 'h', default: '0' },
      { key: 'k', label: 'k', default: '0' }
    ],
    presets: [
      { name: 'y = |x|',        params: { a: '1',  h: '0', k: '0' } },
      { name: 'y = |x − 2|+1',  params: { a: '1',  h: '2', k: '1' } },
      { name: 'y = −|x| + 3',   params: { a: '-1', h: '0', k: '3' } }
    ],
    parseParams: function (raw) { return parseList(raw, ['a', 'h', 'k']); },
    equation: function (p) { return 'f(x) = ' + _withCoef(p.a, '|' + _shiftInner(p.h) + '|', p.k); },
    latex: function (p) { return 'f(x) = ' + _withCoef(p.a, '\\left|' + _lshift(p.h) + '\\right|', p.k); },
    mathExpr: function (p) { return '(' + p.a + ')*abs(x - (' + p.h + ')) + (' + p.k + ')'; },
    calculate: function (p) { return C.Modular(p.a, p.h, p.k); },
    getFn: function (p) { return function (x) { return p.a * Math.abs(x - p.h) + p.k; }; },
    range: rngHyp
  });

  // =========================================================
  // 7. LOGARÍTMICA
  // =========================================================
  CU.createModule({
    id: 'Logaritmica', title: 'Función Logarítmica', accent: '#ff6b81',
    inputs: [
      { key: 'a', label: 'a', default: '1' },
      { key: 'b', label: 'b (base > 0, ≠ 1)', labelKey: 'field.b_base', default: '10' },
      { key: 'h', label: 'h', default: '0' },
      { key: 'k', label: 'k', default: '0' }
    ],
    presets: [
      { name: 'log(x)',      params: { a: '1', b: '10', h: '0', k: '0' } },
      { name: 'ln(x)',       params: { a: '1', b: 'e',  h: '0', k: '0' } },
      { name: 'log₂(x − 1)', params: { a: '1', b: '2',  h: '1', k: '0' } }
    ],
    parseParams: function (raw) {
      var res = parseList(raw, ['a', 'b', 'h', 'k']);
      if (!res.ok) return res;
      if (res.params.b <= 0 || Math.abs(res.params.b - 1) < 1e-12) {
        return { ok: false, error: 'La base b debe ser > 0 y ≠ 1.' };
      }
      return res;
    },
    equation: function (p) {
      var base = Math.abs(p.b - 10) < 1e-12 ? '' : '_' + fmtN(p.b);
      return 'f(x) = ' + _withCoef(p.a, 'log' + base + '(' + _shiftInner(p.h) + ')', p.k);
    },
    latex: function (p) {
      var base = Math.abs(p.b - 10) < 1e-12 ? '' : '_{' + fmtN(p.b) + '}';
      return 'f(x) = ' + _withCoef(p.a, '\\log' + base + '\\left(' + _lshift(p.h) + '\\right)', p.k);
    },
    mathExpr: function (p) {
      // log_b(u) = ln(u)/ln(b)
      return '(' + p.a + ')*log(x - (' + p.h + '))/log(' + p.b + ') + (' + p.k + ')';
    },
    calculate: function (p) { return C.Logaritmica(p.a, p.b, p.h, p.k); },
    getFn: function (p) {
      var lb = Math.log(p.b);
      return function (x) { return x <= p.h ? NaN : p.a * Math.log(x - p.h) / lb + p.k; };
    },
    range: function (p) { return [p.h - 1, p.h + 10]; }
  });

  // =========================================================
  // 8. EXPONENCIAL
  // =========================================================
  CU.createModule({
    id: 'Exponencial', title: 'Función Exponencial', accent: '#4be1ec',
    inputs: [
      { key: 'a', label: 'a', default: '1' },
      { key: 'b', label: 'b (base > 0, ≠ 1)', default: '2' },
      { key: 'h', label: 'h', default: '0' },
      { key: 'k', label: 'k', default: '0' }
    ],
    presets: [
      { name: '2^x',         params: { a: '1', b: '2', h: '0', k: '0' } },
      { name: 'e^x',         params: { a: '1', b: 'e', h: '0', k: '0' } },
      { name: '2^(x−1) + 1', params: { a: '1', b: '2', h: '1', k: '1' } }
    ],
    parseParams: function (raw) {
      var res = parseList(raw, ['a', 'b', 'h', 'k']);
      if (!res.ok) return res;
      if (res.params.b <= 0 || Math.abs(res.params.b - 1) < 1e-12) {
        return { ok: false, error: 'La base b debe ser > 0 y ≠ 1.' };
      }
      return res;
    },
    equation: function (p) { return 'f(x) = ' + _withCoef(p.a, fmtN(p.b) + '^' + _shift(p.h), p.k); },
    latex: function (p) {
      var base = Math.abs(p.b - Math.E) < 1e-12 ? 'e' : fmtN(p.b);
      return 'f(x) = ' + _withCoef(p.a, base + '^{' + _lshift(p.h) + '}', p.k);
    },
    mathExpr: function (p) { return '(' + p.a + ')*(' + p.b + ')^(x - (' + p.h + ')) + (' + p.k + ')'; },
    calculate: function (p) { return C.Exponencial(p.a, p.b, p.h, p.k); },
    getFn: function (p) { return function (x) { return p.a * Math.pow(p.b, x - p.h) + p.k; }; },
    range: rngExp
  });

  // =========================================================
  // 9. PROPORCIONALIDAD INVERSA
  // =========================================================
  CU.createModule({
    id: 'ProporcionalidadInversa', title: 'Proporcionalidad Inversa', accent: '#ffd166',
    inputs: [
      { key: 'a', label: 'a (numerador)', labelKey: 'field.a_numerador', default: '1' },
      { key: 'h', label: 'h (asíntota vert.)', labelKey: 'field.h_asintota_v', default: '0' },
      { key: 'k', label: 'k (asíntota horiz.)', labelKey: 'field.k_asintota_h', default: '0' }
    ],
    presets: [
      { name: '1/x',         params: { a: '1', h: '0', k: '0' } },
      { name: '1/(x − 1)',   params: { a: '1', h: '1', k: '0' } },
      { name: '2/(x−1) + 3', params: { a: '2', h: '1', k: '3' } }
    ],
    parseParams: function (raw) { return parseList(raw, ['a', 'h', 'k']); },
    equation: function (p) {
      var s = fmtN(p.a) + '/' + _shift(p.h);
      if (Math.abs(p.k) > 1e-12) s += (p.k > 0 ? ' + ' : ' − ') + fmtN(Math.abs(p.k));
      return 'f(x) = ' + s;
    },
    latex: function (p) {
      var s = '\\frac{' + fmtN(p.a) + '}{' + _lshift(p.h) + '}';
      if (Math.abs(p.k) > 1e-12) s += (p.k > 0 ? ' + ' : ' - ') + fmtN(Math.abs(p.k));
      return 'f(x) = ' + s;
    },
    mathExpr: function (p) { return '(' + p.a + ')/(x - (' + p.h + ')) + (' + p.k + ')'; },
    calculate: function (p) { return C.ProporcionalidadInversa(p.a, p.h, p.k); },
    getFn: function (p) {
      return function (x) {
        var d = x - p.h;
        if (Math.abs(d) < 1e-12) return NaN;
        return p.a / d + p.k;
      };
    },
    range: rngHyp
  });

  // =========================================================
  // 10. SENO
  // =========================================================
  CU.createModule({
    id: 'Seno', title: 'Función Seno', accent: '#b892ff',
    inputs: [
      { key: 'a', label: 'a (amplitud)', labelKey: 'field.a_amplitud', default: '1' },
      { key: 'b', label: 'b (frecuencia)', labelKey: 'field.b_frecuencia', default: '1' },
      { key: 'h', label: 'h (desfase)', labelKey: 'field.h_desfase', default: '0' },
      { key: 'k', label: 'k (vertical)', labelKey: 'field.k_vertical', default: '0' }
    ],
    presets: [
      { name: 'sin(x)',   params: { a: '1', b: '1', h: '0', k: '0' } },
      { name: '2·sin(x)', params: { a: '2', b: '1', h: '0', k: '0' } },
      { name: 'sin(2x)',  params: { a: '1', b: '2', h: '0', k: '0' } }
    ],
    parseParams: function (raw) { return parseList(raw, ['a', 'b', 'h', 'k']); },
    equation: function (p) { return 'f(x) = ' + _withCoef(p.a, 'sin(' + _trigArg(p.b, p.h) + ')', p.k); },
    latex: function (p) {
      var inner = _lshift(p.h);
      var arg = Math.abs(p.b - 1) < 1e-12 ? inner
              : Math.abs(p.b + 1) < 1e-12 ? '-' + inner
              : fmtN(p.b) + '\\left(' + inner + '\\right)';
      return 'f(x) = ' + _withCoef(p.a, '\\sin\\left(' + arg + '\\right)', p.k);
    },
    mathExpr: function (p) { return '(' + p.a + ')*sin((' + p.b + ')*(x - (' + p.h + '))) + (' + p.k + ')'; },
    calculate: function (p) { return C.Seno(p.a, p.b, p.h, p.k); },
    getFn: function (p) { return function (x) { return p.a * Math.sin(p.b * (x - p.h)) + p.k; }; },
    range: rngTrig
  });

  // =========================================================
  // 11. COSENO
  // =========================================================
  CU.createModule({
    id: 'Coseno', title: 'Función Coseno', accent: '#4be1ec',
    inputs: [
      { key: 'a', label: 'a (amplitud)', default: '1' },
      { key: 'b', label: 'b (frecuencia)', default: '1' },
      { key: 'h', label: 'h (desfase)', default: '0' },
      { key: 'k', label: 'k (vertical)', default: '0' }
    ],
    presets: [
      { name: 'cos(x)',       params: { a: '1', b: '1', h: '0', k: '0' } },
      { name: '2·cos(x)+1',   params: { a: '2', b: '1', h: '0', k: '1' } },
      { name: 'cos(2x)',      params: { a: '1', b: '2', h: '0', k: '0' } }
    ],
    parseParams: function (raw) { return parseList(raw, ['a', 'b', 'h', 'k']); },
    equation: function (p) { return 'f(x) = ' + _withCoef(p.a, 'cos(' + _trigArg(p.b, p.h) + ')', p.k); },
    latex: function (p) {
      var inner = _lshift(p.h);
      var arg = Math.abs(p.b - 1) < 1e-12 ? inner
              : Math.abs(p.b + 1) < 1e-12 ? '-' + inner
              : fmtN(p.b) + '\\left(' + inner + '\\right)';
      return 'f(x) = ' + _withCoef(p.a, '\\cos\\left(' + arg + '\\right)', p.k);
    },
    mathExpr: function (p) { return '(' + p.a + ')*cos((' + p.b + ')*(x - (' + p.h + '))) + (' + p.k + ')'; },
    calculate: function (p) { return C.Coseno(p.a, p.b, p.h, p.k); },
    getFn: function (p) { return function (x) { return p.a * Math.cos(p.b * (x - p.h)) + p.k; }; },
    range: rngTrig
  });

  // =========================================================
  // 12. TANGENTE
  // =========================================================
  CU.createModule({
    id: 'Tangente', title: 'Función Tangente', accent: '#ff6b81',
    inputs: [
      { key: 'a', label: 'a', default: '1' },
      { key: 'b', label: 'b', default: '1' },
      { key: 'h', label: 'h (desfase)', default: '0' },
      { key: 'k', label: 'k (vertical)', default: '0' }
    ],
    presets: [
      { name: 'tan(x)',       params: { a: '1', b: '1', h: '0', k: '0' } },
      { name: 'tan(2x)',      params: { a: '1', b: '2', h: '0', k: '0' } },
      { name: '2·tan(x) + 1', params: { a: '2', b: '1', h: '0', k: '1' } }
    ],
    parseParams: function (raw) { return parseList(raw, ['a', 'b', 'h', 'k']); },
    equation: function (p) { return 'f(x) = ' + _withCoef(p.a, 'tan(' + _trigArg(p.b, p.h) + ')', p.k); },
    latex: function (p) {
      var inner = _lshift(p.h);
      var arg = Math.abs(p.b - 1) < 1e-12 ? inner
              : Math.abs(p.b + 1) < 1e-12 ? '-' + inner
              : fmtN(p.b) + '\\left(' + inner + '\\right)';
      return 'f(x) = ' + _withCoef(p.a, '\\tan\\left(' + arg + '\\right)', p.k);
    },
    mathExpr: function (p) { return '(' + p.a + ')*tan((' + p.b + ')*(x - (' + p.h + '))) + (' + p.k + ')'; },
    calculate: function (p) { return C.Tangente(p.a, p.b, p.h, p.k); },
    getFn: function (p) {
      var eps = 1e-6;
      return function (x) {
        var arg = p.b * (x - p.h);
        var c = Math.cos(arg);
        if (Math.abs(c) < eps) return NaN;
        return p.a * Math.tan(arg) + p.k;
      };
    },
    range: function (p) {
      var T = Math.PI / Math.abs(p.b);
      return [p.h - 2 * T, p.h + 2 * T];
    }
  });

})();
