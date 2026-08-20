/* Transitions Lab shared behaviour. Link once per page, before the closing body tag. */
document.addEventListener('DOMContentLoaded', function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Nav dropdowns: single-open accordion, enforced three ways.
  //    (1) MutationObserver on the [open] attribute of each <details> is
  //        the ground truth. It fires whenever [open] changes, no matter
  //        how — native tap, keyboard, script, dev tools, anything. When
  //        a group opens, every sibling's [open] attribute is removed.
  //    (2) A `toggle` event listener is the fast path on browsers that
  //        fire it reliably (most of them).
  //    (3) A `click` handler on each <summary> preempts the browser's
  //        native toggle on iOS Safari, where preventDefault on the
  //        summary click IS required for the [open] change to route
  //        through script rather than through the browser's own path.
  //    Any one of the three is sufficient. Together they are bulletproof.
  var details = document.querySelectorAll('.nav details.nav-group');
  var enforcing = false;
  var enforceSingle = function (winner) {
    if (enforcing) return;
    enforcing = true;
    details.forEach(function (o) {
      if (o !== winner && o.hasAttribute('open')) o.removeAttribute('open');
    });
    enforcing = false;
  };

  // (1) MutationObserver — ground truth.
  if ('MutationObserver' in window) {
    details.forEach(function (d) {
      var mo = new MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
          if (mutations[i].attributeName === 'open' && d.hasAttribute('open')) {
            enforceSingle(d);
            break;
          }
        }
      });
      mo.observe(d, { attributes: true, attributeFilter: ['open'] });
    });
  }

  // (2) toggle event — fast path.
  details.forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (d.open) enforceSingle(d);
    });
  });

  // (3) click on <summary> — manual toggle for iOS Safari reliability.
  details.forEach(function (d) {
    var s = d.querySelector('summary');
    if (!s) return;
    s.addEventListener('click', function (e) {
      e.preventDefault();
      var wasOpen = d.hasAttribute('open');
      // Close everyone first, then open this one if it was closed.
      enforcing = true;
      details.forEach(function (o) { o.removeAttribute('open'); });
      enforcing = false;
      if (!wasOpen) d.setAttribute('open', '');
    });
  });

  // ── Mobile menu toggle ──────────────────────────────────────
  var burger = document.querySelector('.nav-toggle');
  var menu = document.getElementById('menu');
  if (burger && menu) {
    burger.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      burger.setAttribute('aria-expanded', open);
      // If closing the burger menu, also collapse every nav group.
      if (!open) details.forEach(function (d) { d.open = false; });
    });
    // Close mobile menu (and all groups) when a leaf link is clicked.
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        menu.classList.remove('open');
        details.forEach(function (d) { d.open = false; });
      });
    });
  }

  // Click outside the nav → close any open dropdowns
  document.addEventListener('click', function (e) {
    if (e.target.closest('.nav details.nav-group')) return;
    if (e.target.closest('.nav-toggle')) return;
    details.forEach(function (d) { d.open = false; });
  });

  // ── Scroll reveal (big text drifts up + fades in) ───────────
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal:not(.in)').forEach(function (el) { io.observe(el); });
  } else {
    // Fallback: show everything if IO unsupported or motion is reduced
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
  }

  // ── Cursor-following glow in the hero ───────────────────────
  var hero = document.querySelector('.hero');
  if (hero && !reduce) {
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      hero.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      hero.style.setProperty('--my', (e.clientY - r.top) + 'px');
      hero.classList.add('lit');
    });
    hero.addEventListener('pointerleave', function () {
      hero.classList.remove('lit');
    });
  }

  // ── Cursor-tracking glow on the stance section ──────────────
  var stance = document.querySelector('.stance');
  if (stance) {
    stance.addEventListener('pointermove', function (e) {
      var r = stance.getBoundingClientRect();
      stance.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      stance.style.setProperty('--my', (e.clientY - r.top) + 'px');
      stance.classList.add('lit');
    });
    stance.addEventListener('pointerleave', function () {
      stance.classList.remove('lit');
    });
  }
});
