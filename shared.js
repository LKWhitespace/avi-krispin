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
