/* =========================================================
   ui-v15.js
   - Empty state tags clickeables
   - Bottom-nav indicador activo
   - Chips de tags en biblioteca
   ========================================================= */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;

  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function haptic(ms) { try { navigator.vibrate && navigator.vibrate(ms || 6); } catch (e) {} }

  var TAG_SUGGESTIONS = ['lineal', 'polinomio', 'raíz', 'trig', 'exp', 'log', 'racional', 'valor'];

  // ---------- 1. Añadir tags al empty state ----------
  function enhanceEmptyState() {
    var grid = document.getElementById('cards-grid');
    if (!grid) return;
    var obs = new MutationObserver(function () {
      var empty = grid.querySelector('.af-empty-state');
      if (!empty || empty.querySelector('.af-empty-tags')) return;
      var tagsWrap = document.createElement('div');
      tagsWrap.className = 'af-empty-tags';
      var html = '';
      for (var i = 0; i < TAG_SUGGESTIONS.length; i++) {
        html += '<button type="button" class="af-empty-tag">' + TAG_SUGGESTIONS[i] + '</button>';
      }
      tagsWrap.innerHTML = html;
      empty.appendChild(tagsWrap);
      tagsWrap.addEventListener('click', function (e) {
        var t = e.target;
        if (!t || !t.classList || !t.classList.contains('af-empty-tag')) return;
        var s = document.getElementById('cards-search');
        if (s) {
          s.value = t.textContent;
          s.dispatchEvent(new Event('input', { bubbles: true }));
          s.focus();
        }
        haptic(6);
      });
    });
    obs.observe(grid, { childList: true, subtree: true });
  }

  // ---------- 2. Bottom-nav activo según pantalla ----------
  function setupBottomNavActive() {
    var nav = document.querySelector('.bottom-nav');
    if (!nav) return;
    function update() {
      var homeActive = document.getElementById('home-screen');
      var moduleActive = document.getElementById('module-screen');
      var items = nav.querySelectorAll('.bn-item');
      for (var i = 0; i < items.length; i++) items[i].classList.remove('bn-active');
      var homeItem = nav.querySelector('[data-action="home"]');
      if (homeItem && homeActive && homeActive.classList.contains('active')) {
        homeItem.classList.add('bn-active');
      }
      // No hay item "módulo" en el nav, así que nada más que marcar
    }
    // Detectar cambios de pantalla
    var obs = new MutationObserver(update);
    var hs = document.getElementById('home-screen');
    var ms = document.getElementById('module-screen');
    if (hs) obs.observe(hs, { attributes: true, attributeFilter: ['class'] });
    if (ms) obs.observe(ms, { attributes: true, attributeFilter: ['class'] });
    update();
  }

  // ---------- 3. Init ----------
  function init() {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', afterDom);
    else afterDom();
  }
  function afterDom() {
    enhanceEmptyState();
    setupBottomNavActive();
    document.documentElement.classList.add('ui-v15-ready');
  }
  init();

  window.UIV15 = { version: 'v15' };
})();
