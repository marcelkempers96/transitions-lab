/* Transitions Lab shared behaviour. Link once per page, before the closing body tag. */
document.addEventListener('DOMContentLoaded', function () {
  // Mobile menu toggle
  var t = document.querySelector('.nav-toggle');
  var m = document.getElementById('menu');
  if (t && m) {
    t.addEventListener('click', function () {
      var open = m.classList.toggle('open');
      t.setAttribute('aria-expanded', open);
    });
    m.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { m.classList.remove('open'); });
    });
  }

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Cursor-following glow in the hero (same interaction as the stance section)
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

  // Cursor-tracking gradient on the independence / stance section
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
