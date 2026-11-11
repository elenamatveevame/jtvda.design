(() => {
  const html = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const range = (p, a, b) => clamp((p - a) / (b - a));
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const pad2 = (n) => String(n).padStart(2, '0');
  const fadeIn = (el, ms) => {
    if (reduce || !el.animate) return;
    el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms, easing: 'ease-out' });
  };

  /* Loader: a Klein square and a counter, then it lifts. Shown once per browser session. */
  const loader = document.querySelector('.loader');
  const count = document.querySelector('.loader__count');
  const loaderDone = () => {
    loader.classList.add('is-done');
    try { sessionStorage.setItem('jtvda-seen', '1'); } catch (e) { /* private mode */ }
  };
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
  const sections = Array.from(document.querySelectorAll('main > section'));
  let bounds = [];
  const measureSections = () => {
    const y = scrollY;
    bounds = sections.map((el) => {
      const r = el.getBoundingClientRect();
      return { el, top: r.top + y, bottom: r.bottom + y };
    });
  };
  let measuredH = 0;
  const sectionAt = (viewY) => {
    const h = html.scrollHeight;
    if (h !== measuredH) { measuredH = h; measureSections(); } /* never work from stale positions */
    const y = scrollY + viewY;
    const hit = bounds.find((b) => y >= b.top && y < b.bottom);
    if (hit) return hit.el;
    return (y < bounds[0].top ? bounds[0] : bounds[bounds.length - 1]).el;
  };

  /* Cursor: a dot that opens into a ring over anything clickable. */
  const cursor = document.querySelector('.cursor');
  const cursorLabel = document.querySelector('.cursor__label');
  let mx = innerWidth / 2;
  let my = innerHeight / 2;
  let cx = mx;
  let cy = my;
  if (finePointer) {
    html.classList.add('has-cursor');
    addEventListener('pointermove', (e) => {
      mx = e.clientX;
      my = e.clientY;
      if (!cursor.classList.contains('is-on')) {
        cx = mx;
        cy = my;
        cursor.classList.add('is-on'); /* no stray dot before the mouse has moved */
      }
    }, { passive: true });
    html.addEventListener('mouseleave', () => cursor.classList.remove('is-on'));
    document.addEventListener('pointerover', (e) => {
      cursor.classList.toggle('is-hover', !!e.target.closest('a, button'));
      cursorLabel.textContent = e.target.closest('.item') ? 'View' : '';
    });
    const follow = () => {
      cx += (mx - cx) * 0.22;
      cy += (my - cy) * 0.22;
      cursor.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
      requestAnimationFrame(follow);
    };
    requestAnimationFrame(follow);
  }

  /* Menu: current item; on a phone the bar hides on the way down and returns on the way up. */
  const hudTop = document.querySelector('.hud--top');
  const navLinks = Array.from(document.querySelectorAll('.hud__nav a'));
  let currentId = null;
  let lastY = scrollY;
  const updateMenu = () => {
    const top = sectionAt(24);
    if (hudTop.dataset.section !== top.id) {
      hudTop.dataset.section = top.id;
      hudTop.dataset.theme = top.dataset.theme || 'dark';
    }
    const mid = sectionAt(innerHeight / 2).id;
    if (mid !== currentId) {
      currentId = mid;
      navLinks.forEach((a) => {
        if (a.getAttribute('href') === '#' + mid) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }
    const y = scrollY;
    if (Math.abs(y - lastY) >= 8) {
      html.classList.toggle('nav-hidden', y > lastY && y > 120);
      lastY = y;
    }
  };

  /* Viewer: a click opens the piece full screen. Arrows, swipe, Esc and the Back button work. */
  const items = Array.from(document.querySelectorAll('.item'));
  const lb = document.querySelector('.lightbox');
  const lbFig = lb.querySelector('.lightbox__fig');
  const lbImg = lb.querySelector('.lightbox__img');
  const lbName = lb.querySelector('[data-lb-name]');
  const lbDetail = lb.querySelector('[data-lb-detail]');
  const lbCount = lb.querySelector('[data-lb-count]');
  const lbCloseBtn = lb.querySelector('[data-lb-close]');
  const behind = [document.querySelector('main'), hudTop];
  let lbIndex = 0;
  let lbReturn = null;

  const srcOf = (el) => { const img = el.querySelector('img'); return img.currentSrc || img.src; };
  const lbRender = () => {
    const el = items[lbIndex];
    lbImg.src = srcOf(el);
    lbImg.alt = el.querySelector('img').alt;
    lbName.textContent = el.dataset.name || '';
    lbDetail.textContent = el.dataset.detail || '';
    lbCount.textContent = pad2(lbIndex + 1) + ' / ' + pad2(items.length);
    new Image().src = srcOf(items[(lbIndex + 1) % items.length]); /* warm up the next one */
  };
  const lbOpen = (index) => {
    lbIndex = index;
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
    lbIndex = (lbIndex + d + items.length) % items.length;
    lbRender();
    fadeIn(lbImg, 260);
    fadeIn(lbName, 260);
  };

  items.forEach((el, i) => el.addEventListener('click', () => lbOpen(i)));
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

  /* Scroll: the square grows into the blue screen; pieces drift at slightly different speeds. */
  const entrance = document.querySelector('.scene--entrance');
  const stick = entrance.querySelector('.scene__stick');
  const fields = Array.from(document.querySelectorAll('.field')).map((el) => ({
    el,
    items: Array.from(el.querySelectorAll('.item'))
  }));

  let cover = 1;
  const measure = () => {
    cover = (Math.hypot(innerWidth, innerHeight) / 28) * 1.04;
    measureSections();
  };
  measure();

  let queued = false;
  const update = () => {
    queued = false;
    updateMenu();

    const er = entrance.getBoundingClientRect();
    const total = er.height - innerHeight;
    const p = total > 0 ? clamp(-er.top / total) : 0;
    stick.style.setProperty('--s', (1 + (cover - 1) * ease(range(p, 0.04, 0.58))).toFixed(3));
    stick.style.setProperty('--hint-o', (1 - range(p, 0, 0.05)).toFixed(3));
    stick.style.setProperty('--intro-o', (1 - range(p, 0, 0.18)).toFixed(3));
    stick.style.setProperty('--name-o', (1 - range(p, 0.5, 0.64)).toFixed(3));
    stick.style.setProperty('--name-y', (-range(p, 0.5, 0.64) * 48).toFixed(1) + 'px');
    stick.style.setProperty('--end-o', range(p, 0.62, 0.8).toFixed(3));
    stick.style.setProperty('--judd-s', (0.82 + 0.18 * ease(range(p, 0.62, 1))).toFixed(3));

    if (reduce) return;
    const k = innerWidth < 760 ? 0.35 : 1; /* gentler on a phone so nothing collides */
    fields.forEach((f) => {
      const r = f.el.getBoundingClientRect();
      if (r.bottom < -innerHeight || r.top > innerHeight * 2) return;
      const offset = (r.top + r.height / 2 - innerHeight / 2) * k;
      f.items.forEach((item) => {
        item.style.setProperty('--py', (offset * parseFloat(item.dataset.speed || '0')).toFixed(1) + 'px');
      });
    });
  };
  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  };
  const remeasure = () => { measure(); onScroll(); };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', remeasure);
  addEventListener('load', remeasure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
  /* Any change in the page's height (fonts, images, rotation) moves the sections: measure again. */
  if (window.ResizeObserver) new ResizeObserver(remeasure).observe(document.body);
  update();
})();
