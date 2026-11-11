(() => {
  const html = document.documentElement;
  const body = document.body;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const range = (p, a, b) => clamp((p - a) / (b - a));
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const pad4 = (n) => String(Math.max(0, Math.round(n))).padStart(4, '0');

  /* Loader: a Klein square and a counter, then it lifts. */
  const loader = document.querySelector('.loader');
  const count = document.querySelector('.loader__count');
  if (loader) {
    if (reduce) {
      loader.classList.add('is-done');
    } else {
      const start = performance.now();
      const dur = 1300;
      const step = (t) => {
        const k = clamp((t - start) / dur);
        count.textContent = String(Math.round(ease(k) * 100)).padStart(3, '0');
        if (k < 1) requestAnimationFrame(step);
        else setTimeout(() => loader.classList.add('is-done'), 180);
      };
      requestAnimationFrame(step);
      setTimeout(() => loader.classList.add('is-done'), 2600); /* never block the page */
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
  }, { passive: true });

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
      requestAnimationFrame(follow);
    };
    requestAnimationFrame(follow);
  }

  /* Section label and HUD colour follow the section in the middle of the screen. */
  const sectionLabel = document.querySelector('[data-section-label]');
  const sections = Array.from(document.querySelectorAll('[data-label]'));
  let current = null;
  const updateSection = () => {
    const mid = innerHeight / 2;
    const hit = sections.find((s) => {
      const r = s.getBoundingClientRect();
      return r.top <= mid && r.bottom > mid;
    }) || sections[0];
    if (hit === current) return;
    current = hit;
    sectionLabel.textContent = hit.dataset.label;
    body.dataset.theme = hit.dataset.theme || 'dark';
  };

  /* Work: the piece you point at comes into focus. */
  const pieces = Array.from(document.querySelectorAll('.piece'));
  const nameEl = document.querySelector('[data-piece-name]');
  const detailEl = document.querySelector('[data-piece-detail]');
  const noEl = document.querySelector('[data-piece-no]');
  pieces.forEach((piece) => {
    const activate = () => {
      pieces.forEach((p) => p.classList.toggle('is-active', p === piece));
      nameEl.textContent = piece.dataset.name;
      detailEl.textContent = piece.dataset.detail;
      noEl.textContent = piece.dataset.no + ' / ' + String(pieces.length).padStart(2, '0');
    };
    piece.addEventListener('mouseenter', activate);
    piece.addEventListener('focus', activate);
    piece.addEventListener('click', activate);
  });

  /* Scroll scenes. */
  const entrance = document.querySelector('.scene--entrance');
  const entranceStick = entrance.querySelector('.scene__stick');
  const focus = document.querySelector('.scene--focus');
  const focusStick = focus.querySelector('.scene__stick');
  const field = document.querySelector('.work__field');
  const situField = document.querySelector('.situ__field');
  const shots = Array.from(document.querySelectorAll('.shot'));

  const progress = (el) => {
    const r = el.getBoundingClientRect();
    const total = r.height - innerHeight;
    return total > 0 ? clamp(-r.top / total) : 0;
  };

  let cover = 1;
  const measure = () => { cover = (Math.hypot(innerWidth, innerHeight) / 28) * 1.04; };
  measure();

  let queued = false;
  const update = () => {
    queued = false;
    updateSection();

    const p = progress(entrance);
    const grow = ease(range(p, 0.04, 0.58));
    entranceStick.style.setProperty('--s', (1 + (cover - 1) * grow).toFixed(3));
    entranceStick.style.setProperty('--intro-o', (1 - range(p, 0, 0.18)).toFixed(3));
    entranceStick.style.setProperty('--name-o', (1 - range(p, 0.5, 0.64)).toFixed(3));
    entranceStick.style.setProperty('--name-y', (-range(p, 0.5, 0.64) * 48).toFixed(1) + 'px');
    entranceStick.style.setProperty('--end-o', range(p, 0.62, 0.8).toFixed(3));
    entranceStick.style.setProperty('--judd-s', (0.82 + 0.18 * ease(range(p, 0.62, 1))).toFixed(3));

    const f = progress(focus);
    focusStick.style.setProperty('--fs', (0.22 + 0.86 * ease(range(f, 0, 0.78))).toFixed(3));
    focusStick.style.setProperty('--fo', range(f, 0, 0.1).toFixed(3));
    focusStick.style.setProperty('--fc', range(f, 0.62, 0.82).toFixed(3));

    if (!reduce) {
      const drift = (box, items) => {
        const r = box.getBoundingClientRect();
        if (r.bottom < -innerHeight || r.top > innerHeight * 2) return;
        const offset = r.top + r.height / 2 - innerHeight / 2;
        items.forEach((item) => {
          const speed = parseFloat(item.dataset.speed || '0');
          item.style.setProperty('--py', (offset * speed).toFixed(1) + 'px');
        });
      };
      drift(field, pieces);
      drift(situField, shots);
    }
  };
  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { measure(); onScroll(); });
  update();
})();
