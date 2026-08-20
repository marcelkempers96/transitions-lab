/* Transitions Lab shared behaviour. Link once per page, before the closing body tag. */
document.addEventListener('DOMContentLoaded', function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Nav dropdowns: native <details>/<summary> as an accordion.
  //    We take over the toggle entirely (preventDefault) so the
  //    browser can't race us: close every group, then open the one
  //    that was clicked if it was previously closed. Guaranteed
  //    single-open state on desktop and mobile alike.
  var details = document.querySelectorAll('.nav details.nav-group');
  details.forEach(function (d) {
    var summary = d.querySelector('summary');
    if (!summary) return;
    summary.addEventListener('click', function (e) {
      e.preventDefault();
      var wasOpen = d.open;
      // Close everything.
      details.forEach(function (o) { o.open = false; });
      // Reopen this one if it was closed.
      if (!wasOpen) d.open = true;
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
