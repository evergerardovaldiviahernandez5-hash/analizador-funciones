/* =========================================================
   input-validation.js — v2 (conservadora)
   ---------------------------------------------------------
   Sólo verifica cosas seguras:
     · longitud
     · patrones peligrosos (eval, on*=, etc.)
     · balance de paréntesis
   NO usa math.js ni evalString → no hay falsos positivos.
   ========================================================= */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  if (window._afInputValidInit) return;
  window._afInputValidInit = true;

  var DEBOUNCE_MS = 220;
  var MAX_LEN     = 200;

  var DANGER = [
    { re: /\beval\b/i,             msg: 'eval no permitido' },
    { re: /\bFunction\b/,          msg: 'Function no permitido' },
    { re: /<[a-z]/i,               msg: 'HTML no permitido' },
    { re: /javascript:/i,          msg: 'javascript: no permitido' },
    { re: /__proto__/,             msg: 'acceso a prototipo no permitido' },
    { re: /\bon[a-z]+\s*=/i,       msg: 'atributos on* no permitidos' }
  ];

  function validate(value) {
    // Kill switch global
    if (window._afValidationEnabled === false) return { ok: true };

    var v = String(value == null ? '' : value).trim();
    if (v === '') return { ok: true, empty: true };

    if (v.length > MAX_LEN)
      return { ok: false, msg: 'Máximo ' + MAX_LEN + ' caracteres' };

    for (var i = 0; i < DANGER.length; i++) {
      if (DANGER[i].re.test(v)) return { ok: false, msg: DANGER[i].msg };
    }

    // Balance de paréntesis
    var depth = 0;
    for (var j = 0; j < v.length; j++) {
      var c = v[j];
      if (c === '(' || c === '[') depth++;
      else if (c === ')' || c === ']') {
        if (--depth < 0) return { ok: false, msg: 'Paréntesis desbalanceados' };
      }
    }
    if (depth > 0) return { ok: false, msg: 'Paréntesis sin cerrar' };

    return { ok: true };
  }

  function setState(input, result) {
    var field = input.closest && input.closest('.field');
    if (!field) return;

    var valid   = result.ok === true && !result.empty;
    var invalid = result.ok === false;

    field.classList.toggle('af-field-ok',  valid);
    field.classList.toggle('af-field-bad', invalid);
    input.classList.toggle('af-input-error', invalid);

    // Marca ✓
    var mark = field.querySelector('.af-ok-mark');
    if (valid) {
      if (!mark) {
        mark = document.createElement('span');
        mark.className = 'af-ok-mark';
        mark.setAttribute('aria-hidden', 'true');
        mark.textContent = '✓';
        field.appendChild(mark);
      }
      mark.hidden = false;
    } else if (mark) {
      mark.hidden = true;
    }

    // Burbuja de error
    var bubble = field.querySelector('.af-field-error');
    if (invalid) {
      if (!bubble) {
        bubble = document.createElement('div');
        bubble.className = 'af-field-error';
        field.appendChild(bubble);
      }
      bubble.textContent = result.msg || 'Entrada inválida';
      bubble.hidden = false;
      input.setAttribute('aria-invalid', 'true');
      input.title = result.msg || '';
    } else {
      if (bubble) { bubble.hidden = true; bubble.textContent = ''; }
      input.removeAttribute('aria-invalid');
      input.title = '';
    }
  }

  function attach(input) {
    if (!input || input._afValidated) return;
    input._afValidated = true;

    var timer = null;
    function run() {
      if (!input.isConnected) return;
      setState(input, validate(input.value));
    }
    function onInput() {
      clearTimeout(timer);
      timer = setTimeout(run, DEBOUNCE_MS);
    }
    input.addEventListener('input', onInput);
    input.addEventListener('blur', run);
    input.addEventListener('paste', function () { setTimeout(onInput, 0); });
    if (input.value) run();
  }

  function scanAll(root) {
    var list = (root || document).querySelectorAll(
      '#module-container input[data-key][type="text"]'
    );
    for (var i = 0; i < list.length; i++) attach(list[i]);
  }

  function watch() {
    if (typeof MutationObserver === 'undefined') return;
    var container = document.getElementById('module-container');
    if (!container) return;
    var obs = new MutationObserver(function () { scanAll(container); });
    obs.observe(container, { childList: true, subtree: true });
    scanAll(container);
  }

  // Bloqueo de Enter si hay error
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    var t = e.target;
    if (!t || t.tagName !== 'INPUT' || t.type !== 'text') return;
    if (t.classList.contains('af-input-error')) {
      e.preventDefault();
      e.stopPropagation();
      if (window.CoreUtils && window.CoreUtils.announce)
        window.CoreUtils.announce('Entrada inválida, revisá el campo resaltado.');
    }
  }, true);

  window._afValidateInput = validate;

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', watch);
  else
    watch();

  document.documentElement.classList.add('input-validation-ready');
})();
