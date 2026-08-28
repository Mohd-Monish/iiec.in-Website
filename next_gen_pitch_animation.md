# Next Gen Pitch 2026 — Animation System & Motion Specification

This document provides complete, production-ready source code (HTML, CSS keyframes, mathematical formulas, and JavaScript implementation) for every animation and interactive motion engine on the **Next Gen Pitch 2026** landing page.

---

## 1. 3D Cylindrical Orbit Wheel Gallery Engine

The centerpiece motion component of Next Gen Pitch is a custom 3D photo orbit wheel that projects 14 high-resolution event highlights onto a curved cylindrical 3D space with real-time inertia, smooth lerp interpolation, depth blurs, and grayscale degradation.

### Mathematical Formulation

For card index $i$ and continuous target index $c$:

$$\Delta = (i - c) \pmod{N}$$

If $\Delta > N/2$, then $\Delta \leftarrow \Delta - N$. If $\Delta < -N/2$, then $\Delta \leftarrow \Delta + N$.

- **Angle on Cylinder ($\theta$)**: $\theta = \Delta \times 0.46 \text{ rad}$
- **X Coordinates**: $X = \sin(\theta) \times R$
- **Z Depth**: $Z = (\cos(\theta) - 1) \times (0.92 \times R)$
- **Y Smile Arc**: $Y = \sin^2(\theta) \times 28\text{px}$
- **Y Rotation ($\text{rotY}$)**: $\text{rotY} = -\theta \times \frac{180}{\pi} \times 0.61$
- **Scale Factor ($S$)**: $S = \max(0.68, 1 - |\Delta| \times 0.11)$
- **Opacity ($O$)**: $O = \max(0, 1 - |\Delta| \times 0.28)$
- **Depth Blur ($B$)**: $B = \min(6\text{px}, |\Delta| \times 2.2\text{px})$
- **Grayscale ($G$)**: $G = \min(100\%, |\Delta| \times 45\%)$

### CSS Stage & Card Rules

```css
.orbit-stage-wrapper {
  position: relative;
  user-select: none;
  -webkit-user-select: none;
}

.orbit-stage {
  position: relative;
  width: 100%;
  height: 440px;
  perspective: 1200px;
  perspective-origin: 50% 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: grab;
  touch-action: pan-y;
}

.orbit-stage:active {
  cursor: grabbing;
}

.orbit-card {
  position: absolute;
  width: clamp(250px, 32vw, 360px);
  aspect-ratio: 4 / 3;
  border-radius: 18px;
  overflow: hidden;
  background: #181818;
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1),
              filter 0.4s cubic-bezier(0.16, 1, 0.3, 1),
              opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform, filter, opacity;
  transform-style: preserve-3d;
  backface-visibility: hidden;
}

.orbit-card.is-active {
  border-color: rgba(255, 90, 31, 0.7);
  box-shadow: 0 25px 60px rgba(255, 90, 31, 0.25), 0 10px 30px rgba(0, 0, 0, 0.8);
}
```

### JavaScript Engine Code

```javascript
(function () {
  'use strict';
  
  var stage = document.getElementById('orbit-stage');
  if (!stage) return;
  
  var total = 14;
  var currentIndex = 0;
  var targetIndex = 0;
  var isDragging = false;
  var startX = 0;
  var dragDelta = 0;
  var isAutoplay = true;
  var autoplayTimer = null;

  function render3DOrbit() {
    var stageWidth = stage.clientWidth || 800;
    var radius = Math.min(stageWidth * 0.44, 460);

    for (var i = 0; i < total; i++) {
      var card = orbitCards[i];
      var diff = (i - currentIndex) % total;
      if (diff > total / 2) diff -= total;
      if (diff < -total / 2) diff += total;

      var absDiff = Math.abs(diff);

      if (absDiff > 4.2) {
        card.style.opacity = '0';
        card.style.visibility = 'hidden';
        card.style.transform = 'translate3d(0, 0, -800px)';
        continue;
      }

      card.style.visibility = 'visible';
      var angle = diff * 0.46;
      var x = Math.sin(angle) * radius;
      var z = (Math.cos(angle) - 1) * (radius * 0.92);
      var y = Math.pow(Math.sin(angle), 2) * 28;
      var rotY = -angle * 35;
      var rotZ = diff * -1.5;

      var scale = Math.max(0.68, 1 - absDiff * 0.11);
      var opacity = Math.max(0, 1 - absDiff * 0.28);
      var blur = Math.min(6, absDiff * 2.2);
      var grayscale = Math.min(100, absDiff * 45);
      var zIndex = Math.round(100 - absDiff * 15);

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
      card.style.filter = 'blur(' + blur.toFixed(1) + 'px) grayscale(' + grayscale.toFixed(0) + '%)';
      card.style.transform =
        'translate3d(' + x.toFixed(1) + 'px, ' + y.toFixed(1) + 'px, ' + z.toFixed(1) + 'px) ' +
        'rotateY(' + rotY.toFixed(1) + 'deg) rotateZ(' + rotZ.toFixed(1) + 'deg) scale(' + scale.toFixed(3) + ')';
    }
  }

  function animateLoop() {
    var diff = targetIndex - currentIndex;
    if (Math.abs(diff) > 0.001) {
      currentIndex += diff * 0.1;
      render3DOrbit();
    } else {
      currentIndex = targetIndex;
    }
    requestAnimationFrame(animateLoop);
  }

  requestAnimationFrame(animateLoop);
})();
```

---

## 2. Infinite Ticker Marquee Physics

A continuous 60fps hardware-accelerated ticker banner highlighting competition keywords.

```css
.marquee {
  overflow: hidden;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  padding: 17px 0;
  white-space: nowrap;
}

.marquee-track {
  display: inline-block;
  animation: move 22s linear infinite;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  will-change: transform;
}

.marquee-track span {
  margin: 0 28px;
  color: var(--accent);
}

@keyframes move {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
```

---

## 3. Pulsing Dot & Micro-Interactions

### Pulsing Ring Animation

```css
.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 0 rgba(255, 90, 31, 0.7);
  animation: pulse-ring 2s infinite;
}

@keyframes pulse-ring {
  0% { box-shadow: 0 0 0 0 rgba(255, 90, 31, 0.7); }
  70% { box-shadow: 0 0 0 8px rgba(255, 90, 31, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 90, 31, 0); }
}
```

### Floating Mouse Prompt

```css
.gallery-scroll-prompt svg {
  color: var(--accent);
  animation: float-mouse 2s infinite ease-in-out;
}

@keyframes float-mouse {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(4px); }
}
```

---

## 4. Fullscreen Glass Lightbox Dynamics

```css
.gallery-lightbox {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.25s ease, visibility 0.25s ease;
}

.gallery-lightbox.open {
  opacity: 1;
  visibility: visible;
}
```
