(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------- Header: hairline + scroll progress ---------- */
  var top = document.getElementById('top');
  var progress = document.createElement('span');
  progress.className = 'progress';
  progress.setAttribute('aria-hidden', 'true');
  top.appendChild(progress);

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, y / max) : 0;
      // quantise to 48 steps so the bar fills in "pixels"
      progress.style.transform = 'scaleX(' + (Math.round(p * 48) / 48) + ')';
      top.classList.toggle('scrolled', y > 8);
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Nav: mark the section in view ---------- */
  var navLinks = $$('.top nav a');
  if ('IntersectionObserver' in window) {
    var sections = navLinks.map(function (a) { return document.querySelector(a.getAttribute('href')); }).filter(Boolean);
    var sectionIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        navLinks.forEach(function (a) {
          if (a.getAttribute('href') === '#' + e.target.id) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { sectionIO.observe(s); });
  }

  /* ---------- Scroll reveal (only for things that start below the fold) ---------- */
  var revealIO = null;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    var groups = [
      ['.section-head', 0],
      ['.project .media', 0],
      ['.project .text', 140],
      ['.me > *', 70],
      ['.panel > div', 90],
      ['.jobs .row', 0],
      ['.contact-box > *', 120],
      ['.link-row', 90]
    ];
    var fold = window.innerHeight;
    groups.forEach(function (g) {
      $$(g[0]).forEach(function (el, i) {
        if (el.getBoundingClientRect().top < fold) return; // already visible: leave it alone
        var stagger = g[0].indexOf('> *') > -1 || g[0] === '.link-row' || g[0] === '.panel > div' ? i * g[1] : g[1];
        el.style.setProperty('--d', Math.min(stagger, 400) + 'ms');
        el.classList.add('reveal');
        revealIO.observe(el);
      });
    });
  }

  /* ---------- Filters (built from the projects themselves) ---------- */
  var projects = $$('.project');
  var order = ['UI/UX', 'Social Media', 'Layout', 'Illustration', 'Billboard', 'Branding'];
  var counts = {};
  projects.forEach(function (p) { counts[p.dataset.cat] = (counts[p.dataset.cat] || 0) + 1; });
  var bar = document.getElementById('filters');
  function mk(label, key, n) {
    var b = document.createElement('button');
    b.type = 'button';
    b.id = 'filter-' + key.replace(/[^a-z]/gi, '').toLowerCase();
    b.dataset.key = key;
    b.setAttribute('aria-pressed', key === 'all' ? 'true' : 'false');
    b.innerHTML = label + ' <span>' + n + '</span>';
    bar.appendChild(b);
  }
  mk('All', 'all', projects.length);
  order.forEach(function (k) { if (counts[k]) mk(k, k, counts[k]); });

  var filterTimer = null;
  bar.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b || b.getAttribute('aria-pressed') === 'true') return;
    $$('button', bar).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });

    var count = $('span', b);
    count.classList.remove('bump'); void count.offsetWidth; count.classList.add('bump');

    var key = b.dataset.key;
    var show = function (p) { return key === 'all' || p.dataset.cat === key; };

    if (reduceMotion) {
      projects.forEach(function (p) { p.hidden = !show(p); });
      return;
    }

    clearTimeout(filterTimer);
    projects.forEach(function (p) { if (!p.hidden) p.classList.add('leaving'); });
    filterTimer = setTimeout(function () {
      var shown = 0;
      projects.forEach(function (p) {
        p.classList.remove('leaving');
        p.hidden = !show(p);
        if (!p.hidden) {
          // projects revealed by the filter skip the scroll reveal
          $$('.reveal', p).forEach(function (el) { el.classList.add('in'); });
          p.classList.add('entering');
          p.style.transitionDelay = Math.min(shown, 4) * 70 + 'ms';
          shown++;
        }
      });
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          projects.forEach(function (p) { p.classList.remove('entering'); });
          setTimeout(function () { projects.forEach(function (p) { p.style.transitionDelay = ''; }); }, 700);
        });
      });
    }, 220);
  });

  /* ---------- "View" badge that follows the pointer over images ---------- */
  if (finePointer) {
    var badge = document.createElement('div');
    badge.className = 'view-badge';
    badge.setAttribute('aria-hidden', 'true');
    badge.innerHTML = '<span class="px"></span>View';
    document.body.appendChild(badge);

    var tx = 0, ty = 0, cx = 0, cy = 0, raf = null, active = false;
    function follow() {
      cx += (tx - cx) * (reduceMotion ? 1 : 0.22);
      cy += (ty - cy) * (reduceMotion ? 1 : 0.22);
      badge.style.setProperty('--x', cx + 'px');
      badge.style.setProperty('--y', cy + 'px');
      if (active && (Math.abs(tx - cx) > 0.3 || Math.abs(ty - cy) > 0.3)) raf = requestAnimationFrame(follow);
      else raf = null;
    }
    document.addEventListener('pointermove', function (e) {
      tx = e.clientX + 16; ty = e.clientY + 18;
      var over = !!(e.target.closest && e.target.closest('.shot'));
      if (over && !active) { cx = tx; cy = ty; }
      active = over;
      badge.classList.toggle('on', over);
      if (over && !raf) raf = requestAnimationFrame(follow);
    }, { passive: true });
    document.addEventListener('pointerleave', function () { active = false; badge.classList.remove('on'); });
  }

  /* ---------- Lightbox ---------- */
  var lb = document.getElementById('lb'), lbImg = document.getElementById('lb-img'), lbCap = document.getElementById('lb-cap');
  document.addEventListener('click', function (e) {
    var s = e.target.closest('.shot'); if (!s) return;
    var img = $('img', s);
    lbImg.src = s.dataset.full; lbImg.alt = img.alt;
    var art = s.closest('.project'); lbCap.textContent = art ? $('h3', art).textContent : '';
    if (lb.showModal) lb.showModal();
  });
  document.getElementById('lb-close').addEventListener('click', function () { lb.close(); });
  lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });

  /* ---------- Copy buttons ---------- */
  function burst(btn) {
    if (reduceMotion) return;
    for (var i = 0; i < 8; i++) {
      var s = document.createElement('i');
      s.className = 'spark';
      var a = (Math.PI * 2 * i) / 8 + Math.random() * 0.4;
      var r = 26 + Math.random() * 12;
      s.style.setProperty('--dx', Math.round(Math.cos(a) * r) + 'px');
      s.style.setProperty('--dy', Math.round(Math.sin(a) * r) + 'px');
      btn.appendChild(s);
      setTimeout(function (el) { el.remove(); }, 600, s);
    }
  }
  $$('.copy').forEach(function (cb) {
    var src = document.getElementById(cb.dataset.copy);
    var label = cb.textContent;
    var t = null;
    function reset() { clearTimeout(t); t = setTimeout(function () { cb.textContent = label; cb.classList.remove('done'); }, 1800); }
    function done() { cb.textContent = 'Copied'; cb.classList.add('done'); burst(cb); reset(); }
    function fallback() {
      var r = document.createRange(); r.selectNodeContents(src);
      var sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
      cb.textContent = 'Selected'; reset();
    }
    cb.addEventListener('click', function () {
      try { navigator.clipboard.writeText(src.textContent.trim()).then(done, fallback); } catch (err) { fallback(); }
    });
  });
})();
