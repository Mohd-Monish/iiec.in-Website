/**
 * IIEC Activities Page — Interactive Motion & 3D Orbit Gallery Engine
 * Layout System: Bento Hub & Interactive Event Vault
 */

(function () {
  'use strict';

  // ---------------------------------------------------------
  // 1. Photo Orbit Gallery Data (14 Real Highlight Assets)
  // ---------------------------------------------------------
  const GALLERY_DATA = [
    {
      src: 'assets/Next_Gen_Pitch_2025(Photos)/IMG_2330.webp',
      title: 'Keynote & Grand Opening Ceremony',
      desc: 'Inaugural address and orientation at Next Gen Pitch 2025'
    },
    {
      src: 'assets/Next_Gen_Pitch_2025(Photos)/IMG_2341.webp',
      title: 'Founders & Mentor Networking',
      desc: 'Student teams engaging with ecosystem experts'
    },
    {
      src: 'assets/Next_Gen_Pitch_2025(Photos)/Copy%20of%20IMG_2419.webp',
      title: 'Prototype Demonstrations',
      desc: 'Live hardware and software prototype testing'
    },
    {
      src: 'assets/Next_Gen_Pitch_2025(Photos)/IMG_2418.webp',
      title: 'Team Strategy Session',
      desc: 'Refining pitch decks before the evaluation round'
    },
    {
      src: 'assets/Next_Gen_Pitch_2025(Photos)/Copy%20of%20IMG_2455.webp',
      title: 'Live Pitching on Stage',
      desc: 'Founders presenting solutions to the jury panel'
    },
    {
      src: 'assets/Next_Gen_Pitch_2025(Photos)/Copy%20of%20IMG_2468.webp',
      title: 'Jury Q&A and Feedback',
      desc: 'Constructive evaluation from venture capitalists'
    },
    {
      src: 'assets/Next_Gen_Pitch_2025(Photos)/Copy%20of%20IMG_2470.webp',
      title: 'Audience & Peer Interaction',
      desc: 'Vibrant participation across university departments'
    },
    {
      src: 'assets/Next_Gen_Pitch_2025(Photos)/Copy%20of%20IMG_2471.webp',
      title: 'Panel Discussions',
      desc: 'Insights into startup scaling and funding'
    },
    {
      src: 'assets/Next_Gen_Pitch_2025(Photos)/Copy%20of%20IMG_6595.webp',
      title: 'Jury Deliberations',
      desc: 'Selecting top contenders for Eureka! Zonal Rounds'
    },
    {
      src: 'assets/Next_Gen_Pitch_2025(Photos)/IMG_6602.webp',
      title: 'Winner Announcements',
      desc: 'Celebrating top innovating teams'
    },
    {
      src: 'assets/Next_Gen_Pitch_2025(Photos)/IMG_6681.webp',
      title: 'Mentorship Commitments',
      desc: 'Fast-tracking shortlisted startups to incubation'
    },
    {
      src: 'assets/Next_Gen_Pitch_2025(Photos)/IMG_6711.webp',
      title: 'Award Felicitation Ceremony',
      desc: 'Certificates, trophies, and cash prizes presented'
    },
    {
      src: 'assets/Next_Gen_Pitch_2025(Photos)/IMG_6716.webp',
      title: 'E-Cell Leadership & Core Team',
      desc: 'The student team behind IIEC initiatives'
    },
    {
      src: 'assets/Next_Gen_Pitch_2025(Photos)/IMG_6730.webp',
      title: 'Next Gen Pitch Grand Finale',
      desc: 'Group celebration of innovation and entrepreneurship'
    }
  ];

  // ---------------------------------------------------------
  // 2. Category Filter Pills & Live Event Vault Counter
  // ---------------------------------------------------------
  function initCategoryFilters() {
    const filterPills = document.querySelectorAll('.filter-pill');
    const eventCards = document.querySelectorAll('.event-card[data-category]');
    const countEl = document.getElementById('vault-results-count');

    if (!filterPills.length || !eventCards.length) return;

    function updateCount(visibleCount, totalCount) {
      if (countEl) {
        countEl.textContent = `Showing ${visibleCount} of ${totalCount} Events`;
      }
    }

    updateCount(eventCards.length, eventCards.length);

    filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        filterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        const category = pill.getAttribute('data-filter') || 'all';
        let visible = 0;

        eventCards.forEach(card => {
          const cardCategories = (card.getAttribute('data-category') || '').split(' ');
          if (category === 'all' || cardCategories.includes(category)) {
            card.style.display = 'flex';
            visible++;
          } else {
            card.style.display = 'none';
          }
        });

        updateCount(visible, eventCards.length);
      });
    });
  }

  // ---------------------------------------------------------
  // 3. 3D Cylindrical Orbit Wheel Gallery Engine
  // ---------------------------------------------------------
  function init3DOrbitGallery() {
    const stage = document.getElementById('orbit-stage');
    const gridView = document.getElementById('grid-view');
    const orbitView = document.getElementById('orbit-view');
    const viewOrbitBtn = document.getElementById('view-orbit-btn');
    const viewGridBtn = document.getElementById('view-grid-btn');
    const counterEl = document.getElementById('orbit-counter');
    const titleEl = document.getElementById('orbit-title');
    const prevBtn = document.getElementById('orbit-prev-btn');
    const nextBtn = document.getElementById('orbit-next-btn');
    const autoplayBtn = document.getElementById('orbit-autoplay-btn');
    const autoplayIcon = document.getElementById('autoplay-icon');
    const autoplayLabel = document.getElementById('autoplay-label');

    if (!stage) return;

    const total = GALLERY_DATA.length;
    let currentIndex = 0;
    let targetIndex = 0;
    let isDragging = false;
    let startX = 0;
    let currentX = 0;
    let dragDelta = 0;
    let isAutoplay = true;
    let autoplayInterval = null;
    const orbitCards = [];

    // Create 3D Orbit Cards
    stage.innerHTML = '';
    GALLERY_DATA.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'orbit-card';
      card.setAttribute('data-index', index);
      card.innerHTML = `<img src="${item.src}" alt="${item.title}" loading="lazy" />`;
      
      card.addEventListener('click', () => {
        const diff = (index - Math.round(targetIndex)) % total;
        if (Math.abs(diff) < 0.3) {
          openLightbox(index);
        } else {
          targetIndex += diff;
        }
      });

      stage.appendChild(card);
      orbitCards.push(card);
    });

    // Populate Grid View
    if (gridView) {
      gridView.innerHTML = '';
      GALLERY_DATA.forEach((item, index) => {
        const gridItem = document.createElement('div');
        gridItem.className = 'gallery-grid-item';
        gridItem.innerHTML = `<img src="${item.src}" alt="${item.title}" loading="lazy" />`;
        gridItem.addEventListener('click', () => openLightbox(index));
        gridView.appendChild(gridItem);
      });
    }

    // Mathematical 3D Cylindrical Render Loop
    function render3DOrbit() {
      const stageWidth = stage.clientWidth || 800;
      const radius = Math.min(stageWidth * 0.44, 460);

      for (let i = 0; i < total; i++) {
        const card = orbitCards[i];
        let diff = (i - currentIndex) % total;
        if (diff > total / 2) diff -= total;
        if (diff < -total / 2) diff += total;

        const absDiff = Math.abs(diff);

        if (absDiff > 4.2) {
          card.style.opacity = '0';
          card.style.visibility = 'hidden';
          card.style.transform = 'translate3d(0, 0, -800px)';
          continue;
        }

        card.style.visibility = 'visible';
        const angle = diff * 0.46; // rad
        const x = Math.sin(angle) * radius;
        const z = (Math.cos(angle) - 1) * (radius * 0.92);
        const y = Math.pow(Math.sin(angle), 2) * 28;
        const rotY = -angle * 35;
        const rotZ = diff * -1.5;

        let scale = Math.max(0.68, 1 - absDiff * 0.11);
        let opacity = Math.max(0, 1 - absDiff * 0.28);
        let blur = Math.min(6, absDiff * 2.2);
        let grayscale = Math.min(100, absDiff * 45);
        const zIndex = Math.round(100 - absDiff * 15);

        if (absDiff < 0.4) {
          scale = 1.06;
          blur = 0;
          grayscale = 0;
          opacity = 1;
          card.classList.add('is-active');
        } else {
          card.classList.remove('is-active');
        }

        card.style.zIndex = zIndex;
        card.style.opacity = opacity.toFixed(2);
        card.style.filter = `blur(${blur.toFixed(1)}px) grayscale(${grayscale.toFixed(0)}%)`;
        card.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${rotY.toFixed(1)}deg) rotateZ(${rotZ.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
      }

      // Update counter
      const activeIdx = ((Math.round(currentIndex) % total) + total) % total;
      if (counterEl) counterEl.textContent = `${String(activeIdx + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
    }

    function animateLoop() {
      const diff = targetIndex - currentIndex;
      if (Math.abs(diff) > 0.001) {
        currentIndex += diff * 0.1;
        render3DOrbit();
      } else {
        currentIndex = targetIndex;
      }
      requestAnimationFrame(animateLoop);
    }
    requestAnimationFrame(animateLoop);

    // Touch & Mouse Drag Physics
    stage.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      currentX = startX;
      stopAutoplay();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      currentX = e.clientX;
      dragDelta = currentX - startX;
      targetIndex -= (dragDelta * 0.0015);
      startX = currentX;
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        targetIndex = Math.round(targetIndex);
        if (isAutoplay) startAutoplay();
      }
    });

    stage.addEventListener('touchstart', (e) => {
      isDragging = true;
      startX = e.touches[0].clientX;
      currentX = startX;
      stopAutoplay();
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      currentX = e.touches[0].clientX;
      dragDelta = currentX - startX;
      targetIndex -= (dragDelta * 0.002);
      startX = currentX;
    }, { passive: true });

    window.addEventListener('touchend', () => {
      if (isDragging) {
        isDragging = false;
        targetIndex = Math.round(targetIndex);
        if (isAutoplay) startAutoplay();
      }
    });

    // Prev / Next Controls
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        targetIndex -= 1;
        stopAutoplay();
        if (isAutoplay) startAutoplay();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        targetIndex += 1;
        stopAutoplay();
        if (isAutoplay) startAutoplay();
      });
    }

    // Autoplay Engine
    function startAutoplay() {
      if (autoplayInterval) clearInterval(autoplayInterval);
      autoplayInterval = setInterval(() => {
        if (!isDragging) targetIndex += 1;
      }, 3500);
    }

    function stopAutoplay() {
      if (autoplayInterval) clearInterval(autoplayInterval);
    }

    if (autoplayBtn) {
      autoplayBtn.addEventListener('click', () => {
        isAutoplay = !isAutoplay;
        if (isAutoplay) {
          startAutoplay();
          if (autoplayIcon) autoplayIcon.textContent = '⏸';
          if (autoplayLabel) autoplayLabel.textContent = 'Pause';
        } else {
          stopAutoplay();
          if (autoplayIcon) autoplayIcon.textContent = '▶';
          if (autoplayLabel) autoplayLabel.textContent = 'Play';
        }
      });
    }

    if (isAutoplay) startAutoplay();

    // Toggle Views (Orbit vs Grid)
    if (viewOrbitBtn && viewGridBtn && gridView && orbitView) {
      viewOrbitBtn.addEventListener('click', () => {
        viewOrbitBtn.classList.add('active');
        viewGridBtn.classList.remove('active');
        orbitView.style.display = 'block';
        gridView.classList.remove('show');
      });

      viewGridBtn.addEventListener('click', () => {
        viewGridBtn.classList.add('active');
        viewOrbitBtn.classList.remove('active');
        orbitView.style.display = 'none';
        gridView.classList.add('show');
      });
    }

    // Resize Handling
    window.addEventListener('resize', render3DOrbit);
  }

  // ---------------------------------------------------------
  // 4. Lightbox Modal Component
  // ---------------------------------------------------------
  let currentLightboxIdx = 0;
  function initLightbox() {
    const lightbox = document.getElementById('gallery-lightbox');
    const closeBtn = document.getElementById('lightbox-close');
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');

    if (!lightbox) return;

    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });

    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentLightboxIdx = (currentLightboxIdx - 1 + GALLERY_DATA.length) % GALLERY_DATA.length;
        updateLightboxContent(currentLightboxIdx);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentLightboxIdx = (currentLightboxIdx + 1) % GALLERY_DATA.length;
        updateLightboxContent(currentLightboxIdx);
      });
    }

    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft' && prevBtn) prevBtn.click();
      if (e.key === 'ArrowRight' && nextBtn) nextBtn.click();
    });
  }

  function openLightbox(index) {
    const lightbox = document.getElementById('gallery-lightbox');
    if (!lightbox) return;
    currentLightboxIdx = index;
    updateLightboxContent(index);
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    const lightbox = document.getElementById('gallery-lightbox');
    if (!lightbox) return;
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }

  function updateLightboxContent(index) {
    const img = document.getElementById('lightbox-img');
    const counter = document.getElementById('lightbox-counter');
    const data = GALLERY_DATA[index];

    if (img && data) img.src = data.src;
    if (counter) counter.textContent = `${index + 1} / ${GALLERY_DATA.length}`;
  }

  // ---------------------------------------------------------
  // 5. Horizontal Milestone Rail Drag Scroll
  // ---------------------------------------------------------
  function initTimelineRailDrag() {
    const rail = document.querySelector('.timeline-rail');
    if (!rail) return;

    let isDown = false;
    let startX;
    let scrollLeft;

    rail.addEventListener('mousedown', (e) => {
      isDown = true;
      startX = e.pageX - rail.offsetLeft;
      scrollLeft = rail.scrollLeft;
    });

    rail.addEventListener('mouseleave', () => {
      isDown = false;
    });

    rail.addEventListener('mouseup', () => {
      isDown = false;
    });

    rail.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - rail.offsetLeft;
      const walk = (x - startX) * 1.6;
      rail.scrollLeft = scrollLeft - walk;
    });
  }

  // ---------------------------------------------------------
  // 6. Mobile Navigation Drawer & Morphing Hamburger
  // ---------------------------------------------------------
  function initMobileNavDrawer() {
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const drawer = document.getElementById('mobile-nav-drawer');
    const closeBtn = document.getElementById('mobile-drawer-close');
    const backdrop = document.getElementById('mobile-nav-backdrop');
    const drawerLinks = document.querySelectorAll('.mobile-nav-link');

    if (!hamburgerBtn || !drawer) return;

    function openDrawer() {
      drawer.classList.add('open');
      drawer.setAttribute('aria-hidden', 'false');
      hamburgerBtn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
      hamburgerBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    hamburgerBtn.addEventListener('click', () => {
      const isOpen = drawer.classList.contains('open');
      if (isOpen) {
        closeDrawer();
      } else {
        openDrawer();
      }
    });

    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    if (backdrop) backdrop.addEventListener('click', closeDrawer);

    drawerLinks.forEach(link => {
      link.addEventListener('click', () => {
        closeDrawer();
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('open')) {
        closeDrawer();
      }
    });
  }

  // ---------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    initCategoryFilters();
    init3DOrbitGallery();
    initLightbox();
    initTimelineRailDrag();
    initMobileNavDrawer();
  });

})();

