/* =========================================================
   math-render.js — Render matemático automático
   Convierte strings matemáticos comunes a LaTeX y los
   renderiza con KaTeX. Fallback: texto plano.
   ========================================================= */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  if (window._afMathRenderInit) return;
  window._afMathRenderInit = true;

  // ---------- Palabras que indican texto descriptivo ----------
  var TEXT_WORDS = /\b(?:Creciente|Decreciente|Constante|Par|Impar|Ningun[oa]?|Peri[oó]dica|Infinitos|S[íi]|No|existe|Infinito|inversa|Inyectiva|Ram[as]?|V[eé]rtice|M[íi]nimo|M[áa]ximo|Local|Extremo|Ceros?|Ordenada|Per[íi]odo|Amplitud|As[íi]ntotas?|Doble|Simple|Ra[íi]z|Punto|Inflexi[oó]n|Centro|Simetr[íi]a|Inicio|Fin|Dominio|Imagen|Inversa|todas?|todo|real|reales|Intervalo|Conjunto|Uni[oó]n)\b/i;

  // ---------- Nombres griegos ----------
  var GREEK = {
    alpha:'\\alpha', beta:'\\beta', gamma:'\\gamma', delta:'\\delta',
    epsilon:'\\epsilon', varepsilon:'\\varepsilon', zeta:'\\zeta',
    eta:'\\eta', theta:'\\theta', vartheta:'\\vartheta',
    iota:'\\iota', kappa:'\\kappa', lambda:'\\lambda', mu:'\\mu',
    nu:'\\nu', xi:'\\xi', rho:'\\rho', varrho:'\\varrho',
    sigma:'\\sigma', varsigma:'\\varsigma', tau:'\\tau',
    upsilon:'\\upsilon', phi:'\\phi', varphi:'\\varphi',
    chi:'\\chi', psi:'\\psi', omega:'\\omega',
    Gamma:'\\Gamma', Delta:'\\Delta', Theta:'\\Theta',
    Lambda:'\\Lambda', Xi:'\\Xi', Pi:'\\Pi', Sigma:'\\Sigma',
    Upsilon:'\\Upsilon', Phi:'\\Phi', Psi:'\\Psi', Omega:'\\Omega'
  };

  // ---------- Funciones conocidas ----------
  var FN_LATEX = {
    sin:'\\sin', cos:'\\cos', tan:'\\tan',
    sec:'\\sec', csc:'\\csc', cot:'\\cot',
    arcsin:'\\arcsin', arccos:'\\arccos', arctan:'\\arctan',
    asin:'\\arcsin', acos:'\\arccos', atan:'\\arctan',
    sinh:'\\sinh', cosh:'\\cosh', tanh:'\\tanh',
    log:'\\log', log10:'\\log_{10}', ln:'\\ln', exp:'\\exp',
    abs:'|', sqrt:'\\sqrt', cbrt:'\\sqrt[3]', nthRoot:'\\sqrt',
    min:'\\min', max:'\\max', gcd:'\\gcd', lcm:'\\mathrm{lcm}'
  };

  // ---------- Normaliza símbolos Unicode ----------
  function normalize(s) {
    return String(s)
      .replace(/\u2212/g, '-')   // minus real
      .replace(/[×·∙]/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-');
  }

  function escapeLatex(s) {
    return String(s).replace(/([\\{}$&#^_%])/g, '\\$1');
  }

  function formatNum(v) {
    if (typeof v !== 'number') return escapeLatex(String(v));
    if (v === Infinity)  return '\\infty';
    if (v === -Infinity) return '-\\infty';
    if (Number.isInteger(v)) return String(v);
    var r = Math.round(v * 1e8) / 1e8;
    return String(r);
  }

  function symbolLatex(name) {
    if (GREEK[name]) return GREEK[name];
    if (name === 'pi')       return '\\pi';
    if (name === 'tau')      return '\\tau';
    if (name === 'e')        return 'e';
    if (name === 'i')        return 'i';
    if (name === 'Infinity') return '\\infty';
    if (name === 'NaN')      return '\\text{NaN}';
    if (/^[A-Za-z]$/.test(name)) return name;
    return '\\mathit{' + escapeLatex(name) + '}';
  }

  // ---------- Set / intervalos / ℝ ----------
  function latexifySetOrInterval(str) {
    var s = String(str).trim();
    if (!s) return null;

    // ℝ solo
    if (s === 'ℝ' || s === '\\mathbb{R}') return '\\mathbb{R}';

    // ℝ \ {a}  o  ℝ \\ {a}
    var m = s.match(/^ℝ\s*[\\]\s*\{([^}]+)\}$/);
    if (m) return '\\mathbb{R} \\setminus \\{' + (astToLatex(m[1]) || escapeLatex(m[1])) + '\\}';

    // Unión de intervalos
    if (s.indexOf('∪') !== -1) {
      var parts = s.split('∪').map(function (p) { return latexifySetOrInterval(p.trim()); });
      if (parts.every(Boolean)) return parts.join(' \\; \\cup \\; ');
    }

    // Intervalo [a, b], (a, b], [a, b), (a, b)
    var mi = s.match(/^([\[\(])\s*([^,()\[\]]+?)\s*,\s*([^,()\[\]]+?)\s*([\]\)])$/);
    if (mi) {
      var L = mi[1] === '[' ? '\\left[' : '\\left(';
      var R = mi[4] === ']' ? '\\right]' : '\\right)';
      var a = astToLatex(mi[2].trim());
      var b = astToLatex(mi[3].trim());
      if (a !== null && b !== null)
        return L + a + ',\\,' + b + R;
    }

    // Conjunto {a, b, c}
    if (/^\{.*\}$/.test(s)) {
      var inner = s.slice(1, -1).trim();
      if (!inner) return '\\{\\}';
      var items = inner.split(',').map(function (x) {
        return astToLatex(x.trim()) || escapeLatex(x.trim());
      });
      return '\\{' + items.join(',\\,') + '\\}';
    }

    return null;
  }

  // ---------- AST math.js → LaTeX ----------
  function astToLatex(str) {
    if (!window.math || typeof window.math.parse !== 'function') return null;
    var clean = normalize(str);
    if (!clean) return null;

    var node;
    try { node = window.math.parse(clean); }
    catch (e) { return null; }

    function walk(n) {
      if (!n) return '';
      var t = n.type;

      if (t === 'ConstantNode') return formatNum(n.value);

      if (t === 'SymbolNode')  return symbolLatex(n.name);

      if (t === 'OperatorNode') {
        var op = n.op, args = n.args || [];
        if (op === '+' || op === '-') {
          if (args.length === 1) return (op === '-' ? '-' : '') + wrap(args[0]);
          return args.map(wrap).join(' ' + op + ' ');
        }
        if (op === '*') return args.map(wrap).join(' \\cdot ');
        if (op === '/') return '\\frac{' + walk(args[0]) + '}{' + walk(args[1]) + '}';
        if (op === '^') return wrap(args[0]) + '^{' + walk(args[1]) + '}';
        if (op === 'mod' || op === '%') return wrap(args[0]) + ' \\bmod ' + wrap(args[1]);
        if (op === '!') return walk(args[0]) + '!';
        return args.map(walk).join(' ' + op + ' ');
      }

      if (t === 'ParenthesisNode') return '\\left(' + walk(n.content) + '\\right)';

      if (t === 'FunctionNode') {
        var fname = (n.fn && n.fn.name) || n.name || '';
        var fargs = (n.args || []).map(walk);
        var inner = fargs.join(',\\,');
        if (fname === 'abs')            return '\\left|' + inner + '\\right|';
        if (fname === 'sqrt' || fname === 'cbrt' || fname === 'nthRoot')
          return (FN_LATEX[fname] || '\\sqrt') + '{' + inner + '}';
        if (FN_LATEX[fname])            return FN_LATEX[fname] + '\\left(' + inner + '\\right)';
        return '\\operatorname{' + escapeLatex(fname) + '}\\left(' + inner + '\\right)';
      }

      if (t === 'ArrayNode') {
        return '\\left[' + (n.items || []).map(walk).join(',\\,') + '\\right]';
      }

      if (t === 'RangeNode') {
        var a = walk(n.start), b = walk(n.end);
        return n.step ? a + ':' + walk(n.step) + ':' + b : a + ':' + b;
      }

      if (n.content !== undefined) return walk(n.content);

      // Fallback
      try { return escapeLatex(n.toString()); }
      catch (e) { return ''; }
    }

    function wrap(n) {
      var latex = walk(n);
      if (n && n.type === 'OperatorNode' &&
          (n.op === '+' || n.op === '-') && n.args && n.args.length > 1) {
        return '\\left(' + latex + '\\right)';
      }
      return latex;
    }

    var latex = walk(node);

    // Rechazo de resultados sospechosos: si es solo texto con \mathit, no vale la pena
    if (!latex || /^\\mathit\{/.test(latex) && latex.indexOf('{') === 7 &&
        latex.indexOf('}') === latex.length - 1) return null;

    return latex;
  }

  // ---------- Casos especiales con texto "f⁻¹(x) = ..." ----------
  function tryInversePattern(str) {
    var s = String(str).trim();
    var m = s.match(/^f\u207B\u00B9\s*\(x\)\s*=\s*(.+)$/);
    if (m) {
      var rhs = astToLatex(m[1]);
      if (rhs !== null) return 'f^{-1}(x) = ' + rhs;
    }
    // También y = ... y f(x) = ...
    m = s.match(/^([fy])\s*\(x\)\s*=\s*(.+)$/);
    if (m) {
      var r2 = astToLatex(m[2]);
      if (r2 !== null) return m[1] + '(x) = ' + r2;
    }
    m = s.match(/^x\s*=\s*(.+)$/);
    if (m) {
      var r3 = astToLatex(m[1]);
      if (r3 !== null) return 'x = ' + r3;
    }
    m = s.match(/^y\s*=\s*(.+)$/);
    if (m) {
      var r4 = astToLatex(m[1]);
      if (r4 !== null) return 'y = ' + r4;
    }
    return null;
  }

  // ---------- toLatex público ----------
  function toLatex(str) {
    if (str == null) return null;
    var s = String(str).trim();
    if (!s) return null;

    // Texto descriptivo → no aplicar LaTeX
    if (TEXT_WORDS.test(s)) {
      // Pero puede haber un patrón "Algo: 2π" — no, mejor no complicarla
      return null;
    }

    // Patrones de función con nombre
    var inv = tryInversePattern(s);
    if (inv) return inv;

    // Conjunto / intervalo
    var setL = latexifySetOrInterval(s);
    if (setL) return setL;

    // AST
    var ast = astToLatex(s);
    if (ast !== null) return ast;

    return null;
  }

  // ---------- Render ----------
  function render(el, str) {
    if (!el) return;
    var s = String(str == null ? '' : str);

    if (s === '') { el.textContent = ''; return; }

    var latex = toLatex(s);

    if (latex === null || typeof window.katex === 'undefined') {
      el.textContent = s;
      return;
    }

    try {
      window.katex.render(latex, el, {
        throwOnError: false,
        displayMode: false,
        output: 'htmlAndMathml'
      });
      el.classList.add('af-math');
    } catch (e) {
      el.textContent = s;
    }
  }

  window._afMathRender = {
    render: render,
    toLatex: toLatex
  };

  document.documentElement.classList.add('math-render-ready');
})();
