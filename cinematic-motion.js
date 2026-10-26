/* Aurelle Dental — cinematic scroll direction and visual sequencing.
   Pure frontend motion layer: no analytics, storage, external APIs or route changes. */
(function () {
  'use strict';
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
  const motionState = { raf: 0, scenes: [], observer: null, started: false };

  function addIntro() {
    if (reducedMotion || document.querySelector('.cinema-intro')) return;
    const intro = document.createElement('div');
    intro.className = 'cinema-intro';
    intro.setAttribute('aria-hidden', 'true');
    intro.innerHTML = '<div class="cinema-intro__beam"></div><div class="cinema-intro__beam cinema-intro__beam--two"></div><div class="cinema-intro__lens"></div><div class="cinema-intro__copy"><div class="cinema-intro__brand">Aurelle<span>Thoughtful dental care</span></div><div class="cinema-intro__status">A considered experience<div class="cinema-intro__bar"></div></div></div>';
    document.body.appendChild(intro);
    const remove = () => { if (intro.isConnected) intro.remove(); };
    window.setTimeout(() => { intro.classList.add('is-leaving'); window.setTimeout(remove, 900); }, 1700);
    // Keep the initial impression short even if a device runs CSS animations slowly.
    window.setTimeout(remove, 3100);
  }

  function addSceneChrome(section, index, total) {
    if (!section || section.dataset.cinemaPrepared === 'true') return;
    section.dataset.cinemaPrepared = 'true';
    section.classList.add('cinema-scene');
    const isDark = section.classList.contains('dark-feature') || section.classList.contains('site-footer');
    const isWarm = section.classList.contains('hero') || section.classList.contains('final-cta') || section.classList.contains('review-section');
    const isLilac = section.classList.contains('treatments-section') || section.classList.contains('story-section') || section.classList.contains('page-hero');
    section.classList.add(isDark ? 'cinema-scene--midnight' : isWarm ? 'cinema-scene--warm' : isLilac ? 'cinema-scene--lavender' : 'cinema-scene--pearl');

    if (!section.querySelector(':scope > .cinema-lights')) {
      const lights = document.createElement('div');
      lights.className = 'cinema-lights';
      lights.setAttribute('aria-hidden', 'true');
      section.insertBefore(lights, section.firstChild);
    }
    if (!section.classList.contains('hero') && !section.classList.contains('trust-strip') && !section.classList.contains('site-footer')) {
      if (!section.querySelector(':scope > .cinema-threshold')) {
        const threshold = document.createElement('div');
        threshold.className = 'cinema-threshold';
        threshold.setAttribute('aria-hidden', 'true');
        threshold.innerHTML = '<span></span>'.repeat(7);
        section.appendChild(threshold);
      }
    }
    if (!section.querySelector(':scope > .cinema-scene__index') && !section.classList.contains('trust-strip') && !section.classList.contains('site-footer')) {
      const label = document.createElement('span');
      label.className = 'cinema-scene__index';
      label.setAttribute('aria-hidden', 'true');
      label.textContent = `${String(index).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
      section.appendChild(label);
    }
  }

  function prepareRevealItems(root) {
    if (reducedMotion) return;
    const candidates = root.querySelectorAll('.section-head, .hero-copy, .hero-art, .treatment-card, .story-art, .story-copy, .dark-copy, .dark-orb-wrap, .journey-step, .review-section .listing-card, .faq-intro, .faq-list, .cta-inner > div, .page-hero-grid > div');
    candidates.forEach((el, index) => {
      if (el.dataset.cinemaReveal === 'true') return;
      // Do not override existing reveal orchestration on cards which use its own visibility state.
      el.dataset.cinemaReveal = 'true';
      el.classList.add('cinema-reveal');
      if (el.classList.contains('story-art') || el.classList.contains('dark-orb-wrap') || el.classList.contains('hero-art')) el.classList.add('cinema-reveal--side');
      else if (el.classList.contains('story-copy') || el.classList.contains('dark-copy')) el.classList.add('cinema-reveal--left');
      const delay = Math.min(index % 4, 3) * 75;
      el.style.setProperty('--cinema-delay', `${delay}ms`);
    });
  }

  function rebuild() {
    const app = document.getElementById('app');
    if (!app) return;
    const main = app.querySelector('#main');
    if (!main) return;
    const sections = Array.from(main.querySelectorAll('section.hero, section.trust-strip, section.section, section.dark-feature, section.final-cta, section.page-hero, section.error-404'));
    motionState.scenes = sections;
    sections.forEach((section, i) => addSceneChrome(section, i + 1, sections.length));
    prepareRevealItems(main);
    if (motionState.observer) motionState.observer.disconnect();
    if ('IntersectionObserver' in window && !reducedMotion) {
      motionState.observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-cinema-visible');
            motionState.observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.14, rootMargin: '0px 0px -5% 0px' });
      main.querySelectorAll('.cinema-reveal:not(.is-cinema-visible)').forEach(el => motionState.observer.observe(el));
    } else {
      main.querySelectorAll('.cinema-reveal').forEach(el => el.classList.add('is-cinema-visible'));
    }
    requestTick();
  }

  function tick() {
    motionState.raf = 0;
    const viewH = Math.max(1, window.innerHeight);
    motionState.scenes.forEach(section => {
      if (!section.isConnected) return;
      const rect = section.getBoundingClientRect();
      const total = Math.max(1, rect.height + viewH);
      const progress = Math.max(0, Math.min(1, (viewH - rect.top) / total));
      const center = rect.top + rect.height / 2;
      const visibility = Math.max(0, 1 - Math.abs(center - viewH * .5) / (viewH * .95));
      section.style.setProperty('--scene-progress', progress.toFixed(4));
      section.style.setProperty('--scene-visibility', visibility.toFixed(4));
      section.style.setProperty('--scene-opacity', (0.13 + visibility * 0.38).toFixed(3));
      section.style.setProperty('--threshold-opacity', (visibility * 0.72).toFixed(3));
      section.style.setProperty('--scene-x1', `${(76 - progress * 13).toFixed(2)}%`);
      section.style.setProperty('--scene-y1', `${(22 + progress * 10).toFixed(2)}%`);
      section.style.setProperty('--scene-x2', `${(16 + progress * 16).toFixed(2)}%`);
      section.style.setProperty('--scene-y2', `${(85 - progress * 12).toFixed(2)}%`);
      section.style.setProperty('--scene-sweep', `${(120 - progress * 180).toFixed(2)}%`);
      section.style.setProperty('--bar-scale', (0.35 + progress * 0.65).toFixed(3));
      section.style.setProperty('--story-tilt', `${(-progress * 4).toFixed(2)}deg`);
      section.style.setProperty('--dark-x', `${(78 - progress * 18).toFixed(2)}%`);
      section.style.setProperty('--dark-y', `${(30 + progress * 16).toFixed(2)}%`);
      section.style.setProperty('--dark-orb-y', `${(-progress * 12).toFixed(1)}px`);
      section.style.setProperty('--dark-orb-tilt', `${(progress * 5).toFixed(2)}deg`);
      section.style.setProperty('--dark-angle', `${(progress * 45).toFixed(2)}deg`);
      section.style.setProperty('--dark-step-x', `${((1 - progress) * -8).toFixed(1)}px`);
      section.style.setProperty('--cta-x', `${(81 - progress * 17).toFixed(2)}%`);
      section.style.setProperty('--page-tilt-x', `${(progress * 5).toFixed(2)}deg`);
      section.style.setProperty('--page-tilt-y', `${(-progress * 5).toFixed(2)}deg`);
      if (section.classList.contains('hero')) {
        const parallax = Math.max(-26, Math.min(26, -rect.top * .045));
        section.style.setProperty('--hero-scene-progress', progress.toFixed(4));
        const art = section.querySelector('.hero-art');
        if (art && !reducedMotion) art.style.setProperty('--cinema-parallax', `${parallax.toFixed(1)}px`);
      }
    });
    const header = document.getElementById('site-header');
    if (header) header.classList.toggle('scrolled', window.scrollY > 25);
  }
  function requestTick() { if (!motionState.raf) motionState.raf = window.requestAnimationFrame(tick); }

  function bindPointerAtmosphere() {
    if (!finePointer || reducedMotion || motionState.started) return;
    motionState.started = true;
    document.addEventListener('pointermove', event => {
      const hero = document.querySelector('.hero');
      if (!hero || event.clientY > window.innerHeight * 1.15) return;
      const rect = hero.getBoundingClientRect();
      const x = (event.clientX - rect.left) / Math.max(1, rect.width) - .5;
      const y = (event.clientY - rect.top) / Math.max(1, rect.height) - .5;
      hero.style.setProperty('--cinema-pointer-x', `${(x * 95).toFixed(1)}px`);
      hero.style.setProperty('--cinema-pointer-y', `${(y * 80).toFixed(1)}px`);
    }, { passive: true });
    document.addEventListener('pointermove', event => {
      const card = event.target && event.target.closest && event.target.closest('.treatment-card, .person-card');
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const px = (event.clientX - rect.left) / Math.max(1, rect.width) - .5;
      const py = (event.clientY - rect.top) / Math.max(1, rect.height) - .5;
      card.style.setProperty('--card-tilt-x', `${(px * 2.6).toFixed(2)}deg`);
      card.style.setProperty('--card-tilt-y', `${(-py * 2.2).toFixed(2)}deg`);
    }, { passive: true });
    document.addEventListener('pointerout', event => {
      const card = event.target && event.target.closest && event.target.closest('.treatment-card, .person-card');
      if (!card || (event.relatedTarget && card.contains(event.relatedTarget))) return;
      card.style.setProperty('--card-tilt-x', '0deg');
      card.style.setProperty('--card-tilt-y', '0deg');
    }, { passive: true });
  }

  function boot() {
    if (!document.body) return;
    addIntro();
    document.body.classList.add('cinema-motion-ready');
    rebuild();
    bindPointerAtmosphere();
    window.addEventListener('scroll', requestTick, { passive: true });
    window.addEventListener('resize', requestTick, { passive: true });
    const app = document.getElementById('app');
    if (app && 'MutationObserver' in window) {
      const observer = new MutationObserver(() => {
        if (observer._refresh) window.clearTimeout(observer._refresh);
        observer._refresh = window.setTimeout(rebuild, 45);
      });
      observer.observe(app, { childList: true, subtree: true });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
