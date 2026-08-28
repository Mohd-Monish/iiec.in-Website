# Next Gen Pitch 2026 — Design Specification & UI System Documentation

This document provides a comprehensive guide to the visual design system, color palette, design tokens, typography scale, component architecture, and layout rules for **Next Gen Pitch 2026** (CSMU's premier startup competition under NEC 2026, powered by IIEC and IIT Bombay E-Cell).

---

## 1. Design Philosophy & Brand Aesthetics

**Next Gen Pitch** merges high-energy startup aesthetics with warm, editorial minimalism and modern high-contrast dark accents:
- **Base Canvas**: Soft editorial warm cream background (`#f5f5f0`) providing maximum legibility, paired with pitch-black contrast containers (`#111111`).
- **Signature Startup Accent**: Electric Startup Orange (`#ff5a1f`) and Flame Red-Orange (`#dc4310`) symbolizing innovation, speed, and creative fire.
- **Glassmorphism & Depth**: Multi-layered backdrop blur filters, fine border highlights (`rgba(255, 255, 255, 0.12)`), radial light cones, and subtle 3D surface tilt angles (`rotate(1.5deg)`).
- **High Impact Typography**: Ultra-bold condensed headlines paired with clean geometric body typography (`Inter`).

---

## 2. Color Palette & Design Tokens

### CSS Root Variables

Add this `:root` block to your core stylesheet or page header:

```css
:root {
  /* Core Background & Ink Palette */
  --bg: #f5f5f0;              /* Warm Editorial Canvas */
  --ink: #111111;             /* Charcoal / Pitch Black Accent */
  --card: #ffffff;            /* Crisp Card Surface */
  --muted: #66665f;           /* Muted Body Copy Text */
  --line: #d8d8d0;            /* Subtle Border Divider Line */
  
  /* Primary Vibrant Accent Scale */
  --accent: #ff5a1f;          /* Electric Startup Orange */
  --accent-dark: #dc4310;     /* Deep Flame Orange */
  --accent-light: #ffece4;    /* Light Orange Tint Background */
  --accent-border: #ffc7b0;   /* Muted Orange Border */
  
  /* Dark Section & Glass Tokens */
  --dark-shell-bg: #111111;
  --dark-card-bg: #181818;
  --glass-border: rgba(255, 255, 255, 0.12);
  --glass-blur: blur(16px) saturate(180%);
  
  /* Status Colors */
  --color-success: #157f4a;
  --color-error: #dc4310;

  /* Spacing & Container Limits */
  --container-max: 1160px;
  --nav-height: 76px;
  
  /* Border Radii */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 18px;
  --radius-xl: 26px;
  --radius-pill: 999px;
}
```

---

## 3. Typography System

The typography scale utilizes **Inter** as the primary font family with SF Mono for code chips and numbers.

### Font Import

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
```

### Typography Scale & Utility Classes

```css
body {
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: var(--bg);
  color: var(--ink);
  line-height: 1.5;
}

/* Hero Title */
h1 {
  font-size: clamp(58px, 8vw, 104px);
  line-height: 0.86;
  letter-spacing: -0.075em;
  font-weight: 900;
  max-width: 800px;
}

h1 em {
  color: var(--accent);
  font-style: normal;
}

/* Section Headings */
h2 {
  font-size: clamp(38px, 5vw, 66px);
  line-height: 0.95;
  letter-spacing: -0.06em;
  font-weight: 800;
  max-width: 680px;
}

/* Card Titles */
h3 {
  font-size: 24px;
  letter-spacing: -0.03em;
  font-weight: 700;
}

/* Code Chip Typography */
.code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 700;
  letter-spacing: 0.06em;
  font-size: 13px;
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--accent-light);
  border: 1px solid var(--accent-border);
  color: var(--accent-dark);
}
```

---

## 4. Container & Layout System

### Centered Container Specification

```css
.container {
  width: min(1160px, calc(100% - 40px));
  margin: 0 auto;
}
```

### Grid Layout Systems

1. **Hero Grid**: 2-Column Split (`1.2fr 0.8fr`)
2. **Feature Grid (Reasons)**: 3 Equal Columns (`repeat(3, 1fr)`) with fine vertical border dividers.
3. **Event Details Grid**: 4 Equal Columns (`repeat(4, 1fr)`) inside a dark section shell.
4. **Registration Form Grid**: 2 Columns (`repeat(2, 1fr)`) with full-width spanning capability (`grid-column: 1 / -1`).

---

## 5. UI Component Library

### 1. Brand Header & Navigation Bar

```html
<header class="container">
  <nav class="nav">
    <a class="brand" href="#">NEXT<span>GEN</span> PITCH</a>
    <div class="nav-right">
      <a href="#why">Why Participate</a>
      <a href="#details">Details</a>
      <a href="#gallery">2025 Highlights</a>
      <a class="nav-cta" href="#register">Register →</a>
    </div>
  </nav>
</header>
```

```css
nav {
  height: 76px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--line);
}

.brand {
  font-weight: 800;
  letter-spacing: -0.04em;
  font-size: 19px;
}

.brand span {
  color: var(--accent);
}

.nav-cta {
  background: var(--ink);
  color: #ffffff !important;
  padding: 11px 17px;
  border-radius: var(--radius-pill);
  font-weight: 700;
}
```

### 2. Tilted 3D Hero Ticket Card

```html
<aside class="hero-card">
  <div class="card-top">Next Gen Pitch / NEC 2026</div>
  <div class="date">
    24
    <small>August 2026 · Monday</small>
  </div>
  <div class="venue">
    10:00 AM — 4:00 PM<br>
    Pratapgarh Block, Seminar Hall<br>
    CSMU
  </div>
</aside>
```

```css
.hero-card {
  background: var(--ink);
  color: white;
  min-height: 420px;
  border-radius: 28px;
  padding: 30px;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transform: rotate(1.5deg);
  box-shadow: 0 20px 50px rgba(0,0,0,0.2);
}

.hero-card:before {
  content: "PITCH";
  position: absolute;
  font-size: 145px;
  font-weight: 900;
  letter-spacing: -.08em;
  color: rgba(255, 255, 255, 0.05);
  right: -30px;
  bottom: 40px;
  pointer-events: none;
}
```

### 3. Glassmorphic Highlights Shell

```css
.gallery-shell {
  background: #111111;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 28px;
  padding: clamp(24px, 4vw, 44px);
  color: white;
  position: relative;
  overflow: hidden;
  box-shadow: 0 30px 80px -20px rgba(0, 0, 0, 0.45);
}

.gallery-shell::before {
  content: "";
  position: absolute;
  top: -140px;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 280px;
  background: radial-gradient(circle, rgba(255, 90, 31, 0.2) 0%, rgba(255, 90, 31, 0) 70%);
  pointer-events: none;
  filter: blur(40px);
}
```

### 4. Dynamic Multi-Member Form Fieldset

```html
<fieldset class="member-block">
  <legend><span class="member-tag">Leader</span> Team Leader's Details</legend>
  <div class="form-grid">
    <div class="field full">
      <label for="leaderName">Full Name <i>*</i></label>
      <input id="leaderName" name="leaderName" type="text" placeholder="Full name" required />
    </div>
  </div>
</fieldset>
```

```css
.member-block {
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 24px 22px 22px;
  margin-top: 24px;
  background: var(--bg);
}

.member-tag {
  display: inline-grid;
  place-items: center;
  min-width: 24px;
  height: 24px;
  padding: 0 7px;
  border-radius: var(--radius-pill);
  background: var(--accent);
  color: #fff;
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}
```

---

## 6. Responsive Breakpoint Rules

- **Desktop**: Above `850px` — Full multi-column grids, rotated ticket card, horizontal details bar.
- **Tablet**: `520px – 850px` — Single column hero stacked layout, grid views switch to 2-columns, ticket card levels out.
- **Mobile**: Below `520px` — Container width `calc(100% - 28px)`, typography scales fluidly via `clamp()`, orbit stage height compresses to `320px`.
