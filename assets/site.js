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

/* ── Articles filter + pagination (on /articles) ──
   Chip rows for category / geography / month. One active chip per group;
   the "All" chip clears that group. An item is shown when every group
   either has "All" selected, or the item matches the selected value.
   The visible set is then paginated (PER_PAGE per page); the pager
   sits below the list and resets to page 1 whenever a filter changes. */
(function () {
  var bar = document.querySelector(".article-filter");
  if (!bar) return;
  var listSel = bar.getAttribute("data-filter-target") || ".article-list";
  var list = document.querySelector(listSel);
  if (!list) return;
  var items = Array.prototype.slice.call(list.querySelectorAll(".article-item"));
  var empty = bar.querySelector(".filter-empty");
  var resetBtn = bar.querySelector(".filter-reset");
  var PER_PAGE = 20;
  var page = 1;

  var pager = document.createElement("nav");
  pager.className = "article-pager";
  pager.setAttribute("aria-label", "Article pages");
  list.parentNode.insertBefore(pager, list.nextSibling);

  function applyFilters() {
    var filters = {};
    bar.querySelectorAll(".filter-group").forEach(function (g) {
      var group = g.getAttribute("data-group");
      var active = g.querySelector(".filter-chip.is-active");
      filters[group] = active ? active.getAttribute("data-value") : "";
    });

    items.forEach(function (item) {
      var ok = true;
      Object.keys(filters).forEach(function (group) {
        var wanted = filters[group];
        if (!wanted) return;
        if (item.getAttribute("data-" + group) !== wanted) ok = false;
      });
      item.setAttribute("data-hidden", ok ? "false" : "true");
    });
  }

  function applyPagination() {
    var visible = items.filter(function (it) {
      return it.getAttribute("data-hidden") !== "true";
    });
    var total = visible.length;
    var pages = Math.max(1, Math.ceil(total / PER_PAGE));
    if (page > pages) page = pages;
    if (page < 1) page = 1;

    var startIdx = (page - 1) * PER_PAGE;
    var endIdx = startIdx + PER_PAGE;
    items.forEach(function (it) { it.removeAttribute("data-page-hidden"); });
    visible.forEach(function (it, i) {
      it.setAttribute("data-page-hidden", (i >= startIdx && i < endIdx) ? "false" : "true");
    });

    renderPager(pages);
    if (empty) empty.hidden = total > 0;
  }

  function makeBtn(label, targetPage, isActive, isDisabled, extraClass) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "pager-btn" + (isActive ? " is-active" : "") + (extraClass ? " " + extraClass : "");
    b.textContent = label;
    if (isActive) b.setAttribute("aria-current", "page");
    if (isDisabled) {
      b.disabled = true;
    } else {
      b.addEventListener("click", function () {
        page = targetPage;
        applyPagination();
        var top = list.getBoundingClientRect().top + window.pageYOffset - 20;
        window.scrollTo({top: top, behavior: "smooth"});
      });
    }
    return b;
  }

  function renderPager(pages) {
    pager.innerHTML = "";
    if (pages <= 1) return;
    pager.appendChild(makeBtn("Previous", page - 1, false, page === 1, "pager-prev"));
    for (var p = 1; p <= pages; p++) {
      pager.appendChild(makeBtn(String(p), p, p === page, false, "pager-num"));
    }
    pager.appendChild(makeBtn("Next", page + 1, false, page === pages, "pager-next"));
  }

  function onFilterChange() {
    page = 1;
    applyFilters();
    applyPagination();
  }

  bar.querySelectorAll(".filter-group").forEach(function (g) {
    g.addEventListener("click", function (e) {
      var chip = e.target.closest(".filter-chip");
      if (!chip) return;
      g.querySelectorAll(".filter-chip").forEach(function (c) { c.classList.remove("is-active"); });
      chip.classList.add("is-active");
      onFilterChange();
    });
  });

  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      bar.querySelectorAll(".filter-group").forEach(function (g) {
        g.querySelectorAll(".filter-chip").forEach(function (c) { c.classList.remove("is-active"); });
        var allChip = g.querySelector(".filter-chip.is-all");
        if (allChip) allChip.classList.add("is-active");
      });
      onFilterChange();
    });
  }

  applyFilters();
  applyPagination();
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

/* Flagship-article finding-stats: count each numeral up from 0
   to its target value the first time the row scrolls into view.
   Respects prefers-reduced-motion (renders final value immediately). */
(function () {
  var els = document.querySelectorAll('.prose .finding-stats .n');
  if (!els.length) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  els.forEach(function (el) {
    var raw = (el.textContent || '').trim();
    var target = parseInt(raw.replace(/[^0-9]/g, ''), 10);
    if (isNaN(target)) return;
    el.dataset.target = target;
    if (reduce) return;                   // keep the number as-is
    el.textContent = '0';
  });
  if (reduce) return;
  if (!('IntersectionObserver' in window)) {
    els.forEach(function (el) {
      if (el.dataset.target) el.textContent = el.dataset.target;
    });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      if (el.classList.contains('is-counted')) return;
      el.classList.add('is-counted');
      var target = parseInt(el.dataset.target, 10);
      var duration = 1400;
      var start = performance.now();
      function step(now) {
        var t = Math.min((now - start) / duration, 1);
        var eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
        el.textContent = String(Math.round(target * eased));
        if (t < 1) requestAnimationFrame(step);
        else el.textContent = String(target);
      }
      requestAnimationFrame(step);
      io.unobserve(el);
    });
  }, { threshold: 0.5, rootMargin: '0px 0px -8% 0px' });
  els.forEach(function (el) { if (el.dataset.target) io.observe(el); });
})();

/* Reveal-in-view for the finding-stats numerals: fade + upward
   translate as each column enters viewport. Paired with the
   count-up in the block above so both fire together. */
(function () {
  var items = document.querySelectorAll('.prose .finding-stats > div');
  if (!items.length) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('is-in'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry, i) {
      if (entry.isIntersecting) {
        var idx = Array.prototype.indexOf.call(items, entry.target);
        entry.target.style.transitionDelay = (idx * 120) + 'ms';
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.35, rootMargin: '0px 0px -6% 0px' });
  items.forEach(function (el) { io.observe(el); });
})();

/* ── Footer language selector, driven by Google Translate ─────
   The dropdown lives in the footer (.footer-lang). Live languages
   flip the googtrans cookie and reload the page; Google's widget
   picks up the cookie and translates every subsequent request.
   The English option resets to source; "Soon"-flagged entries are
   inert. State is mirrored on the button label. */
(function () {
  var scope = document.querySelector('.footer-lang');
  if (!scope) return;
  var btn = scope.querySelector('.lang-btn');
  var menu = scope.querySelector('.lang-menu');
  var label = btn && btn.querySelector('.lang-code');
  var reset = scope.querySelector('[data-lang-reset]');
  if (!btn || !menu || !label) return;

  var setOpen = function (open) {
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menu.hidden = !open;
  };
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    setOpen(menu.hidden);
  });
  document.addEventListener('click', function (e) {
    if (!menu.hidden && !menu.contains(e.target) && e.target !== btn) setOpen(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !menu.hidden) setOpen(false);
  });

  // Cookie helpers scoped to google's translate cookie.
  function readCookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }
  function writeCookie(name, value, days) {
    var d = new Date();
    d.setTime(d.getTime() + (days || 365) * 864e5);
    document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + d.toUTCString() + '; path=/';
    // Also write to bare-domain scope so subdomains stay in sync.
    var host = location.hostname.replace(/^www\./, '');
    if (host && host.indexOf('.') !== -1) {
      document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + d.toUTCString() + '; path=/; domain=.' + host;
    }
  }
  function clearCookie(name) {
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    var host = location.hostname.replace(/^www\./, '');
    if (host && host.indexOf('.') !== -1) {
      document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.' + host;
    }
  }

  function parseGoogTrans(v) {
    // /en/nl → 'nl'; /auto/xx also possible.
    if (!v) return 'en';
    var parts = v.split('/');
    return (parts[2] || 'en').toLowerCase() || 'en';
  }
  function labelForCode(code) {
    var known = {
      en:'EN', nl:'NL', de:'DE', fr:'FR', es:'ES', it:'IT', pt:'PT',
      pl:'PL', sv:'SV', da:'DA', no:'NO', fi:'FI', ar:'AR',
      'zh-cn':'ZH', ja:'JA', hi:'HI'
    };
    return known[String(code).toLowerCase()] || String(code).toUpperCase().slice(0, 2);
  }
  function reflectState(code) {
    code = (code || 'en').toLowerCase();
    label.textContent = labelForCode(code);
    menu.querySelectorAll('.lang-option').forEach(function (a) {
      a.classList.toggle('is-active', (a.getAttribute('data-lang') || '').toLowerCase() === code);
    });
    if (reset) reset.hidden = code === 'en';
  }

  // Set state from any existing cookie on load.
  reflectState(parseGoogTrans(readCookie('googtrans')));

  function setLanguage(target) {
    if (!target || target === 'en') {
      clearCookie('googtrans');
      reflectState('en');
      location.reload();
      return;
    }
    writeCookie('googtrans', '/en/' + target, 365);
    reflectState(target);
    location.reload();
  }

  menu.querySelectorAll('.lang-option').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      if (a.classList.contains('is-disabled')) return;
      var target = (a.getAttribute('data-lang') || 'en').toLowerCase();
      setOpen(false);
      setLanguage(target);
    });
  });

  if (reset) {
    reset.addEventListener('click', function (e) { e.preventDefault(); setLanguage('en'); });
  }
})();

(function () {
  var openBtn = document.querySelector('.header-tools .search-btn');
  var overlay = document.querySelector('.search-overlay');
  if (!openBtn || !overlay) return;
  var input = overlay.querySelector('.search-input');
  var closeBtn = overlay.querySelector('.search-close');
  var results = overlay.querySelector('.search-results');
  var hint = overlay.querySelector('.search-hint');
  var indexPromise = null;
  var activeIndex = -1;

  function loadIndex() {
    if (!indexPromise) {
      indexPromise = fetch('/assets/search-index.json', {credentials: 'same-origin'})
        .then(function (r) { return r.ok ? r.json() : []; })
        .catch(function () { return []; });
    }
    return indexPromise;
  }

  function openOverlay() {
    overlay.hidden = false;
    openBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    loadIndex();
    setTimeout(function () { input.focus(); input.select(); }, 20);
  }
  function closeOverlay() {
    overlay.hidden = true;
    openBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function highlight(text, tokens) {
    var safe = escapeHtml(text || '');
    tokens.forEach(function (tok) {
      if (!tok) return;
      var re = new RegExp('(' + tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
      safe = safe.replace(re, '<mark>$1</mark>');
    });
    return safe;
  }
  function score(entry, tokens) {
    var t = (entry.title || '').toLowerCase();
    var d = (entry.description || '').toLowerCase();
    var s = (entry.snippet || '').toLowerCase();
    var total = 0;
    for (var i = 0; i < tokens.length; i++) {
      var tok = tokens[i];
      var w = 0;
      if (t.indexOf(tok) !== -1) w += 8;
      if (d.indexOf(tok) !== -1) w += 4;
      if (s.indexOf(tok) !== -1) w += 1;
      if (!w) return 0;  // require every token
      total += w;
    }
    return total;
  }

  function render(entries, tokens) {
    activeIndex = -1;
    if (!entries.length) {
      results.innerHTML = '<p class="search-no-results">No results.</p>';
      if (hint) hint.style.display = 'none';
      return;
    }
    if (hint) hint.style.display = '';
    results.innerHTML = entries.map(function (e) {
      return (
        '<a class="search-result" href="' + escapeHtml(e.url) + '">' +
          (e.kind ? '<span class="sr-kind">' + escapeHtml(e.kind) + '</span>' : '') +
          '<span class="sr-title">' + highlight(e.title, tokens) + '</span>' +
          '<span class="sr-desc">' + highlight(e.description || e.snippet.slice(0, 200), tokens) + '</span>' +
        '</a>'
      );
    }).join('');
  }

  function runQuery(q) {
    q = q.trim();
    if (!q) { results.innerHTML = ''; if (hint) hint.style.display = ''; return; }
    var tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
    loadIndex().then(function (index) {
      var scored = index
        .map(function (e) { return {e: e, s: score(e, tokens)}; })
        .filter(function (r) { return r.s > 0; })
        .sort(function (a, b) { return b.s - a.s; })
        .slice(0, 12)
        .map(function (r) { return r.e; });
      render(scored, tokens);
    });
  }

  openBtn.addEventListener('click', function (e) { e.preventDefault(); openOverlay(); });
  closeBtn.addEventListener('click', closeOverlay);
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeOverlay();
  });
  input.addEventListener('input', function () { runQuery(input.value); });
  input.addEventListener('keydown', function (e) {
    var items = results.querySelectorAll('.search-result');
    if (e.key === 'ArrowDown' && items.length) {
      e.preventDefault();
      activeIndex = Math.min(items.length - 1, activeIndex + 1);
      items.forEach(function (n, i) { n.classList.toggle('is-active', i === activeIndex); });
      items[activeIndex].scrollIntoView({block: 'nearest'});
    } else if (e.key === 'ArrowUp' && items.length) {
      e.preventDefault();
      activeIndex = Math.max(0, activeIndex - 1);
      items.forEach(function (n, i) { n.classList.toggle('is-active', i === activeIndex); });
      items[activeIndex].scrollIntoView({block: 'nearest'});
    } else if (e.key === 'Enter') {
      var target = items[activeIndex >= 0 ? activeIndex : 0];
      if (target) { e.preventDefault(); window.location.href = target.getAttribute('href'); }
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !overlay.hidden) closeOverlay();
    if ((e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) && overlay.hidden) {
      var tag = (document.activeElement && document.activeElement.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      openOverlay();
    }
  });
})();
