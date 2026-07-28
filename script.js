/* ==========================================================================
   BB CATERING — interaction script
   1) Header shrink + blur on scroll
   2) Hero video grid: pause offscreen cells on tablet/mobile (bandwidth)
   3) Parallax on contact background image
   4) Statement text: word-by-word color reveal tied to scroll position
      (grey -> ink, as the section is scrolled through)
   5) Generic reveal-on-scroll (fade/up/scale) via IntersectionObserver
   6) Team carousel (nav buttons); hover greyscale->color handled in pure CSS
   7) Contact form: floating labels (CSS) + lightweight submit feedback
   8) Custom cursor dot that grows over interactive elements
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------------------------------------------------------------------
     1) HEADER — shrink & blur once page scrolls past hero threshold
  --------------------------------------------------------------------- */
  const header = document.getElementById('siteHeader');
  const onHeaderScroll = () => {
    if (window.scrollY > 80) {
      header.classList.add('is-scrolled');
    } else {
      header.classList.remove('is-scrolled');
    }
  };
  onHeaderScroll();
  window.addEventListener('scroll', onHeaderScroll, { passive: true });

  /* ---------------------------------------------------------------------
     1b) HAMBURGER MENU — toggle the mobile panel open/closed
  --------------------------------------------------------------------- */
  const navBurger = document.getElementById('navBurger');
  const mobileMenu = document.getElementById('mobileMenu');

  const closeMobileMenu = () => {
    navBurger.classList.remove('is-open');
    mobileMenu.classList.remove('is-open');
    navBurger.setAttribute('aria-expanded', 'false');
  };

  navBurger.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('is-open');
    navBurger.classList.toggle('is-open', isOpen);
    navBurger.setAttribute('aria-expanded', String(isOpen));
  });

  // Close the menu whenever a link inside it is clicked (navigating away)
  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMobileMenu);
  });

  /* ---------------------------------------------------------------------
     2) HERO VIDEO GRID — the 3rd cell is CSS-hidden ≤900px, the 2nd cell
        is also hidden ≤600px (see style.css). Hidden videos would still
        keep playing/decoding in the background otherwise, so mirror the
        same breakpoints here and actually pause them — saves data on
        phones and tablets, and resumes playback if the window is resized
        back up past a breakpoint.
  --------------------------------------------------------------------- */
  const heroCells = document.querySelectorAll('.hero-video-cell');
  const tabletQuery = window.matchMedia('(max-width: 900px)');
  const mobileQuery = window.matchMedia('(max-width: 600px)');

  const syncHeroVideos = () => {
    heroCells.forEach(cell => {
      const idx = cell.dataset.heroCell;
      const isHidden = (idx === '3' && tabletQuery.matches) || (idx === '2' && mobileQuery.matches);
      const video = cell.querySelector('video');
      if (!video) return;
      if (isHidden) {
        video.pause();
      } else if (video.paused) {
        video.play().catch(() => {}); // autoplay may need a user gesture on some browsers
      }
    });
  };
  syncHeroVideos();
  tabletQuery.addEventListener('change', syncHeroVideos);
  mobileQuery.addEventListener('change', syncHeroVideos);

  /* ---------------------------------------------------------------------
     3) PARALLAX — contact background image drifts slower than scroll
  --------------------------------------------------------------------- */
  const parallaxEls = document.querySelectorAll('[data-parallax]');
  let ticking = false;

  const updateParallax = () => {
    parallaxEls.forEach(el => {
      const rect = el.parentElement.getBoundingClientRect();
      const speed = 0.18;
      const offset = rect.top * speed;
      el.style.transform = `translate3d(0, ${offset}px, 0)`;
    });
    ticking = false;
  };

  const requestParallax = () => {
    if (!ticking) {
      window.requestAnimationFrame(updateParallax);
      ticking = true;
    }
  };

  if (parallaxEls.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.addEventListener('scroll', requestParallax, { passive: true });
    window.addEventListener('resize', requestParallax);
    updateParallax();
  }

  /* ---------------------------------------------------------------------
     4) STATEMENT — words brighten from muted to ink color as the section
        scrolls through the viewport. Progress is derived from how far the
        section has travelled between entering and leaving the viewport,
        then mapped across the word list so it reads like a "fill" effect.
  --------------------------------------------------------------------- */
  const scrollColorEl = document.querySelector('[data-scroll-color]');

  if (scrollColorEl) {
    // wrap every already-marked .word / .word-strong — they exist in HTML.
    const words = Array.from(scrollColorEl.querySelectorAll('.word, .word-strong'));
    const section = scrollColorEl.closest('section');

    const updateStatementColor = () => {
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;

      // progress 0 -> 1 as section moves from "just entered bottom"
      // to "about to leave top", biased so the effect completes while
      // the block is comfortably centered on screen.
      const start = vh * 0.85;
      const end = vh * 0.15 - rect.height * 0.35;
      const raw = (start - rect.top) / (start - end);
      const progress = Math.min(1, Math.max(0, raw));

      const litCount = Math.floor(progress * words.length);
      words.forEach((w, i) => {
        if (i < litCount) {
          w.classList.add('is-lit');
        } else {
          w.classList.remove('is-lit');
        }
      });
    };

    let statementTicking = false;
    const requestStatementUpdate = () => {
      if (!statementTicking) {
        window.requestAnimationFrame(() => {
          updateStatementColor();
          statementTicking = false;
        });
        statementTicking = true;
      }
    };

    window.addEventListener('scroll', requestStatementUpdate, { passive: true });
    window.addEventListener('resize', requestStatementUpdate);
    updateStatementColor();
  }

  /* ---------------------------------------------------------------------
     5) GENERIC REVEAL — fade/up/scale/line elements animate in once
        when they cross into the viewport. Staggered by DOM order within
        their nearest common container.
  --------------------------------------------------------------------- */
  const revealSelectors = '.reveal-fade, .reveal-up, .reveal-scale, .reveal-line';
  const revealEls = document.querySelectorAll(revealSelectors);

  if ('IntersectionObserver' in window) {
    const groups = new Map();
    revealEls.forEach(el => {
      const parent = el.parentElement;
      if (!groups.has(parent)) groups.set(parent, []);
      groups.get(parent).push(el);
    });
    groups.forEach(list => {
      list.forEach((el, i) => {
        el.style.transitionDelay = `${Math.min(i * 90, 360)}ms`;
      });
    });

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -8% 0px'
    });

    revealEls.forEach(el => revealObserver.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  /* ---------------------------------------------------------------------
     6) TEAM CAROUSEL — prev/next scroll by one card width
  --------------------------------------------------------------------- */
  const track = document.getElementById('teamTrack');
  const prevBtn = document.getElementById('teamPrev');
  const nextBtn = document.getElementById('teamNext');

  if (track && prevBtn && nextBtn) {
    const scrollByCard = (dir) => {
      const card = track.querySelector('.team-card');
      const gap = 24;
      const distance = card ? card.getBoundingClientRect().width + gap : 320;
      track.scrollBy({ left: dir * distance, behavior: 'smooth' });
    };
    prevBtn.addEventListener('click', () => scrollByCard(-1));
    nextBtn.addEventListener('click', () => scrollByCard(1));
  }

  /* ---------------------------------------------------------------------
     7) CONTACT FORM — lightweight submit feedback (no backend wired up)
  --------------------------------------------------------------------- */
  const form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = form.querySelector('.btn-submit');
      const original = btn.innerHTML;
      btn.innerHTML = '<span class="arrow">✓</span> Odoslané';
      btn.style.pointerEvents = 'none';
      setTimeout(() => {
        btn.innerHTML = original;
        btn.style.pointerEvents = '';
        form.reset();
      }, 2400);
    });
  }

  /* ---------------------------------------------------------------------
     8) CUSTOM CURSOR — grows over links/buttons/images; desktop only
  --------------------------------------------------------------------- */
  const cursor = document.querySelector('.cursor-dot');
  const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (cursor && isFinePointer) {
    let cx = 0, cy = 0, tx = 0, ty = 0;

    window.addEventListener('mousemove', (e) => {
      tx = e.clientX;
      ty = e.clientY;
      cursor.classList.add('is-active');
    });

    const animateCursor = () => {
      cx += (tx - cx) * 0.22;
      cy += (ty - cy) * 0.22;
      cursor.style.left = `${cx}px`;
      cursor.style.top = `${cy}px`;
      requestAnimationFrame(animateCursor);
    };
    animateCursor();

    const hoverTargets = document.querySelectorAll('a, button, .occasion-tile, .team-photo');
    hoverTargets.forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('is-hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
    });

    document.addEventListener('mouseleave', () => cursor.classList.remove('is-active'));
  }

});