/* =========================================================
   ui-v13.js
   - Tabs internas (Datos / Gráfico / Propiedades)
   - Swipe horizontal entre módulos
   - Bottom navigation
   - Auto-tema por hora
   ========================================================= */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function haptic(ms) { try { navigator.vibrate && navigator.vibrate(ms || 6); } catch (e) {} }

  // =========================================================
  // 1. Auto-tema por hora
  // =========================================================
  function applyAutoTheme() {
    var manual;
    try { manual = localStorage.getItem('af:theme-manual'); } catch (e) { manual = null; }
    if (manual === '1') return false;
    var h = new Date().getHours();
    var auto = (h >= 7 && h < 19) ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', auto);
    try { localStorage.setItem('af:theme', auto); } catch (e) {}
    var meta = document.getElementById('meta-theme-color');
    if (meta) meta.setAttribute('content', auto === 'light' ? '#f7f8fc' : '#0a0a1a');
    return true;
  }

  function markManualOnToggle() {
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t) return;
      if (t.id === 'btn-theme' || (t.closest && t.closest('#btn-theme')) ||
          (t.dataset && t.dataset.action === 'theme')) {
        try { localStorage.setItem('af:theme-manual', '1'); } catch (err) {}
      }
    }, true);
  }

  // =========================================================
  // 2. Tabs en cada módulo
  // =========================================================
  function setupTabsInContainer(container) {
    if (!container) return;
    if (container._afTabsDone) {
      applyTabFilter(container, container._afActiveTab || 'datos');
      return;
    }
    var panels = qsa(':scope > .panel', container);
    if (!panels.length) return;

    var nav = document.createElement('nav');
    nav.className = 'module-tabs';
    nav.setAttribute('role', 'tablist');
    nav.setAttribute('aria-label', 'Secciones del módulo');
    nav.innerHTML =
      '<button type="button" class="tab-btn active" data-tab="datos" role="tab" aria-selected="true">Datos</button>' +
      '<button type="button" class="tab-btn" data-tab="grafico" role="tab" aria-selected="false">Gráfico</button>' +
      '<button type="button" class="tab-btn" data-tab="props" role="tab" aria-selected="false">Propiedades</button>';
    container.insertBefore(nav, container.firstChild);

    for (var i = 0; i < panels.length; i++) {
      var p = panels[i];
      var id = p.id || '';
      if (id.indexOf('graph-panel-') === 0) p.setAttribute('data-tab', 'grafico');
      else if (id.indexOf('props-panel-') === 0) p.setAttribute('data-tab', 'props');
      else p.setAttribute('data-tab', 'datos');
    }

    container._afActiveTab = 'datos';
    container._afTabsDone = true;

    nav.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.classList || !t.classList.contains('tab-btn')) return;
      var name = t.getAttribute('data-tab');
      if (!name) return;
      applyTabFilter(container, name);
      haptic(6);
    });

    applyTabFilter(container, 'datos');

    // Auto-cambiar a "Gráfico" al calcular
    var graphPanel = null;
    for (var k = 0; k < panels.length; k++) {
      if ((panels[k].id || '').indexOf('graph-panel-') === 0) { graphPanel = panels[k]; break; }
    }
    if (graphPanel && !graphPanel._afTabObs) {
      graphPanel._afTabObs = true;
      var lastDisplay = graphPanel.style.display;
      var obs = new MutationObserver(function () {
        var cur = graphPanel.style.display;
        if (lastDisplay === 'none' && cur !== 'none') {
          setTimeout(function () {
            if (container._afActiveTab !== 'grafico') applyTabFilter(container, 'grafico');
          }, 50);
        }
        lastDisplay = cur;
      });
      obs.observe(graphPanel, { attributes: true, attributeFilter: ['style'] });
    }
  }

  function applyTabFilter(container, name) {
    var btns = qsa('.tab-btn', container);
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      var isActive = b.getAttribute('data-tab') === name;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-selected', String(isActive));
    }
    var panels = qsa(':scope > .panel', container);
    for (var j = 0; j < panels.length; j++) {
      var t = panels[j].getAttribute('data-tab');
      panels[j].classList.toggle('tab-hidden', t !== name);
    }
    container._afActiveTab = name;
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); }
  }

  function watchModuleContainer() {
    var container = document.getElementById('module-container');
    if (!container) return;
    var _debounce = null;
    var obs = new MutationObserver(function () {
      clearTimeout(_debounce);
      _debounce = setTimeout(function () {
        if (container.querySelector(':scope > .panel')) {
          if (!container.querySelector('.module-tabs')) container._afTabsDone = false;
          setupTabsInContainer(container);
        }
      }, 30);
    });
    obs.observe(container, { childList: true, subtree: false });
    if (container.querySelector(':scope > .panel')) setupTabsInContainer(container);
  }

  // =========================================================
  // 3. Swipe horizontal entre módulos
  // =========================================================
  function setupModuleSwipe() {
    var screen = document.getElementById('module-screen');
    if (!screen || screen._afSwipeDone) return;
    screen._afSwipeDone = true;

    var startX = 0, startY = 0, startTime = 0, tracking = false;
    var THRESHOLD_X = 90, MAX_Y = 40, MAX_TIME = 600;

    function onDown(e) {
      var tgt = e.target;
      if (tgt && tgt.closest && tgt.closest('.graph-canvas')) return;
      if (tgt && tgt.closest && tgt.closest('input, textarea, button, .tab-btn')) return;
      var p = e.touches ? e.touches[0] : e;
      startX = p.clientX; startY = p.clientY;
      startTime = Date.now();
      tracking = true;
    }
    function onMove(e) {
      if (!tracking) return;
      var p = e.touches ? e.touches[0] : e;
      var dx = Math.abs(p.clientX - startX);
      var dy = Math.abs(p.clientY - startY);
      if (dy > MAX_Y && dy > dx) tracking = false;
    }
    function onUp(e) {
      if (!tracking) return;
      tracking = false;
      var p = e.changedTouches ? e.changedTouches[0] : e;
      var dx = p.clientX - startX;
      var dy = Math.abs(p.clientY - startY);
      var dt = Date.now() - startTime;
      if (Math.abs(dx) < THRESHOLD_X || dy > MAX_Y || dt > MAX_TIME) return;
      var mods = (window.App && window.App.FUNCTIONS) || [];
      var curId = getCurrentModuleId();
      var idx = -1;
      for (var i = 0; i < mods.length; i++) if (mods[i].id === curId) { idx = i; break; }
      if (idx < 0) return;
      var nextIdx = (dx < 0) ? (idx + 1) % mods.length : (idx - 1 + mods.length) % mods.length;
      var nextId = mods[nextIdx].id;
      haptic(10);
      try { history.replaceState(null, '', '#' + nextId); } catch (err) {}
      if (window.App && window.App.openModule) window.App.openModule(nextId);
    }

    screen.addEventListener('pointerdown', onDown);
    screen.addEventListener('pointermove', onMove);
    screen.addEventListener('pointerup', onUp);
    screen.addEventListener('pointercancel', function () { tracking = false; });
  }

  function getCurrentModuleId() {
    var h = (location.hash || '').replace(/^#/, '');
    var q = h.indexOf('?');
    return q >= 0 ? h.slice(0, q) : h;
  }

  // =========================================================
  // 4. Bottom navigation
  // =========================================================
  function setupBottomNav() {
    if (document.querySelector('.bottom-nav')) return;
    var nav = document.createElement('nav');
    nav.className = 'bottom-nav';
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'Navegación rápida');
    nav.innerHTML =
      '<button type="button" class="bn-item" data-action="home" aria-label="Ir al inicio">' +
        '<span class="bn-icon">🏠</span><span class="bn-label">Inicio</span>' +
      '</button>' +
      '<button type="button" class="bn-item" data-action="library" aria-label="Abrir ejemplos">' +
        '<span class="bn-icon">📚</span><span class="bn-label">Ejemplos</span>' +
      '</button>' +
      '<button type="button" class="bn-item" data-action="settings" aria-label="Ajustes">' +
        '<span class="bn-icon">⚙</span><span class="bn-label">Ajustes</span>' +
      '</button>';
    document.body.appendChild(nav);

    nav.addEventListener('click', function (e) {
      var t = e.target;
      while (t && t !== nav && !(t.dataset && t.dataset.action)) t = t.parentNode;
      if (!t || t === nav) return;
      var action = t.dataset.action;
      haptic(10);
      if (action === 'home') {
        if (window.App && window.App.goHome) window.App.goHome();
      } else if (action === 'library') {
        var btn = document.getElementById('btn-library');
        if (btn) btn.click();
      } else if (action === 'settings') {
        if (window._afOpenSettings) window._afOpenSettings();
        else {
          var sb = document.getElementById('btn-settings');
          if (sb) sb.click();
        }
      }
    });
  }

  // =========================================================
  // 5. Init
  // =========================================================
  function init() {
    applyAutoTheme();
    markManualOnToggle();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', afterDom);
    else afterDom();
  }
  function afterDom() {
    watchModuleContainer();
    setupModuleSwipe();
    setupBottomNav();
    document.documentElement.classList.add('ui-v13-ready');
  }

  init();

  window.UIV13 = {
    version: 'v13',
    applyAutoTheme: applyAutoTheme,
    setupTabsInContainer: setupTabsInContainer
  };
})();
