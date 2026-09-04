/**
 * IIEC Blog Post Reader — JavaScript Engine
 * Dynamic article rendering with dedicated curated editorial artwork
 */

(function () {
  'use strict';

  const API_URL = atob('aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy9BS2Z5Y2J3MEtKazhPYkR3LVhwejlUSmxQWExDWE9Fb3ZXeDBJM2JTVWxjVG1CTFdiX0tMb0w0QXZ0QWtHNW9FbnZ4TUZOdnJ5QS9leGVj');

  // Dedicated bespoke artwork for each published edition (no mock event photos)
  const CURATED_ARTICLE_IMAGES = [
    'assets/images/blog/blog-genz-entrepreneurship.jpg', // Post 0: Gen Z
    'assets/images/blog/blog-balancing-studies.jpg',      // Post 1: Balancing Studies & Startup
    'assets/images/blog/blog-side-hustle.jpg',           // Post 2: Side Hustle
    'assets/images/blog/blog-failed-startup-pivot.jpg'   // Post 3: Failed Startup / Midterm
  ];

  // Offline / instant fallback dataset of official published articles
  const FALLBACK_POSTS = [
    {
      id: "b7e4521a-4712-4fbc-b40b-46bf8d8e5900",
      timestamp: "2026-03-04T12:08:44.839Z",
      title: "Gen- Z redefining Entrepreneurship",
      category: "Entrepreneurship",
      excerpt: "The arena where businesses compete now isn't just a playground to push each other behind - That is what Gen Z has managed to prove with their ways of turning business ventures into yet another fun quest.",
      content: `### GEN-Z: REDEFINING ENTREPRENEURSHIP\n\nMove over, traditional playbooks! Gen-Z entrepreneurs are here, rewriting the rules of business.\nUnlike earlier generations, they aren't waiting for degrees, promotions, or years of experience to begin. Many are starting their ventures in their late teens or early twenties, powered by technology, creativity, and a strong sense of purpose.\n\nGen-Z doesn't just value profit, they prioritise IMPACT.\nThey are building startups in climate tech, mental health, creator economy, and education- areas that shape lives and communities. This generation views entrepreneurship as a means to address problems they deeply care about, rather than just a way to accumulate wealth.\n\nAnother defining trait? Speed and adaptability!\nGen-Z founders are digital natives; it's their niche.\nThey experiment quickly, fail fast, and pivot with confidence swiftly. Social media isn't just their marketing channel- it's their testing ground, community space, and storytelling platform. Unlike older generations, they don't see collaboration as a weakness. They actively co-create, network, and leverage ecosystems.\n\nWhat sets them apart is also their authenticity. Gen-Z founders connect with audiences by being real- sharing struggles as openly as successes. Not ashamed of their setbacks, which leads to the still-growing entrepreneurs feeling related and understood rather than being called a failure and left demotivated. This transparency builds stronger brands and deeper trust.\n\nIf entrepreneurship used to be about profits, Gen-Z is proving it's about purpose with profits. They are demonstrating that businesses can scale and still stay socially conscious.\n\nThe future of entrepreneurship is already here, and it looks bold, inclusive, and disruptive.\n\nWith Gen-Z leading the charge, we aren't just seeing startups- we're seeing co-operation and movements.`,
      author: "Sarah Sameer",
      readTime: "5 min read"
    },
    {
      id: "9144387c-ac86-4d3b-9624-c22198050133",
      timestamp: "2026-03-04T16:30:26.894Z",
      title: "Balancing Studies and Start-Up as a full-time student",
      category: "Entrepreneurship",
      excerpt: "There could be nothing more overwhelming than the constant juggling between start-up drive as an individual and managing the duties of a student at the college. Discover efficient and feasible hacks!",
      content: `For student founders, the struggle is real: balancing assignments, exams, projects, pitch decks, prototypes, and investor calls can feel like running two full-time jobs.\nHowever, with discipline and clarity, it is possible to manage both your studies and your startup and still thrive!\n\nHere are three strategies that can make a significant difference:\n\n1. **Time-blocking:** Set aside fixed hours dedicated to your startup work. Treat this time as non-negotiable, just like your classes.\n\n2. **Leverage your circle:** Collaborate with classmates and peers. Group projects can serve as valuable testing grounds for your ideas.\n\n3. **Prioritize:** Not every email, feature, or meeting is urgent. Focus on high-impact tasks that drive your venture forward.\n\nMany successful founders launched their companies while still in college. Their success came not from superhuman effort, but from focus and synergy. They didn't view their studies and startups as opposing forces; instead, they utilized their education to fuel their entrepreneurial journey.\n\nFor instance, coursework in finance may help you refine your revenue model, while a marketing assignment could inspire your next campaign idea. When approached this way, your degree and your startup can COMPLEMENT each other rather than COMPETE.\n\nRemember: burnout is real!\n\nBalance is not about doing everything at once; it's about knowing what matters most at the moment.\n\nYour degree is an investment in your knowledge. Your startup is an investment in your vision.\nIf you can nurture both, you'll graduate not just with a certificate but also with a company.`,
      author: "Sarah Sameer",
      readTime: "5 min read"
    },
    {
      id: "945a638a-9f8d-4fc9-9045-9cf05ffd8b82",
      timestamp: "2026-03-29T20:44:34.079Z",
      title: "Side Hustle: Beyond just a culture, a stepping stone.",
      category: "Startup Stories",
      excerpt: "Hustling is an essential element to acquiring almost anything extraordinary. Getting fuel ready for your own Start-Up is hardly any different — exploring how young student ventures excel behind the scenes.",
      content: `We've all seen the "hustle culture" reels — the 5:00 AM routines, the aesthetic desk setups, and the pressure to be the next teenage billionaire. It's exhausting, right? Honestly, when you're staring down a thermodynamics lab report or a 2,000-word sociology essay, the idea of "starting a company" feels like trying to climb Everest in flip-flops.\n\nBut here's a secret we don't talk about enough at the E-Cell: **Entrepreneurship doesn't have to be a grand explosion. Sometimes, it's just a slow burn.**\n\n### Redefining the "Startup"\nIf you are a Literature major selling hand-painted bookmarks on Instagram, you are a founder. If you're a Psych student offering freelance tutoring, you're managing a service-based startup. If you're an artist taking commissions for digital portraits, you're navigating supply and demand.\n\nThe "Side-Hustle" isn't just a trendy buzzword to add to your LinkedIn bio. It is a low-stakes laboratory where you can fail, pivot, and learn without the world watching.\n\n### Why the "Small Start" is Your Superpower\nWhen you start small, you're doing more than just earning extra coffee money. You're building a toolkit that your future self will thank you for:\n\n- **The "Yes/No" Muscle:** You learn how to prioritize your time between a mid-term and a client deadline.\n- **The Language of Value:** You stop thinking about "tasks" and start thinking about "solutions." You aren't just selling a product; you're solving a peer's problem.\n- **The Community Effect:** A side-hustle connects you with people outside your major. It turns the campus from a collection of classrooms into a network of collaborators.\n\n### A Space for Everyone\nInnovation isn't reserved for the person who can write 1,000 lines of code before breakfast. It's for the person who notices a gap — a missing service, a clunky process, or a need for something beautiful — and decides to fill it.\n\nWhether your "stepping stone" leads to a global corporation or simply makes you the most resourceful person in your future workplace, it matters. This campus isn't just a place to get a degree; it's a sandbox.\n\nSo, what's that one small idea you've been sitting on? Don't worry about the "scaling" yet.\n\nJust worry about the first step.`,
      author: "Sarah Sameer",
      readTime: "5 min read"
    },
    {
      id: "3b021725-a990-4a13-807f-44a65624e432",
      timestamp: "2026-03-30T06:47:19.477Z",
      title: "The Midterm Manoeuvre: Why Your \"Failed\" Startup is Your Best Grade Yet",
      category: "Startup Stories",
      excerpt: "Getting an idea and wanting to make it a reality is a canon event for university students. Early failure isn't meant to demotivate you — it is the highest-value laboratory curriculum in entrepreneurship.",
      content: `In the pressure cooker of Indian universities, we are conditioned to fear the "F." Whether it's a dreaded red mark on a Fluid Mechanics paper or a low CGPA, failure feels like a dead end. But in the world of entrepreneurship, "failure" isn't a grade — it's a prerequisite.\n\nThink about that project you started in your second year. Maybe it was a campus delivery service that crashed after three days, or a custom merchandise startup that left you with a box of unsold hoodies under your hostel bed. On paper, it looks like a loss of pocket money and time. But look closer at your "DMC" (Detailed Mark Certificate) of life.\n\nWhile your peers were solely focused on rote learning for the midterms, you were learning things no lecture hall can teach:\n\n- **The "Jugaad" Strategy:** You learned how to build a landing page with zero budget and how to negotiate with the local printer in the market.\n- **The Pitch:** You learned how to convince your skeptical roommates (and maybe a professor) that your idea actually had legs.\n- **The Resilience:** You faced the "silence" of zero orders and kept going anyway.\n\nIf you're heading into placements or your first job, don't hide your "failed" ventures. To a recruiter, a student who tried to solve a campus problem and failed is infinitely more valuable than one who never tried at all. It shows initiative, ownership, and a high "Adversity Quotient."\n\nThe IIEC isn't just a place for the "toppers" of the startup world. It's a space for the hustlers who are currently failing their way toward something great.\n\nYour botched, messy prototype is just a rough draft.\n\nYour midterms will come and go, but the skin you developed while trying to build something from scratch? That stays for life.\n\nSo, if your current hustle is struggling, take a breath.\nYou aren't failing; you're just in the middle of a very intense, very practical lab session.`,
      author: "Sarah Sameer",
      readTime: "4 min read"
    }
  ];

  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('id');
  const postIndex = urlParams.get('index');
  const mainEl = document.getElementById('blog-post-main');
  let allPosts = FALLBACK_POSTS;

  /**
   * Resolve appropriate image without ever showing mock event photos
   */
  function resolveArticleImage(post, index) {
    if (post && post.imageUrl && post.imageUrl.trim() !== '' && !post.imageUrl.includes('Next_Gen_Pitch') && !post.imageUrl.includes('default-blog')) {
      return post.imageUrl;
    }
    if (post && post.image && post.image.trim() !== '' && !post.image.includes('Next_Gen_Pitch') && !post.image.includes('default-blog')) {
      return post.image;
    }

    if (index !== undefined && index !== null && CURATED_ARTICLE_IMAGES[index % CURATED_ARTICLE_IMAGES.length]) {
      return CURATED_ARTICLE_IMAGES[index % CURATED_ARTICLE_IMAGES.length];
    }

    const title = (post?.title || '').toLowerCase();
    if (title.includes('gen-') || title.includes('gen z')) return CURATED_ARTICLE_IMAGES[0];
    if (title.includes('balancing') || title.includes('studies')) return CURATED_ARTICLE_IMAGES[1];
    if (title.includes('side hustle') || title.includes('hustling')) return CURATED_ARTICLE_IMAGES[2];
    if (title.includes('midterm') || title.includes('failed')) return CURATED_ARTICLE_IMAGES[3];

    return CURATED_ARTICLE_IMAGES[0];
  }

  async function init() {
    // 1. Detect if current file is blog-post-0.html, blog-post-1.html, etc.
    let detectedIndex = null;
    const pathMatch = window.location.pathname.match(/blog-post-(\d+)/);
    if (pathMatch) {
      detectedIndex = parseInt(pathMatch[1]);
    } else if (postIndex !== null) {
      detectedIndex = parseInt(postIndex);
    }

    // 2. Check localStorage session first
    const storedPost = localStorage.getItem('currentBlogPost');
    if (storedPost) {
      try {
        const post = JSON.parse(storedPost);
        localStorage.removeItem('currentBlogPost');
        renderPost(post, detectedIndex);
        fetchAllPosts();
        return;
      } catch (e) {}
    }

    // 3. Fallback to instant local data if index matched
    if (detectedIndex !== null && FALLBACK_POSTS[detectedIndex]) {
      renderPost(FALLBACK_POSTS[detectedIndex], detectedIndex);
      fetchAllPosts();
      return;
    }

    // 4. Try live fetch
    try {
      const response = await fetch(API_URL, { method: 'GET', redirect: 'follow' });
      const data = await response.json();
      if (data.success && data.posts && data.posts.length > 0) {
        allPosts = data.posts;
        let post = null;
        if (postId) {
          post = data.posts.find(p => p.id === postId);
        } else if (detectedIndex !== null) {
          post = data.posts[detectedIndex];
        }

        if (post) {
          renderPost(post, detectedIndex);
        } else {
          renderNotFound();
        }
      } else if (detectedIndex !== null && FALLBACK_POSTS[detectedIndex]) {
        renderPost(FALLBACK_POSTS[detectedIndex], detectedIndex);
      } else {
        renderNotFound();
      }
    } catch (error) {
      if (detectedIndex !== null && FALLBACK_POSTS[detectedIndex]) {
        renderPost(FALLBACK_POSTS[detectedIndex], detectedIndex);
      } else {
        renderNotFound();
      }
    }
  }

  async function fetchAllPosts() {
    try {
      const response = await fetch(API_URL, { method: 'GET', redirect: 'follow' });
      const data = await response.json();
      if (data.success && data.posts && data.posts.length > 0) {
        allPosts = data.posts;
      }
    } catch (error) {}
  }

  function renderPost(post, index) {
    const imageUrl = resolveArticleImage(post, index);
    const authorInitials = (post.author || 'IIEC').split(' ').map(n => n[0]).join('').toUpperCase();

    document.title = `${post.title} | IIEC Blog`;
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', post.title);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', post.excerpt || '');
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) ogImage.setAttribute('content', imageUrl);

    mainEl.innerHTML = `
      <!-- Hero Image -->
      <div class="blog-post-hero">
        <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(post.title)}" onerror="this.src='assets/images/blog/blog-genz-entrepreneurship.jpg'">
        <div class="blog-post-hero-overlay"></div>
      </div>
      
      <!-- Post Content -->
      <div class="blog-post-container">
        <a href="blog" class="back-to-blog">
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
            <p>Incubation, Innovation &amp; Entrepreneurship Cell &bull; CSMU</p>
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
    const related = allPosts.filter(p => p.id !== currentPost.id && p.title !== currentPost.title).slice(0, 3);
    if (related.length === 0) {
      return '<p style="text-align: center; color: var(--text-secondary);">No other articles available yet.</p>';
    }

    return related.map((post, relIdx) => {
      const idx = allPosts.indexOf(post);
      const imageUrl = resolveArticleImage(post, idx >= 0 ? idx : relIdx);
      const postUrl = idx >= 0 && idx < 4 ? `blog-post-${idx}` : `blog-post?index=${idx}`;

      return `
        <article class="blog-card" data-animate="scale">
          <div class="blog-card-image">
            <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(post.title)}" 
                 width="400" height="250" loading="lazy"
                 onerror="this.src='assets/images/blog/blog-genz-entrepreneurship.jpg'">
            <span class="blog-card-category">${escapeHtml(post.category) || 'General'}</span>
          </div>
          <div class="blog-card-content">
            <div class="blog-card-meta">
              <span class="blog-card-date">${formatDate(post.timestamp)}</span>
              <span class="blog-card-read">${escapeHtml(post.readTime) || '5 min read'}</span>
            </div>
            <h2 class="blog-card-title">${escapeHtml(post.title)}</h2>
            <p class="blog-card-excerpt">${escapeHtml(post.excerpt)}</p>
            <a href="${postUrl}" class="blog-card-link" onclick="openPost(${idx >= 0 ? idx : relIdx}); return false;">
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
        <a href="blog" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px; background: var(--color-accent); color: #fff; padding: 12px 24px; border-radius: 999px; font-weight: 700;">
          <span>Back to Blog</span>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </a>
      </div>
    `;
  }

  function parseMarkdown(text) {
    if (!text) return '<p>No content available.</p>';
    let html = escapeHtml(text);
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
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

  function formatDate(timestamp) {
    if (!timestamp) return 'Recently';
    try {
      return new Date(timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
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

  window.openPost = function (index) {
    if (allPosts[index]) {
      try {
        localStorage.setItem('currentBlogPost', JSON.stringify(allPosts[index]));
      } catch (e) {}
      window.location.href = index < 4 ? `blog-post-${index}` : `blog-post?index=${index}`;
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();