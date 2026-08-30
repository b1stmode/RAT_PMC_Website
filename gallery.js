/* RAT PMC gallery — renders the archive grid + lightbox from the JSON
   in #galleryData. Vanilla, no dependencies. */
(function () {
  'use strict';

  var mount = document.getElementById('galleryMount');
  var dataEl = document.getElementById('galleryData');
  if (!mount || !dataEl) return;

  var records;
  try {
    records = JSON.parse(dataEl.textContent);
  } catch (e) {
    mount.innerHTML = '<p class="gallery-fallback">Gallery data could not be read.</p>';
    return;
  }
  if (!Array.isArray(records) || !records.length) {
    mount.innerHTML = '<p class="gallery-fallback">No photos yet.</p>';
    return;
  }
  records.forEach(function (r, i) { r._i = i; }); // stable id for the viewer

  // ---- helpers ---------------------------------------------------
  function metaText(r) {
    var bits = [];
    if (r.location) bits.push(r.location);
    if (r.unit) bits.push(r.unit);
    // year is already the group heading — only stamp it when there's other detail
    if (bits.length && r.year) bits.unshift(String(r.year));
    return bits.join('  ·  ');
  }
  function altText(r) {
    return r.alt || r.caption ||
      ('RAT PMC training photo' + (r.year ? ', ' + r.year : ''));
  }

  // ---- group by year, newest first ----------------------------
  var years = [];
  var byYear = {};
  records.forEach(function (r) {
    var y = r.year || 'Undated';
    if (!byYear[y]) { byYear[y] = []; years.push(y); }
    byYear[y].push(r);
  });
  years.sort(function (a, b) { return Number(b) - Number(a); });

  // ---- render groups -----------------------------------------
  years.forEach(function (y) {
    var section = document.createElement('section');
    section.className = 'gallery-group';
    section.dataset.year = y;

    var h2 = document.createElement('h2');
    h2.className = 'gallery-year';
    h2.id = 'gallery-year-' + y;
    h2.textContent = y;
    section.appendChild(h2);
    section.setAttribute('aria-labelledby', h2.id);

    var grid = document.createElement('div');
    grid.className = 'gallery-grid';
    var group = byYear[y];
    group.forEach(function (r, idx) { grid.appendChild(buildTile(r, idx, group.length, y)); });
    section.appendChild(grid);

    mount.appendChild(section);
  });

  function buildTile(r, idx, total, year) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tile' + (r.featured ? ' tile--featured' : '');
    btn.dataset.i = r._i;
    btn.setAttribute('aria-label', r.caption
      ? 'Open photo: ' + r.caption
      : 'Open photo ' + (idx + 1) + ' of ' + total + ', ' + year);

    var frame = document.createElement('span');
    frame.className = 'tile__frame';

    var img = document.createElement('img');
    img.src = r.thumb || r.src;
    img.alt = altText(r);
    img.loading = 'lazy';
    img.decoding = 'async';
    if (r.position) img.style.objectPosition = r.position;
    frame.appendChild(img);
    btn.appendChild(frame);

    var meta = metaText(r);
    if (meta || r.caption) {
      var strip = document.createElement('span');
      strip.className = 'tile__cap';
      if (meta) {
        var m = document.createElement('span');
        m.className = 'tile__meta';
        m.textContent = meta;
        strip.appendChild(m);
      }
      if (r.caption) {
        var t = document.createElement('span');
        t.className = 'tile__title';
        t.textContent = r.caption;
        strip.appendChild(t);
      }
      btn.appendChild(strip);
    }

    btn.addEventListener('click', function () { openLightbox(r._i, btn); });
    return btn;
  }

  // ---- year filter chips ------------------------------------
  var filterEl = document.getElementById('galleryFilters');
  if (filterEl && years.length > 1) {
    filterEl.hidden = false;
    var defs = [{ key: 'all', label: 'All' }].concat(
      years.map(function (y) { return { key: String(y), label: String(y) }; })
    );
    defs.forEach(function (d) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip' + (d.key === 'all' ? ' chip--on' : '');
      chip.textContent = d.label;
      chip.dataset.key = d.key;
      chip.setAttribute('aria-pressed', d.key === 'all' ? 'true' : 'false');
      chip.addEventListener('click', function () { applyFilter(d.key); });
      filterEl.appendChild(chip);
    });
  }

  function currentFilter() {
    var on = filterEl && filterEl.querySelector('.chip--on');
    return on ? on.dataset.key : 'all';
  }
  function applyFilter(key) {
    if (filterEl) {
      filterEl.querySelectorAll('.chip').forEach(function (c) {
        var on = c.dataset.key === key;
        c.classList.toggle('chip--on', on);
        c.setAttribute('aria-pressed', String(on));
      });
    }
    mount.querySelectorAll('.gallery-group').forEach(function (g) {
      g.hidden = !(key === 'all' || g.dataset.year === key);
    });
  }
  function visibleRecords() {
    var key = currentFilter();
    return key === 'all'
      ? records
      : records.filter(function (r) { return String(r.year) === key; });
  }

  // ---- lightbox --------------------------------------------
  var lb = document.getElementById('lightbox');
  var lbImg = document.getElementById('lightboxImg');
  var lbCap = document.getElementById('lightboxCap');
  var lbCount = document.getElementById('lightboxCounter');
  var lbStatus = document.getElementById('lightboxStatus');
  var lbIndex = -1;
  var lastFocus = null;
  if (!lb || !lbImg) return; // grid still renders; viewer just won't open

  // regions to seal off from keyboard + AT while the dialog is open
  var pageRegions = [
    document.querySelector('nav.topbar'),
    document.querySelector('main'),
    document.querySelector('footer.site-footer')
  ].filter(Boolean);
  function setPageInert(on) {
    pageRegions.forEach(function (el) {
      if (on) { el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true'); }
      else { el.removeAttribute('inert'); el.removeAttribute('aria-hidden'); }
    });
  }

  function openLightbox(i, trigger) {
    if (!lb) return;
    lastFocus = trigger || document.activeElement;
    showAt(i);
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    setPageInert(true);
    document.addEventListener('keydown', onKey, true);
    lb.querySelector('.lightbox__close').focus();
  }
  function closeLightbox() {
    lb.hidden = true;
    document.body.style.overflow = '';
    setPageInert(false);
    document.removeEventListener('keydown', onKey, true);
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }
  function showAt(i) {
    var r = records[i];
    if (!r) return;
    lbIndex = i;
    lbImg.src = r.src;
    lbImg.alt = altText(r);
    var meta = metaText(r);
    var text = r.caption ? r.caption + (meta ? '   —   ' + meta : '') : meta;
    lbCap.textContent = text;
    lbCap.hidden = !text;
    var list = visibleRecords();
    var pos = list.indexOf(r);
    lbCount.textContent = pos >= 0 ? (pos + 1) + ' / ' + list.length : '';
    if (lbStatus && pos >= 0) {
      lbStatus.textContent = 'Photo ' + (pos + 1) + ' of ' + list.length +
        (r.caption ? ', ' + r.caption : '');
    }
  }
  function step(dir) {
    var list = visibleRecords();
    var pos = list.indexOf(records[lbIndex]);
    if (pos === -1) { pos = 0; } else { pos = (pos + dir + list.length) % list.length; }
    showAt(list[pos]._i);
  }
  function onKey(e) {
    if (lb.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); closeLightbox(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    else if (e.key === 'Tab') {
      var f = lb.querySelectorAll('button');
      var first = f[0], last = f[f.length - 1];
      if (!lb.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  lb.addEventListener('click', function (e) {
    var act = e.target.getAttribute && e.target.getAttribute('data-lb');
    if (act === 'close' || e.target === lb || e.target.classList.contains('lightbox__figure')) closeLightbox();
    else if (act === 'prev') step(-1);
    else if (act === 'next') step(1);
  });
})();
