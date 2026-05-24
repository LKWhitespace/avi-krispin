/* shared interactions: scroll-reveal, count-up, marquee, sticky header, parallax, sticky CTA */
(function () {
  // ---- scroll reveal ----
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

  // Reveal items inside a horizontal carousel as a group when the carousel
  // itself enters viewport — otherwise off-screen cards never intersect and
  // stay at opacity:0, which on iOS shows as cards "appearing/disappearing"
  // while the arrows scroll them in.
  document.querySelectorAll('[data-carousel]').forEach((carousel) => {
    const items = carousel.querySelectorAll('.reveal');
    if (!items.length) return;
    const groupIO = new IntersectionObserver((entries, observer) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        items.forEach((el) => { el.classList.add('in'); io.unobserve(el); });
        observer.unobserve(e.target);
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    groupIO.observe(carousel);
  });

  // ---- count-up ----
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const countObserver = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target;
      const target = parseFloat(el.dataset.count || '0');
      const dur = reducedMotion ? 0 : parseInt(el.dataset.dur || '1600', 10);
      const t0 = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - t0) / dur);
        const v = target * ease(t);
        const isInt = Number.isInteger(target);
        el.textContent = isInt ? Math.round(v).toLocaleString('he-IL') : v.toFixed(1);
        if (t < 1) requestAnimationFrame(tick);
        else el.textContent = isInt ? Math.round(target).toLocaleString('he-IL') : target.toFixed(1);
      };
      requestAnimationFrame(tick);
      countObserver.unobserve(el);
    }
  }, { threshold: 0.4 });
  document.querySelectorAll('[data-count]').forEach((el) => {
    el.textContent = '0';
    countObserver.observe(el);
  });

  // ---- marquee (CSS-driven; pause on hover handled by CSS) ----
  // duplicate children so scroll loops cleanly
  document.querySelectorAll('.mq-track').forEach((track) => {
    const html = track.innerHTML;
    track.innerHTML = html + html;
  });

  // ---- sticky header shrink ----
  const header = document.querySelector('[data-shrink-header]');
  if (header) {
    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop;
      header.classList.toggle('shrunk', y > 80);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ---- hero parallax (subtle, smoothed via rAF) — skip on touch + reduced motion ----
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover: none)').matches;
  const heroLayers = document.querySelectorAll('[data-parallax]');
  if (heroLayers.length && !prefersReduced && !isTouch) {
    const targets = Array.from(heroLayers).map((el) => ({
      el,
      k: parseFloat(el.dataset.parallax || '0.2'),
      current: 0,
      target: 0,
    }));
    let ticking = false;
    const updateTargets = () => {
      const y = window.scrollY || document.documentElement.scrollTop;
      const max = window.innerHeight * 1.2;
      const clamped = Math.max(-max, Math.min(max, y));
      targets.forEach((t) => { t.target = clamped * t.k; });
    };
    const tick = () => {
      let stillAnimating = false;
      targets.forEach((t) => {
        const diff = t.target - t.current;
        if (Math.abs(diff) > 0.1) {
          t.current += diff * 0.12;
          stillAnimating = true;
        } else {
          t.current = t.target;
        }
        t.el.style.transform = `translate3d(0, ${t.current.toFixed(2)}px, 0)`;
      });
      ticking = stillAnimating;
      if (stillAnimating) requestAnimationFrame(tick);
    };
    const onPar = () => {
      updateTargets();
      if (!ticking) { ticking = true; requestAnimationFrame(tick); }
    };
    window.addEventListener('scroll', onPar, { passive: true });
    updateTargets();
    tick();
  }

  // ---- carousel navigation (reusable for any horizontal scroll container) ----
  // Usage:
  //   <div data-carousel>...</div>                      → arrows overlay the scroll area
  //   <div data-carousel data-carousel-nav="...">...    → arrows render inside the target selector
  //   data-carousel-step="0.85" → override per-click scroll fraction of clientWidth
  function initCarouselNav(scrollEl) {
    if (!scrollEl || scrollEl.dataset.carouselInit) return;
    scrollEl.dataset.carouselInit = '1';

    const isRTL = getComputedStyle(scrollEl).direction === 'rtl';
    const stepFraction = parseFloat(scrollEl.dataset.carouselStep || '0.85');
    const navTargetSel = scrollEl.dataset.carouselNav;
    const navTarget = navTargetSel ? document.querySelector(navTargetSel) : null;

    const nav = document.createElement('div');
    nav.className = 'carousel-nav';
    if (navTarget) {
      navTarget.appendChild(nav);
    } else {
      // Fallback: overlay the buttons across the scroll container
      const wrap = document.createElement('div');
      wrap.className = 'carousel-wrap';
      scrollEl.parentNode.insertBefore(wrap, scrollEl);
      wrap.appendChild(scrollEl);
      wrap.appendChild(nav);
      nav.classList.add('carousel-nav-overlay');
    }

    const chevron = (dir) => {
      const d = dir === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6';
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
    };
    const makeBtn = (cls, label, dir) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'carousel-btn ' + cls;
      b.setAttribute('aria-label', label);
      b.innerHTML = chevron(dir);
      return b;
    };

    // Physically: LEFT button has left-pointing chevron, RIGHT button has right-pointing chevron.
    // In RTL the LEFT button means "next/forward" (more content). In LTR the RIGHT button means "next".
    const nextBtn = makeBtn('next', 'הבא', isRTL ? 'left' : 'right');
    const prevBtn = makeBtn('prev', 'הקודם', isRTL ? 'right' : 'left');
    // Container is direction:ltr, so first appended = left, second = right.
    if (isRTL) {
      nav.appendChild(nextBtn); // left
      nav.appendChild(prevBtn); // right
    } else {
      nav.appendChild(prevBtn); // left
      nav.appendChild(nextBtn); // right
    }

    const forwardSign = isRTL ? -1 : 1;
    const step = () => Math.max(120, scrollEl.clientWidth * stepFraction);

    // iOS Safari fights snap-mandatory containers when scrollBy({smooth}) is
    // used — the snap yanks the scroll mid-flight, producing the
    // jump/glitch the user can reproduce on testimonials. Disable snap for
    // the duration of the programmatic scroll, then restore it on settle.
    const isIOS = /iP(hone|ad|od)/.test(navigator.platform) ||
      (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
    let restoreTimer = null;
    const scrollOneStep = (dx) => {
      if (!isIOS) {
        scrollEl.scrollBy({ left: dx, behavior: 'smooth' });
        return;
      }
      const snapInline = scrollEl.style.scrollSnapType;
      scrollEl.style.scrollSnapType = 'none';
      scrollEl.scrollBy({ left: dx, behavior: 'smooth' });
      let lastLeft = scrollEl.scrollLeft;
      let idle = 0;
      const onScroll = () => {
        if (scrollEl.scrollLeft !== lastLeft) { idle = 0; lastLeft = scrollEl.scrollLeft; }
      };
      scrollEl.addEventListener('scroll', onScroll, { passive: true });
      clearInterval(restoreTimer);
      restoreTimer = setInterval(() => {
        idle += 1;
        if (idle >= 4) { // ~4 * 80ms = ~320ms of no movement
          clearInterval(restoreTimer);
          scrollEl.removeEventListener('scroll', onScroll);
          scrollEl.style.scrollSnapType = snapInline;
        }
      }, 80);
    };

    nextBtn.addEventListener('click', () => scrollOneStep(forwardSign * step()));
    prevBtn.addEventListener('click', () => scrollOneStep(-forwardSign * step()));

    const update = () => {
      const max = scrollEl.scrollWidth - scrollEl.clientWidth;
      if (max <= 4) {
        nextBtn.classList.remove('visible');
        prevBtn.classList.remove('visible');
        return;
      }
      const dist = Math.abs(scrollEl.scrollLeft);
      const atStart = dist < 4;
      const atEnd = dist >= max - 4;
      nextBtn.classList.toggle('visible', !atEnd);
      prevBtn.classList.toggle('visible', !atStart);
    };

    scrollEl.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(update).observe(scrollEl);
    }
    requestAnimationFrame(update);
  }

  document.querySelectorAll('[data-carousel]').forEach(initCarouselNav);

  // ---- sticky WhatsApp reveal on scroll past hero ----
  const fab = document.querySelector('[data-fab]');
  if (fab) {
    const onFab = () => {
      const y = window.scrollY || document.documentElement.scrollTop;
      fab.classList.toggle('visible', y > 400);
    };
    window.addEventListener('scroll', onFab, { passive: true });
    onFab();
  }
})();
