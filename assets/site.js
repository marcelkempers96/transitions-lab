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

    // Serve-grid cards: on mobile the CSS starts them off-screen right
    // and translates them into place when this observer flags them
    // in-view. Use a fresh observer with a slightly earlier threshold
    // so the slide-in triggers before the card is fully on screen.
    if (window.matchMedia && window.matchMedia('(max-width: 860px)').matches) {
      var serveIo = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in-view');
            serveIo.unobserve(entry.target);
          }
        });
      }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
      document.querySelectorAll('.serve-grid a').forEach(function (el, i) {
        // Stagger the slide-in so the row does not fire in one block.
        el.style.transitionDelay = (i * 70) + 'ms';
        serveIo.observe(el);
      });
    } else {
      // Desktop: skip the entrance transform, cards render in place.
      document.querySelectorAll('.serve-grid a').forEach(function (el) {
        el.classList.add('is-in-view');
      });
    }
  } else {
    // Fallback: show everything if IO unsupported or motion is reduced
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
    document.querySelectorAll('.serve-grid a').forEach(function (el) { el.classList.add('is-in-view'); });
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

/* Floating scroll-next arrow: one fixed-position circular button
   pinned at the bottom-centre of the viewport that always jumps
   to the next top-level <section> on the page. Its target is
   recomputed on scroll from the current scroll position so a
   click always advances to whichever section is next below.
   Hides automatically as the reader approaches the footer.
   Adapts light/dark tone to whichever section is currently
   under it, using each section's declared colour class. */
(function () {
  var page = document.body.getAttribute("data-page") || "";
  // Enabled on the home page, and on every case-study and insight
  // article. Every other page (programme pages, /about, /contact,
  // etc.) skips the floating arrow.
  var pageAllowed =
    page === "index" ||
    page.indexOf("case-") === 0 ||
    page.indexOf("insight-") === 0;
  if (!pageAllowed) return;

  // Article and case-study pages have almost everything wrapped in
  // one big <section class="light"> with all the prose inside, so
  // 'next section' would jump straight from the hero to the footer.
  // On article pages we step through the h2s inside .prose instead,
  // treating each written section as a stop. Non-article pages keep
  // the body > section pattern from the home page.
  var isArticlePage = page.indexOf("case-") === 0 || page.indexOf("insight-") === 0;
  var sections;
  if (isArticlePage) {
    sections = [];
    var heroSec = document.querySelector('body > section.page-hero');
    if (heroSec) sections.push(heroSec);
    var proseH2s = document.querySelectorAll('.prose > h2');
    for (var pi = 0; pi < proseH2s.length; pi++) sections.push(proseH2s[pi]);
    var ctaSec = document.querySelector('body > section.article-cta-band');
    if (ctaSec) sections.push(ctaSec);
  } else {
    sections = Array.prototype.filter.call(
      document.querySelectorAll("body > section"),
      function (s) { return !s.classList.contains("section-hidden"); }
    );
  }
  if (sections.length < 2) return;
  var footer = document.querySelector("body > footer.site");

  var svg =
    '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" ' +
    'fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M6 9l6 6 6-6"/></svg>';

  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "scroll-next scroll-next--fixed";
  btn.setAttribute("aria-label", "Scroll to next section");
  btn.innerHTML = svg;
  document.body.appendChild(btn);

  // Classes on <section> that mean "dark ground" — flip the arrow
  // to cream on ink so it stays visible against the video and the
  // ink-tinted sections.
  var DARK_CLASSES = [
    "hero", "statement", "section-ink", "section-forest",
    "section-cobalt", "section-plum"
  ];
  function isDark(sec) {
    if (!sec) return false;
    for (var i = 0; i < DARK_CLASSES.length; i++) {
      if (sec.classList.contains(DARK_CLASSES[i])) return true;
    }
    return false;
  }

  function nextTarget() {
    // Find the first section whose top sits below the current
    // scroll position (plus a small tolerance for anchored headers).
    var y = window.scrollY + 80;
    for (var i = 0; i < sections.length; i++) {
      var top = sections[i].offsetTop;
      if (top > y + 40) return sections[i];
    }
    return null;
  }

  function currentSection() {
    var probe = window.scrollY + window.innerHeight - 90;
    var last = sections[0];
    for (var i = 0; i < sections.length; i++) {
      var top = sections[i].offsetTop;
      if (top <= probe) last = sections[i];
    }
    return last;
  }

  function update() {
    // Hide as we approach the footer, so the arrow does not linger
    // over the credits.
    var hide = false;
    if (footer) {
      var fr = footer.getBoundingClientRect();
      if (fr.top < window.innerHeight * 0.85) hide = true;
    } else if (!nextTarget()) {
      hide = true;
    }
    btn.classList.toggle("is-hidden", hide);

    // Tint according to whichever section currently sits under it.
    var cur = currentSection();
    btn.classList.toggle("scroll-next--on-dark", isDark(cur));
  }

  btn.addEventListener("click", function (e) {
    e.preventDefault();
    var target = nextTarget();
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    if (typeof target.focus === "function") {
      var prevTab = target.getAttribute("tabindex");
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
      if (prevTab === null) {
        setTimeout(function () { target.removeAttribute("tabindex"); }, 400);
      }
    }
  });

  var raf = null;
  function schedule() {
    if (raf) return;
    raf = window.requestAnimationFrame(function () {
      raf = null;
      update();
    });
  }
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  update();
})();
