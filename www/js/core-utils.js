/* =========================================================
   core-utils.js — v17
   Estado final:
     · Botones del gráfico: Tarjeta / Enlace / Vista / Nota
     · Sin: PNG, Trazar-mode, Área, f'(x), Volver
     · Tap sobre gráfico = trazar
     · Notas con anti-colisión + panel + drag + persistencia
     · Presets, sliders con animación, KaTeX, ayuda, notables
   ========================================================= */
(function () {
  'use strict';

  // ========= i18n helpers =========
  function _t(key, args) {
    var F = window._afI18nFull;
    if (!F) return key;
    var str = F.t(key);
    return args ? F.format(str, args) : str;
  }
  function _tv(str) {
    var F = window._afI18nFull;
    if (!F) return str;
    return F.translate(str);
  }

  // ========= Helpers =========
  function fmt(n, decimals) {
    if (typeof window !== 'undefined' && typeof window.formatNumber === 'function')
      return window.formatNumber(n, decimals);
    if (typeof n !== 'number' || !isFinite(n)) return String(n);
    var d = (typeof decimals === 'number') ? decimals : 4;
    var r = Math.round(n * Math.pow(10, d)) / Math.pow(10, d);
    return String(r);
  }
  function _lbl(n) { return String(Math.round(n * 100) / 100); }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function announce(msg) {
    var el = document.getElementById('aria-live');
    if (!el) return;
    el.textContent = '';
    setTimeout(function () { el.textContent = msg; }, 50);
  }

  // ========= Constantes notables =========
  var NOTABLES = [
    { v: Math.PI,             s: 'π' },
    { v: Math.PI / 2,         s: 'π/2' },
    { v: Math.PI / 3,         s: 'π/3' },
    { v: Math.PI / 4,         s: 'π/4' },
    { v: Math.PI / 6,         s: 'π/6' },
    { v: 2 * Math.PI,         s: '2π' },
    { v: 3 * Math.PI / 2,     s: '3π/2' },
    { v: Math.E,              s: 'e' },
    { v: (1 + Math.sqrt(5))/2,s: 'φ' },
    { v: Math.SQRT2,          s: '√2' },
    { v: Math.sqrt(3),        s: '√3' },
    { v: Math.SQRT2 / 2,      s: '√2/2' },
    { v: Math.sqrt(3) / 2,    s: '√3/2' }
  ];
  function _notable(v) {
    if (typeof v !== 'number' || !isFinite(v)) return null;
    var av = Math.abs(v);
    for (var i = 0; i < NOTABLES.length; i++)
      if (Math.abs(av - NOTABLES[i].v) < 1e-4) return (v < 0 ? '−' : '') + NOTABLES[i].s;
    return null;
  }
  function decorateNotables(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/-?\d+(?:\.\d+)?/g, function (m) {
      var n = _notable(parseFloat(m));
      return n ? (m + ' (' + n + ')') : m;
    });
  }

  // ========= Utils numéricos =========
  function numericDerivative(f, x, h) { h = h || 1e-5; return (f(x + h) - f(x - h)) / (2 * h); }
  function findRoots(f, a, b, steps) {
    steps = steps || 800;
    var roots = []; var dx = (b - a) / steps;
    var prevX = a, prevY = f(a);
    if (Math.abs(prevY) < 1e-7) roots.push(prevX);
    for (var i = 1; i <= steps; i++) {
      var x = a + i * dx; var y = f(x);
      if (!isFinite(y)) { prevX = x; prevY = y; continue; }
      if (Math.abs(y) < 1e-7) { if (!hasNear(roots, x)) roots.push(x); }
      else if (isFinite(prevY) && prevY * y < 0) {
        var r = bisect(f, prevX, x);
        if (r !== null && !hasNear(roots, r)) roots.push(r);
      }
      prevX = x; prevY = y;
    }
    return roots;
  }
  function bisect(f, a, b) {
    var fa = f(a), fb = f(b);
    if (!isFinite(fa) || !isFinite(fb)) return null;
    for (var i = 0; i < 60; i++) {
      var m = (a + b) / 2; var fm = f(m);
      if (!isFinite(fm)) return null;
      if (Math.abs(fm) < 1e-10 || (b - a) / 2 < 1e-10) return m;
      if (fa * fm < 0) { b = m; fb = fm; } else { a = m; fa = fm; }
    }
    return (a + b) / 2;
  }
  function hasNear(arr, x) {
    for (var i = 0; i < arr.length; i++) if (Math.abs(arr[i] - x) < 1e-6) return true;
    return false;
  }
  function checkParity(f, samples) {
    samples = samples || [-2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2];
    var par = true, impar = true, valid = 0;
    for (var i = 0; i < samples.length; i++) {
      var x = samples[i]; var a = f(x), b = f(-x);
      if (!isFinite(a) || !isFinite(b)) continue;
      valid++;
      if (Math.abs(a - b) > 1e-6) par = false;
      if (Math.abs(a + b) > 1e-6) impar = false;
    }
    if (valid === 0) return 'Ninguna';
    if (par && !impar) return 'Par';
    if (impar && !par) return 'Impar';
    return 'Ninguna';
  }
  function monotoniaIntervals(f, a, b, steps) {
    steps = steps || 400;
    var intervals = []; var dx = (b - a) / steps;
    var curSign = 0, startX = null;
    for (var i = 0; i < steps; i++) {
      var x1 = a + i * dx, x2 = x1 + dx;
      var y1 = f(x1), y2 = f(x2);
      if (!isFinite(y1) || !isFinite(y2)) {
        if (startX !== null) {
          intervals.push({ from: startX, to: x1, behavior: curSign > 0 ? 'creciente' : 'decreciente' });
          startX = null; curSign = 0;
        }
        continue;
      }
      var dy = y2 - y1;
      var sign = dy > 1e-6 ? 1 : (dy < -1e-6 ? -1 : 0);
      if (sign === 0) continue;
      if (curSign === 0) { curSign = sign; startX = x1; }
      else if (sign !== curSign) {
        intervals.push({ from: startX, to: x1, behavior: curSign > 0 ? 'creciente' : 'decreciente' });
        curSign = sign; startX = x1;
      }
    }
    if (startX !== null) intervals.push({ from: startX, to: b, behavior: curSign > 0 ? 'creciente' : 'decreciente' });
    return intervals;
  }
  function numericLimit(f, x0, dir) {
    dir = dir || 'both';
    function side(sign) {
      var h = 1e-6; var y = f(x0 + sign * h);
      if (!isFinite(y)) { h = 1e-3; y = f(x0 + sign * h); }
      return y;
    }
    if (dir === 'left')  return side(-1);
    if (dir === 'right') return side(1);
    return { left: side(-1), right: side(1) };
  }
  function intervalStr(a, b, closedA, closedB) {
    var la = closedA ? '[' : '(', lb = closedB ? ']' : ')';
    var sa = a === -Infinity ? '-∞' : fmt(a);
    var sb = b ===  Infinity ?  '∞' : fmt(b);
    return la + sa + ', ' + sb + lb;
  }

  // ========= Histórico =========
  var HISTORY_KEY = 'af:history';
  var HISTORY_MAX = 15;
  function pushHistory(entry) {
    try {
      var raw = localStorage.getItem(HISTORY_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      var sig = entry.id + '|' + JSON.stringify(entry.params);
      arr = arr.filter(function (e) { return (e.id + '|' + JSON.stringify(e.params)) !== sig; });
      arr.unshift(entry);
      if (arr.length > HISTORY_MAX) arr = arr.slice(0, HISTORY_MAX);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
    } catch (e) {}
  }
  function getHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
    catch (e) { return []; }
  }
  function clearHistory() {
    try { localStorage.removeItem(HISTORY_KEY); } catch (e) {}
  }

  // ========= Ayuda contextual =========
  var HELP = {
    dominio: 'Conjunto de valores de x para los que f(x) existe.',
    imagen: 'Conjunto de valores que toma f(x) al variar x.',
    ceroX: 'Valores de x donde f(x) = 0 (cortes con el eje X).',
    ceroY: 'Valor de f(0): donde la gráfica corta el eje Y.',
    monotonia: 'Intervalos donde la función crece o decrece.',
    paridad: 'Par si f(−x) = f(x); impar si f(−x) = −f(x).',
    inyectiva: 'Cada valor de y proviene de un único x.',
    periodo: 'Distancia tras la cual la función se repite (si aplica).',
    amplitud: 'Mitad de la distancia entre máximo y mínimo.',
    asintotas: 'Rectas a las que la curva se acerca sin tocarlas.',
    inversa: 'Función f⁻¹ que deshace lo que hace f.',
    puntoCaracteristico: 'Punto notable: vértice, inflexión, centro…',
    extremos: 'Máximos/mínimos locales.'
  };

  // ========= Modal =========
  var _modalSetup = false;
  function _setupModal() {
    if (_modalSetup) return;
    var overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    _modalSetup = true;
    function close() {
      overlay.hidden = true;
      if (overlay._afReturnFocus) { try { overlay._afReturnFocus.focus(); } catch (e) {} }
    }
    var cb = document.getElementById('modal-close');
    if (cb) cb.addEventListener('click', close);
    var dl = document.getElementById('modal-download');
    if (dl) dl.addEventListener('click', function () {
      if (overlay._afCanvas && overlay._afFilename) _downloadCanvas(overlay._afCanvas, overlay._afFilename);
      close();
    });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !overlay.hidden) { e.preventDefault(); close(); }
    });
  }
  function showCardPreview(canvas, filename, title, returnFocusBtn) {
    _setupModal();
    var overlay = document.getElementById('modal-overlay');
    var img = document.getElementById('modal-img');
    var t = document.getElementById('modal-title');
    if (!overlay || !img) { _downloadCanvas(canvas, filename); return; }
    try { img.src = canvas.toDataURL('image/png'); } catch (e) { return; }
    if (t && title) t.textContent = 'Vista previa — ' + title;
    overlay._afCanvas = canvas;
    overlay._afFilename = filename;
    overlay._afReturnFocus = returnFocusBtn || null;
    overlay.hidden = false;
    var cb = document.getElementById('modal-close');
    if (cb) cb.focus();
    announce('Vista previa abierta');
  }
  function _downloadCanvas(canvas, filename) {
    try {
      canvas.toBlob(function (blob) {
        if (!blob) return;
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
      }, 'image/png');
    } catch (e) {}
  }

  // =========================================================
  // createModule
  // =========================================================
  function createModule(config) {
    var Module = {
      id: config.id,
      title: config.title,
      accent: config.accent || '#4be1ec',

      _view: null,
      _baseRange: null,
      _currentF: null,
      _currentPoints: null,
      _currentAsym: null,
      _currentProps: null,
      _currentNotes: [],
      _notesMode: false,
      _tracePoint: null,
      _animating: null,
      _userRange: null,

      // -----------------------------------------------------
      // Render
      // -----------------------------------------------------
      render: function (container) {
        var presetsHtml = '';
        if (Array.isArray(config.presets) && config.presets.length) {
          presetsHtml = '<div class="presets-row" id="presets-' + config.id + '" role="group" aria-label="Presets">';
          for (var pi = 0; pi < config.presets.length; pi++) {
            presetsHtml += '<button type="button" class="preset-btn" ' +
              'data-preset-index="' + pi + '">' + config.presets[pi].name + '</button>';
          }
          presetsHtml += '</div>';
        }

        var inputsHtml = '';
        for (var i = 0; i < config.inputs.length; i++) {
          var inp = config.inputs[i];
          var lbl = inp.labelKey ? _t(inp.labelKey) : inp.label;
          inputsHtml +=
            '<div class="field" data-key="' + inp.key + '">' +
              '<label for="in-' + config.id + '-' + inp.key + '">' + lbl + '</label>' +
              '<input type="text" inputmode="text" id="in-' + config.id + '-' + inp.key + '" ' +
                'data-key="' + inp.key + '" value="' + (inp.default !== undefined ? inp.default : '') + '" ' +
                'aria-label="' + inp.label + '">' +
              '<div class="field-slider-row">' +
                '<input type="range" class="field-slider" ' +
                  'id="sl-' + config.id + '-' + inp.key + '" data-key="' + inp.key + '" ' +
                  'min="-10" max="10" step="0.1" value="' + (inp.default !== undefined ? inp.default : '0') + '" ' +
                  'aria-label="Slider ' + inp.label + '">' +
                '<button type="button" class="slider-play" ' +
                  'data-key="' + inp.key + '" aria-label="Animar ' + inp.label + '">▶</button>' +
              '</div>' +
            '</div>';
        }

        container.innerHTML =
          // Panel 1: ecuación
          '<div class="panel" style="--accent:' + Module.accent + '">' +
            '<div class="eq-preview" id="eq-preview-' + config.id + '" ' +
              'role="status" aria-live="polite"><span class="eq-text"></span>' +
              '<div class="eq-katex"></div></div>' +
          '</div>' +

          // Panel 2: inputs
          '<div class="panel" style="--accent:' + Module.accent + '">' +
            '<p class="section-title">Coeficientes</p>' +
            presetsHtml +
            '<div class="inputs-grid" id="inputs-' + config.id + '">' + inputsHtml + '</div>' +
            '<button type="button" class="btn-primary" id="btn-calc-' + config.id + '">Calcular Propiedades</button>' +
          '</div>' +

          // Panel 3: gráfico (con 4 botones)
          '<div class="panel" id="graph-panel-' + config.id + '" style="--accent:' + Module.accent + '; display:none" ' +
            'role="region" aria-label="Gráfico">' +
            '<p class="section-title">Gráfico</p>' +
            '<div class="canvas-wrap">' +
              '<canvas class="graph-canvas" id="canvas-' + config.id + '" ' +
                'role="img" aria-label="Gráfico"></canvas>' +
            '</div>' +
            '<div class="graph-actions">' +
              '<button type="button" class="btn-mini" id="btn-card-' + config.id + '">🖼 Tarjeta</button>' +
              '<button type="button" class="btn-mini" id="btn-share-' + config.id + '">🔗 Enlace</button>' +
              '<button type="button" class="btn-mini" id="btn-reset-' + config.id + '">⟳ Vista</button>' +
              '<button type="button" class="btn-mini" id="btn-notes-' + config.id + '" aria-pressed="false">📝 Nota</button>' +
            '</div>' +
            '<p class="graph-hint">Arrastra · Pellizca para zoom · Toca para trazar · 📝 activa notas</p>' +
          '</div>' +

          // Panel 4: notas
          '<div class="panel" id="notes-panel-' + config.id + '" style="display:none" role="region" aria-label="Notas del gráfico">' +
            '<p class="section-title">Notas del gráfico</p>' +
            '<div class="notes-list" id="notes-list-' + config.id + '"></div>' +
            '<button type="button" class="btn-mini btn-danger" id="btn-clearnotes-' + config.id + '" style="display:none">🗑 Borrar todas</button>' +
          '</div>' +

          // Panel 5: propiedades
          '<div class="panel" id="props-panel-' + config.id + '" style="display:none" ' +
            'role="region" aria-label="Propiedades">' +
            '<p class="section-title">Propiedades</p>' +
            '<ul class="props-list" id="props-list-' + config.id + '" role="list"></ul>' +
          '</div>';

        Module._container = container;
        Module._view = null;
        Module._currentF = null;
        Module._currentPoints = null;
        Module._currentAsym = null;
        Module._currentProps = null;
        Module._currentNotes = [];
        Module._notesMode = false;
        Module._tracePoint = null;
        Module._animating = null;
      },

      // -----------------------------------------------------
      // Init
      // -----------------------------------------------------
      init: function (container) {
        Module._container = container;
        var inputsWrap = container.querySelector('#inputs-' + config.id);

        // Restaurar params
        var restored = Module._loadFromHash() || Module._loadLocal();
        if (restored) {
          for (var k in restored) {
            if (!restored.hasOwnProperty(k)) continue;
            var el = container.querySelector('#in-' + config.id + '-' + k);
            if (el) el.value = restored[k];
          }
        }
        Module._renderPreview();

        // Cargar notas persistidas
        try {
          var savedNotes = Module._loadNotes();
          if (savedNotes && savedNotes.length) Module._currentNotes = savedNotes;
        } catch (e) {}

        // Inputs + sliders
        if (inputsWrap) {
          inputsWrap.addEventListener('input', function (e) {
            var t = e.target;
            if (!t || !t.getAttribute) return;
            var k = t.getAttribute('data-key');
            if (!k) return;
            if (t.type === 'text') Module._syncSliderFromInput(k);
            else if (t.type === 'range') {
              var txt = container.querySelector('#in-' + config.id + '-' + k);
              if (txt) txt.value = t.value;
            }
            Module._renderPreview();
            Module._saveState();
          });
          inputsWrap.addEventListener('keydown', function (ev) {
            if (ev.key === 'Enter' && ev.target.type === 'text') {
              ev.preventDefault(); Module._compute();
            }
          });
          inputsWrap.addEventListener('click', function (e) {
            var t = e.target;
            if (t && t.classList && t.classList.contains('slider-play')) {
              e.preventDefault();
              Module._toggleAnim(t.getAttribute('data-key'), t);
            }
          });
        }

        // Presets
        var presetsWrap = container.querySelector('#presets-' + config.id);
        if (presetsWrap && Array.isArray(config.presets)) {
          presetsWrap.addEventListener('click', function (ev) {
            var t = ev.target;
            if (!t || !t.classList || !t.classList.contains('preset-btn')) return;
            var idx = parseInt(t.getAttribute('data-preset-index'), 10);
            if (isNaN(idx) || !config.presets[idx]) return;
            Module._applyPreset(config.presets[idx].params);
          });
        }

        // Botones
        var btnCalc = container.querySelector('#btn-calc-' + config.id);
        if (btnCalc) btnCalc.addEventListener('click', function () { Module._compute(); });

        var btnCard = container.querySelector('#btn-card-' + config.id);
        if (btnCard) btnCard.addEventListener('click', function () { Module._exportCard(); });

        var btnShare = container.querySelector('#btn-share-' + config.id);
        if (btnShare) btnShare.addEventListener('click', function () { Module._copyLink(); });

        var btnReset = container.querySelector('#btn-reset-' + config.id);
        if (btnReset) btnReset.addEventListener('click', function () { Module._resetView(); });

        var btnNotes = container.querySelector('#btn-notes-' + config.id);
        if (btnNotes) btnNotes.addEventListener('click', function () { Module._toggleNotesMode(); });

        var btnClear = container.querySelector('#btn-clearnotes-' + config.id);
        if (btnClear) btnClear.addEventListener('click', function () { Module._clearNotes(); });

        // Delegación en la lista de notas
        var notesList = container.querySelector('#notes-list-' + config.id);
        if (notesList) {
          notesList.addEventListener('click', function (ev) {
            var t = ev.target;
            if (!t || !t.classList) return;
            var idx = parseInt(t.getAttribute('data-idx'), 10);
            if (isNaN(idx)) return;
            if (t.classList.contains('note-edit')) Module._editNote(idx);
            else if (t.classList.contains('note-del')) Module._deleteNote(idx);
            else if (t.closest && t.closest('.note-item')) Module._focusNote(idx);
          });
        }

        // Refrescar UI de notas (por si había persistidas)
        Module._updateNotesUI();
      },

      // -----------------------------------------------------
      // Sliders + animación
      // -----------------------------------------------------
      _syncSliderFromInput: function (k) {
        var txt = Module._container.querySelector('#in-' + config.id + '-' + k);
        var sl  = Module._container.querySelector('#sl-' + config.id + '-' + k);
        if (!txt || !sl) return;
        var v = parseFloat(txt.value);
        if (isNaN(v)) return;
        var lo = parseFloat(sl.min), hi = parseFloat(sl.max);
        if (v < lo) sl.min = String(Math.floor(v * 2));
        if (v > hi) sl.max = String(Math.ceil(v * 2));
        sl.value = String(v);
      },
      _toggleAnim: function (k, btn) {
        if (Module._animating && Module._animating.key === k) {
          cancelAnimationFrame(Module._animating.raf);
          btn.classList.remove('active');
          btn.textContent = '▶';
          btn._afOrigText = '▶';
          Module._animating = null;
          announce('Animación detenida');
          return;
        }
        if (Module._animating) {
          cancelAnimationFrame(Module._animating.raf);
          var old = Module._container.querySelector('.slider-play[data-key="' + Module._animating.key + '"]');
          if (old) { old.classList.remove('active'); old.textContent = '▶'; old._afOrigText = '▶'; }
        }
        var sl = Module._container.querySelector('#sl-' + config.id + '-' + k);
        if (!sl) return;
        btn.classList.add('active');
        btn.textContent = '⏸';
        btn._afOrigText = '⏸';
        var dir = 1;
        var stepPerFrame = (parseFloat(sl.max) - parseFloat(sl.min)) / 300;
        var state = { key: k, raf: 0, frame: 0 };
        Module._animating = state;

        function tick() {
          var cur = parseFloat(sl.value);
          var lo = parseFloat(sl.min), hi = parseFloat(sl.max);
          var next = cur + dir * stepPerFrame;
          if (next >= hi) { next = hi; dir = -1; }
          else if (next <= lo) { next = lo; dir = 1; }
          sl.value = String(next);
          var txt = Module._container.querySelector('#in-' + config.id + '-' + k);
          if (txt) txt.value = String(Math.round(next * 1000) / 1000);
          Module._renderPreview();
          Module._saveState();
          state.frame++;
          if (state.frame % 8 === 0) Module._recomputeSilent();
          state.raf = requestAnimationFrame(tick);
        }
        state.raf = requestAnimationFrame(tick);
      },
      _recomputeSilent: function () {
        var raw = Module._readParams();
        var parsed = config.parseParams ? config.parseParams(raw) : { ok: true, params: raw };
        if (!parsed.ok) return;
        try {
          var props = config.calculate(parsed.params);
          if (props.error) return;
          Module._currentProps = props;
          var f = config.getFn(parsed.params);
          var range = config.range ? config.range(parsed.params) : [-10, 10];
          Module._currentF = f;
          Module._baseRange = range;
          Module._currentPoints = Module._extractPoints(props, f, range);
          Module._currentAsym = Module._extractAsymptotes(props);
          Module._redraw();
        } catch (e) {}
      },

      _applyPreset: function (params) {
        for (var k in params) {
          if (!params.hasOwnProperty(k)) continue;
          var el = Module._container.querySelector('#in-' + config.id + '-' + k);
          if (el) el.value = params[k];
          Module._syncSliderFromInput(k);
        }
        Module._renderPreview();
        Module._saveState();
      },

      _readParams: function () {
        var obj = {};
        for (var i = 0; i < config.inputs.length; i++) {
          var inp = config.inputs[i];
          var el = Module._container.querySelector('#in-' + config.id + '-' + inp.key);
          obj[inp.key] = el ? el.value : (inp.default || '0');
        }
        return obj;
      },
      _previewSafe: function () {
        try {
          var raw = Module._readParams();
          var parsed = config.parseParams ? config.parseParams(raw) : { ok: true, params: raw };
          if (!parsed.ok) return config.equation ? config.equation(raw) : '—';
          return config.equation(parsed.params);
        } catch (e) { return '—'; }
      },

      // -----------------------------------------------------
      // Preview + KaTeX
      // -----------------------------------------------------
      _renderPreview: function () {
        var el = Module._container.querySelector('#eq-preview-' + config.id);
        if (!el) return;
        var txt;
        try {
          var raw = Module._readParams();
          var parsed = config.parseParams ? config.parseParams(raw) : { ok: true, params: raw };
          txt = parsed.ok ? config.equation(parsed.params) : (config.equation ? config.equation(raw) : '—');
        } catch (e) { txt = '—'; }
        var textSpan = el.querySelector('.eq-text');
        var katexDiv = el.querySelector('.eq-katex');
        if (textSpan) textSpan.textContent = txt;

        var latex = null;
        if (config.latex) {
          try {
            var raw2 = Module._readParams();
            var parsed2 = config.parseParams ? config.parseParams(raw2) : { ok: true, params: raw2 };
            if (parsed2.ok) latex = config.latex(parsed2.params);
          } catch (e) {}
        }
        if (latex && typeof window.katex !== 'undefined' && katexDiv) {
          try {
            window.katex.render(latex, katexDiv, { throwOnError: false, displayMode: false });
            el.classList.add('has-katex');
          } catch (e) { el.classList.remove('has-katex'); }
        } else el.classList.remove('has-katex');
      },

      // -----------------------------------------------------
      // Estado (hash + localStorage)
      // -----------------------------------------------------
      _lsKey: function () { return 'af:params:' + config.id; },
      _saveState: function () {
        var raw = Module._readParams();
        try { localStorage.setItem(Module._lsKey(), JSON.stringify(raw)); } catch (e) {}
        Module._updateHash(raw);
      },
      _loadLocal: function () {
        try { var r = localStorage.getItem(Module._lsKey()); return r ? JSON.parse(r) : null; }
        catch (e) { return null; }
      },
      _loadFromHash: function () {
        var hash = (window.location.hash || '').replace(/^#/, '');
        if (!hash) return null;
        var q = hash.indexOf('?');
        var modName = (q >= 0) ? hash.slice(0, q) : hash;
        if (modName !== config.id) return null;
        if (q < 0) return {};
        var out = {};
        hash.slice(q + 1).split('&').forEach(function (pair) {
          if (!pair) return;
          var eq = pair.indexOf('=');
          if (eq < 0) return;
          out[decodeURIComponent(pair.slice(0, eq))] = decodeURIComponent(pair.slice(eq + 1));
        });
        return out;
      },
      _updateHash: function (raw) {
        raw = raw || Module._readParams();
        var parts = [];
        for (var i = 0; i < config.inputs.length; i++) {
          var k = config.inputs[i].key;
          if (raw[k] !== undefined && raw[k] !== '')
            parts.push(k + '=' + encodeURIComponent(raw[k]));
        }
        var nh = '#' + config.id + (parts.length ? '?' + parts.join('&') : '');
        try { if (window.location.hash !== nh) history.replaceState(null, '', nh); } catch (e) {}
      },

      // -----------------------------------------------------
      // Trazar (tap en el gráfico)
      // -----------------------------------------------------
      _setTraceAt: function (px, py) {
        var canvas = Module._container.querySelector('#canvas-' + config.id);
        if (!canvas || !Module._currentF) return;
        var v = Module._getCurrentView();
        var rect = canvas.getBoundingClientRect();
        var x = v.xmin + (px / rect.width) * (v.xmax - v.xmin);
        var y;
        try { y = Module._currentF(x); } catch (e) { y = NaN; }
        if (!isFinite(y)) y = 0;
        Module._tracePoint = { x: x, y: y };
        Module._redraw();
      },

      // -----------------------------------------------------
      // Notas
      // -----------------------------------------------------
      _noteColors: ['#ffd166', '#4be1ec', '#b892ff', '#ff6b81', '#ff9f4b', '#a0e57a'],
      _nextNoteColor: function () {
        return Module._noteColors[Module._currentNotes.length % Module._noteColors.length];
      },
      _toggleNotesMode: function () {
        Module._notesMode = !Module._notesMode;
        var btn = Module._container.querySelector('#btn-notes-' + config.id);
        if (btn) {
          btn.classList.toggle('active', Module._notesMode);
          btn.setAttribute('aria-pressed', String(Module._notesMode));
        }
        var canvas = Module._container.querySelector('#canvas-' + config.id);
        if (canvas) canvas.style.cursor = Module._notesMode ? 'crosshair' : '';
        announce(Module._notesMode ? 'Modo nota activado' : 'Modo nota desactivado');
      },
      _addNoteAt: function (px, py) {
        var canvas = Module._container.querySelector('#canvas-' + config.id);
        if (!canvas) return;
        var v = Module._getCurrentView();
        var rect = canvas.getBoundingClientRect();
        var x = v.xmin + (px / rect.width) * (v.xmax - v.xmin);
        var y = v.ymax - (py / rect.height) * (v.ymax - v.ymin);
        var text = window.prompt('Nota ' + (Module._currentNotes.length + 1) + ' en (' + _lbl(x) + ', ' + _lbl(y) + '):', '');
        if (text === null) return;
        text = String(text).trim();
        if (!text) return;
        Module._currentNotes.push({ x: x, y: y, text: text, color: Module._nextNoteColor() });
        Module._updateNotesUI();
        Module._saveNotes();
        Module._redraw();
      },
      _editNote: function (idx) {
        if (idx < 0 || idx >= Module._currentNotes.length) return;
        var n = Module._currentNotes[idx];
        var txt = window.prompt('Editar nota ' + (idx + 1) + ':', n.text);
        if (txt === null) return;
        txt = String(txt).trim();
        if (!txt) return;
        n.text = txt;
        Module._updateNotesUI();
        Module._saveNotes();
        Module._redraw();
      },
      _deleteNote: function (idx) {
        if (idx < 0 || idx >= Module._currentNotes.length) return;
        Module._currentNotes.splice(idx, 1);
        Module._updateNotesUI();
        Module._saveNotes();
        Module._redraw();
      },
      _focusNote: function (idx) {
        var canvas = Module._container.querySelector('#canvas-' + config.id);
        if (!canvas) return;
        canvas.classList.remove('af-note-flash');
        void canvas.offsetWidth;
        canvas.classList.add('af-note-flash');
        setTimeout(function () { canvas.classList.remove('af-note-flash'); }, 500);
      },
      _clearNotes: function () {
        if (!Module._currentNotes.length) return;
        if (!window.confirm('¿Borrar todas las notas del gráfico?')) return;
        Module._currentNotes = [];
        Module._updateNotesUI();
        Module._saveNotes();
        Module._redraw();
        announce('Notas borradas');
      },
      _notesKey: function () {
        var raw = Module._readParams();
        return 'af:notes:' + config.id + '|' + JSON.stringify(raw);
      },
      _saveNotes: function () {
        try {
          if (!Module._currentNotes.length) localStorage.removeItem(Module._notesKey());
          else localStorage.setItem(Module._notesKey(), JSON.stringify(Module._currentNotes));
        } catch (e) {}
      },
      _loadNotes: function () {
        try {
          var raw = localStorage.getItem(Module._notesKey());
          return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
      },
      _updateNotesUI: function () {
        var panel = Module._container.querySelector('#notes-panel-' + config.id);
        var list  = Module._container.querySelector('#notes-list-' + config.id);
        var btnClear = Module._container.querySelector('#btn-clearnotes-' + config.id);
        if (!panel || !list) return;
        var notes = Module._currentNotes;
        if (!notes.length) {
          panel.style.display = 'none';
          if (btnClear) btnClear.style.display = 'none';
          return;
        }
        panel.style.display = 'block';
        if (btnClear) {
          btnClear.style.display = '';
          btnClear.textContent = '🗑 Borrar todas (' + notes.length + ')';
          btnClear._afOrigText = btnClear.textContent;
        }
        var html = '';
        for (var i = 0; i < notes.length; i++) {
          var n = notes[i];
          var color = n.color || '#ffd166';
          var safe = String(n.text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
          html +=
            '<div class="note-item" style="--note-color:' + color + '" data-idx="' + i + '">' +
              '<span class="note-num" aria-hidden="true">' + (i + 1) + '</span>' +
              '<div class="note-body">' +
                '<div class="note-text">' + safe + '</div>' +
                '<div class="note-coords">(' + _lbl(n.x) + ', ' + _lbl(n.y) + ')</div>' +
              '</div>' +
              '<div class="note-actions">' +
                '<button type="button" class="note-act note-edit" data-idx="' + i + '" aria-label="Editar">✎</button>' +
                '<button type="button" class="note-act note-del"  data-idx="' + i + '" aria-label="Borrar">✕</button>' +
              '</div>' +
            '</div>';
        }
        list.innerHTML = html;
      },

      // -----------------------------------------------------
      // Vista + redraw
      // -----------------------------------------------------
      _getCurrentView: function () {
        if (Module._view) return Module._view;
        var canvas = Module._container.querySelector('#canvas-' + config.id);
        if (!canvas || !Module._currentF) return { xmin: -10, xmax: 10, ymin: -10, ymax: 10 };
        var range = Module._userRange || Module._baseRange || [-10, 10];
        var yRange = (typeof window.autoRange === 'function')
          ? window.autoRange(Module._currentF, range[0], range[1]) : [-10, 10];
        Module._view = { xmin: range[0], xmax: range[1], ymin: yRange[0], ymax: yRange[1] };
        return Module._view;
      },
      _redraw: function () {
        var canvas = Module._container.querySelector('#canvas-' + config.id);
        if (!canvas || !Module._currentF) return;
        var v = Module._getCurrentView();
        if (typeof window.drawGraph !== 'function') return;
        var points = (Module._currentPoints || []).slice();
        if (Module._tracePoint) {
          points.push({
            x: Module._tracePoint.x, y: Module._tracePoint.y,
            color: '#ffffff', radius: 5,
            label: '(' + _lbl(Module._tracePoint.x) + ', ' + _lbl(Module._tracePoint.y) + ')'
          });
        }
        window.drawGraph(canvas, Module._currentF, {
          xmin: v.xmin, xmax: v.xmax, ymin: v.ymin, ymax: v.ymax,
          color: Module.accent,
          points: points,
          asymptotes: Module._currentAsym || null,
          notes: Module._currentNotes || []
        });
      },
      _panBy: function (dxPx, dyPx) {
        var canvas = Module._container.querySelector('#canvas-' + config.id);
        if (!canvas) return;
        var v = Module._getCurrentView();
        var W = canvas.clientWidth || 1, H = canvas.clientHeight || 1;
        var sx = (v.xmax - v.xmin) / W, sy = (v.ymax - v.ymin) / H;
        v.xmin -= dxPx * sx; v.xmax -= dxPx * sx;
        v.ymin += dyPx * sy; v.ymax += dyPx * sy;
        Module._redraw();
      },
      _zoomAt: function (px, py, scale) {
        var canvas = Module._container.querySelector('#canvas-' + config.id);
        if (!canvas) return;
        var v = Module._getCurrentView();
        var W = canvas.clientWidth || 1, H = canvas.clientHeight || 1;
        var mx = v.xmin + (px / W) * (v.xmax - v.xmin);
        var my = v.ymax - (py / H) * (v.ymax - v.ymin);
        v.xmin = mx + (v.xmin - mx) * scale; v.xmax = mx + (v.xmax - mx) * scale;
        v.ymin = my + (v.ymin - my) * scale; v.ymax = my + (v.ymax - my) * scale;
        Module._redraw();
      },
      _resetView: function () {
        Module._view = null; Module._tracePoint = null;
        Module._redraw();
        var btn = Module._container.querySelector('#btn-reset-' + config.id);
        Module._feedback(btn, '✓ Vista lista');
      },

      // -----------------------------------------------------
      // Interacciones del canvas
      // -----------------------------------------------------
      _setupInteractions: function (canvas) {
        if (canvas._afInteractions) return;
        canvas._afInteractions = true;
        canvas.style.touchAction = 'none';

        var activePointers = new Map();
        var drag = new Map();
        var multiTouch = false;
        var lastC = null, lastD = 0;

        function localPos(e) {
          var rect = canvas.getBoundingClientRect();
          return { x: e.clientX - rect.left, y: e.clientY - rect.top };
        }
        function centroid(pts) {
          var cx = 0, cy = 0;
          for (var i = 0; i < pts.length; i++) { cx += pts[i].x; cy += pts[i].y; }
          return { x: cx / pts.length, y: cy / pts.length };
        }
        function getPts() { var a = []; activePointers.forEach(function (p) { a.push(p); }); return a; }

        canvas.addEventListener('pointerdown', function (e) {
          e.preventDefault();
          try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
          var p = localPos(e);

          // Drag de nota si el modo nota está desactivado y hay pin cerca
          if (!Module._notesMode && canvas._afNoteBoxes) {
            for (var nb = 0; nb < canvas._afNoteBoxes.length; nb++) {
              var box = canvas._afNoteBoxes[nb];
              var dpx = p.x - box.pinX, dpy = p.y - box.pinY;
              if (dpx*dpx + dpy*dpy < 220) {
                canvas._afDraggingNote = nb;
                return;
              }
            }
          }

          activePointers.set(e.pointerId, p);
          drag.set(e.pointerId, { sx: p.x, sy: p.y, moved: false });
          if (activePointers.size >= 2) { multiTouch = true; drag.forEach(function (d) { d.moved = true; }); }
          var pts = getPts();
          lastC = centroid(pts);
          if (pts.length >= 2) {
            var dx = pts[0].x - pts[1].x, dy = pts[0].y - pts[1].y;
            lastD = Math.sqrt(dx*dx + dy*dy);
          } else lastD = 0;
        });

        canvas.addEventListener('pointermove', function (e) {
          // Drag de nota
          if (canvas._afDraggingNote !== undefined && canvas._afDraggingNote !== null) {
            var p2 = localPos(e);
            var view = canvas._afView || Module._getCurrentView();
            var rct = canvas.getBoundingClientRect();
            var nx = view.xmin + (p2.x / rct.width) * (view.xmax - view.xmin);
            var ny = view.ymax - (p2.y / rct.height) * (view.ymax - view.ymin);
            var ni = canvas._afDraggingNote;
            if (Module._currentNotes[ni]) {
              Module._currentNotes[ni].x = nx;
              Module._currentNotes[ni].y = ny;
            }
            Module._redraw();
            return;
          }

          if (!activePointers.has(e.pointerId)) return;
          e.preventDefault();
          var p = localPos(e);
          activePointers.set(e.pointerId, p);
          var d = drag.get(e.pointerId);
          if (d && !d.moved) {
            var ddx = p.x - d.sx, ddy = p.y - d.sy;
            if (ddx*ddx + ddy*ddy > 36) d.moved = true;
          }
          var pts = getPts();
          if (!pts.length) return;
          var c = centroid(pts);
          if (pts.length === 1) {
            if (lastC) Module._panBy(c.x - lastC.x, c.y - lastC.y);
            lastC = c;
          } else if (pts.length >= 2) {
            var dx = pts[0].x - pts[1].x, dy = pts[0].y - pts[1].y;
            var dist = Math.sqrt(dx*dx + dy*dy);
            if (lastD > 0 && Math.abs(dist - lastD) > 0.5) Module._zoomAt(c.x, c.y, lastD / dist);
            lastD = dist; lastC = c;
          }
        });

        function release(e) {
          if (canvas._afDraggingNote !== undefined && canvas._afDraggingNote !== null) {
            canvas._afDraggingNote = null;
            Module._saveNotes();
            Module._updateNotesUI();
            return;
          }
          var d = drag.get(e.pointerId);
          var wasLast = (activePointers.size === 1 && activePointers.has(e.pointerId));
          activePointers.delete(e.pointerId);
          drag.delete(e.pointerId);
          if (wasLast) {
            if (!multiTouch && d && !d.moved) {
              var p = localPos(e);
              if (Module._notesMode) Module._addNoteAt(p.x, p.y);
              else Module._setTraceAt(p.x, p.y);
            }
            multiTouch = false; lastC = null; lastD = 0;
          }
        }
        canvas.addEventListener('pointerup', release);
        canvas.addEventListener('pointercancel', release);
        canvas.addEventListener('pointerleave', release);

        canvas.addEventListener('wheel', function (e) {
          e.preventDefault();
          var scale = e.deltaY > 0 ? 1.15 : 1 / 1.15;
          Module._zoomAt(localPos(e).x, localPos(e).y, scale);
        }, { passive: false });

        canvas.setAttribute('tabindex', '0');
        canvas.addEventListener('keydown', function (e) {
          var W = canvas.clientWidth || 1, H = canvas.clientHeight || 1;
          var handled = true;
          if (e.key === 'ArrowLeft') Module._panBy(20, 0);
          else if (e.key === 'ArrowRight') Module._panBy(-20, 0);
          else if (e.key === 'ArrowUp') Module._panBy(0, 20);
          else if (e.key === 'ArrowDown') Module._panBy(0, -20);
          else if (e.key === '+' || e.key === '=') Module._zoomAt(W/2, H/2, 1/1.2);
          else if (e.key === '-' || e.key === '_') Module._zoomAt(W/2, H/2, 1.2);
          else if (e.key === '0') Module._resetView();
          else handled = false;
          if (handled) e.preventDefault();
        });
      },

      // -----------------------------------------------------
      // Feedback inline
      // -----------------------------------------------------
      _feedback: function (btn, msg, isError) {
        if (!btn) return;
        if (!btn._afOrigText) btn._afOrigText = btn.textContent;
        btn.textContent = msg;
        btn.classList.toggle('action-error', !!isError);
        btn.classList.add('action-feedback');
        clearTimeout(btn._afFbTimer);
        btn._afFbTimer = setTimeout(function () {
          btn.textContent = btn._afOrigText;
          btn.classList.remove('action-error', 'action-feedback');
        }, 1600);
      },

      // -----------------------------------------------------
      // Tarjeta PNG (con firma Ever)
      // -----------------------------------------------------
      _exportCard: function () {
        var btn = Module._container.querySelector('#btn-card-' + config.id);
        var canvas = Module._container.querySelector('#canvas-' + config.id);
        var gp = Module._container.querySelector('#graph-panel-' + config.id);
        if (!canvas || !gp || gp.style.display === 'none' || !Module._currentProps) {
          Module._feedback(btn, 'Calcula primero', true); return;
        }

        var ORDER = [
          ['dominio', 'Dominio'], ['imagen', 'Imagen'],
          ['ceroX', 'Ceros (x)'], ['ceroY', 'Ordenada (y)'],
          ['monotonia', 'Monotonía'], ['paridad', 'Paridad'],
          ['inyectiva', 'Inyectiva'], ['periodo', 'Período'],
          ['amplitud', 'Amplitud'], ['asintotas', 'Asíntotas'],
          ['inversa', 'Inversa'], ['puntoCaracteristico', 'Punto clave'],
          ['extremos', 'Extremos']
        ];
        var props = Module._currentProps;
        var items = [];
        for (var oi = 0; oi < ORDER.length; oi++) {
          var k = ORDER[oi][0], lbl = ORDER[oi][1];
          var v = props[k];
          if (v === undefined || v === null || v === '') continue;
          var str = decorateNotables(Module._stringify(v));
          if (!str) continue;
          if (str === 'Ninguno' && k !== 'extremos' && k !== 'ceroX') continue;
          items.push({ label: lbl, value: str });
        }

        var W = 900, HEADER_H = 155, GRAPH_H = 360, PAD = 40, FOOTER_H = 50;
        var twoCols = items.length > 6, rowH = 52;
        var rows = twoCols ? Math.ceil(items.length / 2) : items.length;
        var propsH = rows * rowH + 20;
        var H = HEADER_H + GRAPH_H + propsH + FOOTER_H + PAD;
        if (H > 1700) { rowH = 44; propsH = rows * rowH + 20; H = HEADER_H + GRAPH_H + propsH + FOOTER_H + PAD; }
        if (H > 1900) { twoCols = true; rows = Math.ceil(items.length / 2); propsH = rows * rowH + 20; H = HEADER_H + GRAPH_H + propsH + FOOTER_H + PAD; }

        var dpr = 2;
        var c = document.createElement('canvas');
        c.width = W * dpr; c.height = H * dpr;
        var ctx = c.getContext('2d');
        ctx.scale(dpr, dpr);

        var grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, '#0a0a1a'); grad.addColorStop(1, '#2d2b55');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = Module.accent; ctx.fillRect(0, 0, W, 6);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#eef0ff';
        ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
        ctx.fillText('Analizador de Funciones', W / 2, 50);
        ctx.fillStyle = '#a7aac7';
        ctx.font = 'italic 14px system-ui, sans-serif';
        ctx.fillText('por Ever', W / 2, 72);
        ctx.fillStyle = '#a7aac7';
        ctx.font = '17px system-ui, sans-serif';
        ctx.fillText(config.title, W / 2, 96);

        ctx.fillStyle = '#ffd166';
        var eqSize = 26;
        ctx.font = 'bold ' + eqSize + 'px ui-monospace, "Fira Code", monospace';
        var eqText = Module._previewSafe();
        while (ctx.measureText(eqText).width > W - 80 && eqSize > 14) {
          eqSize -= 2;
          ctx.font = 'bold ' + eqSize + 'px ui-monospace, "Fira Code", monospace';
        }
        ctx.fillText(eqText, W / 2, 132);

        var gx = PAD, gy = HEADER_H, gw = W - 2 * PAD, gh = GRAPH_H;
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        roundRect(ctx, gx, gy, gw, gh, 16); ctx.fill();
        ctx.save();
        roundRect(ctx, gx, gy, gw, gh, 16); ctx.clip();
        var aspect = canvas.width / canvas.height;
        var drawW = gw, drawH = gw / aspect;
        if (drawH > gh) { drawH = gh; drawW = gh * aspect; }
        try { ctx.drawImage(canvas, gx + (gw - drawW) / 2, gy + (gh - drawH) / 2, drawW, drawH); } catch (e) {}
        ctx.restore();

        var pxTop = HEADER_H + GRAPH_H + 24;
        ctx.textAlign = 'left';
        if (twoCols) {
          var colW = (W - 2 * PAD) / 2;
          for (var i = 0; i < items.length; i++) {
            var col = i % 2, rowIdx = Math.floor(i / 2);
            drawProp(ctx, PAD + col * colW, pxTop + rowIdx * rowH, colW - 16, items[i]);
          }
        } else {
          for (var j = 0; j < items.length; j++) {
            drawProp(ctx, PAD, pxTop + j * rowH, W - 2 * PAD, items[j]);
          }
        }

        ctx.textAlign = 'center';
        ctx.fillStyle = '#a7aac7';
        ctx.font = '13px system-ui, sans-serif';
        ctx.fillText('Hecho por Ever · ' + new Date().toLocaleDateString('es'), W / 2, H - 24);

        var filename = 'analisis-' + config.id.toLowerCase() + '.png';
        showCardPreview(c, filename, config.title, btn);
        Module._feedback(btn, '✓ Listo');
      },

      _copyLink: function () {
        var btn = Module._container.querySelector('#btn-share-' + config.id);
        Module._updateHash();
        var url = window.location.href;
        function done(okFlag) {
          Module._feedback(btn, okFlag ? '✓ Copiado' : '✗ Error', !okFlag);
          announce(okFlag ? 'Enlace copiado' : 'No se pudo copiar');
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(false); });
        } else {
          var ta = document.createElement('textarea');
          ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0';
          document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); done(true); } catch (e) { done(false); }
          document.body.removeChild(ta);
        }
      },

      // -----------------------------------------------------
      // Recompute: recalcula props + gráfico tras cambio de rango
      // -----------------------------------------------------
      _recompute: function () {
        var props = Module._currentProps;
        var f = Module._currentF;
        if (!props || !f) return;

        var naturalRange = Module._baseRange || [-10, 10];
        var effectiveRange = Module._userRange || naturalRange;

        Module._currentPoints = Module._extractPoints(props, f, effectiveRange);
        Module._currentAsym = Module._extractAsymptotes(props);
        Module._view = null;

        Module._redraw();
        Module._renderPropsPanel(props);
      },

      // -----------------------------------------------------
      // Aplica restricción de rango a las propiedades
      // -----------------------------------------------------
      _applyRangeConstraint: function (props, f, range) {
        if (!props || props.error) return props;
        if (!range || !Array.isArray(range)) return props;
        var a = range[0], b = range[1];
        // Defensa: rechazar NaN / rangos inválidos / infinitos
        if (typeof a !== 'number' || typeof b !== 'number') return props;
        if (isNaN(a) || isNaN(b)) return props;
        if (!isFinite(a) || !isFinite(b)) return props;
        if (a >= b) return props;
        if (!f || typeof f !== 'function') return props;

        // Copia superficial
        var out = {};
        for (var k in props) if (props.hasOwnProperty(k)) out[k] = props[k];

        var sa = isFinite(a) ? a : -1e4;
        var sb = isFinite(b) ? b :  1e4;

        // Rango textual para mostrar
        var rangeStr = '[' +
          (isFinite(a) ? Module._fmtVal(a) : '−∞') + ', ' +
          (isFinite(b) ? Module._fmtVal(b) : '∞') + ']';

        // ---------- Ceros filtrados ----------
        if (Array.isArray(out.ceroX)) {
          out.ceroX = out.ceroX.filter(function (x) {
            return typeof x === 'number' && x >= a && x <= b;
          });
          if (!out.ceroX.length) out.ceroX = 'Ninguno en el rango';
        } else if (typeof out.ceroX === 'string' && out.ceroX !== 'Ninguno') {
          out.ceroX = out.ceroX + ' (fuera del rango)';
        }

        // ---------- Extremos filtrados ----------
        if (Array.isArray(out.extremos)) {
          out.extremos = out.extremos.filter(function (e) {
            return e && typeof e.x === 'number' && e.x >= a && e.x <= b;
          });
          if (!out.extremos.length) out.extremos = 'Ninguno en el rango';
        }

        // ---------- Punto característico ----------
        if (out.puntoCaracteristico && typeof out.puntoCaracteristico === 'object') {
          var pc = out.puntoCaracteristico;
          if (typeof pc.x === 'number' && (pc.x < a || pc.x > b)) {
            out.puntoCaracteristico = 'Fuera del rango';
          }
        }

        // ---------- Imagen numérica ----------
        var ymin = Infinity, ymax = -Infinity;
        var N = 400;
        for (var i = 0; i <= N; i++) {
          var x = sa + (sb - sa) * i / N;
          var y;
          try { y = f(x); } catch (e) { continue; }
          if (typeof y !== 'number' || !isFinite(y)) continue;
          if (y < ymin) ymin = y;
          if (y > ymax) ymax = y;
        }
        if (isFinite(ymin) && isFinite(ymax)) {
          var approx = (ymax - ymin) > 1e-6;
          out.imagen = '[' + Module._fmtVal(ymin) + ', ' + Module._fmtVal(ymax) + ']' +
                       (approx ? '  (aprox. numérica)' : '');
        }

        // ---------- Monotonía numérica ----------
        if (window.CoreUtils && typeof window.CoreUtils.monotoniaIntervals === 'function') {
          try {
            var intervals = window.CoreUtils.monotoniaIntervals(f, sa, sb, 300);
            if (intervals && intervals.length) {
              out.monotonia = intervals.map(function (iv) {
                var arrow = iv.behavior === 'creciente' ? '↗' : '↘';
                return arrow + ' [' + Module._fmtVal(iv.from) + ', ' +
                       Module._fmtVal(iv.to) + ']';
              }).join('   ·   ');
            } else {
              out.monotonia = 'Constante en el rango';
            }
          } catch (e) { /* dejar la original */ }
        }

        // ---------- Dominio restringido ----------
        if (typeof out.dominio === 'string' && out.dominio.indexOf('∩') === -1) {
          out.dominio = out.dominio + ' ∩ ' + rangeStr;
        }

        // Marca para el render
        out.__rangeApplied = rangeStr;
        return out;
      },

      // -----------------------------------------------------
      // Render del panel de propiedades (aplica rango)
      // -----------------------------------------------------
      _renderPropsPanel: function (props) {
        var propsList = Module._container && Module._container.querySelector('#props-list-' + config.id);
        if (!propsList) return;

        if (!props || props.error) {
          propsList.innerHTML = '<li role="listitem"><span class="prop-val err">' +
            ((props && props.error) || 'Error') + '</span></li>';
          return;
        }

        var effective = Module._applyRangeConstraint(props, Module._currentF, Module._userRange);

        Module._currentProps = props;
        Module._renderPropsPanel(props);
      },

      // -----------------------------------------------------
      // Compute
      // -----------------------------------------------------
      // -----------------------------------------------------
      // Re-render cuando cambia el idioma
      // -----------------------------------------------------
      _onLangChange: function () {
        if (!Module._currentProps) return;
        Module._lastLatex = '__init__'; // forzar re-render de KaTeX
        Module._renderPropsPanel(Module._currentProps);
        Module._renderPreview();
      },

      _compute: function () {
        var raw = Module._readParams();
        var parsed = config.parseParams ? config.parseParams(raw) : { ok: true, params: raw };
        var propsPanel = Module._container.querySelector('#props-panel-' + config.id);
        var propsList  = Module._container.querySelector('#props-list-' + config.id);
        var graphPanel = Module._container.querySelector('#graph-panel-' + config.id);
        propsPanel.style.display = 'block';
        propsList.innerHTML = '';
        Module._saveState();

        if (!parsed.ok) {
          propsList.innerHTML = '<li role="listitem"><span class="prop-val err">' +
            (parsed.error || 'Parámetros inválidos') + '</span></li>';
          graphPanel.style.display = 'none';
          announce('Error: ' + (parsed.error || ''));
          return;
        }

        var props;
        try { props = config.calculate(parsed.params); }
        catch (e) { props = { error: 'Error: ' + e.message }; }

        var i18n = window._afI18n;
        var T = function (key) { return i18n && i18n.label ? i18n.label(key) : key; };
        var TS = function (key) { return i18n && i18n.section ? i18n.section(key) : key; };
        var GROUPS = [
          { title: TS('basicas'),        keys: ['dominio', 'imagen', 'ceroX', 'ceroY'] },
          { title: TS('analisis'),       keys: ['monotonia', 'extremos', 'puntoCaracteristico'] },
          { title: TS('comportamiento'), keys: ['paridad', 'inyectiva', 'periodo', 'amplitud'] },
          { title: TS('especiales'),     keys: ['asintotas', 'inversa'] }
        ];
        var labels = {
          dominio: T('dominio'), imagen: T('imagen'), ceroX: T('ceroX'),
          ceroY: T('ceroY'), monotonia: T('monotonia'), paridad: T('paridad'),
          inyectiva: T('inyectiva'), periodo: T('periodo'), amplitud: T('amplitud'),
          asintotas: T('asintotas'), inversa: T('inversa'),
          puntoCaracteristico: T('puntoCaracteristico'), extremos: T('extremos')
        };

        if (props.error) {
          propsList.innerHTML = '<li role="listitem"><span class="prop-val err">' + props.error + '</span></li>';
          graphPanel.style.display = 'none';
          announce('Error: ' + props.error);
          return;
        }

        var rendered = 0;
        GROUPS.forEach(function (group) {
          var sectionItems = [];
          group.keys.forEach(function (key) {
            if (!Object.prototype.hasOwnProperty.call(props, key)) return;
            var val = props[key];
            if (val === undefined || val === null) return;
            var rawStr = Module._stringify(val);
            // Traducción por dos vías: exacta primero, patrones después
            if (window._afI18nFull) {
              var translated = window._afI18nFull.translate(rawStr);
              if (translated !== rawStr) rawStr = translated;
            }
            var display = decorateNotables(rawStr);
            var li = document.createElement('li');
            li.setAttribute('role', 'listitem');
            li.innerHTML =
              '<span class="prop-key">' + labels[key] +
                '<button type="button" class="prop-help-btn" aria-label="Ayuda sobre ' + labels[key] + '" aria-expanded="false">?</button>' +
              '</span>' +
              '<span class="prop-val"></span>' +
              '<div class="prop-help" hidden>' + (HELP[key] || '') + '</div>';
            var valEl = li.querySelector('.prop-val');
            if (valEl) {
              if (window._afMathRender && window._afMathRender.render) {
                window._afMathRender.render(valEl, display);
              } else {
                valEl.textContent = display;
              }
            }
            sectionItems.push(li);
            rendered++;
          });
          if (!sectionItems.length) return;
          var sectionLi = document.createElement('li');
          sectionLi.className = 'props-section';
          sectionLi.setAttribute('role', 'presentation');
          var title = document.createElement('p');
          title.className = 'props-section-title';
          title.textContent = group.title;
          var inner = document.createElement('ul');
          inner.className = 'props-list-nested';
          inner.setAttribute('role', 'list');
          sectionItems.forEach(function (li) { inner.appendChild(li); });
          sectionLi.appendChild(title);
          sectionLi.appendChild(inner);
          propsList.appendChild(sectionLi);
        });

        var helpBtns = propsList.querySelectorAll('.prop-help-btn');
        for (var hb = 0; hb < helpBtns.length; hb++) {
          (function (b) {
            b.addEventListener('click', function (ev) {
              ev.stopPropagation();
              var li = b.parentNode && b.parentNode.parentNode;
              var h = li && li.querySelector('.prop-help');
              if (!h) return;
              var open = !h.hidden;
              h.hidden = open;
              b.setAttribute('aria-expanded', String(!open));
            });
          })(helpBtns[hb]);
        }
        announce('Propiedades: ' + rendered);

        try {
          pushHistory({ id: config.id, title: config.title, accent: Module.accent,
            params: raw, equation: Module._previewSafe(), ts: Date.now() });
          if (window.App && window.App.refreshHistory) window.App.refreshHistory();
        } catch (e) {}

        graphPanel.style.display = 'block';
        var canvas = Module._container.querySelector('#canvas-' + config.id);
        if (canvas && typeof window.drawGraph === 'function' && config.getFn) {
          try {
            var f = config.getFn(parsed.params);
            var naturalRange = config.range ? config.range(parsed.params) : [-10, 10];
            var effectiveRange = Module._userRange || naturalRange;
            Module._currentF = f;
            Module._currentProps = props;
            Module._baseRange = naturalRange;
            Module._currentPoints = Module._extractPoints(props, f, effectiveRange);
            Module._currentAsym = Module._extractAsymptotes(props);
            Module._view = null;
            Module._tracePoint = null;
            // Notas: intentar cargar las persistidas para este params
            var saved = Module._loadNotes();
            Module._currentNotes = (saved && saved.length) ? saved : [];
            Module._updateNotesUI();
            Module._setupInteractions(canvas);
            Module._redraw();
          } catch (e) {}
        }
      },

      _extractPoints: function (props, f, range) {
        var out = [];
        if (!props || props.error) return out;
        var xmin = (range && range[0] != null) ? range[0] : -Infinity;
        var xmax = (range && range[1] != null) ? range[1] :  Infinity;
        function inW(x) { return x >= xmin - 1e-9 && x <= xmax + 1e-9; }
        function already(x) {
          for (var i = 0; i < out.length; i++) if (Math.abs(out[i].x - x) < 1e-6) return true;
          return false;
        }
        if (Array.isArray(props.ceroX)) {
          var mc = Math.min(props.ceroX.length, 8);
          for (var i = 0; i < mc; i++) {
            var cx = props.ceroX[i];
            if (typeof cx !== 'number' || !isFinite(cx) || !inW(cx) || already(cx)) continue;
            out.push({ x: cx, y: 0, color: '#ffd166', radius: 5, label: 'x=' + _lbl(cx) });
          }
        }
        if (Array.isArray(props.extremos)) {
          var me = Math.min(props.extremos.length, 4);
          for (var j = 0; j < me; j++) {
            var e = props.extremos[j];
            if (!e || typeof e.x !== 'number' || typeof e.y !== 'number') continue;
            if (!isFinite(e.x) || !isFinite(e.y) || !inW(e.x) || already(e.x)) continue;
            var isMax = /m[áa]x/i.test(e.tipo || '');
            out.push({ x: e.x, y: e.y, color: isMax ? '#ff6b81' : '#4be1ec',
              radius: 5, label: isMax ? 'máx' : 'mín' });
          }
        }
        var pc = props.puntoCaracteristico;
        if (pc && typeof pc.x === 'number' && typeof pc.y === 'number' &&
            isFinite(pc.x) && isFinite(pc.y) && inW(pc.x) && !already(pc.x)) {
          var t = String(pc.tipo || 'clave');
          if (t.indexOf('(') > 0) t = t.slice(0, t.indexOf('(')).trim();
          if (t.indexOf(' de ') > 0) t = t.split(' de ')[0];
          if (t.length > 12) t = t.slice(0, 12) + '…';
          out.push({ x: pc.x, y: pc.y, color: '#b892ff', radius: 5, label: t });
        }
        if (typeof props.ceroY === 'number' && isFinite(props.ceroY) && inW(0) && !already(0)) {
          var y0 = f(0);
          if (isFinite(y0)) out.push({ x: 0, y: y0, color: '#4be1ec', radius: 4, label: 'y=' + _lbl(y0) });
        }
        return out;
      },

      _extractAsymptotes: function (props) {
        var out = { vertical: [], horizontal: [] };
        if (!props || props.error || !props.asintotas) return out;
        var as = props.asintotas;
        if (typeof as === 'string') return out;
        function parseAxis(str, axis) {
          if (typeof str !== 'string') return [];
          var re = new RegExp(axis + '\\s*=\\s*(-?[\\d.]+)', 'g');
          var res = [], m;
          while ((m = re.exec(str)) !== null) {
            var v = parseFloat(m[1]);
            if (isFinite(v) && res.indexOf(v) < 0) res.push(v);
          }
          return res;
        }
        out.vertical = parseAxis(as.vertical, 'x');
        out.horizontal = parseAxis(as.horizontal, 'y');
        return out;
      },

      _stringify: function (v) {
        if (Array.isArray(v)) {
          if (v.length === 0) return 'Ninguno';
          return v.map(function (it) {
            if (typeof it === 'object' && it !== null) {
              return Object.keys(it).map(function (k) { return k + ' = ' + Module._fmtVal(it[k]); }).join(', ');
            }
            return Module._fmtVal(it);
          }).join('; ');
        }
        if (typeof v === 'object' && v !== null) {
          return Object.keys(v).map(function (k) { return k + ': ' + Module._fmtVal(v[k]); }).join(' · ');
        }
        return Module._fmtVal(v);
      },
      _fmtVal: function (v) {
        if (typeof v === 'number' && isFinite(v)) return fmt(v);
        return String(v);
      }
    };

    if (typeof window !== 'undefined') window[config.id + 'Module'] = Module;
    return Module;
  }

  function drawProp(ctx, x, y, w, item) {
    ctx.fillStyle = '#a7aac7';
    ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
    ctx.fillText(item.label.toUpperCase(), x, y + 13);
    ctx.fillStyle = '#eef0ff';
    ctx.font = '14px ui-monospace, "Fira Code", monospace';
    var lines = wrapText(ctx, item.value, w, 2);
    for (var i = 0; i < lines.length; i++) ctx.fillText(lines[i], x, y + 30 + i * 15);
  }
  function wrapText(ctx, text, maxWidth, maxLines) {
    var out = [], words = String(text).split(/\s+/), line = '';
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width <= maxWidth) line = test;
      else { if (line) out.push(line); line = words[i]; if (out.length >= maxLines - 1) break; }
    }
    if (line && out.length < maxLines) out.push(line);
    if (out.length) {
      var last = out[out.length - 1];
      while (ctx.measureText(last + '…').width > maxWidth && last.length > 2) last = last.slice(0, -1);
      out[out.length - 1] = last;
    }
    return out.length ? out : [''];
  }

  var API = {
    fmt: fmt,
    numericDerivative: numericDerivative,
    findRoots: findRoots,
    checkParity: checkParity,
    monotoniaIntervals: monotoniaIntervals,
    numericLimit: numericLimit,
    intervalStr: intervalStr,
    createModule: createModule,
    pushHistory: pushHistory,
    getHistory: getHistory,
    clearHistory: clearHistory,
    announce: announce,
    showCardPreview: showCardPreview,
    decorateNotables: decorateNotables
  };

  if (typeof window !== 'undefined') window.CoreUtils = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
