/**
 * Blog Post Page Script
 * Handles fetching and rendering blog posts from API
 */
(function() {
  'use strict';
  
  const API_URL = 'https://script.google.com/macros/s/AKfycbw0KJk8ObDw-Xpz9TJlPXLCXOEovWx0I3bSUlcTmBLWb_KLoL4AvtAkG5oEnvxMFNvryA/exec';
  
  // Get post ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('id');
  const postIndex = urlParams.get('index');
  
  // DOM Elements
  const mainEl = document.getElementById('blog-post-main');
  const loadingEl = document.getElementById('loading-state');
  
  // Store all posts for related posts section
  let allPosts = [];
  
  // Initialize
  async function init() {
    // First check localStorage for the post data
    const storedPost = localStorage.getItem('currentBlogPost');
    
    if (storedPost) {
      const post = JSON.parse(storedPost);
      // Clear it after reading
      localStorage.removeItem('currentBlogPost');
      
      // Fetch all posts for related posts section
      fetchAllPosts().then(() => {
        renderPost(post);
      });
      return;
    }
    
    // If no stored post, fetch from API
    try {
      const response = await fetch(API_URL, {
        method: 'GET',
        redirect: 'follow'
      });
      const data = await response.json();
      
      if (data.success && data.posts && data.posts.length > 0) {
        allPosts = data.posts;
        
        // Find the post by ID or index
        let post = null;
        
        if (postId) {
          post = data.posts.find(p => p.id === postId);
        } else if (postIndex !== null) {
          post = data.posts[parseInt(postIndex)];
        }
        
        if (post) {
          renderPost(post);
        } else {
          renderNotFound();
        }
      } else {
        renderNotFound();
      }
    } catch (error) {
      console.error('Error loading post:', error);
      renderNotFound();
    }
  }
  
  async function fetchAllPosts() {
    try {
      const response = await fetch(API_URL, {
        method: 'GET',
        redirect: 'follow'
      });
      const data = await response.json();
      if (data.success && data.posts) {
        allPosts = data.posts;
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  }
  
  function renderPost(post) {
    const imageUrl = post.imageUrl || post.image || './assets/images/default-blog.webp';
    const authorInitials = (post.author || 'IIEC').split(' ').map(n => n[0]).join('').toUpperCase();
    
    // Update page title and meta
    document.title = `${post.title} | IIEC Blog`;
    document.querySelector('meta[property="og:title"]').setAttribute('content', post.title);
    document.querySelector('meta[property="og:description"]').setAttribute('content', post.excerpt || '');
    
    mainEl.innerHTML = `
      <!-- Hero Image -->
      <div class="blog-post-hero">
        <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(post.title)}" onerror="this.src='./assets/images/default-blog.webp'">
        <div class="blog-post-hero-overlay"></div>
      </div>
      
      <!-- Post Content -->
      <div class="blog-post-container">
        <a href="blog.html" class="back-to-blog">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Blog
        </a>
        
        <header class="blog-post-header">
          <span class="blog-post-category">${escapeHtml(post.category) || 'General'}</span>
          <h1 class="blog-post-title">${escapeHtml(post.title)}</h1>
          <div class="blog-post-meta">
            <span class="blog-post-meta-item">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              ${formatDate(post.timestamp)}
            </span>
            <span class="blog-post-meta-item">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              ${escapeHtml(post.readTime) || '5 min read'}
            </span>
            <span class="blog-post-meta-item">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              ${escapeHtml(post.author) || 'IIEC Team'}
            </span>
          </div>
        </header>
        
        <article class="blog-post-content">
          ${parseMarkdown(post.content || post.excerpt || '')}
        </article>
        
        <div class="blog-post-author">
          <div class="blog-post-author-avatar">${authorInitials}</div>
          <div class="blog-post-author-info">
            <h4>${escapeHtml(post.author) || 'IIEC Team'}</h4>
            <p>Innovation, Incubation & Entrepreneurship Cell</p>
          </div>
        </div>
        
        <!-- Related Posts -->
        <section class="related-posts" id="related-posts">
          <h2 class="related-posts-title">More Articles</h2>
          <div class="related-posts-grid" id="related-posts-grid">
            ${renderRelatedPosts(post)}
          </div>
        </section>
      </div>
    `;
  }
  
  function renderRelatedPosts(currentPost) {
    // Filter out current post and get up to 3 related posts
    const related = allPosts
      .filter(p => p.id !== currentPost.id && p.title !== currentPost.title)
      .slice(0, 3);
    
    if (related.length === 0) {
      return '<p style="text-align: center; color: var(--text-muted);">No other articles available yet.</p>';
    }
    
    return related.map((post, index) => {
      const imageUrl = post.imageUrl || post.image || './assets/images/default-blog.webp';
      return `
        <article class="blog-card" data-animate="scale">
          <div class="blog-card-image">
            <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(post.title)}" 
                 width="400" height="250" loading="lazy"
                 onerror="this.src='./assets/images/default-blog.webp'">
            <span class="blog-card-category">${escapeHtml(post.category) || 'General'}</span>
          </div>
          <div class="blog-card-content">
            <div class="blog-card-meta">
              <span class="blog-card-date">${formatDate(post.timestamp)}</span>
              <span class="blog-card-read">${escapeHtml(post.readTime) || '5 min read'}</span>
            </div>
            <h2 class="blog-card-title">${escapeHtml(post.title)}</h2>
            <p class="blog-card-excerpt">${escapeHtml(post.excerpt)}</p>
            <a href="#" class="blog-card-link" onclick="openPost(${index}); return false;">
              Read More
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>
        </article>
      `;
    }).join('');
  }
  
  function renderNotFound() {
    mainEl.innerHTML = `
      <div class="blog-post-not-found">
        <h1>Article Not Found</h1>
        <p>Sorry, the article you're looking for doesn't exist or has been removed.</p>
        <a href="blog.html" class="btn btn-primary">
          <span>Back to Blog</span>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </a>
      </div>
    `;
  }
  
  function parseMarkdown(text) {
    if (!text) return '<p>No content available.</p>';
    
    let html = escapeHtml(text);
    
    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Links
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    
    // Blockquotes
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
    
    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    // Inline code
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');
    
    // Unordered lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    
    // Ordered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    
    // Wrap consecutive list items
    html = html.replace(/(<li>.*<\/li>\n?)+/g, function(match) {
      return '<ul>' + match + '</ul>';
    });
    
    // Paragraphs - split by double newlines
    const paragraphs = html.split(/\n\n+/);
    html = paragraphs.map(p => {
      p = p.trim();
      if (!p) return '';
      // Don't wrap if already wrapped in a block element
      if (p.startsWith('<h') || p.startsWith('<ul') || p.startsWith('<ol') || 
          p.startsWith('<blockquote') || p.startsWith('<pre')) {
        return p;
      }
      return '<p>' + p.replace(/\n/g, '<br>') + '</p>';
    }).join('\n');
    
    return html;
  }
  
  function formatDate(timestamp) {
    if (!timestamp) return 'Recently';
    try {
      return new Date(timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Recently';
    }
  }
  
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // Make openPost available globally for related posts
  window.openPost = function(index) {
    if (allPosts[index]) {
      localStorage.setItem('currentBlogPost', JSON.stringify(allPosts[index]));
      window.location.href = `blog-post.html?index=${index}`;
    }
  };
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
