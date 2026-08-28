/* Transitions Lab shared behaviour. Link once per page, before the closing body tag. */
document.addEventListener('DOMContentLoaded', function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Nav dropdowns: single-open accordion.
  //    ONE document-level click listener in the CAPTURE phase intercepts
  //    every tap on a nav summary before the browser can run its native
  //    <details> toggle. We call preventDefault + stopPropagation, then
  //    manually manage [open] state: close every group, then open the one
  //    that was tapped if it was previously closed. No fallbacks to race
  //    against each other; one path, always the same behaviour.
  document.addEventListener('click', function (e) {
    var summary = e.target && e.target.closest && e.target.closest('.nav details.nav-group > summary');
    if (!summary) return;
    var tapped = summary.parentNode;
    e.preventDefault();
    e.stopPropagation();
    var wasOpen = tapped.hasAttribute('open');
    var all = document.querySelectorAll('.nav details.nav-group');
    for (var i = 0; i < all.length; i++) all[i].removeAttribute('open');
    if (!wasOpen) tapped.setAttribute('open', '');
  }, true);

  var details = document.querySelectorAll('.nav details.nav-group');

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

  // ── Typewriter — hero headline then subhead ────────────────
  //     Reads target text from data-text on each element, types it
  //     one character at a time, hides the cursor when done. On
  //     reduced-motion, prints the final text immediately.
  var headline = document.getElementById('hero-headline');
  var subhead = document.getElementById('hero-subhead');
  var cursor = document.getElementById('hero-cursor');
  if (headline) {
    var hText = headline.getAttribute('data-text') || '';
    var sText = subhead ? (subhead.getAttribute('data-text') || '') : '';
    if (reduce) {
      headline.textContent = hText;
      if (subhead) subhead.textContent = sText;
      if (cursor) cursor.style.display = 'none';
    } else {
      var hi = 0, si = 0;
      var typeSub = function () {
        if (si <= sText.length) {
          subhead.textContent = sText.slice(0, si);
          si++;
          setTimeout(typeSub, 18);
        } else if (cursor) {
          cursor.style.display = 'none';
        }
      };
      var typeHead = function () {
        if (hi <= hText.length) {
          headline.textContent = hText.slice(0, hi);
          hi++;
          setTimeout(typeHead, 70);
        } else if (subhead && sText) {
          setTimeout(typeSub, 350);
        } else if (cursor) {
          cursor.style.display = 'none';
        }
      };
      typeHead();
    }
  }
});

/* ── Articles filter (on /articles) ──
   Chip rows for category / geography / month. One active chip per group;
   the "All" chip clears that group. An item is shown when every group
   either has "All" selected, or the item matches the selected value. */
(function () {
  var bar = document.querySelector(".article-filter");
  if (!bar) return;
  var listSel = bar.getAttribute("data-filter-target") || ".article-list";
  var list = document.querySelector(listSel);
  if (!list) return;
  var items = list.querySelectorAll(".article-item");
  var empty = bar.querySelector(".filter-empty");
  var resetBtn = bar.querySelector(".filter-reset");

  function apply() {
    var filters = {};
    bar.querySelectorAll(".filter-group").forEach(function (g) {
      var group = g.getAttribute("data-group");
      var active = g.querySelector(".filter-chip.is-active");
      filters[group] = active ? active.getAttribute("data-value") : "";
    });

    var shown = 0;
    items.forEach(function (item) {
      var ok = true;
      Object.keys(filters).forEach(function (group) {
        var wanted = filters[group];
        if (!wanted) return;
        var actual = item.getAttribute("data-" + (group === "month" ? "month" : group === "geography" ? "geography" : "category"));
        if (actual !== wanted) ok = false;
      });
      item.setAttribute("data-hidden", ok ? "false" : "true");
      if (ok) shown++;
    });

    if (empty) empty.hidden = shown > 0;
  }

  bar.querySelectorAll(".filter-group").forEach(function (g) {
    g.addEventListener("click", function (e) {
      var chip = e.target.closest(".filter-chip");
      if (!chip) return;
      g.querySelectorAll(".filter-chip").forEach(function (c) { c.classList.remove("is-active"); });
      chip.classList.add("is-active");
      apply();
    });
  });

  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      bar.querySelectorAll(".filter-group").forEach(function (g) {
        g.querySelectorAll(".filter-chip").forEach(function (c) { c.classList.remove("is-active"); });
        var allChip = g.querySelector(".filter-chip.is-all");
        if (allChip) allChip.classList.add("is-active");
      });
      apply();
    });
  }
})();
