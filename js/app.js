/* =========================================================
   app.js — v10
   + Búsqueda/filtro de tarjetas
   + Vista compacta / grid
   + Biblioteca de ejemplos resueltos
   + 3 temas: dark / light / contrast
   ========================================================= */
(function () {
  'use strict';
  if (!window.CoreUtils) { console.error('[app] Falta CoreUtils.'); return; }

  var FUNCTIONS = [
    { id: 'Lineal', name: 'Lineal', eq: 'f(x) = mx + b', accent: '#4be1ec', icon: 'Lineal',
      tags: 'recta pendiente lineal' },
    { id: 'Cuadratica', name: 'Cuadrática', eq: 'f(x) = ax² + bx + c', accent: '#b892ff', icon: 'Cuadratica',
      tags: 'parabola vertice cuadratica' },
    { id: 'Cubica', name: 'Cúbica', eq: 'f(x) = ax³ + bx² + cx + d', accent: '#ff6b81', icon: 'Cubica',
      tags: 'cubica inflexion silla' },
    { id: 'RaizCuadrada', name: 'Raíz Cuadrada', eq: 'f(x) = a·√(x−h) + k', accent: '#4be1ec', icon: 'RaizCuadrada',
      tags: 'raiz cuadrada radical' },
    { id: 'RaizCubica', name: 'Raíz Cúbica', eq: 'f(x) = a·∛(x−h) + k', accent: '#b892ff', icon: 'RaizCubica',
      tags: 'raiz cubica radical' },
    { id: 'Modular', name: 'Modular', eq: 'f(x) = a·|x−h| + k', accent: '#ffd166', icon: 'Modular',
      tags: 'valor absoluto modulo v' },
    { id: 'Logaritmica', name: 'Logarítmica', eq: 'f(x) = a·log_b(x−h) + k', accent: '#ff6b81', icon: 'Logaritmica',
      tags: 'log ln logaritmo' },
    { id: 'Exponencial', name: 'Exponencial', eq: 'f(x) = a·b^(x−h) + k', accent: '#4be1ec', icon: 'Exponencial',
      tags: 'exponencial crecimiento e' },
    { id: 'ProporcionalidadInversa', name: 'Proporcionalidad Inversa', eq: 'f(x) = a/(x−h) + k', accent: '#ffd166', icon: 'ProporcionalidadInversa',
      tags: 'inversa hiperbola 1/x racional' },
    { id: 'Seno', name: 'Seno', eq: 'f(x) = a·sin(b(x−h)) + k', accent: '#b892ff', icon: 'Seno',
      tags: 'seno sin trigonometria periodica' },
    { id: 'Coseno', name: 'Coseno', eq: 'f(x) = a·cos(b(x−h)) + k', accent: '#4be1ec', icon: 'Coseno',
      tags: 'coseno cos trigonometria periodica' },
    { id: 'Tangente', name: 'Tangente', eq: 'f(x) = a·tan(b(x−h)) + k', accent: '#ff6b81', icon: 'Tangente',
      tags: 'tangente tan trigonometria periodica' }
  ];

  // Biblioteca
  var LIBRARY = [
    { id: 'Lineal', nameKey: 'lib.Lineal.identity', name: 'Recta por el origen', desc: 'y = x — identidad', params: { m: '1', b: '0' } },
    { id: 'Lineal', nameKey: 'lib.Lineal.slope2', name: 'Recta con pendiente 2', desc: 'y = 2x − 3', params: { m: '2', b: '-3' } },
    { id: 'Lineal', nameKey: 'lib.Lineal.horizontal', name: 'Recta horizontal', desc: 'y = 4 (función constante)', params: { m: '0', b: '4' } },

    { id: 'Cuadratica', nameKey: 'lib.Cuadratica.canonical', name: 'Parábola canónica', desc: 'y = x²', params: { a: '1', b: '0', c: '0' } },
    { id: 'Cuadratica', nameKey: 'lib.Cuadratica.tworoots', name: 'Parábola con 2 raíces', desc: 'y = x² − 4 → ceros en ±2', params: { a: '1', b: '0', c: '-4' } },
    { id: 'Cuadratica', nameKey: 'lib.Cuadratica.inverted', name: 'Parábola invertida', desc: 'y = −x² + 2x', params: { a: '-1', b: '2', c: '0' } },
    { id: 'Cuadratica', nameKey: 'lib.Cuadratica.noreal', name: 'Sin raíces reales', desc: 'y = x² + 1', params: { a: '1', b: '0', c: '1' } },

    { id: 'Cubica', nameKey: 'lib.Cubica.canonical', name: 'Cubo canónico', desc: 'y = x³ (impar)', params: { a: '1', b: '0', c: '0', d: '0' } },
    { id: 'Cubica', nameKey: 'lib.Cubica.extrema', name: 'Cúbica con 2 extremos', desc: 'y = x³ − 3x', params: { a: '1', b: '0', c: '-3', d: '0' } },
    { id: 'Cubica', nameKey: 'lib.Cubica.introots', name: 'Con 3 raíces enteras', desc: 'y = x³ + 6x² + 11x − 6', params: { a: '1', b: '6', c: '11', d: '-6' } },

    { id: 'RaizCuadrada', nameKey: 'lib.RaizCuadrada.basic', name: '√x básica', desc: 'f(x) = √x', params: { a: '1', h: '0', k: '0' } },
    { id: 'RaizCuadrada', nameKey: 'lib.RaizCuadrada.shifted', name: 'Desplazada', desc: 'f(x) = √(x − 2)', params: { a: '1', h: '2', k: '0' } },

    { id: 'Modular', nameKey: 'lib.Modular.absolute', name: 'Valor absoluto', desc: 'f(x) = |x|', params: { a: '1', h: '0', k: '0' } },
    { id: 'Modular', nameKey: 'lib.Modular.inverted_v', name: 'V invertida', desc: 'f(x) = −|x| + 3', params: { a: '-1', h: '0', k: '3' } },

    { id: 'Logaritmica', nameKey: 'lib.Logaritmica.decimal', name: 'Log decimal', desc: 'log₁₀(x)', params: { a: '1', b: '10', h: '0', k: '0' } },
    { id: 'Logaritmica', nameKey: 'lib.Logaritmica.natural', name: 'Log natural', desc: 'ln(x)', params: { a: '1', b: 'e', h: '0', k: '0' } },

    { id: 'Exponencial', nameKey: 'lib.Exponencial.growth', name: 'Crecimiento base 2', desc: 'f(x) = 2ˣ', params: { a: '1', b: '2', h: '0', k: '0' } },
    { id: 'Exponencial', nameKey: 'lib.Exponencial.decay', name: 'Decaimiento base 1/2', desc: 'f(x) = (1/2)ˣ', params: { a: '1', b: '1/2', h: '0', k: '0' } },
    { id: 'Exponencial', nameKey: 'lib.Exponencial.natural', name: 'Exponencial natural', desc: 'f(x) = eˣ', params: { a: '1', b: 'e', h: '0', k: '0' } },

    { id: 'ProporcionalidadInversa', nameKey: 'lib.ProporcionalidadInversa.classic', name: 'Hipérbola clásica', desc: 'f(x) = 1/x', params: { a: '1', h: '0', k: '0' } },
    { id: 'ProporcionalidadInversa', nameKey: 'lib.ProporcionalidadInversa.shifted', name: 'Con desplazamientos', desc: 'f(x) = 2/(x−1) + 3', params: { a: '2', h: '1', k: '3' } },

    { id: 'Seno', nameKey: 'lib.Seno.basic', name: 'Seno básico', desc: 'sin(x)', params: { a: '1', b: '1', h: '0', k: '0' } },
    { id: 'Seno', nameKey: 'lib.Seno.double_amp', name: 'Amplitud doble', desc: 'f(x) = 2·sin(x)', params: { a: '2', b: '1', h: '0', k: '0' } },
    { id: 'Seno', nameKey: 'lib.Seno.double_freq', name: 'Frecuencia doble', desc: 'f(x) = sin(2x)', params: { a: '1', b: '2', h: '0', k: '0' } },

    { id: 'Coseno', nameKey: 'lib.Coseno.basic', name: 'Coseno básico', desc: 'cos(x)', params: { a: '1', b: '1', h: '0', k: '0' } },
    { id: 'Coseno', nameKey: 'lib.Coseno.offset', name: 'Con offset vertical', desc: 'f(x) = 2·cos(x) + 1', params: { a: '2', b: '1', h: '0', k: '1' } },

    { id: 'Tangente', nameKey: 'lib.Tangente.basic', name: 'Tangente básica', desc: 'tan(x)', params: { a: '1', b: '1', h: '0', k: '0' } },
    { id: 'Tangente', name: 'Frecuencia doble', desc: 'f(x) = tan(2x)', params: { a: '1', b: '2', h: '0', k: '0' } }
  ];

  // =========================================================
  // TEMA (3 modos)
  // =========================================================
  var THEME_KEY = 'af:theme';
  var THEMES = ['dark', 'light', 'contrast'];
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var meta = document.getElementById('meta-theme-color');
    if (meta) meta.setAttribute('content',
      theme === 'dark' ? '#0a0a1a' : theme === 'light' ? '#f7f8fc' : '#000000');
    var btn = document.getElementById('btn-theme');
    if (btn) {
      var next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
      btn.setAttribute('aria-label', 'Cambiar a tema ' + next);
      btn.title = 'Tema: ' + theme + ' → ' + next;
    }
  }
  function getInitialTheme() {
    try {
      var saved = localStorage.getItem(THEME_KEY);
      if (THEMES.indexOf(saved) >= 0) return saved;
    } catch (e) {}
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
    return 'dark';
  }
  function initTheme() {
    applyTheme(getInitialTheme());
    var btn = document.getElementById('btn-theme');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var cur = document.documentElement.getAttribute('data-theme') || 'dark';
      var next = THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length];
      applyTheme(next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
      if (window.CoreUtils.announce) window.CoreUtils.announce('Tema ' + next);
    });
  }

  // =========================================================
  // HISTÓRICO
  // =========================================================
  function renderHistory() {
    var panel = document.getElementById('history-panel');
    var list = document.getElementById('history-list');
    if (!panel || !list) return;
    var arr = window.CoreUtils.getHistory ? window.CoreUtils.getHistory() : [];
    if (!arr.length) { panel.style.display = 'none'; return; }
    panel.style.display = 'block';
    var html = '';
    for (var i = 0; i < arr.length; i++) {
      var e = arr[i];
      html +=
        '<button type="button" class="history-item" role="listitem" style="--accent:' + (e.accent || '#4be1ec') + '" ' +
          'data-id="' + e.id + '" data-params=\'' + JSON.stringify(e.params || {}) + '\' ' +
          'aria-label="Abrir ' + (e.title || e.id) + '">' +
          '<div class="hi-name">' + (e.title || e.id) + '</div>' +
          '<div class="hi-eq">' + (e.equation || '') + '</div>' +
        '</button>';
    }
    list.innerHTML = html;
    if (!list._afHistoryListener) {
      list._afHistoryListener = true;
      list.addEventListener('click', onHistoryClick);
    }
  }
  function onHistoryClick(ev) {
    var t = ev.target;
    while (t && t !== this && !t.classList.contains('history-item')) t = t.parentNode;
    if (!t || t === this) return;
    var id = t.getAttribute('data-id');
    var params = {};
    try { params = JSON.parse(t.getAttribute('data-params') || '{}'); } catch (e) {}
    var parts = [];
    for (var k in params) if (params.hasOwnProperty(k) && params[k] !== '' && params[k] != null)
      parts.push(k + '=' + encodeURIComponent(params[k]));
    var nh = '#' + id + (parts.length ? '?' + parts.join('&') : '');
    try { history.replaceState(null, '', nh); } catch (e) { window.location.hash = nh; }
    openModule(id);
  }
  function clearHistory() {
    if (!window.CoreUtils.clearHistory) return;
    window.CoreUtils.clearHistory();
    renderHistory();
    if (window.CoreUtils.announce) window.CoreUtils.announce('Histórico limpiado');
  }

  // =========================================================
  // CUADRÍCULA + búsqueda + vista
  // =========================================================
  var _viewMode = 'grid';       // 'grid' | 'compact'
  var _query = '';

  function buildGrid() {
    var grid = document.getElementById('cards-grid');
    if (!grid) return;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < FUNCTIONS.length; i++) frag.appendChild(makeCard(FUNCTIONS[i], i));
    grid.innerHTML = '';
    grid.appendChild(frag);
    applyFilterAndView();
  }

  function makeCard(fn, index) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'card';
    btn.setAttribute('role', 'listitem');
    btn.style.setProperty('--accent', fn.accent);
    btn.setAttribute('data-target', fn.id);
    btn.setAttribute('data-index', String(index));
    btn.setAttribute('data-search', (fn.name + ' ' + fn.eq + ' ' + (fn.tags || '')).toLowerCase());
    btn.setAttribute('aria-label', 'Abrir módulo de ' + fn.name);

    var iconSrc = (window.CustomIcons && window.CustomIcons.getIcon(fn.icon)) || 'icons/icon.png';
    var fallback = (window.CustomIcons && window.CustomIcons.getFallback(fn.icon)) || 'icons/icon.png';
    btn.innerHTML =
      '<img class="card-icon" alt="" aria-hidden="true" src="' + iconSrc + '" ' +
        'onerror="this.onerror=null;this.src=\'' + fallback + '\';">' +
      '<p class="card-name">' + fn.name + '</p>' +
      '<p class="card-eq">' + fn.eq + '</p>';
    btn.addEventListener('click', function () { openModule(fn.id); });
    return btn;
  }

  function applyFilterAndView() {
    var grid = document.getElementById('cards-grid');
    if (!grid) return;
    grid.classList.toggle('compact', _viewMode === 'compact');
    var cards = grid.querySelectorAll('.card');
    var q = _query.trim().toLowerCase();
    var visibleCount = 0;
    for (var i = 0; i < cards.length; i++) {
      var s = cards[i].getAttribute('data-search') || '';
      var ok = !q || s.indexOf(q) >= 0;
      cards[i].classList.toggle('hidden', !ok);
      if (ok) visibleCount++;
    }
    // Mensaje "sin resultados"
    var empty = grid.querySelector('.cards-empty');
    if (visibleCount === 0) {
      if (!empty) {
        empty = document.createElement('p');
        empty.className = 'cards-empty';
        empty.style.gridColumn = '1 / -1';
        empty.style.textAlign = 'center';
        empty.style.color = 'var(--text-dim)';
        empty.style.padding = '20px';
        empty.textContent = 'Sin resultados para "' + _query + '"';
        grid.appendChild(empty);
      } else {
        empty.textContent = 'Sin resultados para "' + _query + '"';
      }
    } else if (empty) {
      empty.remove();
    }
  }

  function initToolbar() {
    var search = document.getElementById('cards-search');
    if (search) {
      search.addEventListener('input', function () {
        _query = search.value || '';
        applyFilterAndView();
      });
    }
    var vt = document.getElementById('btn-view-toggle');
    if (vt) {
      vt.addEventListener('click', function () {
        _viewMode = (_viewMode === 'grid') ? 'compact' : 'grid';
        vt.textContent = (_viewMode === 'grid') ? '▦' : '☰';
        vt.setAttribute('aria-label',
          _viewMode === 'grid' ? 'Cambiar a vista compacta' : 'Cambiar a vista grid');
        applyFilterAndView();
      });
    }
    var lib = document.getElementById('btn-library');
    if (lib) lib.addEventListener('click', openLibrary);
  }

  // =========================================================
  // BIBLIOTECA
  // =========================================================
  function openLibrary() {
    var overlay = document.getElementById('library-overlay');
    var body = document.getElementById('library-body');
    var close = document.getElementById('library-close');
    if (!overlay || !body) return;

    // Agrupar por módulo
    var groups = {};
    for (var i = 0; i < LIBRARY.length; i++) {
      var it = LIBRARY[i];
      if (!groups[it.id]) groups[it.id] = [];
      groups[it.id].push(it);
    }
    var html = '';
    for (var gid in groups) {
      if (!groups.hasOwnProperty(gid)) continue;
      var mod = FUNCTIONS.find(function (f) { return f.id === gid; });
      if (!mod) continue;
      var modName = (window._afI18nFull && mod.nameKey)
        ? window._afI18nFull.t(mod.nameKey)
        : mod.name;
      html += '<div class="library-group"><p class="library-group-title">' + modName + '</p>';
      for (var j = 0; j < groups[gid].length; j++) {
        var e = groups[gid][j];
        var itemName = (window._afI18nFull && e.nameKey)
          ? window._afI18nFull.t(e.nameKey)
          : e.name;
        var itemDesc = (window._afI18nFull && e.descKey)
          ? window._afI18nFull.t(e.descKey)
          : e.desc;
        html +=
          '<button type="button" class="library-item" style="--accent:' + mod.accent + '" ' +
            'data-id="' + gid + '" data-params=\'' + JSON.stringify(e.params) + '\'>' +
            '<div class="li-name">' + itemName + '</div>' +
            '<div class="li-desc">' + itemDesc + '</div>' +
          '</button>';
      }
      html += '</div>';
    }
    body.innerHTML = html;

    function closeLib() {
      overlay.hidden = true;
      var lb = document.getElementById('btn-library');
      if (lb) lb.focus();
    }
    if (!overlay._afLibSetup) {
      overlay._afLibSetup = true;
      if (close) close.addEventListener('click', closeLib);
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeLib();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !overlay.hidden) { e.preventDefault(); closeLib(); }
      });
      body.addEventListener('click', function (ev) {
        var t = ev.target;
        while (t && t !== body && !t.classList.contains('library-item')) t = t.parentNode;
        if (!t || t === body) return;
        var id = t.getAttribute('data-id');
        var params = {};
        try { params = JSON.parse(t.getAttribute('data-params') || '{}'); } catch (e) {}
        var parts = [];
        for (var k in params) if (params.hasOwnProperty(k))
          parts.push(k + '=' + encodeURIComponent(params[k]));
        var nh = '#' + id + (parts.length ? '?' + parts.join('&') : '');
        try { history.replaceState(null, '', nh); } catch (e) { window.location.hash = nh; }
        closeLib();
        openModule(id);
      });
    }
    overlay.hidden = false;
    if (close) close.focus();
    if (window.CoreUtils.announce) window.CoreUtils.announce('Biblioteca abierta');
  }

  // =========================================================
  // NAVEGACIÓN
  // =========================================================
  function showScreen(id) {
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) screens[i].classList.remove('active');
    var target = document.getElementById(id);
    if (target) target.classList.add('active');
    window.scrollTo(0, 0);
  }

  function openModule(id) {
    var mod = window[id + 'Module'];
    if (!mod) { console.warn('[app] Módulo no encontrado:', id + 'Module'); return; }
    var meta = null;
    for (var i = 0; i < FUNCTIONS.length; i++)
      if (FUNCTIONS[i].id === id) { meta = FUNCTIONS[i]; break; }

    var titleEl = document.getElementById('module-title');
    if (titleEl && meta) titleEl.textContent = meta.name;

    var container = document.getElementById('module-container');
    if (!container) return;

    // ----- Cleanup de timers/observers del módulo anterior -----
    try {
      // 1. Timers de sync del rango (ui-v14)
      var oldPanels = document.querySelectorAll('[id^="graph-panel-"]');
      for (var i = 0; i < oldPanels.length; i++) {
        var gp = oldPanels[i];
        if (gp._afSyncTimer) { clearInterval(gp._afSyncTimer); gp._afSyncTimer = null; }
        if (gp._afTabObs)     { try { gp._afTabObs.disconnect(); } catch (e) {} gp._afTabObs = null; }
      }

      // 2. Cancelar animación del slider si quedó activa
      var mods = (window.App && window.App.FUNCTIONS) || [];
      for (var m = 0; m < mods.length; m++) {
        var M = window[mods[m].id + 'Module'];
        if (M && M._animating) {
          try { cancelAnimationFrame(M._animating.raf); } catch (e) {}
          M._animating = null;
        }
        if (M && M._saveStateTimer) {
          try { clearTimeout(M._saveStateTimer); } catch (e) {}
          M._saveStateTimer = null;
        }
      }

      // 3. Desconectar observers a nivel módulo si existen
      var containerEl = document.getElementById('module-container');
      if (containerEl && containerEl._afObserver) {
        try { containerEl._afObserver.disconnect(); } catch (e) {}
        containerEl._afObserver = null;
      }
    } catch (cleanupErr) {
      console.warn('[app] cleanup:', cleanupErr);
    }
    // ----- Fin cleanup -----

    container.innerHTML = '';

    showScreen('module-screen');
    setTimeout(function () {
      mod.render(container);
      mod.init(container);
      var firstInput = container.querySelector('input[type="text"]');
      if (firstInput) firstInput.focus({ preventScroll: true });
      if (window.CoreUtils.announce) window.CoreUtils.announce('Módulo ' + (meta ? meta.name : id));
    }, 20);
  }

  function goHome() {
    showScreen('home-screen');
    try { if (window.location.hash) history.replaceState(null, '', window.location.pathname); } catch (e) {}
    renderHistory();
    var grid = document.getElementById('cards-grid');
    if (grid) grid.focus({ preventScroll: true });
  }

  // =========================================================
  // ATAJOS
  // =========================================================
  function setupKeyboard() {
    document.addEventListener('keydown', function (ev) {
      var tag = (ev.target && ev.target.tagName) || '';
      var inField = tag === 'INPUT' || tag === 'TEXTAREA';
      if (ev.key === 'Escape') {
        var overlay = document.getElementById('library-overlay');
        if (overlay && !overlay.hidden) return; // ya manejado
        var mod = document.getElementById('module-screen');
        if (mod && mod.classList.contains('active')) { ev.preventDefault(); goHome(); }
        return;
      }
      if (inField) return;
      var home = document.getElementById('home-screen');
      if (home && home.classList.contains('active')) {
        // Foco en búsqueda con /
        if (ev.key === '/') { ev.preventDefault(); var s = document.getElementById('cards-search'); if (s) s.focus(); return; }
        var n = parseInt(ev.key, 10);
        if (!isNaN(n) && n >= 1 && n <= FUNCTIONS.length) {
          ev.preventDefault(); openModule(FUNCTIONS[n - 1].id); return;
        }
        if (ev.key === 't' || ev.key === 'T') {
          ev.preventDefault(); var b = document.getElementById('btn-theme'); if (b) b.click(); return;
        }
      }
    });
  }

  // =========================================================
  // INIT
  // =========================================================
  function init() {
    initTheme();
    buildGrid();
    renderHistory();
    initToolbar();
    setupKeyboard();

    var back = document.getElementById('btn-back');
    if (back) back.addEventListener('click', goHome);
    var clear = document.getElementById('btn-clear-history');
    if (clear) clear.addEventListener('click', clearHistory);

    window.addEventListener('popstate', function () {
      var mod = document.getElementById('module-screen');
      if (mod && mod.classList.contains('active')) goHome();
    });

    var hash = (window.location.hash || '').replace(/^#/, '');
    if (hash) {
      var q = hash.indexOf('?');
      var modId = (q >= 0) ? hash.slice(0, q) : hash;
      if (modId && window[modId + 'Module']) setTimeout(function () { openModule(modId); }, 40);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.App = { FUNCTIONS: FUNCTIONS, LIBRARY: LIBRARY,
    openModule: openModule, goHome: goHome, refreshHistory: renderHistory };
})();
