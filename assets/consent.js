/* Transitions Lab cookie consent
   Small module that renders a bottom-fixed banner on first visit,
   stores the visitor's decision in localStorage, and gates the
   analytics script tags on that decision. No pre-ticked boxes,
   Reject as easy as Accept. Re-openable from the footer link. */
(function () {
  var STORAGE_KEY = 'tl_consent_v1';
  var VERSION = 1;

  // The analytics endpoints served by Vercel on the same origin.
  // These load only after Accept.
  var ANALYTICS = [
    '/_vercel/insights/script.js',
    '/_vercel/speed-insights/script.js'
  ];

  function readDecision() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== VERSION) return null;
      return parsed;
    } catch (e) { return null; }
  }

  function writeDecision(decision) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        essential: true,
        analytics: !!decision.analytics,
        version: VERSION,
        ts: Date.now()
      }));
    } catch (e) { /* private mode etc — ignore */ }
  }

  function has(category) {
    var d = readDecision();
    if (!d) return false;
    return d[category] === true;
  }

  var analyticsLoaded = false;
  function activateAnalytics() {
    if (analyticsLoaded) return;
    analyticsLoaded = true;
    ANALYTICS.forEach(function (src) {
      var s = document.createElement('script');
      s.defer = true;
      s.src = src;
      document.head.appendChild(s);
    });
  }

  function hideBanner() {
    var el = document.getElementById('cookie-banner');
    if (el) el.hidden = true;
  }

  function showBanner() {
    var el = document.getElementById('cookie-banner');
    if (el) el.hidden = false;
  }

  function accept() {
    writeDecision({ analytics: true });
    hideBanner();
    activateAnalytics();
  }

  function reject() {
    writeDecision({ analytics: false });
    hideBanner();
  }

  // Public API — used by the "Manage cookies" footer link and by
  // any future consent-gated tracker.
  window.tlConsent = {
    has: has,
    accept: accept,
    reject: reject,
    open: showBanner
  };

  function init() {
    var decision = readDecision();
    if (decision) {
      hideBanner();
      if (decision.analytics === true) activateAnalytics();
    } else {
      showBanner();
    }
    var acceptBtn = document.getElementById('cookie-accept');
    var rejectBtn = document.getElementById('cookie-reject');
    if (acceptBtn) acceptBtn.addEventListener('click', accept);
    if (rejectBtn) rejectBtn.addEventListener('click', reject);
    // Any element with data-consent-manage opens the banner again.
    var links = document.querySelectorAll('[data-consent-manage]');
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener('click', function (e) {
        e.preventDefault();
        showBanner();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
