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
    // Track the scroll-space wrapper (not the whole <section>): its height
    // is exactly how far the user scrolls while the text is pinned via
    // position:sticky, so progress 0->1 across it maps directly to how much
    // of that pinned scroll has happened.
    const scrollSpace = document.querySelector('.statement-scroll-space') || scrollColorEl.closest('section');

    const updateStatementColor = () => {
      const rect = scrollSpace.getBoundingClientRect();
      const vh = window.innerHeight;

      // The element is pinned (sticky top:0) for exactly the scroll range
      // where rect.top goes from 0 down to -(rect.height - vh). Map progress
      // 0->1 across only that pinned range, so lighting starts the instant
      // the text locks in place and finishes the instant it releases.
      const pinnedDistance = rect.height - vh;
      const raw = -rect.top / (pinnedDistance > 0 ? pinnedDistance : 1);
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
  const revealSelectors = '.reveal-fade, .reveal-up, .reveal-scale, .reveal-line, .family-photo-reveal';
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
     6) MOBILE HAMBURGER MENU
  --------------------------------------------------------------------- */
  const hamburger = document.getElementById('navHamburger');
  const mobilePanel = document.getElementById('navMobilePanel');

  if (hamburger && mobilePanel) {
    const closeMobileMenu = () => {
      hamburger.classList.remove('is-open');
      hamburger.setAttribute('aria-expanded', 'false');
      mobilePanel.classList.remove('is-open');
      document.body.style.overflow = '';
    };
    const openMobileMenu = () => {
      hamburger.classList.add('is-open');
      hamburger.setAttribute('aria-expanded', 'true');
      mobilePanel.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    };

    hamburger.addEventListener('click', () => {
      if (mobilePanel.classList.contains('is-open')) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    });

    mobilePanel.querySelectorAll('[data-nav-mobile-link]').forEach(link => {
      link.addEventListener('click', closeMobileMenu);
    });
  }

  /* ---------------------------------------------------------------------
     7) CONTACT FORM — real submission via Web3Forms API (fetch), with
        lightweight visual feedback on the button. The submit button lives
        outside the <form> element (linked via its form="contactForm"
        attribute) so it can sit in a separate panel row alongside the
        Instagram link — so it's looked up by id rather than as a
        descendant of the form.
  --------------------------------------------------------------------- */
  const form = document.getElementById('contactForm');
  const submitBtn = document.querySelector('.btn-submit');
  if (form && submitBtn) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      // Honeypot: if this hidden field got filled in, it's a bot — silently
      // pretend to succeed without ever sending the request.
      const honeypot = form.querySelector('[name="botcheck"]');
      if (honeypot && honeypot.checked) {
        form.reset();
        return;
      }

      const original = submitBtn.innerHTML;
      submitBtn.innerHTML = '<span class="arrow">…</span> odosielam';
      submitBtn.style.pointerEvents = 'none';

      const formData = new FormData(form);

      fetch(form.action, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            submitBtn.innerHTML = '<span class="arrow">✓</span> odoslané';
            form.reset();
          } else {
            submitBtn.innerHTML = '<span class="arrow">!</span> chyba, skúste znova';
          }
        })
        .catch(() => {
          submitBtn.innerHTML = '<span class="arrow">!</span> chyba, skúste znova';
        })
        .finally(() => {
          setTimeout(() => {
            submitBtn.innerHTML = original;
            submitBtn.style.pointerEvents = '';
          }, 3200);
        });
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

  /* ---------------------------------------------------------------------
     9) COOKIE CONSENT BANNER — simple accept banner, remembers choice in
        localStorage so it only shows once per browser. No cookie
        categories/preferences — a single "Súhlasím" acknowledges use of
        essential + analytics cookies site-wide.
  --------------------------------------------------------------------- */
  const COOKIE_CONSENT_KEY = 'bb_cookie_consent';
  if (!localStorage.getItem(COOKIE_CONSENT_KEY)) {
    const banner = document.createElement('div');
    banner.className = 'cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Súhlas s používaním cookies');
    banner.innerHTML = `
      <p class="cookie-banner-text">
        Táto stránka používa cookies nevyhnutné pre jej fungovanie.
        Používaním webu s tým súhlasíte. Viac v
        <a href="zasady-cookies.html" class="cookie-banner-link">zásadách používania cookies</a>.
      </p>
      <button type="button" class="cookie-banner-btn">Súhlasím</button>
    `;
    document.body.appendChild(banner);
    requestAnimationFrame(() => banner.classList.add('is-visible'));

    banner.querySelector('.cookie-banner-btn').addEventListener('click', () => {
      localStorage.setItem(COOKIE_CONSENT_KEY, '1');
      banner.classList.remove('is-visible');
      setTimeout(() => banner.remove(), 400);
    });
  }

  /* ---------------------------------------------------------------------
     10) SECTION SNAP — Hero, Team, and the 4 story blocks each occupy one
        full "scroll step": a single wheel/trackpad gesture jumps straight
        to the next section, instead of scrolling through it gradually.

        The statement text's own sticky-pin scroll (220vh scroll-space,
        where the paragraph lights up word by word) is deliberately left
        OUTSIDE this snap list — while the user is inside that range,
        wheel input passes through untouched so the text-coloring scroll
        stays smooth and gradual, exactly as before. Snapping resumes once
        they reach the Team section that follows it.

        Everything from Occasions onward is untouched normal scrolling.

        Guarded to homepage-only sections: this whole block only wires up
        when a .hero section exists on the page, since that structure
        (Hero -> statement -> team -> story blocks -> occasions) is
        specific to index.html and doesn't exist on other pages (e.g.
        galeria.html), which should always just scroll normally.
  --------------------------------------------------------------------- */
  if (document.querySelector('.hero')) {
  const statementScrollSpace = document.querySelector('.statement-scroll-space');
  const snapZoneEnd = document.querySelector('.occasions')?.offsetTop ?? Infinity;

  const getSnapPoints = () => {
    const points = [];
    const hero = document.querySelector('.hero');
    const team = document.querySelector('.team-fullscreen');
    const storyBlocks = document.querySelectorAll('.story-block-full');
    const occasions = document.querySelector('.occasions');
    if (hero) points.push(hero.offsetTop);
    // Landing point just past Hero: the start of the statement's own
    // sticky-scroll range. Scrolling down from Hero lands here, then the
    // free-scroll zone check below takes over for the gradual text reveal.
    if (statementScrollSpace) points.push(statementScrollSpace.offsetTop);
    if (team) points.push(team.offsetTop);
    storyBlocks.forEach(b => points.push(b.offsetTop));
    // Final point: where normal scrolling resumes. Without this, the last
    // story block has nowhere to advance to and gets pulled back to itself.
    if (occasions) points.push(occasions.offsetTop);
    return points.sort((a, b) => a - b);
  };

  let isSnapAnimating = false;
  let wheelAccum = 0;
  let wheelResetTimer = null;

  const isInsideFreeScrollZone = (y) => {
    // The statement-scroll-space's own sticky-pin range: while scrollY is
    // within it, let the browser handle scrolling natively (no snapping),
    // so the word-by-word color reveal stays gradual.
    if (!statementScrollSpace) return false;
    const top = statementScrollSpace.offsetTop;
    const bottom = top + statementScrollSpace.offsetHeight;
    return y > top + 10 && y < bottom - 10;
  };

  window.addEventListener('wheel', (e) => {
    const y = window.scrollY;

    // Past the snap zone (Occasions onward): do nothing, normal scroll.
    if (y >= snapZoneEnd - 5) return;

    // Inside the statement's own sticky-scroll range: let it scroll freely.
    if (isInsideFreeScrollZone(y)) return;

    if (isSnapAnimating) {
      e.preventDefault();
      return;
    }

    wheelAccum += e.deltaY;
    clearTimeout(wheelResetTimer);
    wheelResetTimer = setTimeout(() => { wheelAccum = 0; }, 150);

    // Only trigger once the accumulated gesture is clearly intentional —
    // avoids firing on tiny trackpad jitter.
    if (Math.abs(wheelAccum) < 40) return;

    const points = getSnapPoints();
    const direction = wheelAccum > 0 ? 1 : -1;
    wheelAccum = 0;
    clearTimeout(wheelResetTimer);

    // Find the "floor" point: the last snap point at or below the current
    // scroll position. That's the section the user is currently standing
    // in — the target is simply one step in the scroll direction from it.
    let floorIndex = 0;
    for (let i = 0; i < points.length; i++) {
      if (points[i] <= y + 5) floorIndex = i;
    }

    let targetIndex = floorIndex + direction;
    targetIndex = Math.max(0, Math.min(points.length - 1, targetIndex));

    const targetY = points[targetIndex];
    if (targetY === undefined || Math.abs(targetY - y) < 5) return;

    e.preventDefault();
    isSnapAnimating = true;
    window.scrollTo({ top: targetY, behavior: 'smooth' });
    setTimeout(() => { isSnapAnimating = false; }, 700);
  }, { passive: false });
  } // end .hero guard

});