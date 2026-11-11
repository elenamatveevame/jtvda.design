(() => {
  const html = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const range = (p, a, b) => clamp((p - a) / (b - a));
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const pad4 = (n) => String(Math.max(0, Math.round(n))).padStart(4, '0');
  const pad2 = (n) => String(n).padStart(2, '0');
  const fadeIn = (el, ms) => {
    if (reduce || !el.animate) return;
    el.animate([{ opacity: 0, transform: 'translateY(0.1em)' }, { opacity: 1, transform: 'none' }],
      { duration: ms, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' });
  };

  /* Loader: a Klein square and a counter, then it lifts. Shown once per browser session. */
  const loader = document.querySelector('.loader');
  const count = document.querySelector('.loader__count');
  const loaderDone = () => {
    loader.classList.add('is-done');
    try { sessionStorage.setItem('jtvda-seen', '1'); } catch (e) { /* private mode */ }
  };
  if (loader) {
    if (reduce || html.classList.contains('seen')) {
      loaderDone();
    } else {
      const start = performance.now();
      const dur = 1300;
      const step = (t) => {
        const k = clamp((t - start) / dur);
        count.textContent = String(Math.round(ease(k) * 100)).padStart(3, '0');
        if (k < 1) requestAnimationFrame(step);
        else setTimeout(loaderDone, 180);
      };
      requestAnimationFrame(step);
      setTimeout(loaderDone, 2600); /* never block the page */
    }
  }

  /* Live time in Antwerp. */
  const clocks = document.querySelectorAll('[data-clock]');
  const tzs = document.querySelectorAll('[data-tz]');
  let fmt = null;
  let tz = 'GMT+1';
  try {
    fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Brussels', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
    const part = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Brussels', timeZoneName: 'shortOffset' })
      .formatToParts(new Date()).find((p) => p.type === 'timeZoneName');
    if (part) tz = part.value;
  } catch (e) { /* older browsers: fall back to local time */ }
  const tick = () => {
    const now = new Date();
    const s = fmt ? fmt.format(now) : now.toTimeString().slice(0, 8);
    clocks.forEach((el) => { el.textContent = s; });
  };
  tzs.forEach((el) => { el.textContent = '(' + tz + ')'; });
  tick();
  setInterval(tick, 1000);

  /* Sections: which one is under a given point of the screen. */
  const sections = Array.from(document.querySelectorAll('[data-label]'));
  let bounds = [];
  const measureSections = () => {
    const y = scrollY;
    bounds = sections.map((el) => {
      const r = el.getBoundingClientRect();
      return { el, top: r.top + y, bottom: r.bottom + y };
    });
  };
  const sectionAt = (viewY) => {
    const y = scrollY + viewY;
    const hit = bounds.find((b) => y >= b.top && y < b.bottom);
    if (hit) return hit.el;
    return (y < bounds[0].top ? bounds[0] : bounds[bounds.length - 1]).el;
  };
  /* Each corner takes its colour from the section it is sitting on. */
  const setTheme = (el, viewY) => {
    const t = sectionAt(viewY).dataset.theme || 'dark';
    if (el.dataset.theme !== t) el.dataset.theme = t;
  };
  measureSections();

  /* Cursor and coordinates. */
  const xEl = document.querySelector('[data-x]');
  const yEl = document.querySelector('[data-y]');
  const cursor = document.querySelector('.cursor');
  const cursorLabel = document.querySelector('.cursor__label');
  let mx = innerWidth / 2;
  let my = innerHeight / 2;
  let cx = mx;
  let cy = my;
  if (finePointer) html.classList.add('has-cursor');

  addEventListener('pointermove', (e) => {
    mx = e.clientX;
    my = e.clientY;
    if (xEl) xEl.textContent = pad4(mx);
    if (yEl) yEl.textContent = pad4(my);
    if (!cursor.classList.contains('is-on')) {
      cx = mx;
      cy = my;
      cursor.classList.add('is-on'); /* no stray dot before the mouse has moved */
    }
  }, { passive: true });
  html.addEventListener('mouseleave', () => cursor.classList.remove('is-on'));

  document.addEventListener('pointerover', (e) => {
    const hit = e.target.closest('a, button');
    cursor.classList.toggle('is-hover', !!hit);
    const named = e.target.closest('[data-name]');
    cursorLabel.textContent = named ? named.dataset.name : '';
  });

  if (finePointer) {
    const follow = () => {
      cx += (mx - cx) * 0.22;
      cy += (my - cy) * 0.22;
      cursor.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
      setTheme(cursor, my);
      requestAnimationFrame(follow);
    };
    requestAnimationFrame(follow);
  }

  /* Corners: section name, current menu item, colours. */
  const hudTop = document.querySelector('.hud--top');
  const hudBottom = document.querySelector('.hud--bottom');
  const hudSide = document.querySelector('.hud--side');
  const sectionLabel = document.querySelector('[data-section-label]');
  const navLinks = Array.from(document.querySelectorAll('.hud__nav a'));
  const navFor = { work: '#work', focus: '#work', situ: '#work', about: '#about', contact: '#contact' };
  let current = null;
  const updateSection = () => {
    setTheme(hudTop, 24);
    setTheme(hudBottom, innerHeight - 24);
    setTheme(hudSide, innerHeight / 2);
    const topId = sectionAt(24).id;
    if (hudTop.dataset.section !== topId) hudTop.dataset.section = topId;

    const hit = sectionAt(innerHeight / 2);
    if (hit === current) return;
    current = hit;
    sectionLabel.textContent = hit.dataset.label;
    navLinks.forEach((a) => {
      if (a.getAttribute('href') === navFor[hit.id]) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  };

  /* Phone menu: hides while scrolling down, comes back on the way up. */
  let lastY = scrollY;
  const updateNav = () => {
    const y = scrollY;
    if (Math.abs(y - lastY) < 8) return;
    html.classList.toggle('nav-hidden', y > lastY && y > 120);
    lastY = y;
  };

  /* Work: the piece you point at (or, on a phone, the one in the middle of the screen) comes into focus. */
  const pieces = Array.from(document.querySelectorAll('.piece'));
  const nameEl = document.querySelector('[data-piece-name]');
  const detailEl = document.querySelector('[data-piece-detail]');
  const noEl = document.querySelector('[data-piece-no]');
  let activePiece = pieces.find((p) => p.classList.contains('is-active')) || null;
  const activate = (piece) => {
    if (piece === activePiece) return;
    activePiece = piece;
    pieces.forEach((p) => p.classList.toggle('is-active', p === piece));
    nameEl.textContent = piece.dataset.name;
    detailEl.textContent = piece.dataset.detail;
    noEl.textContent = piece.dataset.no + ' / ' + pad2(pieces.length);
    fadeIn(nameEl, 320);
  };
  pieces.forEach((piece) => {
    piece.addEventListener('mouseenter', () => activate(piece));
    piece.addEventListener('focus', () => activate(piece));
    piece.addEventListener('click', () => activate(piece));
  });

  /* Viewer: a click opens the photo full screen. Arrows, swipe, Esc and the Back button work. */
  const lb = document.querySelector('.lightbox');
  const lbFig = lb.querySelector('.lightbox__fig');
  const lbImg = lb.querySelector('.lightbox__img');
  const lbName = lb.querySelector('[data-lb-name]');
  const lbDetail = lb.querySelector('[data-lb-detail]');
  const lbCount = lb.querySelector('[data-lb-count]');
  const lbCloseBtn = lb.querySelector('[data-lb-close]');
  const behind = [document.querySelector('main'), hudTop, hudBottom];
  const shots = Array.from(document.querySelectorAll('.shot'));
  const groups = { work: pieces, situ: shots };
  let lbItems = [];
  let lbIndex = 0;
  let lbReturn = null;

  const lbRender = () => {
    const el = lbItems[lbIndex];
    const img = el.querySelector('img');
    lbImg.src = img.currentSrc || img.src;
    lbImg.alt = img.alt;
    lbName.textContent = el.dataset.name || '';
    lbDetail.textContent = el.dataset.detail || img.alt;
    lbCount.textContent = pad2(lbIndex + 1) + ' / ' + pad2(lbItems.length);
    const next = lbItems[(lbIndex + 1) % lbItems.length].querySelector('img');
    new Image().src = next.currentSrc || next.src; /* warm up the next photo */
  };
  const lbOpen = (group, index) => {
    lbItems = groups[group];
    lbIndex = index;
    lb.dataset.theme = group === 'work' ? 'light' : 'dark';
    lbRender();
    lbReturn = document.activeElement;
    lb.hidden = false;
    html.classList.add('lb-open');
    behind.forEach((el) => { el.inert = true; });
    void lb.offsetWidth; /* start the fade from the closed state */
    lb.classList.add('is-open');
    lbCloseBtn.focus({ preventScroll: true });
    try { history.pushState({ lb: true }, ''); } catch (e) { /* file:// in some browsers */ }
  };
  const lbHide = () => {
    if (lb.hidden) return;
    lb.classList.remove('is-open');
    html.classList.remove('lb-open');
    behind.forEach((el) => { el.inert = false; });
    lb.hidden = true;
    if (lbReturn) lbReturn.focus({ preventScroll: true });
  };
  const lbClose = () => {
    if (history.state && history.state.lb) history.back(); /* popstate does the hiding */
    else lbHide();
  };
  const lbStep = (d) => {
    lbIndex = (lbIndex + d + lbItems.length) % lbItems.length;
    lbRender();
    fadeIn(lbImg, 260);
    fadeIn(lbName, 260);
  };

  Object.keys(groups).forEach((group) => {
    groups[group].forEach((el, i) => el.addEventListener('click', () => lbOpen(group, i)));
  });
  addEventListener('popstate', lbHide);
  lbCloseBtn.addEventListener('click', lbClose);
  lb.querySelector('[data-lb-prev]').addEventListener('click', () => lbStep(-1));
  lb.querySelector('[data-lb-next]').addEventListener('click', () => lbStep(1));
  lbImg.addEventListener('click', () => lbStep(1));
  lb.addEventListener('click', (e) => { if (e.target === lb || e.target === lbFig) lbClose(); });
  let touchX = null;
  let touchY = null;
  lb.addEventListener('touchstart', (e) => {
    touchX = e.changedTouches[0].clientX;
    touchY = e.changedTouches[0].clientY;
  }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    const dy = e.changedTouches[0].clientY - touchY;
    touchX = null;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) lbStep(dx < 0 ? 1 : -1);
  }, { passive: true });
  document.addEventListener('keydown', (e) => {
    if (lb.hidden) return;
    if (e.key === 'Escape') lbClose();
    else if (e.key === 'ArrowRight') lbStep(1);
    else if (e.key === 'ArrowLeft') lbStep(-1);
    else if (e.key === 'Tab') {
      const f = Array.from(lb.querySelectorAll('button'));
      const i = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });

  /* Contact: copy the address. */
  const copyBtn = document.querySelector('[data-copy]');
  if (copyBtn) {
    const copyLabel = copyBtn.querySelector('[data-copy-label]');
    const idle = copyLabel.textContent;
    const mail = document.querySelector('.contact__mail');
    const say = (text) => {
      copyLabel.textContent = text;
      setTimeout(() => { copyLabel.textContent = idle; }, 2200);
    };
    /* Older route: select the address on the page and copy the selection. */
    const copyBySelection = () => {
      const sel = getSelection();
      const r = document.createRange();
      r.selectNodeContents(mail);
      sel.removeAllRanges();
      sel.addRange(r);
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      if (ok) sel.removeAllRanges();
      say(ok ? 'Copied' : 'Address selected'); /* if copying is blocked, it is at least selected */
    };
    copyBtn.addEventListener('click', () => {
      if (!navigator.clipboard) { copyBySelection(); return; }
      navigator.clipboard.writeText(copyBtn.dataset.copy).then(() => say('Copied')).catch(copyBySelection);
    });
  }

  /* Scroll scenes. */
  const entrance = document.querySelector('.scene--entrance');
  const entranceStick = entrance.querySelector('.scene__stick');
  const focus = document.querySelector('.scene--focus');
  const focusStick = focus.querySelector('.scene__stick');
  const field = document.querySelector('.work__field');
  const situField = document.querySelector('.situ__field');

  const progress = (el) => {
    const r = el.getBoundingClientRect();
    const total = r.height - innerHeight;
    return total > 0 ? clamp(-r.top / total) : 0;
  };
  const inView = (el) => {
    const r = el.getBoundingClientRect();
    return r.bottom > -innerHeight && r.top < innerHeight * 2;
  };

  let cover = 1;
  const measure = () => {
    cover = (Math.hypot(innerWidth, innerHeight) / 28) * 1.04;
    measureSections();
  };
  measure();

  let queued = false;
  const update = () => {
    queued = false;
    updateSection();
    updateNav();

    const p = progress(entrance);
    const grow = ease(range(p, 0.04, 0.58));
    entranceStick.style.setProperty('--s', (1 + (cover - 1) * grow).toFixed(3));
    entranceStick.style.setProperty('--hint-o', (1 - range(p, 0, 0.05)).toFixed(3));
    entranceStick.style.setProperty('--intro-o', (1 - range(p, 0, 0.18)).toFixed(3));
    entranceStick.style.setProperty('--name-o', (1 - range(p, 0.5, 0.64)).toFixed(3));
    entranceStick.style.setProperty('--name-y', (-range(p, 0.5, 0.64) * 48).toFixed(1) + 'px');
    entranceStick.style.setProperty('--end-o', range(p, 0.62, 0.8).toFixed(3));
    entranceStick.style.setProperty('--judd-s', (0.82 + 0.18 * ease(range(p, 0.62, 1))).toFixed(3));

    const f = progress(focus);
    focusStick.style.setProperty('--fs', (0.22 + 0.78 * ease(range(f, 0, 0.78))).toFixed(3));
    focusStick.style.setProperty('--fo', range(f, 0, 0.1).toFixed(3));
    focusStick.style.setProperty('--fc', range(f, 0.62, 0.82).toFixed(3));

    const workOn = inView(field);
    const situOn = inView(situField);

    if (!reduce) {
      const drift = (box, items) => {
        const r = box.getBoundingClientRect();
        const k = innerWidth < 760 ? 0.35 : 1; /* gentler drift on a phone so nothing collides */
        const offset = (r.top + r.height / 2 - innerHeight / 2) * k;
        items.forEach((item) => {
          const speed = parseFloat(item.dataset.speed || '0');
          item.style.setProperty('--py', (offset * speed).toFixed(1) + 'px');
        });
      };
      if (workOn) drift(field, pieces);
      if (situOn) drift(situField, shots);
    }

    /* No hover on a touch screen: whatever is in the middle of the screen wakes up. */
    if (!finePointer) {
      if (workOn) {
        const mid = innerHeight * 0.42;
        let best = null;
        let bestD = Infinity;
        pieces.forEach((piece) => {
          const r = piece.getBoundingClientRect();
          const d = Math.abs(r.top + r.height / 2 - mid);
          if (d < bestD) { bestD = d; best = piece; }
        });
        if (best && bestD < innerHeight * 0.6) activate(best);
      }
      if (situOn) {
        shots.forEach((shot) => {
          const r = shot.getBoundingClientRect();
          const c = r.top + r.height / 2;
          shot.classList.toggle('is-near', c > innerHeight * 0.22 && c < innerHeight * 0.78);
        });
      }
    }
  };
  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { measure(); onScroll(); });
  addEventListener('load', () => { measure(); onScroll(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); onScroll(); });
  update();
})();
