# IIEC Website: On-Page SEO & Performance Implementation Plan

This document outlines the required changes to the IIEC website codebase to improve SEO, accessibility, and performance. Execute these steps precisely.

## 1. CRITICAL: Fix Broken Pages & Crawlability
- **Fix `ipl-auction.html`**: The file contains unresolved Git merge conflicts (`<<<<<<< HEAD`, etc.). It also lacks all SEO fundamentals (no meta description, no canonical, no OG tags, no JSON-LD, no semantic HTML). 
  - **Action**: Resolve merge conflicts, rewrite the structure using semantic HTML (`<main>`, `<section>`), externalize the ~2000 lines of inline CSS, and add complete meta tags.
- **Fix Blog Crawlability (`blog.html` & `blog-post.html`)**: Blog posts are currently loaded 100% via JS fetch API, making them invisible to search engine crawlers. Blog links use `blog-post.html?index=N` and `localStorage`.
  - **Action**: Implement static site generation (SSG) for blog posts, or provide server-side rendered fallbacks. If that's not possible, standard `<a>` tags with absolute URLs must be used instead of JS-based navigation (`e.preventDefault()`). 
- **Fix `blog-post.html` Meta Tags**: The canonical URL, OG tags, Twitter cards, and JSON-LD schema are currently static templates.
  - **Action**: Ensure these tags are populated dynamically based on the specific blog post content, or generate individual HTML files per post.

## 2. CRITICAL: Performance Optimization (LCP)
- **Optimize Assets**: `assets/images/incubation.webp` is **5.0 MB**! Favicons are 671 KB each.
  - **Action**: Compress `incubation.webp` to under 200 KB. Compress all logos and favicons to under 50 KB. Review other team photos in `assets/team/` for compression.
- **Minification**: All CSS and JS files in `css/` and `js/` are currently unminified (~353 KB total).
  - **Action**: Minify all CSS (especially `style.css` which is 100+ KB) and JS files. 
- **Inline CSS**: `certificates.html`, `verify.html`, `certificate-dashboard.html`, and `ipl-auction.html` contain massive inline `<style>` blocks (500-2000 lines).
  - **Action**: Extract these into external stylesheets (e.g., `css/certificates.css`, `css/ipl-auction.css`) to allow browser caching.
- **Animation Optimization**: 
  - **Action**: Add `will-change: transform, opacity;` in `style.css` for heavily animated elements to utilize GPU acceleration.

## 3. HIGH: Semantic HTML & Accessibility
- **Missing `<main>` Tags**: Several pages wrap their core content in `<div class="main-content">` instead of a semantic `<main>` tag.
  - **Action**: Replace the wrapper with `<main id="main-content">` on `index.html`, `about.html`, `activities.html`, `blog.html`, `genesis.html`, `techastra.html`, `404.html`, and `analytics.html`.
- **Add `aria-current`**: 
  - **Action**: Add `aria-current="page"` to the active navigation link on all pages.
- **Fix `team.html` Alt Texts & Links**: 
  - **Action**: Joint Heads currently have `alt="JH"` which is terrible for screen readers. Update with their names (e.g., `alt="Swayam Kumar - Joint Head"`). Fix the 7 broken LinkedIn links that currently just point to `https://linkedin.com/in/`.
- **Fix `blog.html` ARIA**: 
  - **Action**: The section has `aria-labelledby="posts-title"` but no element has `id="posts-title"`. Add the ID to the appropriate heading.
- **Remove Duplicate Style Attributes**:
  - **Action**: Fix `activities.html` (line 408) which has two `style` attributes on the same element.

## 4. HIGH: Meta Tags & Structured Data
- **Trim Meta Descriptions**: Meta descriptions on `about.html`, `team.html`, `activities.html`, `blog.html`, and `genesis.html` exceed 200 characters.
  - **Action**: Rewrite to be concise and under 160 characters to prevent SERP truncation.
- **Enhance JSON-LD schemas**:
  - **Action**: Add required `startDate` and `endDate` to the `Event` schema on `techastra.html`.
  - **Action**: Add `WebPage` or `FAQPage` JSON-LD schema to `certificates.html` and `verify.html`.
  - **Action**: Fix the author type in `blog.html` JSON-LD from `Person` to `Organization`.
- **Add Missing Social Tags**:
  - **Action**: Add Twitter Card tags to `certificates.html` and `verify.html`.
  - **Action**: Add `twitter:site` and `twitter:creator` (e.g., `@iiec_csmu`) and `og:locale="en_IN"` across all public pages.

## 5. MEDIUM: General Maintenance
- **Copyright Year Update**: 
  - **Action**: Update the footer copyright year from 2025 to 2026 across all pages.
- **Placeholder Links**: 
  - **Action**: Replace `href="#"` dead links on `activities.html` and `blog.html` with `href="javascript:void(0)"` or actual URLs so search crawlers don't get trapped.
- **Exposed API Keys/URLs**:
  - **Action**: `certificates.html` and `admin.html` expose Google Apps Script API endpoints directly in the inline JS. Obfuscate or move these to a secure backend route if possible.
- **Footer Inconsistencies**:
  - **Action**: Ensure footer anchor links (like `#bootcamp`, `#talks`) point to IDs that actually exist on the target pages.

---
**Execution Note for AI Model**: Work through these tasks methodically, file by file. Start with the CRITICAL tasks (especially image compression and git merge conflicts in `ipl-auction.html`) before moving to structural HTML changes.
