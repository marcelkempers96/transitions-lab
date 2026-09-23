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

/* Quote carousel: rotates <blockquote class="quote-slide"> children inside
   .quote-carousel. Auto-advances every data-autoplay ms (default 6000);
   pauses on hover or when the pointer enters the carousel; wraps prev/
   next around; syncs .quote-dots for tab-navigation. */
(function () {
  var carousels = document.querySelectorAll(".quote-carousel");
  if (!carousels.length) return;

  carousels.forEach(function (c) {
    var slides = c.querySelectorAll(".quote-slide");
    if (slides.length < 2) return;
    var dots = c.querySelector(".quote-dots");
    var prev = c.querySelector(".quote-prev");
    var next = c.querySelector(".quote-next");
    var i = 0;
    var timer = null;
    var delay = parseInt(c.getAttribute("data-autoplay"), 10) || 6000;

    if (dots) {
      for (var k = 0; k < slides.length; k++) {
        var dot = document.createElement("button");
        dot.type = "button";
        dot.className = "quote-dot" + (k === 0 ? " is-active" : "");
        dot.setAttribute("role", "tab");
        dot.setAttribute("aria-label", "Quote " + (k + 1));
        dot.dataset.i = k;
        dots.appendChild(dot);
      }
    }

    function show(n) {
      i = ((n % slides.length) + slides.length) % slides.length;
      slides.forEach(function (s, idx) { s.classList.toggle("is-active", idx === i); });
      if (dots) dots.querySelectorAll(".quote-dot").forEach(function (d, idx) {
        d.classList.toggle("is-active", idx === i);
      });
    }
    function tick() { show(i + 1); }
    function start() { stop(); timer = setInterval(tick, delay); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }

    if (prev) prev.addEventListener("click", function () { show(i - 1); start(); });
    if (next) next.addEventListener("click", function () { show(i + 1); start(); });
    if (dots) dots.addEventListener("click", function (e) {
      var d = e.target.closest(".quote-dot"); if (!d) return;
      show(parseInt(d.dataset.i, 10)); start();
    });
    c.addEventListener("mouseenter", stop);
    c.addEventListener("mouseleave", start);
    c.addEventListener("focusin", stop);
    c.addEventListener("focusout", start);
    start();
  });
})();

/* Share buttons: writes into a hidden `data-share-url` template so the
   LinkedIn / X / Copy buttons carry the current page URL and title.
   Copy shows a brief "Copied" tooltip; failure falls back gracefully. */
(function () {
  var bars = document.querySelectorAll(".article-share");
  if (!bars.length) return;
  var url = location.href.split("#")[0];
  var title = document.title || "";
  bars.forEach(function (bar) {
    var li = bar.querySelector(".share-linkedin");
    var tw = bar.querySelector(".share-twitter");
    var cp = bar.querySelector(".share-copy");
    if (li) li.href = "https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(url);
    if (tw) tw.href = "https://twitter.com/intent/tweet?url=" + encodeURIComponent(url) + "&text=" + encodeURIComponent(title);
    if (cp) cp.addEventListener("click", function (e) {
      e.preventDefault();
      var done = function () {
        cp.classList.add("is-copied");
        setTimeout(function () { cp.classList.remove("is-copied"); }, 1400);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done, done);
      } else {
        var ta = document.createElement("textarea");
        ta.value = url; document.body.appendChild(ta);
        ta.select(); try { document.execCommand("copy"); } catch(_) {}
        document.body.removeChild(ta);
        done();
      }
    });
  });
})();

/* Scroll-next arrow: injects a small circular down-arrow button at
   the bottom-centre of each top-level <section> on the home page,
   and smooth-scrolls to the next sibling section on click. Skips
   the very last section so there is no arrow pointing into the
   footer. On other pages the effect is opt-in via body[data-page]
   whitelist below. */
(function () {
  var page = document.body.getAttribute("data-page") || "";
  var pageAllowed = { index: true };
  if (!pageAllowed[page]) return;

  // Collect all body-level sections (skips the flash banner because
  // it is an <a>, and skips <footer>).
  var sections = Array.prototype.filter.call(
    document.querySelectorAll("body > section"),
    function (s) {
      // Skip elements that are not visually a scroll target.
      if (s.classList.contains("section-hidden")) return false;
      return true;
    }
  );
  if (sections.length < 2) return;

  var svg =
    '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" ' +
    'fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M6 9l6 6 6-6"/></svg>';

  sections.forEach(function (sec, i) {
    if (i === sections.length - 1) return; // last section — no button
    // Do not stack a second button if one is already present.
    if (sec.querySelector(":scope > .scroll-next")) return;

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "scroll-next";
    btn.setAttribute("aria-label", "Scroll to next section");
    btn.innerHTML = svg;
    sec.appendChild(btn);

    btn.addEventListener("click", function (e) {
      e.preventDefault();
      var target = sections[i + 1];
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      // Move focus lightly so keyboard users land on the new
      // section without a scroll flash.
      if (typeof target.focus === "function") {
        var prevTab = target.getAttribute("tabindex");
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
        if (prevTab === null) {
          setTimeout(function () { target.removeAttribute("tabindex"); }, 400);
        }
      }
    });
  });
})();
