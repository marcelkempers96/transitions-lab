/* Transitions Lab shared behaviour. Link once per page, before the closing body tag. */
document.addEventListener('DOMContentLoaded', function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Mobile menu toggle ──────────────────────────────────────
  var burger = document.querySelector('.nav-toggle');
  var menu = document.getElementById('menu');
  if (burger && menu) {
    burger.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      burger.setAttribute('aria-expanded', open);
    });
    // Close mobile menu when a leaf link (not a dropdown label) is clicked.
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { menu.classList.remove('open'); });
    });
  }

  // ── Click-to-open dropdowns in the nav ──────────────────────
  var groups = document.querySelectorAll('.nav .nav-group');
  groups.forEach(function (g) {
    var label = g.querySelector('.nav-label');
    if (!label) return;
    label.setAttribute('role', 'button');
    label.setAttribute('tabindex', '0');
    label.setAttribute('aria-expanded', 'false');
    label.setAttribute('aria-haspopup', 'true');

    function toggle() {
      var willOpen = !g.classList.contains('open');
      // Close every other open group first
      groups.forEach(function (o) {
        if (o !== g) { o.classList.remove('open'); o.querySelector('.nav-label').setAttribute('aria-expanded', 'false'); }
      });
      g.classList.toggle('open', willOpen);
      label.setAttribute('aria-expanded', willOpen);
    }

    label.addEventListener('click', function (e) {
      e.stopPropagation();
      toggle();
    });
    label.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      if (e.key === 'Escape') { g.classList.remove('open'); label.setAttribute('aria-expanded', 'false'); }
    });
  });
  // Close any open dropdown when clicking outside the nav
  document.addEventListener('click', function (e) {
    if (e.target.closest('.nav .nav-group')) return;
    groups.forEach(function (g) {
      g.classList.remove('open');
      var l = g.querySelector('.nav-label');
      if (l) l.setAttribute('aria-expanded', 'false');
    });
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
