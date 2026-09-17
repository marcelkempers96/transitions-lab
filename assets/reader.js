/* Reader preferences: serif toggle, font size, background theme.
   State lives on <html data-theme|data-font|data-size> and persists
   in localStorage so the choice follows the reader across pages.
   Applied inline in the head (see FLASH_INIT in _build.py) to avoid
   a first-paint flicker. The toolbar buttons wire into the same
   apply() calls; aria-pressed reflects current state. */
(function () {
  var html = document.documentElement;
  var KEY_THEME = 'tl_r_theme_v1';
  var KEY_FONT  = 'tl_r_font_v1';
  var KEY_SIZE  = 'tl_r_size_v1';

  function safeGet(k, d) { try { return localStorage.getItem(k) || d; } catch (_) { return d; } }
  function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (_) {} }

  function syncPressed(attr, value) {
    var nodes = document.querySelectorAll('[' + attr + ']');
    for (var i = 0; i < nodes.length; i++) {
      var b = nodes[i];
      b.setAttribute('aria-pressed', b.getAttribute(attr) === value ? 'true' : 'false');
    }
  }

  var apply = {
    theme: function (v) {
      if (v !== 'light' && v !== 'warm' && v !== 'dark') v = 'warm';
      html.setAttribute('data-theme', v);
      safeSet(KEY_THEME, v);
      syncPressed('data-set-theme', v);
    },
    font: function (v) {
      if (v !== 'sans' && v !== 'serif') v = 'sans';
      html.setAttribute('data-font', v);
      safeSet(KEY_FONT, v);
      syncPressed('data-set-font', v);
    },
    size: function (v) {
      var n = parseInt(v, 10); if (isNaN(n)) n = 0;
      if (n < -1) n = -1; if (n > 2) n = 2;
      var s = String(n);
      html.setAttribute('data-size', s);
      safeSet(KEY_SIZE, s);
    }
  };

  // Restore on DOM ready (head-inline init already set the attrs; this
  // re-syncs aria-pressed after the toolbar exists in the DOM).
  document.addEventListener('DOMContentLoaded', function () {
    apply.theme(safeGet(KEY_THEME, 'warm'));
    apply.font(safeGet(KEY_FONT, 'sans'));
    apply.size(safeGet(KEY_SIZE, '0'));
  });

  // Delegated click handler for toolbar buttons.
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-set-theme],[data-set-font],[data-size-step]');
    if (!t) return;
    e.preventDefault();
    if (t.hasAttribute('data-set-theme')) apply.theme(t.getAttribute('data-set-theme'));
    else if (t.hasAttribute('data-set-font')) apply.font(t.getAttribute('data-set-font'));
    else if (t.hasAttribute('data-size-step')) {
      var step = parseInt(t.getAttribute('data-size-step'), 10) || 0;
      var cur = parseInt(safeGet(KEY_SIZE, '0'), 10);
      apply.size(String(cur + step));
    }
  });

  // Expose for the consent module or other scripts.
  window.tlReader = apply;
})();
