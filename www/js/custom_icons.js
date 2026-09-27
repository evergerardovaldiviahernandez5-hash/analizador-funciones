/* =========================================================
   custom_icons.js
   Mapa de iconos PNG por tipo de función + fallback SVG
   inline (data-URI) cuando el PNG no existe o falla la carga.
   ========================================================= */
(function () {
  'use strict';

  var ICONS = {
    Lineal:                  'icons/Lineal.png',
    Cuadratica:              'icons/Cuadratica.png',
    Cubica:                  'icons/Cubica.png',
    RaizCuadrada:            'icons/Raiz_cuadrada.png',
    RaizCubica:              'icons/Raiz_cubica.png',
    Modular:                 'icons/Modular.png',
    Logaritmica:             'icons/Logaritmica.png',
    Exponencial:             'icons/Exponencial.png',
    ProporcionalidadInversa: 'icons/Proporcionalidad_inversa.png',
    Seno:                    'icons/Seno.png',
    Coseno:                  'icons/Coseno.png',
    Tangente:                'icons/Tangente.png'
  };

  // SVG genérico como data-URI (color de acento por tipo)
  function makeSvg(color) {
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
      '<rect width="64" height="64" rx="14" fill="rgba(255,255,255,0.06)"/>' +
      '<path d="M6 42 Q 20 42 24 24 T 40 24 T 58 10" fill="none" ' +
      'stroke="' + color + '" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="6"  cy="42" r="2.5" fill="' + color + '"/>' +
      '<circle cx="58" cy="10" r="2.5" fill="' + color + '"/>' +
      '</svg>';
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  var FALLBACKS = {
    Lineal:                  makeSvg('#4be1ec'),
    Cuadratica:              makeSvg('#b892ff'),
    Cubica:                  makeSvg('#ff6b81'),
    RaizCuadrada:            makeSvg('#4be1ec'),
    RaizCubica:              makeSvg('#b892ff'),
    Modular:                 makeSvg('#ffd166'),
    Logaritmica:             makeSvg('#ff6b81'),
    Exponencial:             makeSvg('#4be1ec'),
    ProporcionalidadInversa: makeSvg('#ffd166'),
    Seno:                    makeSvg('#b892ff'),
    Coseno:                  makeSvg('#4be1ec'),
    Tangente:                makeSvg('#ff6b81')
  };

  function getIcon(id)     { return ICONS[id] || ''; }
  function getFallback(id) { return FALLBACKS[id] || makeSvg('#4be1ec'); }

  var API = { MAP: ICONS, getIcon: getIcon, getFallback: getFallback };

  if (typeof window !== 'undefined') window.CustomIcons = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();