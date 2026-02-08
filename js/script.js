/**
 * IIEC Website - Main JavaScript
 * Innovation, Incubation & Entrepreneurship Cell
 * Particle System + Animations + Interactions
 * Vanilla JS Only - Zero Dependencies
 */

// ========================================
// Page Loading Bar Controller
// ========================================
(function() {
  'use strict';
  
  const loader = document.getElementById('page-loader');
  const loaderBar = document.getElementById('loader-bar');
  const loaderPercent = document.getElementById('loader-percent');
  
  // Exit if loader doesn't exist
  if (!loader || !loaderBar || !loaderPercent) return;
  
  let progress = 0;
  let targetProgress = 0;
  let animationFrame = null;
  let isComplete = false;
  
  // Update the progress bar visually
  function updateProgress() {
    if (progress < targetProgress) {
      // Smooth easing - faster at start, slower as it approaches target
      const diff = targetProgress - progress;
      const increment = Math.max(0.5, diff * 0.15);
      progress = Math.min(progress + increment, targetProgress);
      
      const roundedProgress = Math.round(progress);
      loaderBar.style.width = roundedProgress + '%';
      loaderPercent.textContent = roundedProgress;
    }
    
    if (!isComplete || progress < 100) {
      animationFrame = requestAnimationFrame(updateProgress);
    }
  }
  
  // Start the animation
  animationFrame = requestAnimationFrame(updateProgress);
  
  // Phase 1: Quick start (0-35%) - happens immediately
  targetProgress = 10;
  setTimeout(() => { targetProgress = 25; }, 100);
  setTimeout(() => { targetProgress = 35; }, 200);
  
  // Phase 2: Medium speed (35-55%)
  setTimeout(() => { targetProgress = 45; }, 400);
  setTimeout(() => { targetProgress = 55; }, 600);
  
  // Phase 3: Slower (55-70%) - simulating heavier content
  setTimeout(() => { targetProgress = 62; }, 900);
  setTimeout(() => { targetProgress = 70; }, 1300);
  
  // Phase 4: Wait for actual content (70-90%) - controlled by actual load events
  let phase4Started = false;
  function startPhase4() {
    if (phase4Started) return;
    phase4Started = true;
    
    // Slowly progress from 70 to 88
    const phase4Interval = setInterval(() => {
      if (targetProgress < 88 && !isComplete) {
        targetProgress += 0.8;
      } else {
        clearInterval(phase4Interval);
      }
    }, 150);
  }
  
  // Start phase 4 after a delay
  setTimeout(startPhase4, 1500);
  
  // Complete the loading (called when page is ready)
  function completeLoading() {
    if (isComplete) return;
    isComplete = true;
    
    // Quick finish to 100%
    targetProgress = 100;
    
    // Wait for animation to complete, then hide loader
    setTimeout(() => {
      loader.classList.add('loaded');
      
      // Remove loader from DOM after animation
      setTimeout(() => {
        if (loader && loader.parentNode) {
          loader.parentNode.removeChild(loader);
        }
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
        }
      }, 600);
    }, 400);
  }
  
  // Listen for window load event
  window.addEventListener('load', () => {
    // Add small delay to show 100% briefly
    setTimeout(completeLoading, 300);
  });
  
  // Fallback: Complete after max wait time (6 seconds)
  setTimeout(() => {
    if (!isComplete) {
      completeLoading();
    }
  }, 6000);
  
  // Track image loading for more accurate progress
  let totalImages = 0;
  let loadedImages = 0;
  
  // Check images after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', trackImages);
  } else {
    trackImages();
  }
  
  function trackImages() {
    const images = document.querySelectorAll('img');
    totalImages = images.length;
    
    if (totalImages === 0) {
      targetProgress = Math.max(targetProgress, 85);
      return;
    }
    
    images.forEach(img => {
      if (img.complete) {
        loadedImages++;
        updateImageProgress();
      } else {
        img.addEventListener('load', () => {
          loadedImages++;
          updateImageProgress();
        });
        img.addEventListener('error', () => {
          loadedImages++;
          updateImageProgress();
        });
      }
    });
  }
  
  function updateImageProgress() {
    if (totalImages > 0 && targetProgress >= 70) {
      const imageProgress = (loadedImages / totalImages) * 18; // 70-88% based on images
      targetProgress = Math.max(targetProgress, 70 + imageProgress);
    }
  }
  
  // Expose complete function globally for manual completion
  window.completePageLoading = completeLoading;
})();

(function () {
  'use strict';

  // ========================================
  // Device Detection
  // ========================================
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth < 768;

  // ========================================
  // Configuration
  // ========================================
  const CONFIG = {
    particleBaseCount: isMobile ? 25 : 60,
    particleSpeed: isMobile ? 0.2 : 0.3,
    connectionDistance: isMobile ? 100 : 150,
    mouseRadius: 150,
    scrollThreshold: 50,
    animationThreshold: 0.15,
    enableParticles: !isMobile || window.innerWidth > 480
  };

  // ========================================
  // Utility Functions
  // ========================================
  const Utils = {
    // Debounce function
    debounce(func, wait) {
      let timeout;
      return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
      };
    },

    // Throttle function for scroll/resize events
    throttle(func, limit) {
      let inThrottle;
      return function (...args) {
        if (!inThrottle) {
          func.apply(this, args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      };
    },

    // Check for reduced motion preference
    prefersReducedMotion() {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    },

    // Get particle count based on screen size
    getParticleCount() {
      if (isMobile && isSmallScreen) {
        return 15; // Minimal particles on small mobile
      }
      const area = window.innerWidth * window.innerHeight;
      const baseArea = 1920 * 1080;
      const ratio = Math.min(area / baseArea, 1.5);
      return Math.floor(CONFIG.particleBaseCount * ratio);
    },

    // Validate email
    isValidEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
  };

  // ========================================
  // Particle System
  // ========================================
  class ParticleSystem {
    constructor(canvas) {
      if (!canvas) return;

      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.particles = [];
      this.mouse = { x: null, y: null };
      this.animationId = null;
      this.isRunning = true;

      // Disable particles if reduced motion or very small screen
      if (Utils.prefersReducedMotion() || !CONFIG.enableParticles) {
        this.canvas.style.opacity = '0.3';
        this.canvas.style.display = 'none';
        return;
      }

      this.init();
    }

    init() {
      this.resize();
      this.createParticles();
      this.bindEvents();
      this.animate();
    }

    resize() {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }

    createParticles() {
      this.particles = [];
      const count = Utils.getParticleCount();

      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: Math.random() * this.canvas.width,
          y: Math.random() * this.canvas.height,
          vx: (Math.random() - 0.5) * CONFIG.particleSpeed,
          vy: (Math.random() - 0.5) * CONFIG.particleSpeed,
          size: Math.random() * 2 + 1,
          opacity: Math.random() * 0.5 + 0.2,
          pulse: Math.random() * Math.PI * 2,
          hue: Math.random() * 30 + 35 // Gold hue range
        });
      }
    }

    bindEvents() {
      // Resize handler
      window.addEventListener('resize', Utils.debounce(() => {
        this.resize();
        this.createParticles();
      }, 250), { passive: true });

      // Mouse tracking
      document.addEventListener('mousemove', (e) => {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
      }, { passive: true });

      document.addEventListener('mouseleave', () => {
        this.mouse.x = null;
        this.mouse.y = null;
      }, { passive: true });

      // Visibility API
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.pause();
        } else {
          this.resume();
        }
      });

      // Intersection Observer for performance
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.resume();
          } else {
            this.pause();
          }
        });
      }, { threshold: 0 });

      // Observe hero section or fallback to body
      const hero = document.querySelector('.hero');
      if (hero) {
        observer.observe(hero);
      }
    }

    pause() {
      this.isRunning = false;
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
    }

    resume() {
      if (!this.isRunning) {
        this.isRunning = true;
        this.animate();
      }
    }

    animate() {
      if (!this.isRunning) return;

      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Update and draw particles
      this.particles.forEach((particle, i) => {
        // Update pulse
        particle.pulse += 0.02;
        const pulseFactor = 1 + Math.sin(particle.pulse) * 0.3;

        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Mouse interaction
        if (this.mouse.x !== null && this.mouse.y !== null) {
          const dx = particle.x - this.mouse.x;
          const dy = particle.y - this.mouse.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < CONFIG.mouseRadius) {
            const force = (CONFIG.mouseRadius - distance) / CONFIG.mouseRadius;
            particle.x += dx * force * 0.02;
            particle.y += dy * force * 0.02;
          }
        }

        // Wrap around edges
        if (particle.x < 0) particle.x = this.canvas.width;
        if (particle.x > this.canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = this.canvas.height;
        if (particle.y > this.canvas.height) particle.y = 0;

        // Draw particle glow
        const gradient = this.ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.size * 3 * pulseFactor
        );
        gradient.addColorStop(0, `hsla(${particle.hue}, 100%, 60%, ${particle.opacity})`);
        gradient.addColorStop(1, 'transparent');

        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size * 3 * pulseFactor, 0, Math.PI * 2);
        this.ctx.fillStyle = gradient;
        this.ctx.fill();

        // Draw particle core
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size * pulseFactor, 0, Math.PI * 2);
        this.ctx.fillStyle = `hsla(${particle.hue}, 100%, 70%, ${particle.opacity * 1.5})`;
        this.ctx.fill();

        // Draw connections
        for (let j = i + 1; j < this.particles.length; j++) {
          const other = this.particles[j];
          const dx = particle.x - other.x;
          const dy = particle.y - other.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < CONFIG.connectionDistance) {
            const opacity = (1 - distance / CONFIG.connectionDistance) * 0.15;
            const avgHue = (particle.hue + other.hue) / 2;

            this.ctx.beginPath();
            this.ctx.moveTo(particle.x, particle.y);
            this.ctx.lineTo(other.x, other.y);
            this.ctx.strokeStyle = `hsla(${avgHue}, 100%, 60%, ${opacity})`;
            this.ctx.lineWidth = 0.5;
            this.ctx.stroke();
          }
        }
      });

      this.animationId = requestAnimationFrame(() => this.animate());
    }
  }

  // ========================================
  // Glow Orb Effect
  // ========================================
  class GlowOrb {
    constructor() {
      this.wrapper = document.querySelector('.glow-orb-wrapper');
      if (!this.wrapper || Utils.prefersReducedMotion()) return;

      this.bindEvents();
    }

    bindEvents() {
      document.addEventListener('mousemove', (e) => {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const offsetX = (e.clientX - centerX) / centerX * 30;
        const offsetY = (e.clientY - centerY) / centerY * 30;

        this.wrapper.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
      }, { passive: true });
    }
  }

  // ========================================
  // Navigation
  // ========================================
  class Navigation {
    constructor() {
      this.navbar = document.querySelector('.navbar');
      this.menuToggle = document.querySelector('.menu-toggle');
      this.navLinks = document.querySelector('.nav-links');
      this.isOpen = false;

      if (!this.navbar) return;
      this.init();
    }

    init() {
      this.bindScrollEvents();
      this.bindMenuToggle();
      this.bindSmoothScroll();
      this.setActiveLink();
    }

    bindScrollEvents() {
      let ticking = false;

      window.addEventListener('scroll', () => {
        if (!ticking) {
          requestAnimationFrame(() => {
            this.handleScroll();
            ticking = false;
          });
          ticking = true;
        }
      }, { passive: true });
    }

    handleScroll() {
      const scrollY = window.pageYOffset;

      if (scrollY > CONFIG.scrollThreshold) {
        this.navbar.classList.add('scrolled');
      } else {
        this.navbar.classList.remove('scrolled');
      }
    }

    bindMenuToggle() {
      if (!this.menuToggle || !this.navLinks) return;

      this.menuToggle.addEventListener('click', () => {
        this.toggleMenu();
      });

      // Close menu when clicking a link
      this.navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          if (this.isOpen) this.toggleMenu();
        });
      });

      // Close on escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen) {
          this.toggleMenu();
        }
      });
    }

    toggleMenu() {
      this.isOpen = !this.isOpen;
      this.menuToggle.classList.toggle('active', this.isOpen);
      this.navLinks.classList.toggle('active', this.isOpen);
      this.menuToggle.setAttribute('aria-expanded', this.isOpen);

      // Toggle body scroll lock using class (better for mobile)
      if (this.isOpen) {
        document.body.classList.add('nav-open');
        document.body.style.top = `-${window.scrollY}px`;
      } else {
        const scrollY = document.body.style.top;
        document.body.classList.remove('nav-open');
        document.body.style.top = '';
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }

    bindSmoothScroll() {
      document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
          const href = anchor.getAttribute('href');
          if (href === '#' || href === '#!') return;

          const target = document.querySelector(href);
          if (target) {
            e.preventDefault();
            const offset = this.navbar ? this.navbar.offsetHeight : 0;
            const top = target.offsetTop - offset;

            window.scrollTo({
              top,
              behavior: 'smooth'
            });
          }
        });
      });
    }

    setActiveLink() {
      const currentPage = window.location.pathname.split('/').pop() || 'index.html';

      this.navLinks?.querySelectorAll('.nav-link').forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage || (currentPage === '' && href === 'index.html')) {
          link.classList.add('active');
        }
      });
    }
  }

  // ========================================
  // Scroll Animations
  // ========================================
  class ScrollAnimations {
    constructor() {
      this.observedElements = new Set();
      this.init();
    }

    init() {
      this.observeElements();
      this.observeTimeline();
      this.addParallaxEffects();
      this.addCounterAnimations();
    }

    observeElements() {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !this.observedElements.has(entry.target)) {
            this.observedElements.add(entry.target);

            // Get delay from attribute or calculate stagger
            const delay = entry.target.dataset.animateDelay
              ? parseInt(entry.target.dataset.animateDelay) * 100
              : 0;

            setTimeout(() => {
              entry.target.classList.add('in-view');

              // Trigger any child animations
              this.animateChildren(entry.target);
            }, delay);
          }
        });
      }, {
        root: null,
        rootMargin: '0px 0px -80px 0px',
        threshold: CONFIG.animationThreshold
      });

      // Observe all animatable elements
      const animatableSelectors = [
        '[data-animate]',
        '.glass-card',
        '.team-card',
        '.blog-card',
        '.timeline-item',
        '.initiative-card',
        '.status-section',
        '.footer',
        '.section-header',
        '.pillar-card',
        '.newsletter-section'
      ];

      document.querySelectorAll(animatableSelectors.join(', ')).forEach(el => {
        observer.observe(el);
      });
    }

    animateChildren(parent) {
      // Animate status values with counter effect
      const statusValues = parent.querySelectorAll('.status-value');
      statusValues.forEach((val, i) => {
        setTimeout(() => {
          val.classList.add('animated');
        }, i * 150);
      });

      // Animate footer columns with stagger
      if (parent.classList.contains('footer')) {
        const columns = parent.querySelectorAll('.footer-grid > *');
        columns.forEach((col, i) => {
          setTimeout(() => {
            col.style.opacity = '1';
            col.style.transform = 'translateY(0)';
          }, i * 100);
        });
      }
    }

    addParallaxEffects() {
      // Disable parallax on touch devices for better performance
      if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        return;
      }

      // Disable on smaller screens
      if (window.innerWidth < 1024) {
        return;
      }

      const parallaxElements = document.querySelectorAll('.glow-orb');

      if (parallaxElements.length === 0) return;

      let ticking = false;

      window.addEventListener('mousemove', (e) => {
        if (!ticking) {
          requestAnimationFrame(() => {
            const mouseX = e.clientX / window.innerWidth - 0.5;
            const mouseY = e.clientY / window.innerHeight - 0.5;

            parallaxElements.forEach(el => {
              const speed = el.dataset.parallaxSpeed || 20;
              const x = mouseX * speed;
              const y = mouseY * speed;
              el.style.transform = `translate(${x}px, ${y}px)`;
            });
            ticking = false;
          });
          ticking = true;
        }
      });
    }

    addCounterAnimations() {
      const counters = document.querySelectorAll('.status-value, .stat-number, .highlight-stat');

      counters.forEach(counter => {
        const text = counter.textContent;
        const hasPlus = text.includes('+');
        const numMatch = text.match(/(\d[\d,]*)/); 

        if (numMatch) {
          const target = parseInt(numMatch[0].replace(/,/g, ''));
          const prefix = text.substring(0, text.indexOf(numMatch[0]));
          counter.dataset.target = target;
          counter.dataset.suffix = hasPlus ? '+' : '';
          counter.dataset.prefix = prefix || '';

          // Check if it's a text like "NEC" - don't animate
          if (isNaN(target)) return;

          const animateCounter = () => {
            const observer = new IntersectionObserver((entries) => {
              if (entries[0].isIntersecting) {
                this.countUp(counter, target, counter.dataset.suffix);
                observer.disconnect();
              }
            }, { threshold: 0.5 });

            observer.observe(counter);
          };

          animateCounter();
        }
      });
    }

    countUp(element, target, suffix = '') {
      let current = 0;
      const prefix = element.dataset.prefix || '';
      const duration = 2000;
      const stepTime = 50;
      const steps = duration / stepTime;
      const increment = target / steps;

      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        element.textContent = prefix + Math.floor(current).toLocaleString() + suffix;
      }, stepTime);
    }

    observeTimeline() {
      // Observe individual timeline items for scroll-triggered animations
      const timelineItems = document.querySelectorAll('.timeline-item');
      const progress = document.querySelector('.timeline-progress');
      const timeline = document.querySelector('.timeline, .timeline-container');

      if (timelineItems.length === 0) return;

      // Create observer for each timeline item with generous threshold
      const itemObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Add in-view class with a slight delay for dramatic effect
            setTimeout(() => {
              entry.target.classList.add('in-view');
            }, 100);
          }
        });
      }, {
        root: null,
        rootMargin: '0px 0px -100px 0px', // Trigger when element is 100px into view
        threshold: 0.2 // Trigger when 20% is visible
      });

      // Observe each timeline item
      timelineItems.forEach(item => {
        itemObserver.observe(item);
      });

      // Progress bar animation on scroll
      if (progress && timeline) {
        const updateProgress = () => {
          const rect = timeline.getBoundingClientRect();
          const windowHeight = window.innerHeight;
          const timelineHeight = timeline.offsetHeight;

          const scrolled = windowHeight - rect.top;
          const total = windowHeight + timelineHeight;
          const percentage = Math.min(Math.max(scrolled / total, 0), 1);

          progress.style.height = `${percentage * 100}%`;
        };

        window.addEventListener('scroll', () => {
          requestAnimationFrame(updateProgress);
        }, { passive: true });

        updateProgress();
      }
    }
  }

  // ========================================
  // Newsletter Form
  // ========================================
  class NewsletterForm {
    constructor() {
      this.form = document.getElementById('newsletter-form');
      if (!this.form) return;

      this.emailInput = this.form.querySelector('input[type="email"]');
      this.message = this.form.querySelector('.form-message');
      this.submitBtn = this.form.querySelector('button[type="submit"]');

      this.init();
    }

    init() {
      this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    async handleSubmit(e) {
      e.preventDefault();

      const email = this.emailInput.value.trim();

      // Validate email
      if (!Utils.isValidEmail(email)) {
        this.showMessage('Please enter a valid email address.', 'error');
        return;
      }

      // Disable button
      this.submitBtn.disabled = true;
      this.submitBtn.textContent = 'Subscribing...';

      try {
        // Google Apps Script endpoint
        const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbydEKX5aGktlKmzChBkspWVGStJkHHgVbY2iA8bCP761U48rhCU_vls-y3o7LvjA2ZS/exec';

        await fetch(SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            timestamp: new Date().toISOString(),
            source: 'website'
          })
        });

        // With no-cors mode, we can't read the response, so assume success
        this.showMessage('Thank you for subscribing! 🎉', 'success');
        this.emailInput.value = '';

      } catch (error) {
        console.error('Newsletter submission error:', error);
        this.showMessage('Something went wrong. Please try again.', 'error');
      } finally {
        this.submitBtn.disabled = false;
        this.submitBtn.textContent = 'Subscribe';
      }
    }

    showMessage(text, type) {
      if (!this.message) return;

      this.message.textContent = text;
      this.message.className = `form-message ${type}`;

      // Auto-hide after 5 seconds
      setTimeout(() => {
        this.message.className = 'form-message';
      }, 5000);
    }
  }

  // ========================================
  // Admin Form (Password Protected)
  // ========================================
  class AdminForm {
    constructor() {
      this.passwordScreen = document.getElementById('password-screen');
      this.adminDashboard = document.getElementById('admin-dashboard');
      this.passwordForm = document.getElementById('password-form');
      this.passwordInput = document.getElementById('admin-password');
      this.blogForm = document.getElementById('blog-post-form');
      this.logoutBtn = document.getElementById('logout-btn');
      this.contentTextarea = document.getElementById('post-content');
      this.formMessage = null;

      if (!this.passwordScreen) return;

      this.correctPassword = 'IIEC@CSMU@2026';
      this.init();
    }

    init() {
      // Password form submission
      this.passwordForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        this.checkPassword();
      });

      // Blog form submission
      this.blogForm?.addEventListener('submit', (e) => this.handleBlogSubmit(e));

      // Logout button
      this.logoutBtn?.addEventListener('click', () => this.logout());

      // Initialize text formatter
      this.initTextFormatter();
    }

    initTextFormatter() {
      const toolbar = document.querySelector('.formatter-toolbar');
      if (!toolbar || !this.contentTextarea) return;

      this.previewPane = document.getElementById('preview-pane');
      this.previewContent = document.getElementById('preview-content');
      this.previewToggle = document.getElementById('toggle-preview');

      // Format button clicks
      toolbar.querySelectorAll('.formatter-btn:not(.preview-toggle)').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const format = btn.dataset.format;
          if (format) this.applyFormat(format);
        });
      });

      // Preview toggle
      if (this.previewToggle) {
        this.previewToggle.addEventListener('click', (e) => {
          e.preventDefault();
          this.togglePreview();
        });
      }

      // Update preview on content change
      this.contentTextarea.addEventListener('input', () => {
        this.updatePreview();
      });

      // Keyboard shortcuts
      this.contentTextarea.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
          switch (e.key.toLowerCase()) {
            case 'b':
              e.preventDefault();
              this.applyFormat('bold');
              break;
            case 'i':
              e.preventDefault();
              this.applyFormat('italic');
              break;
            case 'u':
              e.preventDefault();
              this.applyFormat('underline');
              break;
          }
        }
      });
    }

    togglePreview() {
      if (!this.previewPane || !this.previewToggle) return;
      
      const isActive = this.previewPane.classList.toggle('active');
      this.previewToggle.classList.toggle('active', isActive);
      
      if (isActive) {
        this.updatePreview();
      }
    }

    updatePreview() {
      if (!this.previewContent || !this.previewPane.classList.contains('active')) return;
      
      const content = this.contentTextarea.value;
      
      if (!content.trim()) {
        this.previewContent.innerHTML = '<p class="preview-placeholder">Start typing to see preview...</p>';
        return;
      }
      
      this.previewContent.innerHTML = this.parseMarkdownForPreview(content);
    }

    parseMarkdownForPreview(text) {
      if (!text) return '';
      
      let html = this.escapeHtml(text);
      
      // Headers
      html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
      html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
      html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
      
      // Bold
      html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      
      // Italic
      html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
      
      // Underline
      html = html.replace(/&lt;u&gt;(.+?)&lt;\/u&gt;/g, '<u>$1</u>');
      
      // Links
      html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>');
      
      // Blockquotes
      html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
      
      // Code blocks
      html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
      
      // Inline code
      html = html.replace(/`(.+?)`/g, '<code>$1</code>');
      
      // Unordered lists
      html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
      
      // Ordered lists
      html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
      
      // Wrap consecutive list items
      html = html.replace(/(<li>.*<\/li>\n?)+/g, function(match) {
        return '<ul>' + match + '</ul>';
      });
      
      // Paragraphs
      const paragraphs = html.split(/\n\n+/);
      html = paragraphs.map(p => {
        p = p.trim();
        if (!p) return '';
        if (p.startsWith('<h') || p.startsWith('<ul') || p.startsWith('<ol') || 
            p.startsWith('<blockquote') || p.startsWith('<pre')) {
          return p;
        }
        return '<p>' + p.replace(/\n/g, '<br>') + '</p>';
      }).join('\n');
      
      return html;
    }

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    applyFormat(format) {
      const textarea = this.contentTextarea;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = textarea.value.substring(start, end);
      const beforeText = textarea.value.substring(0, start);
      const afterText = textarea.value.substring(end);

      let newText = '';
      let cursorOffset = 0;

      const formats = {
        bold: { before: '**', after: '**', placeholder: 'bold text' },
        italic: { before: '*', after: '*', placeholder: 'italic text' },
        underline: { before: '<u>', after: '</u>', placeholder: 'underlined text' },
        h1: { before: '# ', after: '', placeholder: 'Heading 1', newLine: true },
        h2: { before: '## ', after: '', placeholder: 'Heading 2', newLine: true },
        h3: { before: '### ', after: '', placeholder: 'Heading 3', newLine: true },
        ul: { before: '- ', after: '', placeholder: 'List item', newLine: true },
        ol: { before: '1. ', after: '', placeholder: 'List item', newLine: true },
        link: { before: '[', after: '](url)', placeholder: 'link text' },
        quote: { before: '> ', after: '', placeholder: 'Quote text', newLine: true },
        code: { before: '```\n', after: '\n```', placeholder: 'code here', newLine: true }
      };

      const formatConfig = formats[format];
      if (!formatConfig) return;

      const { before, after, placeholder, newLine } = formatConfig;
      const text = selectedText || placeholder;
      
      // Add newline before if needed and not already at start of line
      const needsNewLine = newLine && beforeText.length > 0 && !beforeText.endsWith('\n');
      const prefix = needsNewLine ? '\n' : '';

      newText = beforeText + prefix + before + text + after + afterText;
      
      textarea.value = newText;
      
      // Position cursor
      if (selectedText) {
        // Keep text selected
        const newStart = start + prefix.length + before.length;
        const newEnd = newStart + text.length;
        textarea.setSelectionRange(newStart, newEnd);
      } else {
        // Select placeholder
        const newStart = start + prefix.length + before.length;
        const newEnd = newStart + placeholder.length;
        textarea.setSelectionRange(newStart, newEnd);
      }
      
      textarea.focus();
    }

    checkPassword() {
      const entered = this.passwordInput?.value.trim();
      const messageEl = this.passwordScreen?.querySelector('.form-message');

      if (entered === this.correctPassword) {
        this.passwordScreen.style.display = 'none';
        this.adminDashboard.style.display = 'block';
      } else {
        this.passwordInput.classList.add('error');
        this.passwordInput.value = '';
        if (messageEl) {
          messageEl.textContent = 'Incorrect password. Try again.';
          messageEl.className = 'form-message error';
        }

        setTimeout(() => {
          this.passwordInput.classList.remove('error');
          if (messageEl) messageEl.className = 'form-message';
        }, 2000);
      }
    }

    logout() {
      this.passwordScreen.style.display = 'block';
      this.adminDashboard.style.display = 'none';
      this.passwordInput.value = '';
    }

    async handleBlogSubmit(e) {
      e.preventDefault();

      // Get form values using element IDs (matching admin.html)
      const data = {
        title: document.getElementById('post-title')?.value?.trim() || '',
        category: document.getElementById('post-category')?.value || '',
        excerpt: document.getElementById('post-excerpt')?.value?.trim() || '',
        content: document.getElementById('post-content')?.value?.trim() || '',
        imageUrl: document.getElementById('post-image')?.value?.trim() || '',
        author: document.getElementById('post-author')?.value?.trim() || 'IIEC Team',
        readTime: document.getElementById('post-read-time')?.value?.trim() || '5 min read'
      };

      // Validate required fields
      if (!data.title || !data.category || !data.excerpt || !data.content || !data.author) {
        this.showBlogMessage('Please fill in all required fields.', 'error');
        return;
      }

      const submitBtn = this.blogForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Publishing...</span>';

      try {
        // Google Apps Script endpoint
        const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw0KJk8ObDw-Xpz9TJlPXLCXOEovWx0I3bSUlcTmBLWb_KLoL4AvtAkG5oEnvxMFNvryA/exec';

        await fetch(SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data)
        });

        // With no-cors mode, we can't read the response, so assume success
        this.showBlogMessage('Blog post published successfully! 🎉', 'success');
        this.blogForm.reset();

      } catch (error) {
        console.error('Blog submission error:', error);
        this.showBlogMessage('Failed to publish. Please try again.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Publish Post</span><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>';
      }
    }

    showBlogMessage(text, type) {
      const messageEl = this.blogForm?.querySelector('.form-message');
      if (!messageEl) return;

      messageEl.textContent = text;
      messageEl.className = `form-message ${type}`;

      // Auto-hide success messages after 5 seconds
      if (type === 'success') {
        setTimeout(() => {
          messageEl.className = 'form-message';
        }, 5000);
      }
    }
  }

  // ========================================
  // Lightbox
  // ========================================
  class Lightbox {
    constructor() {
      this.lightbox = document.getElementById('lightbox');
      this.lightboxImg = document.getElementById('lightbox-img');
      this.lightboxName = document.getElementById('lightbox-name');
      this.lightboxRole = document.getElementById('lightbox-role');
      this.closeBtn = document.querySelector('.lightbox-close');

      if (!this.lightbox) return;
      this.init();
    }

    init() {
      // Open lightbox on team card click
      document.querySelectorAll('.team-card[data-lightbox]').forEach(card => {
        card.addEventListener('click', (e) => {
          if (e.target.closest('.team-linkedin')) return;

          const img = card.querySelector('img');
          const name = card.querySelector('.team-name')?.textContent || '';
          const role = card.querySelector('.team-role')?.textContent || '';

          this.open(img?.src, img?.alt, name, role);
        });
      });

      // Close handlers
      this.closeBtn?.addEventListener('click', () => this.close());
      this.lightbox.addEventListener('click', (e) => {
        if (e.target === this.lightbox) this.close();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.close();
      });
    }

    open(src, alt, name, role) {
      if (!src) return;

      this.lightboxImg.src = src;
      this.lightboxImg.alt = alt || '';
      if (this.lightboxName) this.lightboxName.textContent = name;
      if (this.lightboxRole) this.lightboxRole.textContent = role;

      this.lightbox.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    close() {
      this.lightbox.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  // ========================================
  // Initialize Application
  // ========================================
  function init() {
    // Particle system
    const canvas = document.getElementById('particle-canvas');
    if (canvas) {
      new ParticleSystem(canvas);
    }

    // Glow orb
    new GlowOrb();

    // Navigation
    new Navigation();

    // Scroll animations
    new ScrollAnimations();

    // Newsletter form
    new NewsletterForm();

    // Admin form
    new AdminForm();

    // Lightbox
    new Lightbox();

    // Fallback: Show all content after 1 second if animations haven't triggered
    setTimeout(() => {
      document.querySelectorAll('[data-animate]').forEach(el => {
        if (!el.classList.contains('in-view')) {
          el.classList.add('in-view');
        }
      });
    }, 1000);

    // Log initialization
    console.log('%c IIEC Website Initialized ',
      'background: linear-gradient(135deg, #ffb703, #ffd166); color: #05070f; font-weight: bold; padding: 8px 16px; border-radius: 4px;');
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

// Blog Posts Loader
class BlogPostsLoader {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.apiUrl = 'https://script.google.com/macros/s/AKfycbw0KJk8ObDw-Xpz9TJlPXLCXOEovWx0I3bSUlcTmBLWb_KLoL4AvtAkG5oEnvxMFNvryA/exec';
    // Store posts data
    this.postsData = [];
    this.init();
  }
  
  async init() {
    if (!this.container) return;
    
    console.log('BlogPostsLoader: Starting to fetch posts...');
    
    try {
      const response = await fetch(this.apiUrl, {
        method: 'GET',
        redirect: 'follow'
      });
      
      console.log('BlogPostsLoader: Response status:', response.status);
      
      const data = await response.json();
      console.log('BlogPostsLoader: Data received:', data);
      
      // Hide loading state
      const loadingEl = document.getElementById('blog-loading');
      if (loadingEl) loadingEl.style.display = 'none';
      
      if (data.success && data.posts && data.posts.length > 0) {
        console.log('BlogPostsLoader: Rendering', data.posts.length, 'posts');
        // Store posts data
        this.postsData = data.posts;
        // Render API posts
        this.renderPosts(data.posts);
      } else {
        console.log('BlogPostsLoader: No posts found, showing empty state');
        // Show empty state
        this.renderEmptyState();
      }
    } catch (error) {
      console.error('BlogPostsLoader: Error loading posts:', error);
      // Hide loading and show empty state on error
      const loadingEl = document.getElementById('blog-loading');
      if (loadingEl) loadingEl.style.display = 'none';
      this.renderEmptyState();
    }
  }
  
  renderEmptyState() {
    this.container.innerHTML = `
      <div class="blog-empty">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
        <h3>No Articles Yet</h3>
        <p>We're working on exciting content. Check back soon for inspiring stories about innovation and entrepreneurship!</p>
      </div>
    `;
  }
  
  openBlogPost(post, index = null) {
    // Store post data in localStorage for the blog-post.html page to read
    localStorage.setItem('currentBlogPost', JSON.stringify(post));
    
    // Navigate to blog post page
    if (index !== null) {
      window.location.href = `blog-post.html?index=${index}`;
    } else {
      window.location.href = `blog-post.html`;
    }
  }
  
  renderPosts(posts) {
    // Create HTML for API posts
    const apiPostsHTML = posts.map((post, index) => {
      // Handle both imageUrl and image fields from Google Sheets
      const imageUrl = post.imageUrl || post.image || '';
      
      return `
      <article class="blog-card" data-animate="scale" data-post-index="${index}">
        <div class="blog-card-image">
          <img src="${imageUrl || './Assests/blog/default.webp'}" 
               alt="${this.escapeHtml(post.title)}" 
               width="400" height="250" loading="lazy"
               onerror="this.src='./Assests/blog/default.webp'">
          <span class="blog-card-category">${this.escapeHtml(post.category) || 'General'}</span>
        </div>
        <div class="blog-card-content">
          <div class="blog-card-meta">
            <span class="blog-card-date">${this.formatDate(post.timestamp)}</span>
            <span class="blog-card-read">${this.escapeHtml(post.readTime) || '5 min read'}</span>
          </div>
          <h2 class="blog-card-title">${this.escapeHtml(post.title)}</h2>
          <p class="blog-card-excerpt">${this.escapeHtml(post.excerpt)}</p>
          <a href="blog-post.html?index=${index}" class="blog-card-link" data-post-index="${index}">
            Read More
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </article>
    `}).join('');
    
    // Replace container with API posts
    this.container.innerHTML = apiPostsHTML;
    
    // Add click handlers to API posts
    this.container.querySelectorAll('.blog-card-link[data-post-index]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const index = parseInt(link.dataset.postIndex);
        if (this.postsData[index]) {
          this.openBlogPost(this.postsData[index], index);
        }
      });
    });
    
    // Trigger animations for new posts
    this.container.querySelectorAll('.blog-card').forEach((card, index) => {
      card.style.opacity = '0';
      card.style.transform = 'scale(0.95)';
      setTimeout(() => {
        card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        card.style.opacity = '1';
        card.style.transform = 'scale(1)';
        card.classList.add('in-view');
      }, index * 100);
    });
  }
  
  formatDate(timestamp) {
    if (!timestamp) return 'Recently';
    try {
      return new Date(timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Recently';
    }
  }
  
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize on blog page
if (document.getElementById('blog-posts')) {
  new BlogPostsLoader('blog-posts');
}