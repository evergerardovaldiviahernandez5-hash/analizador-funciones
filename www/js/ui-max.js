/* =========================================================
   UI MAX — Mejoras progresivas de interfaz
   Analizador de Funciones · Ever
   ---------------------------------------------------------
   Capa OPCIONAL y defensiva: si algo falla, la app sigue
   funcionando exactamente igual. No toca estado ni lógica
   de los módulos; solo añade brillo interactivo:
     1. Halo de acento que sigue al puntero en las tarjetas
     2. Relleno de acento en los sliders (--p)
     3. Sombra de la cabecera del módulo al hacer scroll
   ========================================================= */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;

  function ready(fn) {
    if (doc.readyState === 'loading') {
      doc.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  /* ---------- 1. Halo que sigue al puntero en .card ---------- */
  function initCardSheen() {
    // Delegación: funciona con tarjetas actuales y futuras.
    doc.addEventListener('pointermove', function (ev) {
      var card = ev.target && ev.target.closest ? ev.target.closest('.card') : null;
      if (!card) return;
      var r = card.getBoundingClientRect();
      if (!r.width || !r.height) return;
      card.style.setProperty('--mx', ((ev.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      card.style.setProperty('--my', ((ev.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    }, { passive: true });
  }

  /* ---------- 2. Relleno de acento en sliders ---------- */
  function syncSlider(sl) {
    try {
      var min = parseFloat(sl.min); if (!isFinite(min)) min = 0;
      var max = parseFloat(sl.max); if (!isFinite(max)) max = 100;
      var val = parseFloat(sl.value); if (!isFinite(val)) val = min;
      var p = max > min ? ((val - min) / (max - min)) * 100 : 0;
      sl.style.setProperty('--p', p.toFixed(2) + '%');
    } catch (e) { /* silencioso */ }
  }

  function syncAllSliders(scope) {
    var list = (scope || doc).querySelectorAll('.field-slider');
    for (var i = 0; i < list.length; i++) syncSlider(list[i]);
  }

  function initSliders() {
    // Delegación en captura: cualquier slider, presente o futuro.
    ['input', 'change'].forEach(function (type) {
      doc.addEventListener(type, function (ev) {
        var t = ev.target;
        if (t && t.classList && t.classList.contains('field-slider')) syncSlider(t);
      }, { capture: true, passive: true });
    });

    // Cuando un módulo renderiza nuevos sliders, los inicializamos.
    if ('MutationObserver' in window) {
      var scheduled = false;
      new MutationObserver(function (muts) {
        if (scheduled) return;
        for (var i = 0; i < muts.length; i++) {
          if (muts[i].addedNodes && muts[i].addedNodes.length) { scheduled = true; break; }
        }
        if (!scheduled) return;
        // rAF: esperamos a que el DOM del módulo termine de montarse.
        requestAnimationFrame(function () {
          scheduled = false;
          syncAllSliders(doc);
        });
      }).observe(doc.body, { childList: true, subtree: true });
    }

    syncAllSliders(doc);
  }

  /* ---------- 3. Cabecera del módulo con sombra al hacer scroll ---------- */
  function initModuleHeader() {
    var ticking = false;
    function update() {
      ticking = false;
      var header = doc.querySelector('.module-header');
      if (!header) return;
      header.classList.toggle('is-scrolled', window.scrollY > 6);
    }
    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });
    update();
  }

  ready(function () {
    try { initCardSheen(); } catch (e) {}
    try { initSliders(); } catch (e) {}
    try { initModuleHeader(); } catch (e) {}
    root.classList.add('ui-max-ready');
  });
})();
