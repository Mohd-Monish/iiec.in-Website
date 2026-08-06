# IIEC.in - Design Specification & System System Documentation

This document provides a comprehensive guide to the visual design system of **IIEC.in** (Incubation, Innovation & Entrepreneurship Cell, Chhatrapati Shivaji Maharaj University). Use these design tokens, typography scales, colors, UI components, and code snippets to construct consistent, high-impact dark-themed websites and tools for the cell.

---

## 1. Design Philosophy & Theme Overview

The IIEC.in website employs a modern **Futuristic Dark Theme** featuring:
- **Base Aesthetics**: Deep charcoal `#09090b` and pitch black backgrounds with multi-layered subtle radial gradients (`#05070f`, `#070912`, `#18181b`).
- **Signature Accent**: Warm Cyber Gold / Amber (`#F5A524` / `#FFB703`) representing innovation, achievement, and energy.
- **Glassmorphism**: Semi-transparent elevated surfaces with backdrop blur filters, fine light borders (`rgba(255, 255, 255, 0.1)`), and soft radial ambient glow blurs.

---

## 2. Color Palette & Design Tokens

### CSS Root Variables

Place this `:root` block in your core CSS stylesheet (`style.css`):

```css
:root {
  /* Color System */
  --color-base: #09090b;
  --color-base-rgb: 9, 9, 11;
  --color-surface: #18181b;
  --color-surface-elevated: #27272a;
  --color-surface-hover: #3f3f46;
  
  /* Gradient Background Layers */
  --gradient-start: #18181b;
  --gradient-mid: #070912;
  --gradient-end: #05070f;
  
  /* Glass Effect Colors */
  --glass-bg: rgba(24, 24, 27, 0.6);
  --glass-bg-solid: rgba(14, 20, 34, 0.92);
  --glass-border: rgba(255, 255, 255, 0.1);
  --glass-border-hover: rgba(255, 183, 3, 0.2);
  
  /* Accent Gold / Amber Palette */
  --color-accent: #F5A524;
  --color-accent-rgb: 245, 165, 36;
  --color-accent-hover: #F7B750;
  --color-accent-muted: rgba(255, 183, 3, 0.15);
  
  /* Text Color Scale */
  --text-primary: #f5f7ff;      /* Bright Off-White for Headings */
  --text-secondary: #c2c9de;    /* Soft Grey-Blue for Subtitles */
  --text-muted: #8891a8;        /* Muted Grey for Captions & Metadata */
  --text-accent: var(--color-accent);
  
  /* Semantic Status Colors */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  
  /* Shadows & Ambient Glows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.4);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
  --shadow-glow: 0 0 20px rgba(var(--color-accent-rgb), 0.3);
  --shadow-glow-lg: 0 0 40px rgba(var(--color-accent-rgb), 0.4);

  /* Border Radii */
  --radius-sm: 0.375rem;   /* 6px */
  --radius-md: 0.5rem;    /* 8px */
  --radius-lg: 0.75rem;   /* 12px */
  --radius-xl: 1rem;      /* 16px */
  --radius-2xl: 1.5rem;   /* 24px */
  --radius-full: 9999px;  /* Pill / Circle */

  /* Layout Limits */
  --container-max: 1280px;
  --navbar-height: 80px;
}
```

---

## 3. Typography System

The typography pairs modern geometric sans-serif fonts for headings and body, alongside high-impact condensed display fonts for special event titles.

### Font Imports

Include Google Fonts in `<head>` or at top of CSS:

```css
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700&family=Montserrat:wght@500;600;700;800&family=Poppins:wght@400;500;600;700&display=swap');
```

### Font Roles

1. **Headings & Display**: `'Montserrat', sans-serif` (Bold 700 / ExtraBold 800)
2. **Body Text & UI**: `'Inter', sans-serif` (Normal 400 / Medium 500 / SemiBold 600)
3. **Special Events & Numbers**: `'Bebas Neue', sans-serif` (All-caps display titles & big statistics)
4. **Sub-pages / Cards**: `'Poppins', sans-serif`

### Fluid Typography Scale

```css
:root {
  --text-xs: clamp(0.7rem, 0.65rem + 0.25vw, 0.75rem);
  --text-sm: clamp(0.8rem, 0.75rem + 0.25vw, 0.875rem);
  --text-base: clamp(0.9rem, 0.85rem + 0.25vw, 1rem);
  --text-lg: clamp(1rem, 0.95rem + 0.25vw, 1.125rem);
  --text-xl: clamp(1.15rem, 1.05rem + 0.5vw, 1.25rem);
  --text-2xl: clamp(1.4rem, 1.2rem + 1vw, 1.5rem);
  --text-3xl: clamp(1.75rem, 1.5rem + 1.25vw, 1.875rem);
  --text-4xl: clamp(2rem, 1.5rem + 2.5vw, 2.5rem);
  --text-5xl: clamp(2.5rem, 2rem + 2.5vw, 3rem);
  --text-hero: clamp(3.5rem, 2.5rem + 5vw, 5.5rem);
}

/* Headings Styling */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-display);
  font-weight: 700;
  line-height: 1.2;
  color: var(--text-primary);
  text-wrap: balance;
}

/* Text Highlights & Gold Gradient Text */
.text-gold-gradient {
  background: linear-gradient(135deg, #ffb703, #ffd166);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Eyebrows / Section Badges */
.section-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: var(--radius-full);
  background: var(--color-accent-muted);
  border: 1px solid rgba(255, 183, 3, 0.3);
  color: var(--color-accent);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
}
```

---

## 4. Layouts, Grids & Containers

### Main Container

```css
.container {
  width: 100%;
  max-width: var(--container-max);
  margin: 0 auto;
  padding: 0 clamp(1rem, 3vw, 2rem);
}
```

### Responsive Grid System

```css
.grid-2 {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

.grid-3 {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

.grid-4 {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

@media (min-width: 640px) {
  .grid-2 { grid-template-columns: repeat(2, 1fr); }
  .grid-3 { grid-template-columns: repeat(2, 1fr); }
  .grid-4 { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 1024px) {
  .grid-3 { grid-template-columns: repeat(3, 1fr); }
  .grid-4 { grid-template-columns: repeat(4, 1fr); }
}
```

---

## 5. Core UI Components & Code Implementation

### 1. Glassmorphism Card (`.glass-card`)

```html
<div class="glass-card">
  <div class="glass-card-header">
    <span class="section-eyebrow">Incubation</span>
    <h3>Startup Acceleration</h3>
  </div>
  <p>Providing mentorship, funding avenues, and legal support for campus founders.</p>
</div>
```

```css
.glass-card {
  background: rgba(24, 24, 27, 0.6);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  padding: 2rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.glass-card:hover {
  transform: translateY(-4px);
  border-color: var(--glass-border-hover);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 183, 3, 0.15);
}
```

---

### 2. Buttons (`.btn-primary` & `.nav-cta`)

```html
<a href="#register" class="btn-primary">
  <span>Join IIEC</span>
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
</a>
```

```css
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 28px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, #ffd56a 0%, #f5b335 100%);
  color: #05070f;
  font-family: 'Inter', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  border: 1px solid rgba(255, 227, 152, 0.4);
  box-shadow: 0 8px 20px rgba(245, 179, 53, 0.28);
  cursor: pointer;
  text-decoration: none;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-primary:hover {
  transform: translateY(-2px);
  background: linear-gradient(135deg, #ffe08a 0%, #f9bf49 100%);
  box-shadow: 0 14px 30px rgba(245, 179, 53, 0.45);
}
```

---

### 3. Underline Form Fields with Focus Glow

```html
<div class="field">
  <label for="user-email">Email Address</label>
  <input type="email" id="user-email" placeholder="name@domain.com" />
</div>
```

```css
.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 1.25rem;
}

.field label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.field input, .field select, .field textarea {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(9, 9, 11, 0.65);
  color: var(--text-primary);
  border-radius: var(--radius-lg);
  padding: 14px 16px;
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  outline: none;
  transition: all 0.25s ease;
}

.field input:focus, .field select:focus, .field textarea:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 4px rgba(245, 165, 36, 0.18), 0 0 15px rgba(245, 165, 36, 0.2);
}
```

---

### 4. Glowing Ambient Orbs (`.glow-orb`)

```html
<div class="glow-orb-wrapper">
  <div class="glow-orb"></div>
</div>
```

```css
.glow-orb-wrapper {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  pointer-events: none;
  z-index: 1;
  overflow: hidden;
}

.glow-orb {
  position: absolute;
  width: 600px;
  height: 600px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(245, 165, 36, 0.15) 0%, rgba(245, 165, 36, 0.04) 40%, transparent 70%);
  filter: blur(60px);
  transform: translate(-50%, -50%);
  top: 30%; left: 50%;
  transition: transform 0.1s ease-out;
}
```
