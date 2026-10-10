/**
 * IIEC Blog Post Reader — JavaScript Engine
 * Dynamic article rendering from Google Sheets CMS & Organic Recommendations
 */

(function () {
  'use strict';

  const API_URL = atob('aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy9BS2Z5Y2J3MEtKazhPYkR3LVhwejlUSmxQWExDWE9Fb3ZXeDBJM2JTVWxjVG1CTFdiX0tMb0w0QXZ0QWtHNW9FbnZ4TUZOdnJ5QS9leGVj');

  // Default fallback image if an article has no image URL specified
  const DEFAULT_COVER_IMAGE = 'assets/og-image.webp';

  const mainEl = document.getElementById('blog-post-main');
  let allPosts = [];
  let activePost = null;

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Format dates nicely
   */
  function formatDate(timestamp) {
    if (!timestamp) return 'Recent Edition';
    try {
      const d = new Date(timestamp);
      if (isNaN(d.getTime())) return 'Recent Edition';
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Recent Edition';
    }
  }

  /**
   * Resolve Cover Image:
   * Purely uses the user-uploaded / provided image URL from Google Sheets / Appwrite Storage.
   */
  function resolveArticleImage(post) {
    if (!post) return DEFAULT_COVER_IMAGE;
    const userImg = (post.imageUrl || post.image || '').trim();
    if (userImg !== '') {
      return userImg;
    }
    return DEFAULT_COVER_IMAGE;
  }

  /**
   * Convert Markdown to rich HTML
   */
  function parseMarkdown(text) {
    if (!text) return '<p>No content available.</p>';
    let html = escapeHtml(text);
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, function (match) {
      return '<ul>' + match + '</ul>';
    });
    const paragraphs = html.split(/\n\n+/);
    html = paragraphs.map(p => {
      p = p.trim();
      if (!p) return '';
      if (p.startsWith('<h') || p.startsWith('<ul') || p.startsWith('<ol') || p.startsWith('<blockquote') || p.startsWith('<pre')) {
        return p;
      }
      return '<p>' + p.replace(/\n/g, '<br>') + '</p>';
    }).join('\n');
    return html;
  }

  /**
   * Reading Progress Bar Scroll Handler
   */
  function initReadingHairline() {
    const hairline = document.getElementById('iiec-top-hairline');
    if (!hairline) return;

    window.addEventListener('scroll', () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) {
        hairline.style.width = '0%';
        return;
      }
      const scrollProgress = Math.min(100, Math.max(0, (window.scrollY / docHeight) * 100));
      hairline.style.width = `${scrollProgress}%`;
    }, { passive: true });
  }

  /**
   * Main Post Render Function
   */
  function renderPost(post, index) {
    if (!mainEl || !post) return;
    activePost = post;

    const imageUrl = resolveArticleImage(post, index);
    const author = post.author || 'IIEC Editorial';
    const authorInitials = author.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'IE';
    const category = post.category || 'Entrepreneurship';
    const readTime = post.readTime || '5 min read';
    const dateFormatted = formatDate(post.timestamp);

    // Update Page Meta
    document.title = `${post.title} | IIEC Blog`;
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', post.title);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', post.excerpt || '');
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) ogImage.setAttribute('content', imageUrl);

    mainEl.innerHTML = `
      <div class="article-reader-container">
        
        <!-- Breadcrumb & Back Navigation Strip -->
        <div class="article-nav-wrapper">
          <div class="article-breadcrumb-bar">
            <a href="blog.html" class="btn-back-articles">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Articles</span>
            </a>
            <div class="article-quick-actions">
              <button type="button" class="btn-article-share" id="btn-copy-link" title="Copy article link">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span id="copy-link-label">Copy Link</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Main Card Surface -->
        <article class="article-main-card">
          
          <!-- Article Header -->
          <header class="article-header">
            <span class="article-category-badge">
              <span class="badge-dot"></span>
              ${escapeHtml(category)}
            </span>
            <h1 class="article-headline">${escapeHtml(post.title)}</h1>
            ${post.excerpt ? `<p class="article-lead-excerpt">${escapeHtml(post.excerpt)}</p>` : ''}
            
            <!-- Meta Bar -->
            <div class="article-meta-bar">
              <div class="article-author-cluster">
                <div class="author-cluster-avatar">${authorInitials}</div>
                <div class="author-cluster-info">
                  <span class="author-cluster-name">${escapeHtml(author)}</span>
                  <span class="author-cluster-role">Incubation, Innovation &amp; Entrepreneurship Cell &bull; CSMU</span>
                </div>
              </div>
              <div class="article-meta-tags">
                <span class="meta-tag-item">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  ${dateFormatted}
                </span>
                <span class="meta-sep">&bull;</span>
                <span class="meta-tag-item">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  ${escapeHtml(readTime)}
                </span>
              </div>
            </div>
          </header>

          <!-- Hero Cover Artwork -->
          <div class="article-hero-cover">
            <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(post.title)}" loading="eager" onerror="this.src='assets/images/blog/blog-genz-entrepreneurship.jpg'">
          </div>

          <!-- Article Rich Text Body -->
          <div class="article-body-content">
            ${parseMarkdown(post.content || post.excerpt || '')}
          </div>

          <!-- Engagement Footer & Share -->
          <footer class="article-footer-engagement">
            <div class="share-toolbar-left">
              <span>Share this article:</span>
              <div class="share-pills-row">
                <button type="button" class="share-icon-btn" id="share-twitter" title="Share on X / Twitter">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </button>
                <button type="button" class="share-icon-btn" id="share-linkedin" title="Share on LinkedIn">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/></svg>
                </button>
                <button type="button" class="share-icon-btn" id="share-whatsapp" title="Share on WhatsApp">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.03-1.24-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.4-.42-.56-.43h-.47c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.77 2.7 4.28 3.79.6.26 1.07.41 1.44.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.07-.12-.24-.19-.49-.31z"/></svg>
                </button>
              </div>
            </div>
          </footer>

          <!-- Author Bio Card -->
          <div class="article-author-card">
            <div class="author-card-avatar">${authorInitials}</div>
            <div class="author-card-details">
              <h4>Written by ${escapeHtml(author)}</h4>
              <div class="author-role-sub">Incubation, Innovation &amp; Entrepreneurship Cell, CSMU</div>
              <p>Sharing student founder playbooks, startup insights, and campus innovation lessons from the IIEC community at Chhatrapati Shivaji Maharaj University.</p>
            </div>
          </div>

        </article>

        <!-- Organic Related Articles -->
        <section class="related-articles-section" id="related-articles-section">
          <div class="related-header-row">
            <div>
              <h3>Related <span>Insights</span></h3>
              <p>Explore more articles on student entrepreneurship and innovation</p>
            </div>
            <a href="blog.html" class="btn-back-articles">View All Articles &rarr;</a>
          </div>
          <div class="related-grid" id="related-grid">
            ${renderRelatedArticlesHtml(post)}
          </div>
        </section>

      </div>
    `;

    initShareButtons(post);
  }

  /**
   * Organic Related Posts Generation
   */
  function renderRelatedArticlesHtml(currentPost) {
    if (!allPosts || allPosts.length <= 1) {
      return '<p style="color: var(--muted); font-style: italic;">More articles coming soon.</p>';
    }

    // Filter out current post
    const others = allPosts.filter(p => {
      if (currentPost.id && p.id && p.id === currentPost.id) return false;
      if (p.title === currentPost.title) return false;
      return true;
    });

    if (others.length === 0) {
      return '<p style="color: var(--muted); font-style: italic;">More articles coming soon.</p>';
    }

    // Prioritize same category, then other recent posts
    const sameCategory = others.filter(p => (p.category || '').toLowerCase() === (currentPost.category || '').toLowerCase());
    const differentCategory = others.filter(p => (p.category || '').toLowerCase() !== (currentPost.category || '').toLowerCase());

    const selected = [...sameCategory, ...differentCategory].slice(0, 3);

    return selected.map(post => {
      const globalIdx = allPosts.indexOf(post);
      const img = resolveArticleImage(post, globalIdx >= 0 ? globalIdx : 0);
      const author = post.author || 'IIEC Team';
      const authorInitials = author.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'IE';
      const cat = post.category || 'General';
      const read = post.readTime || '5 min read';
      const date = formatDate(post.timestamp);
      const targetUrl = post.id ? `blog-post.html?id=${encodeURIComponent(post.id)}` : `blog-post.html?index=${globalIdx >= 0 ? globalIdx : 0}`;

      return `
        <article class="blog-card" style="background: var(--card); border: 1px solid var(--line); border-radius: var(--radius-lg); overflow: hidden; display: flex; flex-direction: column; box-shadow: var(--shadow-sm); transition: transform 0.2s ease, box-shadow 0.2s ease;">
          <div style="position: relative; width: 100%; aspect-ratio: 16 / 9; overflow: hidden; background: var(--bg-subtle);">
            <img src="${escapeHtml(img)}" alt="${escapeHtml(post.title)}" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" loading="lazy" onerror="this.src='assets/og-image.webp'">
            <span style="position: absolute; top: 12px; left: 12px; padding: 3px 10px; background: rgba(245, 245, 240, 0.94); backdrop-filter: blur(8px); border-radius: 999px; font-family: var(--font-mono); font-size: 10px; font-weight: 800; color: var(--accent-dark); border: 1px solid var(--accent-border); text-transform: uppercase;">
              ${escapeHtml(cat)}
            </span>
          </div>
          <div style="padding: 1.25rem; display: flex; flex-direction: column; flex: 1; gap: 0.6rem;">
            <div style="display: flex; align-items: center; gap: 0.6rem; font-size: 12px; color: var(--muted); font-weight: 600;">
              <span>${date}</span>
              <span>&bull;</span>
              <span>${escapeHtml(read)}</span>
            </div>
            <h4 style="font-family: var(--font-heading); font-size: 16px; font-weight: 800; line-height: 1.3; color: var(--ink); margin: 0;">
              <a href="${targetUrl}" class="related-post-link" data-id="${escapeHtml(post.id || '')}" data-index="${globalIdx}">${escapeHtml(post.title)}</a>
            </h4>
            <p style="font-size: 13px; color: var(--muted); line-height: 1.5; margin-top: auto; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${escapeHtml(post.excerpt || '')}
            </p>
            <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 0.75rem; border-top: 1px solid var(--line); margin-top: 0.5rem;">
              <span style="font-size: 12px; font-weight: 700; color: var(--ink);">${escapeHtml(author)}</span>
              <a href="${targetUrl}" class="related-post-link" data-id="${escapeHtml(post.id || '')}" data-index="${globalIdx}" style="font-size: 12px; font-weight: 800; color: var(--accent); display: inline-flex; align-items: center; gap: 3px;">
                <span>Read</span> &rarr;
              </a>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  /**
   * Share Buttons Initialization
   */
  function initShareButtons(post) {
    const copyBtn = document.getElementById('btn-copy-link');
    const copyLabel = document.getElementById('copy-link-label');
    const twitterBtn = document.getElementById('share-twitter');
    const linkedinBtn = document.getElementById('share-linkedin');
    const whatsappBtn = document.getElementById('share-whatsapp');

    // Canonical permanent share URL always targets ?id=
    const origin = window.location.origin || (window.location.protocol + '//' + window.location.host);
    const path = window.location.pathname.replace(/\/$/, '') || '/blog-post.html';
    const postSlug = post.id ? `?id=${encodeURIComponent(post.id)}` : window.location.search;
    const articleUrl = `${origin}${path.endsWith('.html') ? path : '/blog-post.html'}${postSlug}`;
    const title = post.title || 'IIEC Blog Article';

    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(articleUrl);
          if (copyLabel) copyLabel.textContent = 'Copied!';
          setTimeout(() => {
            if (copyLabel) copyLabel.textContent = 'Copy Link';
          }, 2000);
        } catch (err) {
          if (copyLabel) copyLabel.textContent = 'Link Copied!';
          prompt('Copy article link:', articleUrl);
        }
      });
    }

    if (twitterBtn) {
      twitterBtn.addEventListener('click', () => {
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(articleUrl)}&via=iiec_csmu`;
        window.open(url, '_blank', 'noopener,noreferrer,width=600,height=450');
      });
    }

    if (linkedinBtn) {
      linkedinBtn.addEventListener('click', () => {
        const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(articleUrl)}`;
        window.open(url, '_blank', 'noopener,noreferrer,width=600,height=500');
      });
    }

    if (whatsappBtn) {
      whatsappBtn.addEventListener('click', () => {
        const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(title + ' — ' + articleUrl)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
      });
    }

    // Related post dynamic click delegation
    document.querySelectorAll('.related-post-link').forEach(link => {
      link.addEventListener('click', () => {
        const targetId = link.dataset.id;
        const idx = parseInt(link.dataset.index || '-1');
        const target = allPosts.find(p => p.id === targetId) || (idx >= 0 ? allPosts[idx] : null);
        if (target) {
          try {
            localStorage.setItem('currentBlogPost', JSON.stringify(target));
          } catch (err) {}
        }
      });
    });
  }

  /**
   * Not Found View
   */
  function renderNotFound() {
    if (!mainEl) return;
    mainEl.innerHTML = `
      <div class="article-reader-container" style="text-align: center; padding: 6rem 1.5rem;">
        <div class="article-main-card" style="max-width: 580px; margin: 0 auto; padding: 3rem 2rem;">
          <h2 style="font-family: var(--font-heading); font-size: 28px; font-weight: 900; margin-bottom: 0.75rem; color: var(--ink);">Article Not Found</h2>
          <p style="color: var(--muted); margin-bottom: 1.75rem;">Sorry, the requested article could not be loaded or may have been updated.</p>
          <a href="blog.html" class="btn-back-articles" style="display: inline-flex; justify-content: center; width: fit-content; margin: 0 auto;">
            <span>&larr; Return to All Articles</span>
          </a>
        </div>
      </div>
    `;
  }

  /**
   * Main Initialization Routine
   */
  async function init() {
    initReadingHairline();

    const urlParams = new URLSearchParams(window.location.search);
    const postId = (urlParams.get('id') || '').trim();
    const postIndex = urlParams.get('index');

    let detectedIndex = (postIndex !== null && postIndex !== '') ? parseInt(postIndex) : null;
    const pathMatch = window.location.pathname.match(/blog-post-(\d+)/);
    if (pathMatch && detectedIndex === null) {
      detectedIndex = parseInt(pathMatch[1]);
    }

    // 1. Try local cached post in session storage for instant preview if matching ID
    let hasRenderedCache = false;
    const storedPostRaw = localStorage.getItem('currentBlogPost');
    if (storedPostRaw) {
      try {
        const cached = JSON.parse(storedPostRaw);
        if (cached && (!postId || String(cached.id).trim() === postId)) {
          renderPost(cached, detectedIndex || 0);
          hasRenderedCache = true;
        }
      } catch (e) {}
    }

    // 2. Pure live fetch from Google Apps Script Backend (Google Sheets CMS)
    try {
      const response = await fetch(API_URL, { method: 'GET', redirect: 'follow' });
      const data = await response.json();
      if (data && data.success && Array.isArray(data.posts) && data.posts.length > 0) {
        let sortedPosts = data.posts;
        if (Array.isArray(data.orderedIds) && data.orderedIds.length > 0) {
          const map = new Map(data.posts.map(p => [p.id, p]));
          const arranged = [];
          data.orderedIds.forEach(id => {
            if (map.has(id)) {
              arranged.push(map.get(id));
              map.delete(id);
            }
          });
          map.forEach(p => arranged.push(p));
          sortedPosts = arranged;
        }

        allPosts = sortedPosts;
        let post = null;
        let activeIdx = 0;

        // Match priority: 1. ID -> 2. Index -> 3. Newest published post
        if (postId) {
          const foundIdx = sortedPosts.findIndex(p => String(p.id).trim() === postId);
          if (foundIdx !== -1) {
            post = sortedPosts[foundIdx];
            activeIdx = foundIdx;
          }
        }
        
        if (!post && detectedIndex !== null && sortedPosts[detectedIndex]) {
          post = sortedPosts[detectedIndex];
          activeIdx = detectedIndex;
        }

        if (!post && !postId && detectedIndex === null && sortedPosts.length > 0) {
          post = sortedPosts[0];
          activeIdx = 0;
        }

        if (post) {
          renderPost(post, activeIdx);
          // Canonicalize address bar to always include ?id=
          if (post.id && window.history && window.history.replaceState) {
            const canonicalHref = 'blog-post.html?id=' + encodeURIComponent(post.id);
            window.history.replaceState(null, '', canonicalHref);
          }
        } else {
          renderNotFound();
        }
      } else {
        renderNotFound();
      }
    } catch (err) {
      console.error('Error fetching live article from Google Sheets CMS:', err);
      if (!hasRenderedCache) {
        renderError();
      }
    }
  }

  function renderError() {
    if (!mainEl) return;
    mainEl.innerHTML = `
      <div class="article-reader-container" style="text-align: center; padding: 6rem 1.5rem;">
        <div class="article-main-card" style="max-width: 580px; margin: 0 auto; padding: 3rem 2rem;">
          <h2 style="font-family: var(--font-heading); font-size: 28px; font-weight: 900; margin-bottom: 0.75rem; color: var(--ink);">Unable to Connect</h2>
          <p style="color: var(--muted); margin-bottom: 1.75rem;">Could not load article from Google Sheets. Please verify your connection.</p>
          <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
            <button onclick="location.reload()" class="btn-back-articles" style="cursor: pointer; border: none;">
              <span>↻ Reload Page</span>
            </button>
            <a href="blog.html" class="btn-back-articles">
              <span>&larr; Return to All Articles</span>
            </a>
          </div>
        </div>
      </div>
    `;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();