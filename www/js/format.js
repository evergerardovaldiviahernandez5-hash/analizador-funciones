/* =========================================================
   format.js
   - formatNumber: redondeo legible, fracciones simples, ±∞.
   - formatEquation: expresión ASCII → notación matemática legible.
   - gcd: máximo común divisor.
   ========================================================= */
(function () {
  'use strict';

  function gcd(a, b) {
    a = Math.abs(Math.round(a));
    b = Math.abs(Math.round(b));
    while (b) { var t = b; b = a % b; a = t; }
    return a || 1;
  }

  function formatNumber(n, decimals) {
    if (typeof n === 'string') return n;
    if (n === Infinity)  return '∞';
    if (n === -Infinity) return '-∞';
    if (typeof n !== 'number' || isNaN(n)) return 'NaN';

    var d = (typeof decimals === 'number') ? decimals : 4;

    var roundInt = Math.round(n);
    if (Math.abs(n - roundInt) < 1e-9) return String(roundInt);

    // Fracción simple solo con denominadores pequeños (≤20) y tolerancia estricta
    var frac = toSimpleFraction(n, 20, 1e-10);
    if (frac) return frac;

    var r = Number(n.toFixed(d));
    if (r === 0) return '0';
    return String(r);
  }

  function toSimpleFraction(n, maxDen, tol) {
    maxDen = maxDen || 20;
    tol    = tol    || 1e-10;
    var sign = n < 0 ? -1 : 1;
    var x = Math.abs(n);
    if (x === 0) return '0';
    var h1 = 1, h2 = 0, k1 = 0, k2 = 1, b = x;
    do {
      var a = Math.floor(b);
      var aux = h1; h1 = a * h1 + h2; h2 = aux;
      aux = k1; k1 = a * k1 + k2; k2 = aux;
      if (k1 > maxDen) return null;
      var denom = b - a;
      if (denom === 0) break;
      b = 1 / denom;
    } while (Math.abs(x - h1 / k1) > tol);

    if (k1 === 1) return String(sign * h1);
    if (k1 > maxDen || k1 === 0) return null;
    var g = gcd(h1, k1);
    return sign * h1 / g + '/' + k1 / g;
  }

  function formatEquation(expr) {
    if (expr == null) return '';
    var s = String(expr);

    s = s.replace(/\bsqrt\(/g, '√(');
    s = s.replace(/\bcbrt\(/g, '∛(');
    s = s.replace(/\bpi\b/g, 'π');
    s = s.replace(/\bInfinity\b/g, '∞');

    s = s.replace(/\^2\b/g, '²');
    s = s.replace(/\^3\b/g, '³');
    s = s.replace(/\^4\b/g, '⁴');
    s = s.replace(/\^5\b/g, '⁵');
    s = s.replace(/\^6\b/g, '⁶');
    s = s.replace(/\^7\b/g, '⁷');
    s = s.replace(/\^8\b/g, '⁸');
    s = s.replace(/\^9\b/g, '⁹');

    s = s.replace(/(\d)\s*\*\s*x/g, '$1x');
    s = s.replace(/(\d)\s*\*\s*\(/g, '$1(');
    s = s.replace(/(\w)\s*\*\s*(\w)/g, '$1 $2');

    s = s.replace(/\s*\+\s*/g, ' + ');
    s = s.replace(/\s*-\s*/g, ' − ');
    s = s.replace(/\s*\/\s*/g, ' / ');

    s = s.replace(/\s+/g, ' ').trim();
    return s;
  }

  function prettyExpr(expr) { return formatEquation(expr); }

  var API = {
    gcd: gcd,
    formatNumber: formatNumber,
    formatEquation: formatEquation,
    prettyExpr: prettyExpr,
    toSimpleFraction: toSimpleFraction
  };

  if (typeof window !== 'undefined') {
    window.formatNumber = formatNumber;
    window.formatEquation = formatEquation;
    window.prettyExpr = prettyExpr;
    window.gcd = gcd;
    window.Format = API;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
