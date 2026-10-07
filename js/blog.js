/**
 * IIEC Blog & Insights — JavaScript Engine
 * Dynamic post rendering, automatic live category generator & counts, instant search & newsletter
 */

(function () {
  'use strict';

  // API endpoint for Google Sheets CMS
  const SCRIPT_URL = atob('aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy9BS2Z5Y2J3MEtKazhPYkR3LVhwejlUSmxQWExDWE9Fb3ZXeDBJM2JTVWxjVG1CTFdiX0tMb0w0QXZ0QWtHNW9FbnZ4TUZOdnJ5QS9leGVj');
  const NEWSLETTER_URL = atob('aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy9BS2Z5Y2J5ZEVLWDVhR2t0bEttekNoQmtzcFdWR1N0SmtISGdWYlkyaUE4YkNQNzYxVTQ4cmhDVV92bHMteTNvN0x2akEyWlMvZXhlYw==');

  // Curated article visual assets tailored to each topic
  const CURATED_ARTICLE_IMAGES = [
    'assets/images/blog/blog-genz-entrepreneurship.jpg', // Post 0: Gen Z
    'assets/images/blog/blog-balancing-studies.jpg',      // Post 1: Balancing Studies & Startup
    'assets/images/blog/blog-side-hustle.jpg',           // Post 2: Side Hustle
    'assets/images/blog/blog-failed-startup-pivot.jpg'   // Post 3: Failed Startup / Midterm
  ];

  // Default published dataset
  const DEFAULT_POSTS = [
    {
      id: "b7e4521a-4712-4fbc-b40b-46bf8d8e5900",
      timestamp: "2026-03-04T12:08:44.839Z",
      title: "Gen- Z redefining Entrepreneurship",
      category: "Entrepreneurship",
      excerpt: "The arena where businesses compete now isn't just a playground to push each other behind - That is what Gen Z has managed to prove with their ways of turning business ventures into yet another fun quest.",
      author: "Sarah Sameer",
      readTime: "5 min read"
    },
    {
      id: "9144387c-ac86-4d3b-9624-c22198050133",
      timestamp: "2026-03-04T16:30:26.894Z",
      title: "Balancing Studies and Start-Up as a full-time student",
      category: "Entrepreneurship",
      excerpt: "There could be nothing more overwhelming than the constant juggling between start-up drive as an individual and managing the duties of a student at the college. Discover efficient and feasible hacks!",
      author: "Sarah Sameer",
      readTime: "5 min read"
    },
    {
      id: "945a638a-9f8d-4fc9-9045-9cf05ffd8b82",
      timestamp: "2026-03-29T20:44:34.079Z",
      title: "Side Hustle: Beyond just a culture, a stepping stone.",
      category: "Startup Stories",
      excerpt: "Hustling is an essential element to acquiring almost anything extraordinary. Getting fuel ready for your own Start-Up is hardly any different — exploring how young student ventures excel behind the scenes.",
      author: "Sarah Sameer",
      readTime: "5 min read"
    },
    {
      id: "3b021725-a990-4a13-807f-44a65624e432",
      timestamp: "2026-03-30T06:47:19.477Z",
      title: "The Midterm Manoeuvre: Why Your \"Failed\" Startup is Your Best Grade Yet",
      category: "Startup Stories",
      excerpt: "Getting an idea and wanting to make it a reality is a canon event for university students. Early failure isn't meant to demotivate you — it is the highest-value laboratory curriculum in entrepreneurship.",
      author: "Sarah Sameer",
      readTime: "4 min read"
    }
  ];

  // State
  let currentFilter = 'all';
  let searchQuery = '';
  let postsData = DEFAULT_POSTS;

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

  const SEED_POST_IMAGES = {
    "b7e4521a-4712-4fbc-b40b-46bf8d8e5900": 'assets/images/blog/blog-genz-entrepreneurship.jpg',
    "9144387c-ac86-4d3b-9624-c22198050133": 'assets/images/blog/blog-balancing-studies.jpg',
    "945a638a-9f8d-4fc9-9045-9cf05ffd8b82": 'assets/images/blog/blog-side-hustle.jpg',
    "3b021725-a990-4a13-807f-44a65624e432": 'assets/images/blog/blog-failed-startup-pivot.jpg'
  };

  /**
   * Get image for post with smart fallback:
   * Always prioritizes user-uploaded/provided image URL for new posts.
   */
  function getPostImage(post, index) {
    if (!post) return 'assets/images/blog/blog-genz-entrepreneurship.jpg';

    // 1. Prioritize user uploaded/provided image URL directly
    const userImg = (post.imageUrl || post.image || '').trim();
    if (userImg !== '') {
      return userImg;
    }

    // 2. Map original seed posts without a custom image URL to their specific assets
    if (post.id && SEED_POST_IMAGES[post.id]) {
      return SEED_POST_IMAGES[post.id];
    }
    const title = (post.title || '').toLowerCase();
    if (title.includes('gen-') || title.includes('gen z')) return 'assets/images/blog/blog-genz-entrepreneurship.jpg';
    if (title.includes('balancing') || title.includes('studies')) return 'assets/images/blog/blog-balancing-studies.jpg';
    if (title.includes('side hustle') || title.includes('hustling')) return 'assets/images/blog/blog-side-hustle.jpg';
    if (title.includes('midterm') || title.includes('failed')) return 'assets/images/blog/blog-failed-startup-pivot.jpg';

    // 3. Clean default fallback for new posts created without an image
    return 'assets/images/blog/blog-genz-entrepreneurship.jpg';
  }

  /**
   * Dynamically build category pills and calculate counts
   */
  function renderDynamicCategoryPills(posts) {
    if (!categoryFilterBar || !posts) return;

    const categoryMap = new Map();
    let totalCount = posts.length;

    posts.forEach(post => {
      const cat = (post.category || 'General').trim();
      const count = categoryMap.get(cat) || 0;
      categoryMap.set(cat, count + 1);
    });

    let pillsHtml = `
      <button class="filter-pill ${currentFilter === 'all' ? 'active' : ''}" data-filter="all" role="tab" aria-selected="${currentFilter === 'all'}">
        <span>All Articles</span>
        <span class="filter-pill-count">${totalCount}</span>
      </button>
    `;

    categoryMap.forEach((count, cat) => {
      const filterKey = cat.toLowerCase();
      const isActive = currentFilter === filterKey;
      pillsHtml += `
        <button class="filter-pill ${isActive ? 'active' : ''}" data-filter="${escapeHtml(filterKey)}" role="tab" aria-selected="${isActive}">
          <span>${escapeHtml(cat)}</span>
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
        currentFilter = (pill.getAttribute('data-filter') || 'all').toLowerCase();
        applyFilterAndSearch();
      });
    });

    // Update Hero Stats
    if (editionsCountEl) {
      editionsCountEl.textContent = totalCount;
    }
    if (articlesCountEl) {
      articlesCountEl.textContent = totalCount;
    }
    if (readAvgEl && posts.length > 0) {
      let totalMins = 0;
      posts.forEach(p => {
        const readStr = p.readTime || '5 min read';
        const num = parseInt(readStr) || 5;
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

    const img = getPostImage(post, featuredIndex);
    const cat = post.category || 'Featured';
    const date = formatDate(post.timestamp);
    const read = post.readTime || '5 min read';
    const author = post.author || 'IIEC Editorial';
    const authorInitials = author.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'IE';
    const postUrl = `blog-post.html?index=${featuredIndex}`;

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
      const img = getPostImage(post, index);
      const cat = post.category || 'Insights';
      const cleanCat = cat.toLowerCase();
      const read = post.readTime || '5 min read';
      const date = formatDate(post.timestamp);
      const author = post.author || 'IIEC Team';
      const authorInitials = author.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'IE';
      const postUrl = `blog-post.html?index=${index}`;
      const isFeatured = post.id === featuredPost.id;

      return `
        <article class="blog-card ${isFeatured ? 'blog-card--featured-spotlight' : ''}" data-category="${escapeHtml(cleanCat)}" data-post-index="${index}">
          <div class="blog-card-image">
            <img src="${escapeHtml(img)}" 
                 alt="${escapeHtml(post.title)}" 
                 width="400" height="250" 
                 loading="lazy"
                 onerror="this.src='assets/images/blog/blog-genz-entrepreneurship.jpg'">
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
    let visibleCount = 0;

    cards.forEach(card => {
      const category = (card.getAttribute('data-category') || '').toLowerCase();
      const title = (card.querySelector('.blog-card-title')?.textContent || '').toLowerCase();
      const excerpt = (card.querySelector('.blog-card-excerpt')?.textContent || '').toLowerCase();
      const author = (card.querySelector('.blog-card-author-tag')?.textContent || '').toLowerCase();

      const matchesFilter = currentFilter === 'all' || category === currentFilter || category.includes(currentFilter);
      const matchesSearch = !searchQuery || title.includes(searchQuery) || excerpt.includes(searchQuery) || author.includes(searchQuery);

      if (matchesFilter && matchesSearch) {
        card.style.display = 'flex';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    // Update count in header
    if (articlesCountEl) {
      articlesCountEl.textContent = visibleCount;
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

    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      applyFilterAndSearch();
    });

    const resetBtn = document.getElementById('reset-search-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
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
      }
    } catch (err) {
      console.warn('Live fetch note (using fallback posts):', err);
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
    // Initial instant render
    renderDynamicPosts(DEFAULT_POSTS);
    initSearch();
    initNewsletter();
    // Live refresh
    fetchLivePosts();
  });
})();
