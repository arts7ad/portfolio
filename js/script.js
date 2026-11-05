(function () {
  // sticky bar hairline
  var top = document.getElementById('top');
  var onScroll = function () { top.classList.toggle('scrolled', window.scrollY > 8); };
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // filters built from the projects themselves
  var projects = Array.prototype.slice.call(document.querySelectorAll('.project'));
  var order = ['UI/UX', 'Social Media', 'Layout', 'Illustration', 'Billboard', 'Branding'];
  var counts = {};
  projects.forEach(function (p) { counts[p.dataset.cat] = (counts[p.dataset.cat] || 0) + 1; });
  var bar = document.getElementById('filters');
  function mk(label, key, n) {
    var b = document.createElement('button');
    b.type = 'button'; b.id = 'filter-' + key.replace(/[^a-z]/gi, '').toLowerCase();
    b.dataset.key = key; b.setAttribute('aria-pressed', key === 'all' ? 'true' : 'false');
    b.innerHTML = label + ' <span>' + n + '</span>';
    bar.appendChild(b);
  }
  mk('All', 'all', projects.length);
  order.forEach(function (k) { if (counts[k]) mk(k, k, counts[k]); });
  bar.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    bar.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    projects.forEach(function (p) { p.hidden = !(b.dataset.key === 'all' || p.dataset.cat === b.dataset.key); });
  });

  // lightbox
  var lb = document.getElementById('lb'), lbImg = document.getElementById('lb-img'), lbCap = document.getElementById('lb-cap');
  document.addEventListener('click', function (e) {
    var s = e.target.closest('.shot'); if (!s) return;
    var img = s.querySelector('img');
    lbImg.src = s.dataset.full; lbImg.alt = img.alt;
    var art = s.closest('.project'); lbCap.textContent = art ? art.querySelector('h3').textContent : '';
    if (lb.showModal) lb.showModal();
  });
  document.getElementById('lb-close').addEventListener('click', function () { lb.close(); });
  lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });

  // copy buttons
  document.querySelectorAll('.copy').forEach(function (cb) {
    var em = document.getElementById(cb.dataset.copy);
    cb.addEventListener('click', function () {
      var reset = function () { setTimeout(function () { cb.textContent = 'Copy'; }, 1600); };
      var done = function () { cb.textContent = 'Copied'; reset(); };
      var fallback = function () { var r = document.createRange(); r.selectNodeContents(em); var sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); cb.textContent = 'Selected'; reset(); };
      try { navigator.clipboard.writeText(em.textContent).then(done, fallback); } catch (err) { fallback(); }
    });
  });
})();
