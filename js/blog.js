/**
 * IIEC Blog & Insights — JavaScript Engine
 * Dynamic post rendering, automatic live category generator & counts, instant search & newsletter
 */

(function () {
  'use strict';

  // API endpoint for Google Sheets CMS
  const SCRIPT_URL = atob('aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy9BS2Z5Y2J3MEtKazhPYkR3LVhwejlUSmxQWExDWE9Fb3ZXeDBJM2JTVWxjVG1CTFdiX0tMb0w0QXZ0QWtHNW9FbnZ4TUZOdnJ5QS9leGVj');
  const NEWSLETTER_URL = atob('aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy9BS2Z5Y2J5ZEVLWDVhR2t0bEttekNoQmtzcFdWR1N0SmtISGdWYlkyaUE4YkNQNzYxVTQ4cmhDVV92bHMteTNvN0x2akEyWlMvZXhlYw==');

  // Default fallback image if an article has no image URL specified
  const DEFAULT_COVER_IMAGE = 'assets/og-image.webp';

  // State
  let currentFilter = 'all';
  let searchQuery = '';
  let postsData = [];

  // DOM Elements
  const postsContainer = document.getElementById('blog-posts');
  const searchInput = document.getElementById('blog-search');
  const categoryFilterBar = document.getElementById('blog-category-filter-bar');
  const featuredSection = document.getElementById('blog-featured-section');
  const articlesCountEl = document.getElementById('articles-count');
  const editionsCountEl = document.getElementById('blog-editions-count');
  const readAvgEl = document.getElementById('blog-read-avg');
  const newsletterForm = document.getElementById('newsletter-form');
  const newsletterMessage = document.getElementById('newsletter-message');

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
   * Format ISO or millisecond date nicely
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
   * Get image for post:
   * Purely uses the image URL provided in Google Sheets / Appwrite Storage.
   */
  function getPostImage(post) {
    if (!post) return DEFAULT_COVER_IMAGE;
    const userImg = (post.imageUrl || post.image || '').trim();
    if (userImg !== '') {
      return userImg;
    }
    return DEFAULT_COVER_IMAGE;
  }

  /**
   * Dynamically build category pills and calculate counts
   */
  function renderDynamicCategoryPills(posts) {
    if (!categoryFilterBar || !posts) return;

    const categoryMap = new Map();
    const totalCount = posts.length;

    posts.forEach(post => {
      let rawCat = (post.category || 'General').trim();
      if (!rawCat) rawCat = 'General';
      const key = rawCat.toLowerCase();
      if (!categoryMap.has(key)) {
        // Pretty title casing for UI display
        const displayName = rawCat.charAt(0).toUpperCase() + rawCat.slice(1);
        categoryMap.set(key, { name: displayName, count: 0 });
      }
      categoryMap.get(key).count += 1;
    });

    // Sort categories by highest article count first
    const sortedCategories = Array.from(categoryMap.entries()).sort((a, b) => b[1].count - a[1].count);

    let pillsHtml = `
      <button class="filter-pill ${currentFilter === 'all' ? 'active' : ''}" data-filter="all" role="tab" aria-selected="${currentFilter === 'all'}">
        <span>All Articles</span>
        <span class="filter-pill-count">${totalCount}</span>
      </button>
    `;

    sortedCategories.forEach(([filterKey, { name, count }]) => {
      const isActive = currentFilter === filterKey;
      pillsHtml += `
        <button class="filter-pill ${isActive ? 'active' : ''}" data-filter="${escapeHtml(filterKey)}" role="tab" aria-selected="${isActive}">
          <span>${escapeHtml(name)}</span>
          <span class="filter-pill-count">${count}</span>
        </button>
      `;
    });

    categoryFilterBar.innerHTML = pillsHtml;

    // Attach click listeners
    const pills = categoryFilterBar.querySelectorAll('.filter-pill');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        pills.forEach(p => {
          p.classList.remove('active');
          p.setAttribute('aria-selected', 'false');
        });
        pill.classList.add('active');
        pill.setAttribute('aria-selected', 'true');
        currentFilter = (pill.getAttribute('data-filter') || 'all').toLowerCase().trim();
        applyFilterAndSearch();
      });
    });

    // Update Hero Stats dynamically
    if (editionsCountEl) {
      editionsCountEl.textContent = totalCount;
    }
    if (articlesCountEl) {
      articlesCountEl.textContent = `${totalCount} Published`;
    }
    if (readAvgEl && posts.length > 0) {
      let totalMins = 0;
      posts.forEach(p => {
        const readStr = String(p.readTime || '5 min read');
        const num = parseInt(readStr.replace(/[^0-9]/g, ''), 10) || 5;
        totalMins += num;
      });
      const avg = Math.max(1, Math.round(totalMins / posts.length));
      readAvgEl.textContent = `${avg} Min`;
    }
  }

  /**
   * Dynamically build featured spotlight article (newest article)
   */
  /**
   * Dynamically build featured spotlight article
   */
  function renderFeaturedArticle(post, featuredIndex = 0) {
    if (!featuredSection || !post) return;

    const img = getPostImage(post);
    const cat = post.category || 'Featured';
    const date = formatDate(post.timestamp);
    const read = post.readTime || '5 min read';
    const author = post.author || 'IIEC Editorial';
    const authorInitials = author.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'IE';
    const postUrl = post.id ? `blog-post.html?id=${encodeURIComponent(post.id)}` : `blog-post.html?index=${featuredIndex}`;

    featuredSection.innerHTML = `
      <a href="${postUrl}" class="blog-featured-card" aria-label="Read featured article: ${escapeHtml(post.title)}" data-post-index="${featuredIndex}">
        <div class="featured-media-wrapper">
          <img src="${escapeHtml(img)}" alt="${escapeHtml(post.title)}" loading="eager" decoding="async">
          <span class="featured-badge-tag">
            <span class="badge-dot"></span> Featured Edition
          </span>
        </div>
        <div class="featured-content">
          <div>
            <div class="featured-meta-row">
              <span class="featured-meta-item">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                ${date}
              </span>
              <span class="featured-meta-item">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                ${escapeHtml(read)}
              </span>
              <span class="featured-meta-item" style="color: var(--accent); font-weight: 800;">
                ${escapeHtml(cat)}
              </span>
            </div>
            <h2 class="featured-title">${escapeHtml(post.title)}</h2>
            <p class="featured-excerpt">
              ${escapeHtml(post.excerpt || '')}
            </p>
          </div>
          <div class="featured-footer-row">
            <div class="featured-author-box">
              <span class="author-avatar">${authorInitials}</span>
              <div>
                <div class="author-info-name">${escapeHtml(author)}</div>
                <div class="author-info-sub">IIEC CSMU &bull; Author</div>
              </div>
            </div>
            <span class="featured-read-action">
              <span>Read Feature Story</span>
              <span>&rarr;</span>
            </span>
          </div>
        </div>
      </a>
    `;

    // Cache to localStorage on click
    const featuredLink = featuredSection.querySelector('.blog-featured-card');
    if (featuredLink) {
      featuredLink.addEventListener('click', () => {
        try {
          localStorage.setItem('currentBlogPost', JSON.stringify(post));
        } catch (e) {}
      });
    }
  }

  /**
   * Apply Custom Order and Featured Choice from Google Sheet CMS (Universal across all devices)
   */
  function applyAdminLayout(posts, apiFeaturedId = null, apiOrderedIds = null) {
    if (!posts || posts.length === 0) return { orderedPosts: posts, featuredPost: posts[0], featuredIndex: 0 };

    // Ensure IDs exist
    const standardized = posts.map((p, idx) => ({
      ...p,
      id: p.id || `post_${idx}_${p.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`
    }));

    let orderedPosts = [...standardized];

    // Check if any post from sheet has isFeatured=true
    const sheetFeaturedPost = standardized.find(p => p.isFeatured === true || String(p.isFeatured).toLowerCase() === 'true');
    let targetFeaturedId = apiFeaturedId || (sheetFeaturedPost ? sheetFeaturedPost.id : null);
    let targetOrderedIds = (Array.isArray(apiOrderedIds) && apiOrderedIds.length > 0) ? apiOrderedIds : null;

    // Fallback to local storage only if remote API didn't provide custom layout
    if (!targetFeaturedId || !targetOrderedIds) {
      const savedLayoutRaw = localStorage.getItem('iiec_blog_layout_v1');
      if (savedLayoutRaw) {
        try {
          const layout = JSON.parse(savedLayoutRaw);
          if (!targetFeaturedId && layout.featuredId) targetFeaturedId = layout.featuredId;
          if (!targetOrderedIds && Array.isArray(layout.orderedIds)) targetOrderedIds = layout.orderedIds;
        } catch (err) {}
      }
    }

    // 1. Arrange Posts according to targetOrderedIds
    if (Array.isArray(targetOrderedIds) && targetOrderedIds.length > 0) {
      const postMap = new Map(standardized.map(p => [p.id, p]));
      const arranged = [];
      targetOrderedIds.forEach(id => {
        if (postMap.has(id)) {
          arranged.push(postMap.get(id));
          postMap.delete(id);
        }
      });
      // Add remaining newly fetched posts
      postMap.forEach(p => arranged.push(p));
      orderedPosts = arranged;
    }

    // 2. Select Spotlight Featured Story
    let featuredPost = orderedPosts[0];
    let featuredIndex = 0;
    if (targetFeaturedId) {
      const foundIndex = orderedPosts.findIndex(p => p.id === targetFeaturedId);
      if (foundIndex !== -1) {
        featuredPost = orderedPosts[foundIndex];
        featuredIndex = foundIndex;
      }
    }

    return { orderedPosts, featuredPost, featuredIndex };
  }

  /**
   * Render dynamic posts into the grid
   */
  function renderDynamicPosts(posts, apiFeaturedId = null, apiOrderedIds = null) {
    if (!postsContainer || !posts || posts.length === 0) return;

    // Apply custom curation from Google Sheet CMS
    const { orderedPosts, featuredPost, featuredIndex } = applyAdminLayout(posts, apiFeaturedId, apiOrderedIds);
    postsData = orderedPosts;

    // Render dynamic category filter bar & stats
    renderDynamicCategoryPills(orderedPosts);

    // Render chosen featured spotlight article
    renderFeaturedArticle(featuredPost, featuredIndex);

    // Render main articles grid
    const cardsHtml = orderedPosts.map((post, index) => {
      const img = getPostImage(post);
      const cat = post.category || 'Insights';
      const cleanCat = cat.toLowerCase();
      const read = post.readTime || '5 min read';
      const date = formatDate(post.timestamp);
      const author = post.author || 'IIEC Team';
      const authorInitials = author.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'IE';
      const postUrl = post.id ? `blog-post.html?id=${encodeURIComponent(post.id)}` : `blog-post.html?index=${index}`;
      const isFeatured = post.id === featuredPost.id;

      return `
        <article class="blog-card ${isFeatured ? 'blog-card--featured-spotlight' : ''}" data-category="${escapeHtml(cleanCat)}" data-post-index="${index}" data-post-id="${escapeHtml(post.id || '')}">
          <div class="blog-card-image">
            <img src="${escapeHtml(img)}" 
                 alt="${escapeHtml(post.title)}" 
                 width="400" height="250" 
                 loading="lazy"
                 onerror="this.src='assets/og-image.webp'">
            <span class="blog-card-category">${escapeHtml(cat)}</span>
          </div>
          <div class="blog-card-content">
            <div class="blog-card-meta">
              <span class="blog-card-meta-item">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                ${date}
              </span>
              <span class="blog-card-meta-item">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                ${escapeHtml(read)}
              </span>
            </div>
            <h2 class="blog-card-title">
              <a href="${postUrl}">${escapeHtml(post.title)}</a>
            </h2>
            <p class="blog-card-excerpt">${escapeHtml(post.excerpt || '')}</p>
            <div class="blog-card-footer">
              <div class="blog-card-author-tag">
                <span class="tag-avatar">${authorInitials}</span>
                <span>${escapeHtml(author)}</span>
              </div>
              <a href="${postUrl}" class="blog-card-link" data-post-index="${index}">
                <span>Read Article</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>
          </div>
        </article>
      `;
    }).join('');

    postsContainer.innerHTML = cardsHtml;

    // Attach click listeners for instant local cache handover
    postsContainer.querySelectorAll('.blog-card-link, .blog-card-title a').forEach(link => {
      link.addEventListener('click', () => {
        const card = link.closest('.blog-card');
        const idx = parseInt(card?.dataset.postIndex || '-1');
        if (idx >= 0 && postsData[idx]) {
          try {
            localStorage.setItem('currentBlogPost', JSON.stringify(postsData[idx]));
          } catch (err) {}
        }
      });
    });

    applyFilterAndSearch();
  }

  /**
   * Filter and Search execution
   */
  function applyFilterAndSearch() {
    const cards = document.querySelectorAll('.blog-card');
    const emptyState = document.getElementById('blog-empty-state');
    const totalCount = cards.length;
    let visibleCount = 0;

    cards.forEach(card => {
      const category = (card.getAttribute('data-category') || '').toLowerCase();
      const title = (card.querySelector('.blog-card-title')?.textContent || '').toLowerCase();
      const excerpt = (card.querySelector('.blog-card-excerpt')?.textContent || '').toLowerCase();
      const author = (card.querySelector('.blog-card-author-tag')?.textContent || '').toLowerCase();

      const matchesFilter = currentFilter === 'all' || category === currentFilter || category.split(',').map(s => s.trim().toLowerCase()).includes(currentFilter);
      const matchesSearch = !searchQuery || title.includes(searchQuery) || excerpt.includes(searchQuery) || author.includes(searchQuery) || category.includes(searchQuery);

      if (matchesFilter && matchesSearch) {
        card.style.display = 'flex';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    // Toggle Featured Spotlight: when user searches or filters by a specific category,
    // gracefully hide the generic featured story so the targeted results take center stage
    if (featuredSection) {
      if (currentFilter !== 'all' || searchQuery !== '') {
        featuredSection.style.display = 'none';
      } else {
        featuredSection.style.display = 'block';
      }
    }

    // Update count in header
    if (articlesCountEl) {
      if (currentFilter === 'all' && !searchQuery) {
        articlesCountEl.textContent = `${totalCount} Published`;
      } else {
        articlesCountEl.textContent = `${visibleCount} of ${totalCount}`;
      }
    }

    // Toggle empty state
    if (emptyState) {
      emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
    }
  }

  /**
   * Initialize Live Search
   */
  function initSearch() {
    if (!searchInput) return;

    const searchClearBtn = document.getElementById('blog-search-clear');

    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      if (searchClearBtn) {
        searchClearBtn.style.display = searchQuery ? 'inline-flex' : 'none';
      }
      applyFilterAndSearch();
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        searchQuery = '';
        if (searchClearBtn) searchClearBtn.style.display = 'none';
        applyFilterAndSearch();
      }
    });

    if (searchClearBtn) {
      searchClearBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        searchClearBtn.style.display = 'none';
        searchInput.focus();
        applyFilterAndSearch();
      });
    }

    const resetBtn = document.getElementById('reset-search-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        if (searchClearBtn) searchClearBtn.style.display = 'none';
        currentFilter = 'all';
        if (categoryFilterBar) {
          const pills = categoryFilterBar.querySelectorAll('.filter-pill');
          pills.forEach(p => {
            if (p.getAttribute('data-filter') === 'all') {
              p.classList.add('active');
              p.setAttribute('aria-selected', 'true');
            } else {
              p.classList.remove('active');
              p.setAttribute('aria-selected', 'false');
            }
          });
        }
        applyFilterAndSearch();
      });
    }
  }

  /**
   * Fetch live posts from Google Apps Script
   */
  async function fetchLivePosts() {
    try {
      const response = await fetch(SCRIPT_URL, { method: 'GET', redirect: 'follow' });
      const data = await response.json();

      if (data && data.success && Array.isArray(data.posts) && data.posts.length > 0) {
        renderDynamicPosts(data.posts, data.featuredPostId || data.featuredId, data.orderedIds);
      } else {
        if (postsContainer) {
          postsContainer.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--muted);">
              <h3>No Articles Published Yet</h3>
              <p>Check back soon for new insights and founder stories.</p>
            </div>
          `;
        }
      }
    } catch (err) {
      console.warn('Live fetch note from Google Sheets CMS:', err);
      if (postsContainer) {
        postsContainer.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--muted);">
            <h3>Unable to Load Articles</h3>
            <p style="margin-bottom: 1.5rem;">Could not connect to the Google Sheets CMS. Please check your network.</p>
            <button onclick="location.reload()" class="btn btn-primary btn-sm" style="display: inline-flex; margin: 0 auto;">
              <span>↻ Retry Connection</span>
            </button>
          </div>
        `;
      }
    }
  }

  /**
   * Newsletter Form Handler
   */
  function initNewsletter() {
    if (!newsletterForm) return;

    newsletterForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailInput = newsletterForm.querySelector('input[type="email"]');
      const submitBtn = newsletterForm.querySelector('button[type="submit"]');
      const email = emailInput?.value.trim();

      if (!email) return;

      submitBtn.disabled = true;
      submitBtn.textContent = 'Subscribing...';

      try {
        await fetch(NEWSLETTER_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email,
            timestamp: new Date().toISOString(),
            source: 'blog_page'
          })
        });

        if (newsletterMessage) {
          newsletterMessage.className = 'form-message success';
          newsletterMessage.textContent = 'You are in! Thank you for subscribing to IIEC Insights.';
        }
        newsletterForm.reset();
      } catch (error) {
        if (newsletterMessage) {
          newsletterMessage.className = 'form-message error';
          newsletterMessage.textContent = 'Unable to subscribe right now. Please try again.';
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Subscribe Free';
        setTimeout(() => {
          if (newsletterMessage) newsletterMessage.style.display = 'none';
        }, 5000);
      }
    });
  }

  // Initialize all engines on DOM load
  document.addEventListener('DOMContentLoaded', () => {
    initSearch();
    initNewsletter();
    // Pure live fetch from Google Sheet CMS
    fetchLivePosts();
  });
})();
