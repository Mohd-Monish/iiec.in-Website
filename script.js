/**
 * IIEC Website - Main JavaScript
 * Innovation, Incubation & Entrepreneurship Cell
 * Particle System + Animations + Interactions
 * Vanilla JS Only - Zero Dependencies
 */

(function() {
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
      return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
      };
    },

    // Throttle function for scroll/resize events
    throttle(func, limit) {
      let inThrottle;
      return function(...args) {
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
      const counters = document.querySelectorAll('.status-value');
      
      counters.forEach(counter => {
        const text = counter.textContent;
        const hasPlus = text.includes('+');
        const numMatch = text.match(/\d+/);
        
        if (numMatch) {
          const target = parseInt(numMatch[0]);
          counter.dataset.target = target;
          counter.dataset.suffix = hasPlus ? '+' : '';
          
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
        element.textContent = Math.floor(current) + suffix;
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
        // Google Apps Script endpoint (replace with your actual endpoint)
        const SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL';
        
        // For demo purposes, simulate success
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        this.showMessage('Thank you for subscribing! 🎉', 'success');
        this.emailInput.value = '';
        
        /* Uncomment when you have your Google Apps Script URL:
        const response = await fetch(SCRIPT_URL, {
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
        
        this.showMessage('Thank you for subscribing! 🎉', 'success');
        this.emailInput.value = '';
        */
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
      this.passwordScreen = document.querySelector('.password-screen');
      this.adminForm = document.querySelector('.admin-form');
      this.passwordInput = document.getElementById('admin-password');
      this.passwordBtn = document.getElementById('password-submit');
      this.blogForm = document.getElementById('blog-form');
      this.formMessage = document.querySelector('.admin-form .form-message');
      
      if (!this.passwordScreen) return;
      
      this.correctPassword = 'iiec2026';
      this.init();
    }

    init() {
      // Password check
      this.passwordBtn?.addEventListener('click', () => this.checkPassword());
      this.passwordInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.checkPassword();
      });
      
      // Blog form submission
      this.blogForm?.addEventListener('submit', (e) => this.handleBlogSubmit(e));
    }

    checkPassword() {
      const entered = this.passwordInput?.value.trim();
      
      if (entered === this.correctPassword) {
        this.passwordScreen.classList.add('hidden');
        this.adminForm.classList.remove('hidden');
      } else {
        this.passwordInput.classList.add('error');
        this.passwordInput.value = '';
        this.passwordInput.placeholder = 'Incorrect password. Try again.';
        
        setTimeout(() => {
          this.passwordInput.classList.remove('error');
          this.passwordInput.placeholder = 'Enter password';
        }, 2000);
      }
    }

    async handleBlogSubmit(e) {
      e.preventDefault();
      
      const formData = new FormData(this.blogForm);
      const data = {
        title: formData.get('title'),
        image: formData.get('image'),
        content: formData.get('content'),
        author: 'IIEC Team',
        date: new Date().toISOString()
      };

      const submitBtn = this.blogForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Publishing...';

      try {
        // Google Apps Script endpoint (replace with your actual endpoint)
        const SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL';
        
        // For demo purposes, simulate success
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        this.showMessage('Blog post published successfully! 🎉', 'success');
        this.blogForm.reset();
        
        /* Uncomment when you have your Google Apps Script URL:
        const response = await fetch(SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data)
        });
        
        this.showMessage('Blog post published successfully! 🎉', 'success');
        this.blogForm.reset();
        */
      } catch (error) {
        console.error('Blog submission error:', error);
        this.showMessage('Failed to publish. Please try again.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Publish Post';
      }
    }

    showMessage(text, type) {
      if (!this.formMessage) return;
      
      this.formMessage.textContent = text;
      this.formMessage.className = `form-message ${type}`;
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
