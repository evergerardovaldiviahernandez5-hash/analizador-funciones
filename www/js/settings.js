/* =========================================================
   settings.js — Ajustes: temas + idioma
   ---------------------------------------------------------
   · Modal accesible con 2 pestañas (Apariencia / Idioma)
   · 10 temas con paletas completas
   · 6 idiomas con i18n básico
   · Persistencia: af:theme, af:lang, af:theme-manual
   ========================================================= */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  if (window._afSettingsInit) return;
  window._afSettingsInit = true;

  // =========================================================
  // 10 TEMAS
  // =========================================================
  var THEMES = [
    { id: 'dark',     name: { es: 'Oscuro',      en: 'Dark',       pt: 'Escuro',     fr: 'Sombre',     de: 'Dunkel',  it: 'Scuro'     }, colors: ['#0a0a1a', '#2d2b55', '#4be1ec'] },
    { id: 'light',    name: { es: 'Claro',       en: 'Light',      pt: 'Claro',      fr: 'Clair',      de: 'Hell',    it: 'Chiaro'    }, colors: ['#f7f8fc', '#e8ebf7', '#4be1ec'] },
    { id: 'ocean',    name: { es: 'Océano',      en: 'Ocean',      pt: 'Oceano',     fr: 'Océan',      de: 'Ozean',   it: 'Oceano'    }, colors: ['#041a2e', '#0a3d62', '#3ec1d3'] },
    { id: 'sunset',   name: { es: 'Atardecer',   en: 'Sunset',     pt: 'Pôr do sol', fr: 'Coucher',    de: 'Sonnen',  it: 'Tramonto'  }, colors: ['#1a0a0f', '#3d1a2a', '#ff7e67'] },
    { id: 'forest',   name: { es: 'Bosque',      en: 'Forest',     pt: 'Floresta',   fr: 'Forêt',      de: 'Wald',    it: 'Foresta'   }, colors: ['#0a1a0f', '#1a3d1f', '#7bd88f'] },
    { id: 'royal',    name: { es: 'Púrpura',     en: 'Royal',      pt: 'Real',       fr: 'Royal',      de: 'König',   it: 'Reale'     }, colors: ['#150a2e', '#2d1b69', '#b892ff'] },
    { id: 'mono',     name: { es: 'Monocromo',   en: 'Monochrome', pt: 'Monocrom.',  fr: 'Mono',       de: 'Mono',    it: 'Mono'      }, colors: ['#1a1a1a', '#333333', '#e0e0e0'] },
    { id: 'neon',     name: { es: 'Neón',        en: 'Neon',       pt: 'Neon',       fr: 'Néon',       de: 'Neon',    it: 'Neon'      }, colors: ['#0a0014', '#1a0033', '#ff00ff'] },
    { id: 'sepia',    name: { es: 'Sepia',       en: 'Sepia',      pt: 'Sépia',      fr: 'Sépia',      de: 'Sepia',   it: 'Seppia'    }, colors: ['#f4ecd8', '#e8dcc0', '#8b5a2b'] },
    { id: 'contrast', name: { es: 'Contraste',   en: 'Contrast',   pt: 'Contraste',  fr: 'Contraste',  de: 'Kontrast',it: 'Contrasto' }, colors: ['#000000', '#000000', '#ffff00'] }
  ];

  // =========================================================
  // 6 IDIOMAS
  // =========================================================
  var LANGS = [
    { id: 'es', flag: '🇪🇸', name: 'Español'   },
    { id: 'en', flag: '🇬🇧', name: 'English'   },
    { id: 'pt', flag: '🇵🇹', name: 'Português' },
    { id: 'fr', flag: '🇫🇷', name: 'Français'  },
    { id: 'de', flag: '🇩🇪', name: 'Deutsch'   },
    { id: 'it', flag: '🇮🇹', name: 'Italiano'  }
  ];

  // =========================================================
  // i18n — sólo las cadenas de la UI (las props se quedan en es)
  // =========================================================
  var STRINGS = {
    es: {
      'settings.title':      'Ajustes',
      'settings.tab.themes': '🎨 Apariencia',
      'settings.tab.lang':   '🌐 Idioma',
      'settings.section.appearance': 'Elegí un tema',
      'settings.section.language':   'Elegí un idioma',
      'settings.hint.themes': 'El tema se aplica al instante y se guarda.',
      'settings.hint.lang':   'Algunos textos pueden quedar en español.',
      'settings.close':      'Cerrar',
      'search.placeholder':  '🔍 Buscar función o característica…',
      'toolbar.library':     'Abrir biblioteca',
      'toolbar.view':        'Cambiar vista',
      'nav.home':            'Inicio',
      'nav.library':         'Ejemplos',
      'nav.settings':        'Ajustes'
    },
    en: {
      'settings.title':      'Settings',
      'settings.tab.themes': '🎨 Appearance',
      'settings.tab.lang':   '🌐 Language',
      'settings.section.appearance': 'Pick a theme',
      'settings.section.language':   'Pick a language',
      'settings.hint.themes': 'The theme applies instantly and is saved.',
      'settings.hint.lang':   'Some texts may remain in Spanish.',
      'settings.close':      'Close',
      'search.placeholder':  '🔍 Search function or feature…',
      'toolbar.library':     'Open library',
      'toolbar.view':        'Toggle view',
      'nav.home':            'Home',
      'nav.library':         'Examples',
      'nav.settings':        'Settings'
    },
    pt: {
      'settings.title':      'Ajustes',
      'settings.tab.themes': '🎨 Aparência',
      'settings.tab.lang':   '🌐 Idioma',
      'settings.section.appearance': 'Escolha um tema',
      'settings.section.language':   'Escolha um idioma',
      'settings.hint.themes': 'O tema é aplicado na hora e salvo.',
      'settings.hint.lang':   'Alguns textos podem ficar em espanhol.',
      'settings.close':      'Fechar',
      'search.placeholder':  '🔍 Buscar função ou recurso…',
      'toolbar.library':     'Abrir biblioteca',
      'toolbar.view':        'Alternar vista',
      'nav.home':            'Início',
      'nav.library':         'Exemplos',
      'nav.settings':        'Ajustes'
    },
    fr: {
      'settings.title':      'Paramètres',
      'settings.tab.themes': '🎨 Apparence',
      'settings.tab.lang':   '🌐 Langue',
      'settings.section.appearance': 'Choisissez un thème',
      'settings.section.language':   'Choisissez une langue',
      'settings.hint.themes': 'Le thème s\'applique immédiatement.',
      'settings.hint.lang':   'Certains textes peuvent rester en espagnol.',
      'settings.close':      'Fermer',
      'search.placeholder':  '🔍 Rechercher une fonction…',
      'toolbar.library':     'Ouvrir la bibliothèque',
      'toolbar.view':        'Changer la vue',
      'nav.home':            'Accueil',
      'nav.library':         'Exemples',
      'nav.settings':        'Réglages'
    },
    de: {
      'settings.title':      'Einstellungen',
      'settings.tab.themes': '🎨 Aussehen',
      'settings.tab.lang':   '🌐 Sprache',
      'settings.section.appearance': 'Wähle ein Theme',
      'settings.section.language':   'Wähle eine Sprache',
      'settings.hint.themes': 'Das Theme wird sofort angewendet.',
      'settings.hint.lang':   'Einige Texte bleiben evtl. Spanisch.',
      'settings.close':      'Schließen',
      'search.placeholder':  '🔍 Funktion suchen…',
      'toolbar.library':     'Bibliothek öffnen',
      'toolbar.view':        'Ansicht wechseln',
      'nav.home':            'Start',
      'nav.library':         'Beispiele',
      'nav.settings':        'Einstellungen'
    },
    it: {
      'settings.title':      'Impostazioni',
      'settings.tab.themes': '🎨 Aspetto',
      'settings.tab.lang':   '🌐 Lingua',
      'settings.section.appearance': 'Scegli un tema',
      'settings.section.language':   'Scegli una lingua',
      'settings.hint.themes': 'Il tema viene applicato subito.',
      'settings.hint.lang':   'Alcuni testi possono rimanere in spagnolo.',
      'settings.close':      'Chiudi',
      'search.placeholder':  '🔍 Cerca funzione…',
      'toolbar.library':     'Apri libreria',
      'toolbar.view':        'Cambia vista',
      'nav.home':            'Home',
      'nav.library':         'Esempi',
      'nav.settings':        'Impostazioni'
    }
  };

  var THEME_KEY = 'af:theme';
  var LANG_KEY  = 'af:lang';
  var MANUAL_KEY = 'af:theme-manual';

  // =========================================================
  // Utilidades
  // =========================================================
  function safeGet(key, def) {
    try { var v = localStorage.getItem(key); return v == null ? def : v; }
    catch (e) { return def; }
  }
  function safeSet(key, val) {
    try { localStorage.setItem(key, val); } catch (e) {}
  }

  function getCurrentTheme() {
    var t = safeGet(THEME_KEY, 'dark');
    for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === t) return t;
    return 'dark';
  }

  function getCurrentLang() {
    var l = safeGet(LANG_KEY, 'es');
    for (var i = 0; i < LANGS.length; i++) if (LANGS[i].id === l) return l;
    return 'es';
  }

  function applyTheme(id) {
    document.documentElement.setAttribute('data-theme', id);
    var meta = document.getElementById('meta-theme-color');
    if (meta) {
      var colorMap = {
        dark: '#0a0a1a', light: '#f7f8fc', ocean: '#041a2e',
        sunset: '#1a0a0f', forest: '#0a1a0f', royal: '#150a2e',
        mono: '#1a1a1a', neon: '#0a0014', sepia: '#f4ecd8',
        contrast: '#000000'
      };
      meta.setAttribute('content', colorMap[id] || '#0a0a1a');
    }
    safeSet(THEME_KEY, id);
    safeSet(MANUAL_KEY, '1'); // desactiva auto-tema
  }

  function applyLang(id) {
    safeSet(LANG_KEY, id);
    document.documentElement.setAttribute('lang', id);
    translateUI(id);
    // Notificar a toda la app: re-render de textos dinámicos
    try {
      window.dispatchEvent(new CustomEvent('af:langchange', { detail: { lang: id } }));
    } catch (e) {}
  }

  // =========================================================
  // Traducción de la UI
  // =========================================================
  function t(key, lang) {
    var l = lang || getCurrentLang();
    if (STRINGS[l] && STRINGS[l][key]) return STRINGS[l][key];
    return STRINGS.es[key] || key;
  }

  function translateUI(lang) {
    // Búsqueda
    var search = document.getElementById('cards-search');
    if (search) search.placeholder = t('search.placeholder', lang);

    // Botón biblioteca
    var lib = document.getElementById('btn-library');
    if (lib) { lib.title = t('toolbar.library', lang); lib.setAttribute('aria-label', t('toolbar.library', lang)); }

    // Botón vista
    var vt = document.getElementById('btn-view-toggle');
    if (vt) vt.setAttribute('aria-label', t('toolbar.view', lang));

    // Bottom-nav
    var bnHome = document.querySelector('.bottom-nav [data-action="home"]');
    var bnLib  = document.querySelector('.bottom-nav [data-action="library"]');
    var bnSet  = document.querySelector('.bottom-nav [data-action="settings"]');
    if (bnHome) { var h = bnHome.querySelector('.bn-label'); if (h) h.textContent = t('nav.home', lang); }
    if (bnLib)  { var lb = bnLib.querySelector('.bn-label');  if (lb) lb.textContent = t('nav.library', lang); }
    if (bnSet)  { var st = bnSet.querySelector('.bn-label');  if (st) st.textContent = t('nav.settings', lang); }

    // Botón ajustes (icon-only)
    var bs = document.getElementById('btn-settings');
    if (bs) { bs.setAttribute('aria-label', t('settings.title', lang)); bs.title = t('settings.title', lang); }
  }

  // =========================================================
  // Modal
  // =========================================================
  var overlay, themeGrid, langList, tabs, panes;
  var returnFocus = null;

  function buildModal() {
    if (document.getElementById('settings-overlay')) return;

    var wrap = document.createElement('div');
    wrap.id = 'settings-overlay';
    wrap.className = 'modal-overlay settings-overlay';
    wrap.hidden = true;
    wrap.innerHTML =
      '<div class="modal modal-wide settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">' +
        '<div class="modal-header">' +
          '<h3 id="settings-title" class="modal-title">Ajustes</h3>' +
          '<button type="button" class="modal-close" id="settings-close" aria-label="Cerrar">✕</button>' +
        '</div>' +
        '<div class="settings-tabs" role="tablist">' +
          '<button type="button" class="settings-tab active" data-tab="appearance" role="tab" aria-selected="true">🎨 Apariencia</button>' +
          '<button type="button" class="settings-tab" data-tab="language" role="tab" aria-selected="false">🌐 Idioma</button>' +
        '</div>' +
        '<div class="settings-body">' +
          '<div class="settings-pane" data-pane="appearance" role="tabpanel">' +
            '<p class="settings-hint" id="hint-themes">El tema se aplica al instante y se guarda.</p>' +
            '<div class="theme-grid" id="theme-grid"></div>' +
          '</div>' +
          '<div class="settings-pane" data-pane="language" hidden role="tabpanel">' +
            '<p class="settings-hint" id="hint-lang">Algunos textos pueden quedar en español.</p>' +
            '<div class="lang-list" id="lang-list"></div>' +
          '</div>' +
        '</div>' +
        '<div class="modal-footer">' +
          '<button type="button" class="btn-primary" id="settings-ok">Cerrar</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(wrap);

    overlay   = wrap;
    themeGrid = wrap.querySelector('#theme-grid');
    langList  = wrap.querySelector('#lang-list');
    tabs      = wrap.querySelectorAll('.settings-tab');
    panes     = wrap.querySelectorAll('.settings-pane');

    // Construir grid de temas
    THEMES.forEach(function (theme) {
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'theme-card';
      card.setAttribute('data-theme-id', theme.id);
      card.setAttribute('role', 'radio');
      card.innerHTML =
        '<span class="theme-preview" style="background:linear-gradient(135deg,' +
          theme.colors[0] + ' 0%, ' + theme.colors[1] + ' 55%, ' + theme.colors[2] + ' 100%);">' +
          '<span class="theme-preview-dot" style="background:' + theme.colors[2] + ';"></span>' +
        '</span>' +
        '<span class="theme-name"></span>' +
        '<span class="theme-check" aria-hidden="true">✓</span>';
      card.addEventListener('click', function () {
        applyTheme(theme.id);
        updateThemeSelection();
        if (window.CoreUtils && window.CoreUtils.announce)
          window.CoreUtils.announce('Tema ' + (theme.name[getCurrentLang()] || theme.name.es));
      });
      themeGrid.appendChild(card);
    });

    // Construir lista de idiomas
    LANGS.forEach(function (lang) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'lang-item';
      item.setAttribute('data-lang-id', lang.id);
      item.setAttribute('role', 'radio');
      item.innerHTML =
        '<span class="lang-flag" aria-hidden="true">' + lang.flag + '</span>' +
        '<span class="lang-name">' + lang.name + '</span>' +
        '<span class="lang-check" aria-hidden="true">✓</span>';
      item.addEventListener('click', function () {
        applyLang(lang.id);
        updateLangSelection();
        refreshThemeNames();
      });
      langList.appendChild(item);
    });

    // Tabs
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var name = tab.getAttribute('data-tab');
        tabs.forEach(function (t) {
          var active = t === tab;
          t.classList.toggle('active', active);
          t.setAttribute('aria-selected', String(active));
        });
        panes.forEach(function (p) {
          p.hidden = p.getAttribute('data-pane') !== name;
        });
      });
    });

    // Cerrar
    function closeSettings() {
      overlay.hidden = true;
      if (returnFocus && returnFocus.focus) { try { returnFocus.focus(); } catch (e) {} }
      returnFocus = null;
    }
    wrap.querySelector('#settings-close').addEventListener('click', closeSettings);
    wrap.querySelector('#settings-ok').addEventListener('click', closeSettings);
    wrap.addEventListener('click', function (e) { if (e.target === wrap) closeSettings(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !overlay.hidden) { e.preventDefault(); closeSettings(); }
    });

    updateThemeSelection();
    updateLangSelection();
    refreshThemeNames();
  }

  function updateThemeSelection() {
    var cur = getCurrentTheme();
    var cards = themeGrid.querySelectorAll('.theme-card');
    for (var i = 0; i < cards.length; i++) {
      var active = cards[i].getAttribute('data-theme-id') === cur;
      cards[i].classList.toggle('active', active);
      cards[i].setAttribute('aria-checked', String(active));
    }
  }

  function updateLangSelection() {
    var cur = getCurrentLang();
    var items = langList.querySelectorAll('.lang-item');
    for (var i = 0; i < items.length; i++) {
      var active = items[i].getAttribute('data-lang-id') === cur;
      items[i].classList.toggle('active', active);
      items[i].setAttribute('aria-checked', String(active));
    }
  }

  function refreshThemeNames() {
    var l = getCurrentLang();
    var cards = themeGrid.querySelectorAll('.theme-card');
    for (var i = 0; i < cards.length; i++) {
      var id = cards[i].getAttribute('data-theme-id');
      var theme = null;
      for (var j = 0; j < THEMES.length; j++) if (THEMES[j].id === id) { theme = THEMES[j]; break; }
      if (!theme) continue;
      var nameEl = cards[i].querySelector('.theme-name');
      if (nameEl) nameEl.textContent = theme.name[l] || theme.name.es;
    }
    // Re-traducir los textos del modal
    var st = document.getElementById('settings-title');
    if (st) st.textContent = t('settings.title', l);
    var tt1 = document.querySelector('.settings-tab[data-tab="appearance"]');
    var tt2 = document.querySelector('.settings-tab[data-tab="language"]');
    if (tt1) tt1.textContent = t('settings.tab.themes', l);
    if (tt2) tt2.textContent = t('settings.tab.lang', l);
    var h1 = document.getElementById('hint-themes');
    var h2 = document.getElementById('hint-lang');
    if (h1) h1.textContent = t('settings.hint.themes', l);
    if (h2) h2.textContent = t('settings.hint.lang', l);
    var ok = document.getElementById('settings-ok');
    if (ok) ok.textContent = t('settings.close', l);
  }

  function openSettings() {
    buildModal();
    returnFocus = document.activeElement;
    overlay.hidden = false;
    refreshThemeNames();
    updateThemeSelection();
    updateLangSelection();
    // Enfocar el tab activo
    setTimeout(function () {
      var first = overlay.querySelector('.settings-tab.active');
      if (first) { try { first.focus(); } catch (e) {} }
    }, 30);
  }

  // =========================================================
  // Wire-up del botón ⚙ y API pública
  // =========================================================
  function wireButton() {
    var btn = document.getElementById('btn-settings');
    if (btn && !btn._afSettingsWired) {
      btn._afSettingsWired = true;
      btn.addEventListener('click', openSettings);
    }
  }

  window._afOpenSettings = openSettings;
  window._afApplyTheme   = applyTheme;
  window._afApplyLang    = applyLang;
  window._afGetLang      = getCurrentLang;
  window._afGetTheme     = getCurrentTheme;
  window._afI18n         = { t: t, strings: STRINGS };

  // =========================================================
  // Init
  // =========================================================
  function init() {
    // Tema
    var th = getCurrentTheme();
    // Compatibilidad: si venía guardado 'dark'/'light'/'contrast' lo respetamos.
    document.documentElement.setAttribute('data-theme', th);

    // Idioma
    var lg = getCurrentLang();
    document.documentElement.setAttribute('lang', lg);
    translateUI(lg);

    // Botón ⚙ (por si aún no está)
    wireButton();
    // Si aparece más tarde (por navegación), reintentar
    var mo = new MutationObserver(wireButton);
    mo.observe(document.body, { childList: true, subtree: true });

  
  // =========================================================
  // --- AF-I18N-EXT-V1 ---
  // Extensión: labels, secciones y valores comunes
  // =========================================================
  (function extendI18n() {
    var EXTRA = {
      es: {
        // Labels de propiedades
        'prop.dominio': 'Dominio',
        'prop.imagen': 'Imagen',
        'prop.ceroX': 'Ceros (x)',
        'prop.ceroY': 'Ordenada (y)',
        'prop.monotonia': 'Monotonía',
        'prop.paridad': 'Paridad',
        'prop.inyectiva': 'Inyectiva',
        'prop.periodo': 'Período',
        'prop.amplitud': 'Amplitud',
        'prop.asintotas': 'Asíntotas',
        'prop.inversa': 'Inversa',
        'prop.puntoCaracteristico': 'Punto clave',
        'prop.extremos': 'Extremos',
        // Secciones
        'section.basicas': 'Básicas',
        'section.analisis': 'Análisis',
        'section.comportamiento': 'Comportamiento',
        'section.especiales': 'Especiales',
        // Valores comunes
        'val.Ninguno': 'Ninguno',
        'val.Ninguna': 'Ninguna',
        'val.Sí': 'Sí',
        'val.No': 'No',
        'val.Par': 'Par',
        'val.Impar': 'Impar',
        'val.No periódica': 'No periódica',
        'val.Constante': 'Constante'
      },
      en: {
        'prop.dominio': 'Domain',
        'prop.imagen': 'Range',
        'prop.ceroX': 'Zeros (x)',
        'prop.ceroY': 'Y-intercept',
        'prop.monotonia': 'Monotonicity',
        'prop.paridad': 'Parity',
        'prop.inyectiva': 'Injective',
        'prop.periodo': 'Period',
        'prop.amplitud': 'Amplitude',
        'prop.asintotas': 'Asymptotes',
        'prop.inversa': 'Inverse',
        'prop.puntoCaracteristico': 'Key point',
        'prop.extremos': 'Extrema',
        'section.basicas': 'Basics',
        'section.analisis': 'Analysis',
        'section.comportamiento': 'Behavior',
        'section.especiales': 'Special',
        'val.Ninguno': 'None',
        'val.Ninguna': 'None',
        'val.Sí': 'Yes',
        'val.No': 'No',
        'val.Par': 'Even',
        'val.Impar': 'Odd',
        'val.No periódica': 'Not periodic',
        'val.Constante': 'Constant'
      },
      pt: {
        'prop.dominio': 'Domínio',
        'prop.imagen': 'Imagem',
        'prop.ceroX': 'Zeros (x)',
        'prop.ceroY': 'Ordenada (y)',
        'prop.monotonia': 'Monotonia',
        'prop.paridad': 'Paridade',
        'prop.inyectiva': 'Injetiva',
        'prop.periodo': 'Período',
        'prop.amplitud': 'Amplitude',
        'prop.asintotas': 'Assíntotas',
        'prop.inversa': 'Inversa',
        'prop.puntoCaracteristico': 'Ponto-chave',
        'prop.extremos': 'Extremos',
        'section.basicas': 'Básicas',
        'section.analisis': 'Análise',
        'section.comportamiento': 'Comportamento',
        'section.especiales': 'Especiais',
        'val.Ninguno': 'Nenhum',
        'val.Ninguna': 'Nenhuma',
        'val.Sí': 'Sim',
        'val.No': 'Não',
        'val.Par': 'Par',
        'val.Impar': 'Ímpar',
        'val.No periódica': 'Não periódica',
        'val.Constante': 'Constante'
      },
      fr: {
        'prop.dominio': 'Domaine',
        'prop.imagen': 'Image',
        'prop.ceroX': 'Zéros (x)',
        'prop.ceroY': 'Ordonnée (y)',
        'prop.monotonia': 'Monotonie',
        'prop.paridad': 'Parité',
        'prop.inyectiva': 'Injective',
        'prop.periodo': 'Période',
        'prop.amplitud': 'Amplitude',
        'prop.asintotas': 'Asymptotes',
        'prop.inversa': 'Réciproque',
        'prop.puntoCaracteristico': 'Point clé',
        'prop.extremos': 'Extrema',
        'section.basicas': 'Bases',
        'section.analisis': 'Analyse',
        'section.comportamiento': 'Comportement',
        'section.especiales': 'Spéciales',
        'val.Ninguno': 'Aucun',
        'val.Ninguna': 'Aucune',
        'val.Sí': 'Oui',
        'val.No': 'Non',
        'val.Par': 'Paire',
        'val.Impar': 'Impaire',
        'val.No periódica': 'Non périodique',
        'val.Constante': 'Constante'
      },
      de: {
        'prop.dominio': 'Definitionsbereich',
        'prop.imagen': 'Wertebereich',
        'prop.ceroX': 'Nullstellen (x)',
        'prop.ceroY': 'Y-Achsenabschnitt',
        'prop.monotonia': 'Monotonie',
        'prop.paridad': 'Parität',
        'prop.inyectiva': 'Injektiv',
        'prop.periodo': 'Periode',
        'prop.amplitud': 'Amplitude',
        'prop.asintotas': 'Asymptoten',
        'prop.inversa': 'Umkehrfunktion',
        'prop.puntoCaracteristico': 'Schlüsselpunkt',
        'prop.extremos': 'Extrema',
        'section.basicas': 'Grundlagen',
        'section.analisis': 'Analyse',
        'section.comportamiento': 'Verhalten',
        'section.especiales': 'Speziell',
        'val.Ninguno': 'Keine',
        'val.Ninguna': 'Keine',
        'val.Sí': 'Ja',
        'val.No': 'Nein',
        'val.Par': 'Gerade',
        'val.Impar': 'Ungerade',
        'val.No periódica': 'Nicht periodisch',
        'val.Constante': 'Konstant'
      },
      it: {
        'prop.dominio': 'Dominio',
        'prop.imagen': 'Immagine',
        'prop.ceroX': 'Zeri (x)',
        'prop.ceroY': 'Ordinata (y)',
        'prop.monotonia': 'Monotonia',
        'prop.paridad': 'Parità',
        'prop.inyectiva': 'Iniettiva',
        'prop.periodo': 'Periodo',
        'prop.amplitud': 'Ampiezza',
        'prop.asintotas': 'Asintoti',
        'prop.inversa': 'Inversa',
        'prop.puntoCaracteristico': 'Punto chiave',
        'prop.extremos': 'Estremi',
        'section.basicas': 'Base',
        'section.analisis': 'Analisi',
        'section.comportamiento': 'Comportamento',
        'section.especiales': 'Speciali',
        'val.Ninguno': 'Nessuno',
        'val.Ninguna': 'Nessuna',
        'val.Sí': 'Sì',
        'val.No': 'No',
        'val.Par': 'Pari',
        'val.Impar': 'Dispari',
        'val.No periódica': 'Non periodica',
        'val.Constante': 'Costante'
      }
    };

    for (var l in EXTRA) if (EXTRA.hasOwnProperty(l)) {
      if (!STRINGS[l]) STRINGS[l] = {};
      for (var k in EXTRA[l]) if (EXTRA[l].hasOwnProperty(k)) {
        STRINGS[l][k] = EXTRA[l][k];
      }
    }
  })();

  // API extendida
  window._afI18n = window._afI18n || {};
  window._afI18n.label = function (key, lang) {
    var l = lang || getCurrentLang();
    var k = 'prop.' + key;
    if (STRINGS[l] && STRINGS[l][k]) return STRINGS[l][k];
    if (STRINGS.es && STRINGS.es[k]) return STRINGS.es[k];
    return key;
  };
  window._afI18n.section = function (key, lang) {
    var l = lang || getCurrentLang();
    var k = 'section.' + key;
    if (STRINGS[l] && STRINGS[l][k]) return STRINGS[l][k];
    if (STRINGS.es && STRINGS.es[k]) return STRINGS.es[k];
    return key;
  };
  window._afI18n.value = function (str, lang) {
    if (str == null) return str;
    var l = lang || getCurrentLang();
    var k = 'val.' + str;
    if (STRINGS[l] && STRINGS[l][k]) return STRINGS[l][k];
    if (STRINGS.es && STRINGS.es[k]) return STRINGS.es[k];
    return str;
  };
  window._afI18n.currentLang = getCurrentLang;

  document.documentElement.classList.add('settings-ready');
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init);
  else
    init();
})();
