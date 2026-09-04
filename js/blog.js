/**
 * IIEC Blog & Insights — JavaScript Engine
 * Dynamic post rendering, instant category filtering, live search & newsletter
 */

(function () {
  'use strict';

  // API endpoint for Google Sheets CMS
  const SCRIPT_URL = atob('aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy9BS2Z5Y2J3MEtKazhPYkR3LVhwejlUSmxQWExDWE9Fb3ZXeDBJM2JTVWxjVG1CTFdiX0tMb0w0QXZ0QWtHNW9FbnZ4TUZOdnJ5QS9leGVj');
  const NEWSLETTER_URL = atob('aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy9BS2Z5Y2J5ZEVLWDVhR2t0bEttekNoQmtzcFdWR1N0SmtISGdWYlkyaUE4YkNQNzYxVTQ4cmhDVV92bHMteTNvN0x2akEyWlMvZXhlYw==');

  // Curated article visual assets tailored to each article topic
  const CURATED_ARTICLE_IMAGES = [
    'assets/images/blog/blog-genz-entrepreneurship.jpg', // Post 0: Gen Z
    'assets/images/blog/blog-balancing-studies.jpg',      // Post 1: Balancing Studies & Startup
    'assets/images/blog/blog-side-hustle.jpg',           // Post 2: Side Hustle
    'assets/images/blog/blog-failed-startup-pivot.jpg'   // Post 3: Failed Startup / Midterm
  ];

  // State
  let currentFilter = 'all';
  let searchQuery = '';
  let postsData = [];

  // DOM Elements
  const postsContainer = document.getElementById('blog-posts');
  const searchInput = document.getElementById('blog-search');
  const filterPills = document.querySelectorAll('.filter-pill');
  const articlesCountEl = document.getElementById('articles-count');
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
   * Get image for post with smart fallback
   */
  function getPostImage(post, index) {
    // Ignore empty images or mock Next Gen Pitch photos
    if (post.imageUrl && post.imageUrl.trim() !== '' && !post.imageUrl.includes('Next_Gen_Pitch')) {
      return post.imageUrl;
    }
    if (post.image && post.image.trim() !== '' && !post.image.includes('Next_Gen_Pitch')) {
      return post.image;
    }
    
    if (index !== undefined && index !== null && CURATED_ARTICLE_IMAGES[index % CURATED_ARTICLE_IMAGES.length]) {
      return CURATED_ARTICLE_IMAGES[index % CURATED_ARTICLE_IMAGES.length];
    }
    return 'assets/images/blog/blog-genz-entrepreneurship.jpg';
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

      const matchesFilter = currentFilter === 'all' || category.includes(currentFilter);
      const matchesSearch = !searchQuery || title.includes(searchQuery) || excerpt.includes(searchQuery);

      if (matchesFilter && matchesSearch) {
        card.style.display = 'flex';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    // Update count
    if (articlesCountEl) {
      articlesCountEl.textContent = visibleCount;
    }

    // Toggle empty state
    if (emptyState) {
      emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
    }
  }

  /**
   * Initialize Category Pills
   */
  function initFilters() {
    filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        filterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentFilter = (pill.getAttribute('data-filter') || 'all').toLowerCase();
        applyFilterAndSearch();
      });
    });
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
        filterPills.forEach(p => {
          if (p.getAttribute('data-filter') === 'all') p.classList.add('active');
          else p.classList.remove('active');
        });
        applyFilterAndSearch();
      });
    }
  }

  /**
   * Render dynamic posts from API
   */
  function renderDynamicPosts(posts) {
    if (!postsContainer || !posts || posts.length === 0) return;

    postsData = posts;

    const cardsHtml = posts.map((post, index) => {
      const img = getPostImage(post, index);
      const cat = post.category || 'Insights';
      const cleanCat = cat.toLowerCase();
      const read = post.readTime || '5 min read';
      const date = formatDate(post.timestamp);
      const author = post.author || 'IIEC Team';
      const authorInitials = author.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'II';

      // Use clean URLs: blog-post-0 or blog-post?index=${index}
      const postUrl = index < 4 ? `blog-post-${index}` : `blog-post?index=${index}`;

      return `
        <article class="blog-card" data-category="${escapeHtml(cleanCat)}" data-post-index="${index}">
          <div class="blog-card-image">
            <img src="${escapeHtml(img)}" 
                 alt="${escapeHtml(post.title)}" 
                 width="400" height="250" 
                 loading="lazy"
                 onerror="this.src='assets/images/default-blog.webp'">
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
            <p class="blog-card-excerpt">${escapeHtml(post.excerpt)}</p>
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

    // Attach click listeners for seamless state caching
    postsContainer.querySelectorAll('.blog-card-link, .blog-card-title a').forEach(link => {
      link.addEventListener('click', (e) => {
        const card = link.closest('.blog-card');
        const idx = parseInt(card?.dataset.postIndex || '-1');
        if (idx >= 0 && postsData[idx]) {
          try {
            localStorage.setItem('currentBlogPost', JSON.stringify(postsData[idx]));
          } catch (err) {
            console.warn('Could not store blog post:', err);
          }
        }
      });
    });

    applyFilterAndSearch();
  }

  /**
   * Fetch live posts from Google Apps Script
   */
  async function fetchLivePosts() {
    try {
      const response = await fetch(SCRIPT_URL, { method: 'GET', redirect: 'follow' });
      const data = await response.json();

      if (data.success && data.posts && data.posts.length > 0) {
        renderDynamicPosts(data.posts);
      }
    } catch (err) {
      console.warn('Using pre-rendered static articles (live fetch skipped):', err);
      // Pre-rendered markup is already active and pristine!
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
    initFilters();
    initSearch();
    initNewsletter();
    fetchLivePosts();
  });
})();
