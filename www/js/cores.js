/* =========================================================
   cores.js — 12 núcleos matemáticos puros (sin DOM, sin canvas)
   Testeable con Node:
     node -e "console.log(require('./cores.js').Cuadratica(1,0,-4))"
   Cada calcularPropiedadesX(...) devuelve un objeto de propiedades
   o { error: '...' } si los parámetros son inválidos.
   ========================================================= */
(function () {
  'use strict';

  // -------- Resolución de CoreUtils (browser o Node) --------
  var CU = (typeof window !== 'undefined' && window.CoreUtils) || null;
  if (!CU && typeof require !== 'undefined') {
    try { CU = require('./core-utils.js'); } catch (e) { CU = null; }
  }
  if (!CU) CU = {};

  function fmt(n) { return CU.fmt ? CU.fmt(n) : String(n); }
  function isFiniteNum(v) { return typeof v === 'number' && isFinite(v); }
  var PI = Math.PI;

  // -------------------------------------------------------
  // Ángulo simbólico: si el ratio corresponde a un ángulo notable,
  // devuelve una cadena tipo "π/6" o "−π/4"; si no, null.
  // -------------------------------------------------------
  function symbolicAngle(ratio, fnName) {
    var specials = {
      arcsin: [
        { v: 0,                s: '0' },
        { v: 0.5,              s: 'π/6' },
        { v: Math.SQRT2 / 2,   s: 'π/4' },
        { v: Math.sqrt(3) / 2, s: 'π/3' },
        { v: 1,                s: 'π/2' }
      ],
      arccos: [
        { v: 1,                s: '0' },
        { v: Math.sqrt(3) / 2, s: 'π/6' },
        { v: Math.SQRT2 / 2,   s: 'π/4' },
        { v: 0.5,              s: 'π/3' },
        { v: 0,                s: 'π/2' }
      ]
    };
    var list = specials[fnName] || [];
    var abs = Math.abs(ratio);
    var sign = ratio < 0 ? '−' : '';
    for (var i = 0; i < list.length; i++) {
      if (Math.abs(abs - list[i].v) < 1e-9) return sign + list[i].s;
    }
    return null;
  }


  // =========================================================
  // 1. LINEAL  f(x) = m·x + b
  // =========================================================
  function calcularPropiedadesLineal(m, b) {
    if (!isFiniteNum(m) || !isFiniteNum(b)) return { error: 'Parámetros inválidos: m y b deben ser números finitos.' };
    var r = {};
    r.dominio = 'ℝ';
    r.imagen  = (m === 0) ? '{' + fmt(b) + '}' : 'ℝ';

    if (m === 0) r.ceroX = (b === 0) ? 'Infinitos (f(x)=0 para todo x)' : 'Ninguno';
    else         r.ceroX = [-b / m];
    r.ceroY = b;

    r.monotonia = (m > 0) ? 'Creciente en todo ℝ'
                : (m < 0) ? 'Decreciente en todo ℝ'
                          : 'Constante en todo ℝ';
    r.paridad = (m === 0) ? 'Par' : (b === 0 ? 'Impar' : 'Ninguna');
    r.inyectiva = (m !== 0) ? 'Sí' : 'No';
    r.periodo = 'No periódica';
    r.asintotas = 'Ninguna';
    r.inversa = (m !== 0)
      ? 'f⁻¹(x) = (x − ' + fmt(b) + ') / ' + fmt(m)
      : 'No existe (no inyectiva)';
    r.puntoCaracteristico = { x: 0, y: b, tipo: 'Ordenada al origen' };
    r.extremos = 'Ninguno';
    return r;
  }

  // =========================================================
  // 2. CUADRÁTICA  f(x) = a·x² + b·x + c
  // =========================================================
  function calcularPropiedadesCuadratica(a, b, c) {
    if (!isFiniteNum(a) || !isFiniteNum(b) || !isFiniteNum(c)) return { error: 'Parámetros inválidos.' };
    if (Math.abs(a) < 1e-12) {
      var lin = calcularPropiedadesLineal(b, c);
      if (!lin.error) lin.nota = 'a=0 ⇒ degenera en función lineal.';
      return lin;
    }
    var xv = -b / (2 * a);
    var yv = c - (b * b) / (4 * a);
    var disc = b * b - 4 * a * c;

    var zeros = [];
    if (disc > 1e-12) {
      var s = Math.sqrt(disc);
      zeros = [(-b - s) / (2 * a), (-b + s) / (2 * a)];
    } else if (Math.abs(disc) <= 1e-12) {
      zeros = [xv];
    }

    var r = {};
    r.dominio = 'ℝ';
    r.imagen  = (a > 0) ? '[' + fmt(yv) + ', ∞)' : '(−∞, ' + fmt(yv) + ']';
    r.ceroX   = zeros.length ? zeros : 'Ninguno (raíces complejas)';
    r.ceroY   = c;
    r.monotonia = (a > 0)
      ? 'Decreciente en (−∞, ' + fmt(xv) + '], creciente en [' + fmt(xv) + ', ∞)'
      : 'Creciente en (−∞, ' + fmt(xv) + '], decreciente en [' + fmt(xv) + ', ∞)';
    r.paridad = (Math.abs(b) < 1e-12) ? 'Par' : 'Ninguna';
    r.inyectiva = 'No (parábola)';
    r.periodo = 'No periódica';
    r.asintotas = 'Ninguna';
    r.inversa = 'No es función global (definida por ramas)';
    r.puntoCaracteristico = { x: xv, y: yv, tipo: 'Vértice' };
    r.extremos = [{ x: xv, y: yv, tipo: a > 0 ? 'Mínimo' : 'Máximo' }];
    return r;
  }

  // =========================================================
  // 3. CÚBICA  f(x) = a·x³ + b·x² + c·x + d
  // =========================================================
  function calcularPropiedadesCubica(a, b, c, d) {
    if (!isFiniteNum(a) || !isFiniteNum(b) || !isFiniteNum(c) || !isFiniteNum(d)) return { error: 'Parámetros inválidos.' };
    if (Math.abs(a) < 1e-12) {
      var cu = calcularPropiedadesCuadratica(b, c, d);
      if (!cu.error) cu.nota = 'a=0 ⇒ degenera en cuadrática.';
      return cu;
    }
    var f = function (x) { return a*x*x*x + b*x*x + c*x + d; };
    var r = {};
    r.dominio = 'ℝ';
    r.imagen  = 'ℝ';

    // Ceros: 1º math.js (exacto), 2º Nerdamer (simbólico), 3º numérico
var zeros = null;
if (typeof window !== 'undefined' && window.mathParser) {
  if (window.mathParser.polynomialRoots) {
    zeros = window.mathParser.polynomialRoots([a, b, c, d]);
  }
  // Nerdamer: útil cuando polynomialRoot falla o hay raíces irracionales
  if ((!zeros || !zeros.length) && window.mathParser.nerdamerSolve) {
    var exprStr = '(' + a + ')*x^3 + (' + b + ')*x^2 + (' + c + ')*x + (' + d + ')';
    var sol = window.mathParser.nerdamerSolve(exprStr, 'x');
    if (sol && sol.length) {
      // Filtrar solo raíces reales numéricas
      var reales = sol.filter(function (v) {
        return typeof v === 'number' && isFinite(v);
      });
      if (reales.length) zeros = reales;
    }
  }
}
// Último recurso: bisección numérica
if (!zeros || !zeros.length) {
  zeros = (CU.findRoots) ? CU.findRoots(f, -100, 100, 2000) : [];
}
r.ceroX = zeros.length ? zeros : 'Solo 1 raíz real (2 complejas)';

    // Derivada: f'(x) = 3a·x² + 2b·x + c ; discriminante Δ' = 4(b² − 3ac)
    var discP = 4 * b * b - 12 * a * c;
    var xInf = -b / (3 * a);
    if (discP <= 1e-12) {
      r.monotonia = (a > 0) ? 'Estrictamente creciente en ℝ' : 'Estrictamente decreciente en ℝ';
      r.inyectiva = 'Sí';
      r.extremos  = 'Ninguno';
    } else {
      var sq = Math.sqrt(discP);
      var x1 = (-2*b - sq) / (6*a);
      var x2 = (-2*b + sq) / (6*a);
      var xa = Math.min(x1, x2), xb = Math.max(x1, x2);
      r.monotonia = (a > 0)
        ? 'Creciente en (−∞, ' + fmt(xa) + '], decreciente en [' + fmt(xa) + ', ' + fmt(xb) + '], creciente en [' + fmt(xb) + ', ∞)'
        : 'Decreciente en (−∞, ' + fmt(xa) + '], creciente en [' + fmt(xa) + ', ' + fmt(xb) + '], decreciente en [' + fmt(xb) + ', ∞)';
      r.inyectiva = 'No (tiene extremos locales)';
      r.extremos = [
        { x: x1, y: f(x1), tipo: a > 0 ? 'Máximo local' : 'Mínimo local' },
        { x: x2, y: f(x2), tipo: a > 0 ? 'Mínimo local' : 'Máximo local' }
      ];
    }

    r.paridad = (Math.abs(b) < 1e-12 && Math.abs(d) < 1e-12) ? 'Impar' : 'Ninguna';
    r.periodo = 'No periódica';
    r.asintotas = 'Ninguna';
    r.inversa = 'No elemental (fórmula de Cardano)';
    r.puntoCaracteristico = { x: xInf, y: f(xInf), tipo: 'Punto de inflexión' };
    return r;
  }

  // =========================================================
  // 4. RAÍZ CUADRADA  f(x) = a·√(x − h) + k
  // =========================================================
  function calcularPropiedadesRaizCuadrada(a, h, k) {
    if (!isFiniteNum(a) || !isFiniteNum(h) || !isFiniteNum(k)) return { error: 'Parámetros inválidos.' };
    var r = {};
    r.dominio = '[' + fmt(h) + ', ∞)';

    if (a === 0) {
      r.imagen = '{' + fmt(k) + '}';
      r.ceroX  = (k === 0) ? 'Infinitos en [' + fmt(h) + ', ∞)' : 'Ninguno';
    } else {
      r.imagen = (a > 0) ? '[' + fmt(k) + ', ∞)' : '(−∞, ' + fmt(k) + ']';
      // a·√(x−h) = −k  ⟺  √(x−h) = −k/a  (requiere −k/a ≥ 0)
      var rhs = -k / a;
      if (rhs < -1e-12)               r.ceroX = 'Ninguno';
      else if (Math.abs(rhs) < 1e-12) r.ceroX = [h];
      else                             r.ceroX = [h + rhs * rhs];
    }
    r.ceroY = (h <= 0 && a !== 0) ? a * Math.sqrt(-h) + k
            : (a === 0 ? k : 'No corta el eje Y (0 ∉ dominio)');

    r.monotonia = (a > 0) ? 'Creciente en todo el dominio'
                : (a < 0) ? 'Decreciente en todo el dominio'
                          : 'Constante';
    r.paridad = 'Ninguna (dominio no simétrico)';
    r.inyectiva = (a !== 0) ? 'Sí' : 'No';
    r.periodo = 'No periódica';
    r.asintotas = 'Ninguna';
    r.inversa = (a !== 0)
      ? 'f⁻¹(x) = ' + fmt(h) + ' + ((x − ' + fmt(k) + ') / ' + fmt(a) + ')², para x en la imagen'
      : 'No existe (no inyectiva)';
    r.puntoCaracteristico = { x: h, y: k, tipo: 'Punto de inicio (vértice)' };
    r.extremos = (a !== 0)
      ? [{ x: h, y: k, tipo: a > 0 ? 'Mínimo en el extremo del dominio' : 'Máximo en el extremo del dominio' }]
      : 'Ninguno';
    return r;
  }

  // =========================================================
  // 5. RAÍZ CÚBICA  f(x) = a·∛(x − h) + k
  // =========================================================
  function calcularPropiedadesRaizCubica(a, h, k) {
    if (!isFiniteNum(a) || !isFiniteNum(h) || !isFiniteNum(k)) return { error: 'Parámetros inválidos.' };
    var cbrt = function (x) { return x < 0 ? -Math.pow(-x, 1/3) : Math.pow(x, 1/3); };
    var f = function (x) { return a * cbrt(x - h) + k; };

    var r = {};
    r.dominio = 'ℝ';
    r.imagen  = (a === 0) ? '{' + fmt(k) + '}' : 'ℝ';

    if (a === 0) {
      r.ceroX = (k === 0) ? 'Infinitos (f(x)=0 ∀x)' : 'Ninguno';
    } else {
      // ∛(x−h) = −k/a  ⟹  x = h − (k/a)³
      r.ceroX = [h - Math.pow(k / a, 3)];
    }
    r.ceroY = f(0);

    r.monotonia = (a > 0) ? 'Estrictamente creciente en ℝ'
                : (a < 0) ? 'Estrictamente decreciente en ℝ'
                          : 'Constante';
    r.paridad = (Math.abs(h) < 1e-12 && Math.abs(k) < 1e-12 && a !== 0) ? 'Impar' : 'Ninguna';
    r.inyectiva = (a !== 0) ? 'Sí' : 'No';
    r.periodo = 'No periódica';
    r.asintotas = 'Ninguna';
    r.inversa = (a !== 0)
      ? 'f⁻¹(x) = ' + fmt(h) + ' + ((x − ' + fmt(k) + ') / ' + fmt(a) + ')³'
      : 'No existe (no inyectiva)';
    r.puntoCaracteristico = { x: h, y: k, tipo: 'Centro de simetría' };
    r.extremos = 'Ninguno (monótona estricta)';
    return r;
  }

  // =========================================================
  // 6. MODULAR  f(x) = a·|x − h| + k
  // =========================================================
  function calcularPropiedadesModular(a, h, k) {
    if (!isFiniteNum(a) || !isFiniteNum(h) || !isFiniteNum(k)) return { error: 'Parámetros inválidos.' };
    var r = {};
    r.dominio = 'ℝ';

    if (a === 0) {
      r.imagen = '{' + fmt(k) + '}';
      r.ceroX  = (k === 0) ? 'Infinitos (f(x)=0 ∀x)' : 'Ninguno';
    } else {
      r.imagen = (a > 0) ? '[' + fmt(k) + ', ∞)' : '(−∞, ' + fmt(k) + ']';
      // a·|x−h| = −k  ⟺  |x−h| = −k/a  (requiere −k/a ≥ 0)
      var rhs = -k / a;
      if (rhs < -1e-12)               r.ceroX = 'Ninguno';
      else if (Math.abs(rhs) < 1e-12) r.ceroX = [h];
      else                             r.ceroX = [h - rhs, h + rhs];
    }
    r.ceroY = a * Math.abs(h) + k;

    if (a === 0)      r.monotonia = 'Constante';
    else if (a > 0)   r.monotonia = 'Decreciente en (−∞, ' + fmt(h) + '], creciente en [' + fmt(h) + ', ∞)';
    else              r.monotonia = 'Creciente en (−∞, ' + fmt(h) + '], decreciente en [' + fmt(h) + ', ∞)';

    r.paridad = (Math.abs(h) < 1e-12) ? 'Par' : 'Ninguna';
    r.inyectiva = 'No (forma de V)';
    r.periodo = 'No periódica';
    r.asintotas = 'Ninguna';
    r.inversa = 'No es función global (dos ramas)';
    r.puntoCaracteristico = { x: h, y: k, tipo: 'Vértice' };
    r.extremos = (a !== 0) ? [{ x: h, y: k, tipo: a > 0 ? 'Mínimo' : 'Máximo' }] : 'Ninguno';
    return r;
  }

  // =========================================================
  // 7. LOGARÍTMICA  f(x) = a·log_b(x − h) + k
  // =========================================================
  function calcularPropiedadesLogaritmica(a, b, h, k) {
    if (!isFiniteNum(a) || !isFiniteNum(b) || !isFiniteNum(h) || !isFiniteNum(k)) return { error: 'Parámetros inválidos.' };
    if (b <= 0 || Math.abs(b - 1) < 1e-12) return { error: 'La base b debe ser > 0 y ≠ 1.' };

    var logB = function (x) { return Math.log(x) / Math.log(b); };
    var r = {};
    r.dominio = '(' + fmt(h) + ', ∞)';
    r.imagen  = (a === 0) ? '{' + fmt(k) + '}' : 'ℝ';

    if (a === 0) {
      r.ceroX = (k === 0) ? 'Infinitos' : 'Ninguno';
    } else {
      // a·log_b(x−h) = −k  ⟹  x = h + b^(−k/a)
      r.ceroX = [h + Math.pow(b, -k / a)];
    }
    r.ceroY = (h < 0) ? a * logB(-h) + k : 'No corta el eje Y (0 ∉ dominio)';

    var inc = (a > 0 && b > 1) || (a < 0 && b > 0 && b < 1);
    r.monotonia = inc ? 'Estrictamente creciente en (' + fmt(h) + ', ∞)'
                      : 'Estrictamente decreciente en (' + fmt(h) + ', ∞)';
    r.paridad = 'Ninguna';
    r.inyectiva = (a !== 0) ? 'Sí' : 'No';
    r.periodo = 'No periódica';
    r.asintotas = { vertical: 'x = ' + fmt(h) };
    r.inversa = (a !== 0)
      ? 'f⁻¹(x) = ' + fmt(h) + ' + ' + fmt(b) + '^((x − ' + fmt(k) + ') / ' + fmt(a) + ')'
      : 'No existe';
    r.puntoCaracteristico = { x: h + 1, y: k, tipo: 'Punto (h+1, k), ya que log_b(1)=0' };
    r.extremos = 'Ninguno';
    return r;
  }

  // =========================================================
  // 8. EXPONENCIAL  f(x) = a·b^(x − h) + k
  // =========================================================
  function calcularPropiedadesExponencial(a, b, h, k) {
    if (!isFiniteNum(a) || !isFiniteNum(b) || !isFiniteNum(h) || !isFiniteNum(k)) return { error: 'Parámetros inválidos.' };
    if (b <= 0 || Math.abs(b - 1) < 1e-12) return { error: 'La base b debe ser > 0 y ≠ 1.' };

    var r = {};
    r.dominio = 'ℝ';
    if (a === 0) {
      r.imagen = '{' + fmt(k) + '}';
      r.ceroX  = (k === 0) ? 'Infinitos' : 'Ninguno';
    } else {
      r.imagen = (a > 0) ? '(' + fmt(k) + ', ∞)' : '(−∞, ' + fmt(k) + ')';
      var arg = -k / a;
      if (arg > 1e-12) r.ceroX = [h + Math.log(arg) / Math.log(b)];
      else              r.ceroX = 'Ninguno';
    }
    r.ceroY = a * Math.pow(b, -h) + k;

    var inc = (a > 0 && b > 1) || (a < 0 && b < 1);
    r.monotonia = inc ? 'Estrictamente creciente en ℝ' : 'Estrictamente decreciente en ℝ';
    r.paridad = 'Ninguna';
    r.inyectiva = (a !== 0) ? 'Sí' : 'No';
    r.periodo = 'No periódica';
    r.asintotas = { horizontal: 'y = ' + fmt(k) };
    r.inversa = (a !== 0)
      ? 'f⁻¹(x) = ' + fmt(h) + ' + log_' + fmt(b) + '((x − ' + fmt(k) + ') / ' + fmt(a) + ')'
      : 'No existe';
    r.puntoCaracteristico = { x: h, y: a + k, tipo: 'Punto (h, a+k), ya que b⁰=1' };
    r.extremos = 'Ninguno';
    return r;
  }

  // =========================================================
  // 9. PROPORCIONALIDAD INVERSA  f(x) = a/(x − h) + k
  // =========================================================
  function calcularPropiedadesProporcionalidadInversa(a, h, k) {
    if (!isFiniteNum(a) || !isFiniteNum(h) || !isFiniteNum(k)) return { error: 'Parámetros inválidos.' };
    var r = {};
    r.dominio = 'ℝ \\ {' + fmt(h) + '}';
    r.imagen  = (a === 0) ? '{' + fmt(k) + '}' : 'ℝ \\ {' + fmt(k) + '}';

    if (a === 0) {
      r.ceroX = (k === 0) ? 'Infinitos' : 'Ninguno';
    } else if (Math.abs(k) < 1e-12) {
      r.ceroX = 'Ninguno (no corta el eje X)';
    } else {
      // a/(x−h) = −k  ⟹  x = h − a/k
      r.ceroX = [h - a / k];
    }
    r.ceroY = (Math.abs(h) < 1e-12)
      ? 'No corta el eje Y (x=0 ∉ dominio)'
      : (a / (-h) + k);

    if (a === 0)     r.monotonia = 'Constante';
    else if (a > 0)  r.monotonia = 'Decreciente en (−∞, ' + fmt(h) + ') y decreciente en (' + fmt(h) + ', ∞)';
    else             r.monotonia = 'Creciente en (−∞, ' + fmt(h) + ') y creciente en (' + fmt(h) + ', ∞)';

    r.paridad = (Math.abs(h) < 1e-12 && Math.abs(k) < 1e-12) ? 'Impar' : 'Ninguna';
    r.inyectiva = (a !== 0) ? 'Sí' : 'No';
    r.periodo = 'No periódica';
    r.asintotas = { vertical: 'x = ' + fmt(h), horizontal: 'y = ' + fmt(k) };
    r.inversa = (a !== 0)
      ? 'f⁻¹(x) = ' + fmt(h) + ' + ' + fmt(a) + ' / (x − ' + fmt(k) + ')'
      : 'No existe';
    r.puntoCaracteristico = { x: h, y: k, tipo: 'Centro de simetría (intersección de asíntotas)' };
    r.extremos = 'Ninguno';
    return r;
  }

  // =========================================================
  // 10. SENO  f(x) = a·sin(b(x − h)) + k
  // =========================================================
  function calcularPropiedadesSeno(a, b, h, k) {
    if (!isFiniteNum(a) || !isFiniteNum(b) || !isFiniteNum(h) || !isFiniteNum(k)) return { error: 'Parámetros inválidos.' };
    if (Math.abs(b) < 1e-12) {
      var r0 = calcularPropiedadesLineal(0, k); // b=0 ⇒ f(x) = a·sin(0)+k = k
      if (!r0.error) r0.nota = 'b=0 ⇒ función constante en y = k.';
      return r0;
    }
    var r = {};
    r.dominio = 'ℝ';
    r.imagen  = (a === 0) ? '{' + fmt(k) + '}' : '[' + fmt(k - Math.abs(a)) + ', ' + fmt(k + Math.abs(a)) + ']';
    if (a === 0) {
      r.ceroX = (k === 0) ? 'Infinitos' : 'Ninguno';
    } else {
      var ratioS = -k / a;
      if (Math.abs(ratioS) > 1 + 1e-9) {
        r.ceroX = 'Ninguno (|−k/a| > 1: sin(·) = ratio no tiene solución)';
      } else {
        var arcSym = symbolicAngle(ratioS, 'arcsin');
        var arcStr = arcSym || ('arcsin(' + fmt(ratioS) + ')');
        r.ceroX = 'x = ' + fmt(h) + ' + (' + arcStr + ' + 2πn)/' + fmt(b) +
                  '  ó  x = ' + fmt(h) + ' + (π − ' + arcStr + ' + 2πn)/' + fmt(b) + ', n ∈ ℤ';
      }
    }
    r.ceroY = a * Math.sin(-b * h) + k;
    r.monotonia = 'Oscilante: alterna tramos crecientes y decrecientes cada ' + fmt(PI / Math.abs(b)) + ' unidades.';
    r.paridad = (Math.abs(h) < 1e-12 && Math.abs(k) < 1e-12) ? 'Impar' : 'Ninguna';
    r.inyectiva = 'No (periódica)';
    r.periodo   = 2 * PI / Math.abs(b);
    r.amplitud  = Math.abs(a);
    r.asintotas = 'Ninguna';
    r.inversa   = 'No es función global (requiere restringir el dominio a un periodo)';
    r.puntoCaracteristico = { x: h, y: k, tipo: 'Punto de desplazamiento (inicio del ciclo)' };
    r.extremos = 'Máximos en x = h + π/(2' + fmt(b) + ') + 2πn/' + fmt(b) + ' (y = ' + fmt(k + Math.abs(a)) + '); ' +
                 'mínimos en x = h − π/(2' + fmt(b) + ') + 2πn/' + fmt(b) + ' (y = ' + fmt(k - Math.abs(a)) + '); n ∈ ℤ';
    return r;
  }

  // =========================================================
  // 11. COSENO  f(x) = a·cos(b(x − h)) + k
  // =========================================================
  function calcularPropiedadesCoseno(a, b, h, k) {
    if (!isFiniteNum(a) || !isFiniteNum(b) || !isFiniteNum(h) || !isFiniteNum(k)) return { error: 'Parámetros inválidos.' };
    if (Math.abs(b) < 1e-12) {
      var r0 = calcularPropiedadesLineal(0, a + k); // f(x) = a·cos(0)+k = a+k
      if (!r0.error) r0.nota = 'b=0 ⇒ función constante en y = a + k.';
      return r0;
    }
    var r = {};
    r.dominio = 'ℝ';
    r.imagen  = (a === 0) ? '{' + fmt(k) + '}' : '[' + fmt(k - Math.abs(a)) + ', ' + fmt(k + Math.abs(a)) + ']';
    if (a === 0) {
      r.ceroX = (k === 0) ? 'Infinitos' : 'Ninguno';
    } else {
      var ratioC = -k / a;
      if (Math.abs(ratioC) > 1 + 1e-9) {
        r.ceroX = 'Ninguno (|−k/a| > 1: cos(·) = ratio no tiene solución)';
      } else {
        var arcCosSym = symbolicAngle(ratioC, 'arccos');
        var arcCosStr = arcCosSym || ('arccos(' + fmt(ratioC) + ')');
        r.ceroX = 'x = ' + fmt(h) + ' + (±' + arcCosStr + ' + 2πn)/' + fmt(b) + ', n ∈ ℤ';
      }
    }
    r.ceroY = a * Math.cos(-b * h) + k;
    r.monotonia = 'Oscilante: alterna tramos crecientes y decrecientes cada ' + fmt(PI / Math.abs(b)) + ' unidades.';
    r.paridad = (Math.abs(h) < 1e-12 && Math.abs(k) < 1e-12) ? 'Par' : 'Ninguna';
    r.inyectiva = 'No (periódica)';
    r.periodo   = 2 * PI / Math.abs(b);
    r.amplitud  = Math.abs(a);
    r.asintotas = 'Ninguna';
    r.inversa   = 'No es función global (requiere restringir el dominio a un periodo)';
    r.puntoCaracteristico = { x: h, y: a + k, tipo: 'Punto (h, a+k), ya que cos(0)=1' };
    r.extremos = 'Máximos en x = h + 2πn/' + fmt(b) + ' (y = ' + fmt(k + Math.abs(a)) + '); ' +
                 'mínimos en x = h + π/' + fmt(b) + ' + 2πn/' + fmt(b) + ' (y = ' + fmt(k - Math.abs(a)) + '); n ∈ ℤ';
    return r;
  }

  // =========================================================
  // 12. TANGENTE  f(x) = a·tan(b(x − h)) + k
  // =========================================================
  function calcularPropiedadesTangente(a, b, h, k) {
    if (!isFiniteNum(a) || !isFiniteNum(b) || !isFiniteNum(h) || !isFiniteNum(k)) return { error: 'Parámetros inválidos.' };
    if (Math.abs(b) < 1e-12) {
      var r0 = calcularPropiedadesLineal(0, k); // f(x) = a·tan(0)+k = k
      if (!r0.error) r0.nota = 'b=0 ⇒ función constante en y = k.';
      return r0;
    }
    var r = {};
    r.dominio = 'ℝ \\ { x = ' + fmt(h) + ' + (π/2 + nπ)/' + fmt(b) + ', n ∈ ℤ }';
    r.imagen  = (a === 0) ? '{' + fmt(k) + '}' : 'ℝ';

    if (a === 0) {
      r.ceroX = (k === 0) ? 'Infinitos' : 'Ninguno';
    } else {
      r.ceroX = 'x = ' + fmt(h) + ' + (arctan(−' + fmt(k/a) + ') + nπ)/' + fmt(b) + ', n ∈ ℤ';
    }
    r.ceroY = a * Math.tan(-b * h) + k;

    var inc = (a * b) > 0;
    r.monotonia = (inc ? 'Creciente' : 'Decreciente') + ' en cada rama (entre asíntotas consecutivas)';
    r.paridad = (Math.abs(h) < 1e-12 && Math.abs(k) < 1e-12) ? 'Impar' : 'Ninguna';
    r.inyectiva = 'Sí (en cada rama)';
    r.periodo   = PI / Math.abs(b);
    r.asintotas = { vertical: 'x = ' + fmt(h) + ' + (π/2 + nπ)/' + fmt(b) + ', n ∈ ℤ' };
    r.inversa   = (a !== 0)
      ? 'f⁻¹(x) = ' + fmt(h) + ' + arctan((x − ' + fmt(k) + ')/' + fmt(a) + ')/' + fmt(b) + ' + nπ/' + fmt(b) + ' (por ramas)'
      : 'No existe';
    r.puntoCaracteristico = { x: h, y: k, tipo: 'Punto (h, k), ya que tan(0)=0' };
    r.extremos = 'Ninguno (monótona en cada rama)';
    return r;
  }

  // =========================================================
  // Registro global (window.CORES + funciones sueltas)
  // =========================================================
  var CORES = {
    Lineal:                 calcularPropiedadesLineal,
    Cuadratica:             calcularPropiedadesCuadratica,
    Cubica:                 calcularPropiedadesCubica,
    RaizCuadrada:           calcularPropiedadesRaizCuadrada,
    RaizCubica:             calcularPropiedadesRaizCubica,
    Modular:                calcularPropiedadesModular,
    Logaritmica:            calcularPropiedadesLogaritmica,
    Exponencial:            calcularPropiedadesExponencial,
    ProporcionalidadInversa:calcularPropiedadesProporcionalidadInversa,
    Seno:                   calcularPropiedadesSeno,
    Coseno:                 calcularPropiedadesCoseno,
    Tangente:               calcularPropiedadesTangente
  };

  if (typeof window !== 'undefined') {
    window.CORES = CORES;
    window.calcularPropiedadesLineal                 = calcularPropiedadesLineal;
    window.calcularPropiedadesCuadratica             = calcularPropiedadesCuadratica;
    window.calcularPropiedadesCubica                 = calcularPropiedadesCubica;
    window.calcularPropiedadesRaizCuadrada           = calcularPropiedadesRaizCuadrada;
    window.calcularPropiedadesRaizCubica             = calcularPropiedadesRaizCubica;
    window.calcularPropiedadesModular                = calcularPropiedadesModular;
    window.calcularPropiedadesLogaritmica            = calcularPropiedadesLogaritmica;
    window.calcularPropiedadesExponencial            = calcularPropiedadesExponencial;
    window.calcularPropiedadesProporcionalidadInversa= calcularPropiedadesProporcionalidadInversa;
    window.calcularPropiedadesSeno                   = calcularPropiedadesSeno;
    window.calcularPropiedadesCoseno                 = calcularPropiedadesCoseno;
    window.calcularPropiedadesTangente               = calcularPropiedadesTangente;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = CORES;
})();