/* =========================================================
   parser.js
   Wrapper de math.js + Nerdamer.
   - preprocessExpr: normaliza símbolos Unicode a ASCII.
   - parse/eval/derivative/simplify/polynomialRoots: math.js.
   - nerdamerSolve/Derivative/Limit/Simplify: Nerdamer simbólico.
   Fallback: si math.js no cargó, usa Function() nativo.
             si Nerdamer no cargó, las funciones nerdamer* → null.
   ========================================================= */
(function () {
  'use strict';

  var hasMath     = (typeof window !== 'undefined' && typeof window.math !== 'undefined');
  var hasNerdamer = (typeof window !== 'undefined' && typeof window.nerdamer !== 'undefined');

  // ---------------------------------------------------------
  // Preprocesamiento de entrada Unicode → ASCII
  // ---------------------------------------------------------
  var FRACTIONS = {
    '½': '(1/2)', '⅓': '(1/3)', '⅔': '(2/3)', '¼': '(1/4)', '¾': '(3/4)',
    '⅕': '(1/5)', '⅖': '(2/5)', '⅗': '(3/5)', '⅘': '(4/5)',
    '⅙': '(1/6)', '⅚': '(5/6)', '⅛': '(1/8)', '⅜': '(3/8)', '⅝': '(5/8)', '⅞': '(7/8)'
  };
  var SUPERSCRIPTS = {
    '⁰':'^0', '¹':'^1', '²':'^2', '³':'^3', '⁴':'^4', '⁵':'^5',
    '⁶':'^6', '⁷':'^7', '⁸':'^8', '⁹':'^9', 'ⁿ':'^n'
  };

  function preprocessExpr(s) {
    if (typeof s !== 'string') s = String(s == null ? '' : s);
    s = s.replace(/\s+/g, ' ').trim();

    s = s.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
    s = s.replace(/·/g, '*').replace(/∙/g, '*');

    s = s.replace(/π/g, 'pi').replace(/∞/g, 'Infinity');

    for (var f in FRACTIONS) {
      if (FRACTIONS.hasOwnProperty(f)) s = s.split(f).join(FRACTIONS[f]);
    }

    var sup = '';
    for (var k = 0; k < s.length; k++) {
      var ch = s.charAt(k);
      sup += SUPERSCRIPTS[ch] ? SUPERSCRIPTS[ch] : ch;
    }
    s = sup;

    s = s.replace(/√\s*\(/g, 'sqrt(');
    s = s.replace(/∛\s*\(/g, 'cbrt(');
    s = s.replace(/√\s*([0-9a-zA-Z])/g, 'sqrt($1)');
    s = s.replace(/∛\s*([0-9a-zA-Z])/g, 'cbrt($1)');
    s = s.replace(/\|([^|]+)\|/g, 'abs($1)');
    s = s.replace(/\[/g, '(').replace(/\]/g, ')');

    return s;
  }

  // ---------------------------------------------------------
  // math.js: parse / eval / derivative / simplify
  // ---------------------------------------------------------
  function parse(expr) {
    var clean = preprocessExpr(expr);
    if (hasMath) {
      try { return { node: window.math.parse(clean), raw: clean }; }
      catch (e) { throw new Error('Expresión inválida: ' + e.message); }
    }
    return { node: null, raw: clean, native: compileNative(clean) };
  }

  function compileNative(clean) {
    var jsExpr = clean
      .replace(/\^/g, '**')
      .replace(/\bpi\b/g, 'Math.PI')
      .replace(/\be\b/g, 'Math.E')
      .replace(/\bsqrt\b/g, 'Math.sqrt')
      .replace(/\bcbrt\b/g, 'Math.cbrt')
      .replace(/\babs\b/g, 'Math.abs')
      .replace(/\bsin\b/g, 'Math.sin')
      .replace(/\bcos\b/g, 'Math.cos')
      .replace(/\btan\b/g, 'Math.tan')
      .replace(/\blog\b/g, 'Math.log10')
      .replace(/\bln\b/g, 'Math.log')
      .replace(/\bexp\b/g, 'Math.exp');
    /* eslint-disable no-new-func */
    return new Function('x', 'return (' + jsExpr + ');');
  }

  function evalExpr(parsed, x) {
    if (parsed && parsed.node && hasMath) {
      try { return window.math.evaluate(parsed.node, { x: x }); }
      catch (e) { return NaN; }
    }
    if (parsed && parsed.native) {
      try { return parsed.native(x); }
      catch (e) { return NaN; }
    }
    return NaN;
  }

  function evalString(expr, x) { return evalExpr(parse(expr), x); }

  function derivative(expr, variable) {
    variable = variable || 'x';
    if (!hasMath) return null;
    try {
      var node = (typeof expr === 'string') ? window.math.parse(preprocessExpr(expr)) : expr;
      return window.math.derivative(node, variable);
    } catch (e) { return null; }
  }

  function simplify(expr) {
    if (!hasMath) return String(expr);
    try {
      var node = (typeof expr === 'string') ? window.math.parse(preprocessExpr(expr)) : expr;
      return window.math.simplify(node).toString();
    } catch (e) { return String(expr); }
  }

  function polynomialRoots(coeffs) {
    if (!hasMath || typeof window.math.polynomialRoot !== 'function') return null;
    try {
      var args = coeffs.slice();
      var res = window.math.polynomialRoot.apply(null, args.reverse());
      if (!Array.isArray(res)) res = [res];
      return res.map(function (r) {
        if (typeof r === 'number') return r;
        if (r && typeof r.re === 'number' && Math.abs(r.im) < 1e-10) return r.re;
        return null;
      }).filter(function (r) { return r !== null; });
    } catch (e) { return null; }
  }

  // ---------------------------------------------------------
  // Nerdamer: operaciones simbólicas
  // Todas devuelven null si Nerdamer no está disponible
  // o si la operación falla.
  // ---------------------------------------------------------

  // Convierte un resultado de Nerdamer (Symbol/Vector) a string limpio.
  function _nerdToStr(result) {
    if (result == null) return null;
    try {
      if (typeof result.toString === 'function') return result.toString();
      return String(result);
    } catch (e) { return null; }
  }

  // Resuelve expr = 0 para 'variable'.
  // Devuelve array de números (raíces reales) o array de strings (soluciones simbólicas),
  // o null si no aplica.
  function nerdamerSolve(expr, variable) {
    if (!hasNerdamer) return null;
    variable = variable || 'x';
    var clean = preprocessExpr(expr);
    var str = null;

    // Forma 1: instancia .solveFor(variable)
    try {
      var sym = window.nerdamer(clean);
      if (sym && typeof sym.solveFor === 'function') {
        str = _nerdToStr(sym.solveFor(variable));
      }
    } catch (e) {}

    // Forma 2: estática nerdamer.solve(expr, variable)
    if (!str && typeof window.nerdamer.solve === 'function') {
      try { str = _nerdToStr(window.nerdamer.solve(clean, variable)); } catch (e) {}
    }

    // Forma 3: comando interno
    if (!str) {
      try { str = _nerdToStr(window.nerdamer('solve(' + clean + ', ' + variable + ')')); } catch (e) {}
    }

    if (!str) return null;
    str = str.trim();
    if (str.charAt(0) === '[' && str.charAt(str.length - 1) === ']') {
      str = str.slice(1, -1);
    }

    var parts = str.split(',').map(function (t) { return t.trim(); });
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      var t = parts[i];
      if (t === '') continue;
      var v = parseFloat(t);
      // Si es un número real, convertir; si no, dejar como string
      var isNumeric = /^-?[0-9.eE+]+$/.test(t);
      if (!isNaN(v) && isNumeric) out.push(v);
      else out.push(t);
    }
    return out.length ? out : null;
  }

  // Derivada simbólica como string.
  function nerdamerDerivative(expr, variable) {
    if (!hasNerdamer) return null;
    variable = variable || 'x';
    var clean = preprocessExpr(expr);

    // Forma 1: instancia .diff(variable)
    try {
      var sym = window.nerdamer(clean);
      if (sym && typeof sym.diff === 'function') {
        var d1 = _nerdToStr(sym.diff(variable));
        if (d1) return d1;
      }
    } catch (e) {}

    // Forma 2: instancia .derivative(variable)
    try {
      var sym2 = window.nerdamer(clean);
      if (sym2 && typeof sym2.derivative === 'function') {
        var d2 = _nerdToStr(sym2.derivative(variable));
        if (d2) return d2;
      }
    } catch (e) {}

    // Forma 3: estática nerdamer.diff(expr, variable)
    try {
      if (typeof window.nerdamer.diff === 'function') {
        var d3 = _nerdToStr(window.nerdamer.diff(clean, variable));
        if (d3) return d3;
      }
    } catch (e) {}

    // Forma 4: comando interno
    try {
      var cmd = 'diff(' + clean + ', ' + variable + ')';
      var d4 = _nerdToStr(window.nerdamer(cmd));
      if (d4 && d4.indexOf('diff(') < 0) return d4;
    } catch (e) {}

    return null;
  }

  // Límite simbólico. to puede ser 0, 'Infinity', '-Infinity', etc.
  function nerdamerLimit(expr, variable, to) {
    if (!hasNerdamer) return null;
    variable = variable || 'x';
    to = (to === undefined) ? 0 : to;
    var clean = preprocessExpr(expr);

    // Forma 1: comando interno (más común)
    try {
      var cmd = 'limit(' + clean + ', ' + variable + ', ' + to + ')';
      var s1 = _nerdToStr(window.nerdamer(cmd));
      if (s1 && s1.indexOf('limit(') < 0) {
        return s1.replace(/\binf\b/gi, '∞').replace(/Infinity/g, '∞');
      }
    } catch (e) {}

    // Forma 2: estática
    try {
      if (typeof window.nerdamer.limit === 'function') {
        var s2 = _nerdToStr(window.nerdamer.limit(clean, variable, to));
        if (s2) return s2.replace(/Infinity/g, '∞');
      }
    } catch (e) {}

    return null;
  }

  // Simplificación simbólica como string.
  function nerdamerSimplify(expr) {
    if (!hasNerdamer) return null;
    try {
      var res = window.nerdamer(preprocessExpr(expr));
      // Si tiene .simplify usa eso, si no, el toString ya simplifica
      if (res && typeof res.simplify === 'function') {
        return _nerdToStr(res.simplify());
      }
      return _nerdToStr(res);
    } catch (e) { return null; }
  }

  // Evalúa una expresión con Nerdamer en x = valor (útil cuando math.js falla).
  function nerdamerEval(expr, variable, value) {
    if (!hasNerdamer) return null;
    variable = variable || 'x';
    try {
      var clean = preprocessExpr(expr);
      var res = window.nerdamer(clean).sub(variable, String(value)).evaluate();
      var s = _nerdToStr(res);
      var v = parseFloat(s);
      return isNaN(v) ? s : v;
    } catch (e) { return null; }
  }

  // ---------------------------------------------------------
  // Exportar API
  // ---------------------------------------------------------
  function nerdamerProbe() {
    if (!hasNerdamer) return { ok: false, reason: 'nerdamer no cargado' };
    var out = { ok: true };
    try {
      var sym = window.nerdamer('x^2');
      out.instance = {
        diff: typeof sym.diff,
        derivative: typeof sym.derivative,
        solveFor: typeof sym.solveFor,
        evaluate: typeof sym.evaluate
      };
    } catch (e) { out.instance = { err: e.message }; }
    out.static = {
      diff: typeof window.nerdamer.diff,
      solve: typeof window.nerdamer.solve,
      limit: typeof window.nerdamer.limit,
      integrate: typeof window.nerdamer.integrate
    };
    try { out.testDerivative = nerdamerDerivative('x^3', 'x') || 'null'; }
    catch (e) { out.testDerivative = 'ERR: ' + e.message; }
    try { out.testSolve = nerdamerSolve('x^2 - 4', 'x') || 'null'; }
    catch (e) { out.testSolve = 'ERR: ' + e.message; }
    try { out.testLimit = nerdamerLimit('sin(x)/x', 'x', 0) || 'null'; }
    catch (e) { out.testLimit = 'ERR: ' + e.message; }
    return out;
  }

  var API = {
    // Disponibilidad
    hasMath: hasMath,
    hasNerdamer: hasNerdamer,

    // math.js
    preprocessExpr: preprocessExpr,
    parse: parse,
    eval: evalExpr,
    evalString: evalString,
    derivative: derivative,
    simplify: simplify,
    polynomialRoots: polynomialRoots,

    // Nerdamer
    nerdamerSolve: nerdamerSolve,
    nerdamerDerivative: nerdamerDerivative,
    nerdamerLimit: nerdamerLimit,
    nerdamerSimplify: nerdamerSimplify,
    nerdamerEval: nerdamerEval,
    nerdamerProbe: nerdamerProbe
  };

  if (typeof window !== 'undefined') {
    window.mathParser = API;
    window.preprocessExpr = preprocessExpr;
    window.nerdamerProbe = nerdamerProbe;
    // Log de diagnóstico útil durante el desarrollo
    if (!hasMath)     console.warn('[parser] math.js no cargó — usando fallback nativo.');
    if (!hasNerdamer) console.warn('[parser] Nerdamer no cargó — las funciones simbólicas avanzadas estarán deshabilitadas.');
    else              console.info('[parser] Nerdamer listo.');
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();