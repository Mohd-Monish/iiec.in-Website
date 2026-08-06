# IIEC.in - Animation System & Code Specification

This document provides complete, production-ready source code (HTML, CSS keyframes, and JavaScript) for every animation on the **IIEC.in** website. Use this manual to implement identical motion graphics, loader screens, micro-interactions, canvas networks, and scroll reveals in other projects.

---

## 1. Multi-Stage Page Loader (Dot Wave + Percentage Bar)

An interactive dark loading screen featuring pulsing logo shadow glow, a 5-dot wave sequence, a animated shimmer progress track, and frame-by-frame JS percentage counting.

### HTML Structure

```html
<div id="page-loader" class="page-loader">
  <div class="loader-content">
    <div class="loader-logo">
      <img src="assets/logo.png" alt="IIEC Logo" />
    </div>
    <div class="loader-bar-container">
      <div class="loader-dots-wrapper">
        <div class="loader-dot"></div>
        <div class="loader-dot"></div>
        <div class="loader-dot"></div>
        <div class="loader-dot"></div>
        <div class="loader-dot"></div>
      </div>
      <div class="loader-bar-wrapper">
        <div id="loader-bar" class="loader-bar"></div>
      </div>
      <div class="loader-info-row">
        <span id="loader-percent" class="loader-percentage-num">0</span>
        <span class="loader-percentage-symbol">%</span>
      </div>
    </div>
  </div>
</div>
```

### CSS Styling & Keyframes

```css
.page-loader {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: linear-gradient(135deg, #05070f 0%, #0a0d18 50%, #05070f 100%);
  z-index: 99999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), 
              visibility 0.6s cubic-bezier(0.4, 0, 0.2, 1),
              transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.page-loader.loaded {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: scale(1.02);
}

/* Pulsing Logo Shadow */
.loader-logo {
  width: 80px; height: 80px;
  animation: loader-pulse 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

@keyframes loader-pulse {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 20px rgba(255, 183, 3, 0.3)); }
  50% { transform: scale(1.08); filter: drop-shadow(0 0 30px rgba(255, 183, 3, 0.6)); }
}

/* Staggered Dot Wave */
.loader-dots-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 40px;
}

.loader-dot {
  width: 12px; height: 12px;
  background: linear-gradient(135deg, #ffb703, #ffd166);
  border-radius: 50%;
  animation: dotWave 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

.loader-dot:nth-child(1) { animation-delay: 0s; }
.loader-dot:nth-child(2) { animation-delay: 0.12s; }
.loader-dot:nth-child(3) { animation-delay: 0.24s; }
.loader-dot:nth-child(4) { animation-delay: 0.36s; }
.loader-dot:nth-child(5) { animation-delay: 0.48s; }

@keyframes dotWave {
  0%, 100% { transform: translateY(0) scale(1); opacity: 0.4; }
  40%, 60% { transform: translateY(-18px) scale(1.15); opacity: 1; box-shadow: 0 0 25px rgba(255, 183, 3, 0.7); }
}

/* Shimmer Progress Track */
.loader-bar-wrapper {
  width: 320px; height: 4px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 100px;
  overflow: hidden;
}

.loader-bar {
  height: 100%; width: 0%;
  background: linear-gradient(90deg, #ffb703, #ffd166, #ffb703);
  background-size: 200% 100%;
  border-radius: 100px;
  transition: width 0.3s ease-out;
  animation: loader-shimmer 1.5s ease-in-out infinite;
}

@keyframes loader-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### JavaScript Progress Engine

```javascript
(function () {
  'use strict';
  const loader = document.getElementById('page-loader');
  const loaderBar = document.getElementById('loader-bar');
  const loaderPercent = document.getElementById('loader-percent');
  if (!loader || !loaderBar || !loaderPercent) return;

  let progress = 0;
  let targetProgress = 0;
  let animationFrame = null;
  let isComplete = false;

  function updateProgress() {
    if (progress < targetProgress) {
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

  animationFrame = requestAnimationFrame(updateProgress);
  targetProgress = 15;
  setTimeout(() => { targetProgress = 40; }, 200);
  setTimeout(() => { targetProgress = 70; }, 600);

  function completeLoading() {
    if (isComplete) return;
    isComplete = true;
    targetProgress = 100;
    setTimeout(() => {
      loader.classList.add('loaded');
      setTimeout(() => {
        if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
        if (animationFrame) cancelAnimationFrame(animationFrame);
      }, 600);
    }, 400);
  }

  window.addEventListener('load', () => { setTimeout(completeLoading, 300); });
  setTimeout(() => { if (!isComplete) completeLoading(); }, 5000);
})();
```

---

## 2. Interactive Particle Constellation Network (HTML5 Canvas)

Floating amber nodes with glowing radial gradients, pulsing radii, mouse proximity repulsion, and interactive constellation connecting lines.

### HTML Markup

```html
<canvas id="particle-canvas"></canvas>
```

### CSS Styling

```css
#particle-canvas {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 0;
  pointer-events: none;
  opacity: 0.85;
}
```

### JavaScript Canvas Class

```javascript
class ParticleSystem {
  constructor(canvas) {
    if (!canvas) return;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.mouse = { x: null, y: null };
    this.isRunning = true;
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
    const count = Math.floor((window.innerWidth * window.innerHeight) / 25000);
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.2,
        pulse: Math.random() * Math.PI * 2,
        hue: Math.random() * 25 + 35 // Gold / Amber spectrum
      });
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => { this.resize(); this.createParticles(); });
    document.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    document.addEventListener('mouseleave', () => {
      this.mouse.x = null;
      this.mouse.y = null;
    });
  }

  animate() {
    if (!this.isRunning) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.particles.forEach((p, i) => {
      p.pulse += 0.02;
      const pulseFactor = 1 + Math.sin(p.pulse) * 0.3;
      p.x += p.vx;
      p.y += p.vy;

      // Mouse Repulsion
      if (this.mouse.x !== null && this.mouse.y !== null) {
        const dx = p.x - this.mouse.x;
        const dy = p.y - this.mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          const force = (150 - dist) / 150;
          p.x += dx * force * 0.02;
          p.y += dy * force * 0.02;
        }
      }

      // Screen wrapping
      if (p.x < 0) p.x = this.canvas.width;
      if (p.x > this.canvas.width) p.x = 0;
      if (p.y < 0) p.y = this.canvas.height;
      if (p.y > this.canvas.height) p.y = 0;

      // Draw particle dot with glow
      const grad = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3 * pulseFactor);
      grad.addColorStop(0, `hsla(${p.hue}, 100%, 60%, ${p.opacity})`);
      grad.addColorStop(1, 'transparent');
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * 3 * pulseFactor, 0, Math.PI * 2);
      this.ctx.fillStyle = grad;
      this.ctx.fill();

      // Connect Constellation Lines
      for (let j = i + 1; j < this.particles.length; j++) {
        const other = this.particles[j];
        const dx = p.x - other.x;
        const dy = p.y - other.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 140) {
          const lineOpacity = (1 - dist / 140) * 0.15;
          this.ctx.beginPath();
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(other.x, other.y);
          this.ctx.strokeStyle = `hsla(${p.hue}, 100%, 60%, ${lineOpacity})`;
          this.ctx.lineWidth = 0.5;
          this.ctx.stroke();
        }
      }
    });

    requestAnimationFrame(() => this.animate());
  }
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('particle-canvas');
  if (canvas) new ParticleSystem(canvas);
});
```

---

## 3. Scroll Reveal System (`[data-animate]`)

Viewport-triggered entrance transitions driven by `IntersectionObserver`. Supports fade, scale, slide, blur, flip, and bounce variations with optional staggered delay (`data-animate-delay`).

### HTML Usage Examples

```html
<!-- Simple Fade Up -->
<div data-animate>Standard Scroll Entrance</div>

<!-- Scale In with 0.2s delay -->
<div data-animate="scale" data-animate-delay="2">Delayed Scale Entrance</div>

<!-- Left Slide -->
<div data-animate="left">Slide in from Left</div>
```

### CSS Transition Rules

```css
[data-animate] {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94),
              transform 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94),
              filter 0.7s ease;
}

[data-animate="scale"] { transform: scale(0.9); }
[data-animate="left"] { transform: translateX(-50px); }
[data-animate="right"] { transform: translateX(50px); }

[data-animate].in-view {
  opacity: 1;
  transform: translateY(0) translateX(0) scale(1);
  filter: blur(0);
}
```

### JavaScript Intersection Observer

```javascript
class ScrollAnimations {
  constructor() {
    this.init();
  }
  init() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const delay = entry.target.dataset.animateDelay ? parseInt(entry.target.dataset.animateDelay) * 100 : 0;
          setTimeout(() => {
            entry.target.classList.add('in-view');
          }, delay);
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -80px 0px', threshold: 0.15 });

    document.querySelectorAll('[data-animate], .glass-card, .team-card, .blog-card').forEach((el) => {
      observer.observe(el);
    });
  }
}

new ScrollAnimations();
```

---

## 4. Glowing Rainbow Announcement Header Bar

A high-converting top notification bar featuring a continuous 300% moving gradient, glowing pulse dot, shimmering light streak, and interactive CTA container.

### HTML Structure

```html
<a href="genesis.html" class="announcement-bar">
  <div class="announcement-shimmer"></div>
  <div class="announcement-bar-content">
    <span class="announcement-pulse"></span>
    <span class="announcement-text">Genesis 2026 Registration is now LIVE!</span>
    <span class="announcement-cta">Register Now &rarr;</span>
  </div>
</a>
```

### CSS Animations

```css
.announcement-bar {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 301;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 1.5rem;
  background: linear-gradient(90deg, #ff0844, #ffb199, #7b2ff7, #00d4ff, #ff0844);
  background-size: 300% 100%;
  animation: announceGradient 6s linear infinite;
  color: #fff;
  font-weight: 700;
  text-decoration: none;
  overflow: hidden;
  box-shadow: 0 2px 20px rgba(255, 8, 68, 0.4);
}

@keyframes announceGradient {
  0% { background-position: 0% 50%; }
  100% { background-position: 300% 50%; }
}

/* Passing Shimmer Streak */
.announcement-shimmer {
  position: absolute;
  top: 0; left: -100%;
  width: 60%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  animation: announceShimmer 3s ease-in-out infinite;
}

@keyframes announceShimmer {
  0% { left: -100%; }
  100% { left: 200%; }
}

/* Pulsing White Indicator Dot */
.announcement-pulse {
  width: 10px; height: 10px;
  background: #fff;
  border-radius: 50%;
  animation: announcePulse 1s ease-in-out infinite;
}

@keyframes announcePulse {
  0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 8px rgba(255,255,255,0.8); }
  50% { opacity: 0.6; transform: scale(1.5); box-shadow: 0 0 16px rgba(255,255,255,1); }
}
```

---

## 5. Eased Numerical Counter

Dynamically rolls numbers upwards using cubic ease-out calculation as elements enter the viewport.

### HTML Structure

```html
<div class="status-value">50+</div>
```

### JavaScript Engine

```javascript
function animateCounter(element, target, suffix = '+') {
  let current = 0;
  const duration = 2000;
  const stepTime = 40;
  const steps = duration / stepTime;
  const increment = target / steps;

  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    element.textContent = Math.floor(current).toLocaleString() + suffix;
  }, stepTime);
}

// Observer Integration
const counterEls = document.querySelectorAll('.status-value');
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const valText = entry.target.textContent;
      const num = parseInt(valText.replace(/\D/g, ''));
      if (!isNaN(num)) animateCounter(entry.target, num, valText.includes('+') ? '+' : '');
      counterObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

counterEls.forEach(el => counterObserver.observe(el));
```

---

## 6. Keyframe Animations Library

Reuse these keyframes across any project element:

```css
/* Floating Movement */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-15px); }
}

/* Glow Pulse Shadow */
@keyframes glowPulse {
  0%, 100% { box-shadow: 0 0 20px rgba(255, 183, 3, 0.3); }
  50% { box-shadow: 0 0 40px rgba(255, 183, 3, 0.6), 0 0 60px rgba(255, 183, 3, 0.3); }
}

/* Bounce In Entrance */
@keyframes bounceIn {
  0% { opacity: 0; transform: scale(0.3); }
  50% { opacity: 1; transform: scale(1.05); }
  70% { transform: scale(0.95); }
  100% { transform: scale(1); }
}

/* 3D Flip In Y */
@keyframes flipInY {
  from { opacity: 0; transform: perspective(400px) rotateY(90deg); }
  to { opacity: 1; transform: perspective(400px) rotateY(0); }
}
```
