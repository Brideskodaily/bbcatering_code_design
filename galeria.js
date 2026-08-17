/* ==========================================================================
   GALÉRIA — filterable masonry wall + fullscreen lightbox
   1) Photo data (real photos only)
   2) Render tiles into the wall
   3) Category filter (button chips)
   4) Lightbox: open on tile click, prev/next, keyboard, swipe, closes on
      scrim/Esc/X
   5) Hero background slideshow (cross-fade between a few images)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------------------------------------------------------------------
     1) PHOTO DATA
     One entry per photo: { src, alt, cat, span }
       - src:  path to the image in assets/
       - alt:  short description (used for accessibility + lightbox label)
       - cat:  must match a data-filter value in the filter bar (and a key
               in CATS below)
       - span: 'tall' | 'wide' | '' — controls tile size in the masonry
               layout, purely visual, pick whatever reads well

     TO ADD REAL PHOTOS: drop the file in assets/, then add one object to
     the PHOTOS array below (copy an existing line and edit it). To add a
     photo to an existing category, just add a new object with that same
     cat value anywhere in the list — order in the list = order on the
     wall (within "Všetko"; filtering by category preserves this order).
  --------------------------------------------------------------------- */
  const CATS = {
    svadby:     'Svadby',
    firemne:    'Firemné eventy',
    rodinne:    'Rodinné oslavy',
    garden:     'Garden party',
    vip:        'VIP večere',
    degustacie: 'Degustácie',
    jedlo:      'Jedlo'
  };

  // ---- REAL PHOTOS -------------------------------------------------
  // Add new photos here — one object per photo, in any order.
  const PHOTOS = [
    { src: 'assets/jedlo_1.jpg', alt: 'BB Catering — jedlo, fotka 1', cat: 'jedlo', span: '' },
    { src: 'assets/jedlo_2.jpg', alt: 'BB Catering — jedlo, fotka 2', cat: 'jedlo', span: 'tall' },
    { src: 'assets/jedlo_3.jpg', alt: 'BB Catering — jedlo, fotka 3', cat: 'jedlo', span: '' },
    { src: 'assets/jedlo_4.jpg', alt: 'BB Catering — jedlo, fotka 4', cat: 'jedlo', span: 'wide' },
    { src: 'assets/jedlo_5.jpg', alt: 'BB Catering — jedlo, fotka 5', cat: 'jedlo', span: '' },
    { src: 'assets/jedlo_6.jpg', alt: 'BB Catering — jedlo, fotka 6', cat: 'jedlo', span: '' },
    { src: 'assets/jedlo_7.jpg', alt: 'BB Catering — jedlo, fotka 7', cat: 'jedlo', span: 'tall' },
    { src: 'assets/jedlo_8.jpg', alt: 'BB Catering — jedlo, fotka 8', cat: 'jedlo', span: '' }
  ];

  /* ---------------------------------------------------------------------
     2) RENDER WALL
  --------------------------------------------------------------------- */
  const wall = document.getElementById('gwall');
  const emptyState = document.getElementById('gwallEmpty');

  PHOTOS.forEach((photo, i) => {
    const btn = document.createElement('button');
    btn.className = `gtile${photo.span ? ' gtile--' + photo.span : ''}`;
    btn.dataset.cat = photo.cat;
    btn.dataset.index = i;
    btn.setAttribute('aria-label', photo.alt);
    btn.innerHTML = `<img src="${photo.src}" alt="${photo.alt}" loading="lazy">`;
    wall.appendChild(btn);
  });

  /* ---------------------------------------------------------------------
     3) FILTER
  --------------------------------------------------------------------- */
  const chips = document.querySelectorAll('.gfilter-chip');
  const tiles = document.querySelectorAll('.gtile');

  const applyFilter = (filter) => {
    let visibleCount = 0;
    tiles.forEach(tile => {
      const match = filter === 'all' || tile.dataset.cat === filter;
      tile.style.display = match ? '' : 'none';
      if (match) visibleCount++;
    });
    emptyState.hidden = visibleCount > 0;
  };

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      applyFilter(chip.dataset.filter);
    });
  });

  /* ---------------------------------------------------------------------
     4) LIGHTBOX
  --------------------------------------------------------------------- */
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCurrent = document.getElementById('lightboxCurrent');
  const lightboxTotal = document.getElementById('lightboxTotal');
  const lightboxCat = document.getElementById('lightboxCat');
  const btnClose = document.getElementById('lightboxClose');
  const btnPrev = document.getElementById('lightboxPrev');
  const btnNext = document.getElementById('lightboxNext');

  let activeIndex = 0;
  let visibleIndices = [];

  const getVisibleIndices = () => {
    return Array.from(tiles)
      .filter(t => t.style.display !== 'none')
      .map(t => parseInt(t.dataset.index, 10));
  };

  const showPhoto = (photoIndex) => {
    const photo = PHOTOS[photoIndex];
    lightboxImg.src = photo.src;
    lightboxImg.alt = photo.alt;
    lightboxCat.textContent = CATS[photo.cat];
    const posInVisible = visibleIndices.indexOf(photoIndex) + 1;
    lightboxCurrent.textContent = posInVisible;
    lightboxTotal.textContent = visibleIndices.length;
    activeIndex = photoIndex;
  };

  const openLightbox = (photoIndex) => {
    visibleIndices = getVisibleIndices();
    showPhoto(photoIndex);
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  const stepLightbox = (dir) => {
    const pos = visibleIndices.indexOf(activeIndex);
    const nextPos = (pos + dir + visibleIndices.length) % visibleIndices.length;
    showPhoto(visibleIndices[nextPos]);
  };

  tiles.forEach(tile => {
    tile.addEventListener('click', () => openLightbox(parseInt(tile.dataset.index, 10)));
  });

  btnClose.addEventListener('click', closeLightbox);
  document.querySelectorAll('[data-lightbox-close]').forEach(el => {
    el.addEventListener('click', closeLightbox);
  });
  btnPrev.addEventListener('click', () => stepLightbox(-1));
  btnNext.addEventListener('click', () => stepLightbox(1));

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') stepLightbox(-1);
    if (e.key === 'ArrowRight') stepLightbox(1);
  });

  // Swipe support (touch devices)
  let touchStartX = 0;
  const stage = document.getElementById('lightboxStage');
  stage.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) stepLightbox(dx > 0 ? -1 : 1);
  }, { passive: true });

  /* ---------------------------------------------------------------------
     5) HERO BACKGROUND SLIDESHOW — cross-fade between a few images
  --------------------------------------------------------------------- */
  const heroSlides = document.querySelectorAll('[data-hero-slide]');
  if (heroSlides.length > 1) {
    let heroIndex = 0;
    heroSlides.forEach((el, i) => el.classList.toggle('is-active', i === 0));
    setInterval(() => {
      heroSlides[heroIndex].classList.remove('is-active');
      heroIndex = (heroIndex + 1) % heroSlides.length;
      heroSlides[heroIndex].classList.add('is-active');
    }, 4500);
  }

  // Initial filter state + reveal animation for elements already on screen
  applyFilter('all');
  document.querySelectorAll('.reveal-fade, .reveal-up').forEach(el => {
    requestAnimationFrame(() => el.classList.add('is-visible'));
  });

});
