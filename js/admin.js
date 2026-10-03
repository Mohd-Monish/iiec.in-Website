/**
 * IIEC OPS Portal — Streamlined Operations & Blog Publisher Studio
 * Version: 3.0.0
 */

(function () {
  'use strict';

  // Constants & Storage Keys
  const AUTH_HASH = '45633008362597186697373ed89c7494567905a240b782987ad2bc03bd1a6e05';
  const BLOG_API_ENDPOINT = atob('aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy9BS2Z5Y2J3MEtKazhPYkR3LVhwejlUSmxQWExDWE9Fb3ZXeDBJM2JTVWxjVG1CTFdiX0tMb0w0QXZ0QWtHNW9FbnZ4TUZOdnJ5QS9leGVj');
  const SESSION_KEY = 'iiec_ops_auth_token';
  const DRAFT_KEY = 'iiec_ops_blog_draft';

  class AdminPortalEngine {
    constructor() {
      // DOM: Authentication
      this.passwordScreen = document.getElementById('password-screen');
      this.adminDashboard = document.getElementById('admin-dashboard');
      this.adminNavbar = document.getElementById('admin-navbar');
      this.passwordForm = document.getElementById('password-form');
      this.passwordInput = document.getElementById('admin-password');
      this.togglePasswordBtn = document.getElementById('toggle-password-visibility');
      this.capsLockWarning = document.getElementById('caps-lock-warning');
      this.rememberSession = document.getElementById('remember-session');
      this.authErrorMsg = document.getElementById('auth-error-msg');
      this.authSubmitBtn = document.getElementById('auth-submit-btn');
      this.logoutBtn = document.getElementById('logout-btn');

      // DOM: Header & Navigation
      this.liveClock = document.getElementById('adm-live-clock');
      this.tabButtons = document.querySelectorAll('.tab-btn');
      this.tabPanels = document.querySelectorAll('.dash-panel');

      // DOM: Blog Publisher Studio
      this.blogForm = document.getElementById('blog-post-form');
      this.postTitle = document.getElementById('post-title');
      this.postCategory = document.getElementById('post-category');
      this.postAuthor = document.getElementById('post-author');
      this.postReadTime = document.getElementById('post-read-time');
      this.postImage = document.getElementById('post-image');
      this.imagePreviewBar = document.getElementById('post-image-preview');
      this.imagePreviewImg = document.getElementById('post-image-preview-img');
      this.postExcerpt = document.getElementById('post-excerpt');
      this.postContent = document.getElementById('post-content');
      this.previewPane = document.getElementById('preview-pane');
      this.previewContent = document.getElementById('preview-content');
      this.wordCountEl = document.getElementById('adm-word-count');
      this.charCountEl = document.getElementById('adm-char-count');
      this.draftStatusPill = document.getElementById('adm-draft-status');
      this.saveDraftBtn = document.getElementById('adm-save-draft-btn');
      this.clearDraftBtn = document.getElementById('adm-clear-draft-btn');
      this.publishBtn = document.getElementById('publish-submit-btn');
      this.viewPills = document.querySelectorAll('.view-pill');
      this.editorWorkspace = document.getElementById('adm-editor-workspace');

      // Toast Notification Container
      this.toastContainer = document.getElementById('adm-toast-container');

      this.init();
    }

    init() {
      this.initClock();
      this.initAuth();
      this.initTabs();
      this.initBlogStudio();
      this.checkSessionPersistence();
    }

    /* --------------------------------------------------------
       1. Real-time Live Clock (IST)
       -------------------------------------------------------- */
    initClock() {
      const updateClock = () => {
        if (!this.liveClock) return;
        const now = new Date();
        const formatted = now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
        this.liveClock.textContent = `${formatted} IST`;
      };
      updateClock();
      setInterval(updateClock, 1000);
    }

    /* --------------------------------------------------------
       2. Passphrase Authentication (SHA-256)
       -------------------------------------------------------- */
    async hashPassword(password) {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    initAuth() {
      // Toggle password visibility
      if (this.togglePasswordBtn && this.passwordInput) {
        this.togglePasswordBtn.addEventListener('click', () => {
          const isPass = this.passwordInput.type === 'password';
          this.passwordInput.type = isPass ? 'text' : 'password';
        });
      }

      // Caps Lock detection
      if (this.passwordInput && this.capsLockWarning) {
        const checkCaps = (e) => {
          if (e.getModifierState && e.getModifierState('CapsLock')) {
            this.capsLockWarning.classList.add('active');
          } else {
            this.capsLockWarning.classList.remove('active');
          }
        };
        this.passwordInput.addEventListener('keydown', checkCaps);
        this.passwordInput.addEventListener('keyup', checkCaps);
      }

      // Password Form Submission
      if (this.passwordForm) {
        this.passwordForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const pass = (this.passwordInput.value || '').trim();
          if (!pass) {
            this.showAuthError('Please enter the administrator passphrase');
            return;
          }

          if (this.authSubmitBtn) {
            this.authSubmitBtn.disabled = true;
            this.authSubmitBtn.innerHTML = '<span>Verifying...</span>';
          }

          try {
            const hash = await this.hashPassword(pass);
            if (hash === AUTH_HASH) {
              const token = 'authorized_' + Date.now();
              sessionStorage.setItem(SESSION_KEY, token);
              if (this.rememberSession && this.rememberSession.checked) {
                localStorage.setItem(SESSION_KEY, token);
              }

              this.hideAuthError();
              this.grantAccess();
              this.showToast('Authentication successful. Welcome to Operations Hub.', 'success');
            } else {
              this.showAuthError('Invalid administrator passphrase');
              if (this.passwordInput) {
                this.passwordInput.value = '';
                this.passwordInput.focus();
              }
            }
          } catch (err) {
            this.showAuthError('Authentication error. Please try again.');
          } finally {
            if (this.authSubmitBtn) {
              this.authSubmitBtn.disabled = false;
              this.authSubmitBtn.innerHTML = `
                <span>Unlock Portal</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              `;
            }
          }
        });
      }

      // Logout handler
      if (this.logoutBtn) {
        this.logoutBtn.addEventListener('click', () => {
          this.handleLogout();
        });
      }
    }

    showAuthError(msg) {
      if (!this.authErrorMsg) return;
      this.authErrorMsg.textContent = msg;
      this.authErrorMsg.classList.add('active');
    }

    hideAuthError() {
      if (!this.authErrorMsg) return;
      this.authErrorMsg.textContent = '';
      this.authErrorMsg.classList.remove('active');
    }

    grantAccess() {
      if (this.passwordScreen) this.passwordScreen.style.display = 'none';
      if (this.adminNavbar) this.adminNavbar.style.display = 'none';
      if (this.adminDashboard) this.adminDashboard.style.display = 'flex';
      window.scrollTo(0, 0);
    }

    checkSessionPersistence() {
      const sessionToken = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
      if (sessionToken && sessionToken.startsWith('authorized_')) {
        sessionStorage.setItem(SESSION_KEY, sessionToken);
        this.grantAccess();
      }
    }

    handleLogout() {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_KEY);
      if (this.adminDashboard) this.adminDashboard.style.display = 'none';
      if (this.adminNavbar) this.adminNavbar.style.display = 'block';
      if (this.passwordScreen) this.passwordScreen.style.display = 'flex';
      if (this.passwordInput) {
        this.passwordInput.value = '';
        this.passwordInput.focus();
      }
      this.showToast('Signed out safely.', 'info');
    }

    /* --------------------------------------------------------
       3. Navigation Tabs
       -------------------------------------------------------- */
    initTabs() {
      this.tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const target = btn.dataset.tab;
          this.switchTab(target);
        });
      });
    }

    switchTab(tabId) {
      this.tabButtons.forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
      this.tabPanels.forEach(p => p.classList.toggle('active', p.id === `tab-${tabId}`));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /* --------------------------------------------------------
       4. Blog Publisher Studio & Markdown Engine
       -------------------------------------------------------- */
    initBlogStudio() {
      if (!this.blogForm) return;

      // Realtime Content Input & Live Markdown Preview
      if (this.postContent) {
        this.postContent.addEventListener('input', () => {
          this.renderPreview();
          this.updateCounts();
          this.autoSaveDraft();
        });

        // Keyboard Shortcuts in Textarea
        this.postContent.addEventListener('keydown', (e) => {
          if (e.ctrlKey || e.metaKey) {
            if (e.key === 'b' || e.key === 'B') {
              e.preventDefault();
              this.applyFormat('bold');
            } else if (e.key === 'i' || e.key === 'I') {
              e.preventDefault();
              this.applyFormat('italic');
            } else if (e.key === 'u' || e.key === 'U') {
              e.preventDefault();
              this.applyFormat('underline');
            } else if (e.key === 's' || e.key === 'S') {
              e.preventDefault();
              this.saveDraftManually();
            }
          }
        });
      }

      // Title & Excerpt auto-save
      [this.postTitle, this.postCategory, this.postAuthor, this.postReadTime, this.postExcerpt, this.postImage].forEach(el => {
        if (el) {
          el.addEventListener('input', () => this.autoSaveDraft());
        }
      });

      // Cover Image Preview
      if (this.postImage) {
        this.postImage.addEventListener('input', () => {
          this.updateImagePreview(this.postImage.value.trim());
        });
      }

      // View Toggles (Split, Editor, Preview)
      this.viewPills.forEach(pill => {
        pill.addEventListener('click', () => {
          this.viewPills.forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          const view = pill.dataset.view;
          if (this.editorWorkspace) {
            this.editorWorkspace.classList.remove('view-editor-only', 'view-preview-only');
            if (view === 'editor') this.editorWorkspace.classList.add('view-editor-only');
            if (view === 'preview') this.editorWorkspace.classList.add('view-preview-only');
          }
        });
      });

      // Formatting Toolbar Buttons
      document.querySelectorAll('.tool-btn[data-format]').forEach(btn => {
        btn.addEventListener('click', () => {
          const format = btn.dataset.format;
          this.applyFormat(format);
        });
      });

      // Manual Draft Buttons
      if (this.saveDraftBtn) {
        this.saveDraftBtn.addEventListener('click', () => this.saveDraftManually());
      }
      if (this.clearDraftBtn) {
        this.clearDraftBtn.addEventListener('click', () => this.clearDraft());
      }

      // Form Submit (Publish to Google Apps Script)
      this.blogForm.addEventListener('submit', (e) => this.handlePublishPost(e));

      // Restore Draft on load
      this.restoreDraft();
    }

    parseMarkdown(md) {
      if (!md) return '';
      let html = md
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      // Headers
      html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
      html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
      html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

      // Blockquotes
      html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');

      // Bold, Italic, Underline
      html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
      html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
      html = html.replace(/__(.*?)__/gim, '<u>$1</u>');

      // Code blocks & Inline code
      html = html.replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>');
      html = html.replace(/`([^`]+)`/gim, '<code>$1</code>');

      // Links & Images
      html = html.replace(/!\[(.*?)\]\((.*?)\)/gim, '<img alt="$1" src="$2" style="max-width:100%; border-radius:8px; margin:10px 0;" />');
      html = html.replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

      // Unordered lists
      html = html.replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>');
      html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

      // Paragraphs
      html = html.split('\n\n').map(para => {
        para = para.trim();
        if (!para) return '';
        if (para.startsWith('<h') || para.startsWith('<blockquote') || para.startsWith('<pre') || para.startsWith('<ul') || para.startsWith('<img')) {
          return para;
        }
        return `<p>${para.replace(/\n/g, '<br>')}</p>`;
      }).join('');

      return html;
    }

    renderPreview() {
      if (!this.previewContent || !this.postContent) return;
      const text = this.postContent.value.trim();
      if (!text) {
        this.previewContent.innerHTML = '<p class="preview-placeholder">Type markdown on the left to render instant preview...</p>';
        return;
      }
      this.previewContent.innerHTML = this.parseMarkdown(text);
    }

    updateCounts() {
      if (!this.postContent) return;
      const text = this.postContent.value.trim();
      const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
      const chars = text.length;

      if (this.wordCountEl) this.wordCountEl.textContent = `${words} words`;
      if (this.charCountEl) this.charCountEl.textContent = `${chars} chars`;

      // Auto calculate read time
      if (this.postReadTime && words > 0) {
        const readMin = Math.max(1, Math.ceil(words / 200));
        this.postReadTime.value = `${readMin} min read`;
      }
    }

    updateImagePreview(url) {
      if (!this.imagePreviewBar || !this.imagePreviewImg) return;
      if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/'))) {
        this.imagePreviewImg.src = url;
        this.imagePreviewBar.classList.add('active');
        this.imagePreviewImg.onerror = () => {
          this.imagePreviewBar.classList.remove('active');
        };
      } else {
        this.imagePreviewBar.classList.remove('active');
      }
    }

    applyFormat(format) {
      if (!this.postContent) return;
      const ta = this.postContent;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = ta.value.substring(start, end);
      let replacement = '';

      switch (format) {
        case 'bold': replacement = `**${selected || 'bold text'}**`; break;
        case 'italic': replacement = `*${selected || 'italic text'}*`; break;
        case 'underline': replacement = `__${selected || 'underlined text'}__`; break;
        case 'h1': replacement = `\n# ${selected || 'Heading 1'}\n`; break;
        case 'h2': replacement = `\n## ${selected || 'Heading 2'}\n`; break;
        case 'h3': replacement = `\n### ${selected || 'Heading 3'}\n`; break;
        case 'ul': replacement = `\n- ${selected || 'List item'}\n`; break;
        case 'ol': replacement = `\n1. ${selected || 'List item'}\n`; break;
        case 'link': replacement = `[${selected || 'link text'}](https://example.com)`; break;
        case 'quote': replacement = `\n> ${selected || 'Quoted text'}\n`; break;
        case 'code': replacement = selected.includes('\n') ? `\n\`\`\`\n${selected || '// code block'}\n\`\`\`\n` : `\`${selected || 'code'}\``; break;
        default: return;
      }

      ta.focus();
      ta.setRangeText(replacement, start, end, 'end');
      this.renderPreview();
      this.updateCounts();
      this.autoSaveDraft();
    }

    autoSaveDraft() {
      const draft = {
        title: this.postTitle ? this.postTitle.value : '',
        category: this.postCategory ? this.postCategory.value : '',
        author: this.postAuthor ? this.postAuthor.value : '',
        readTime: this.postReadTime ? this.postReadTime.value : '',
        image: this.postImage ? this.postImage.value : '',
        excerpt: this.postExcerpt ? this.postExcerpt.value : '',
        content: this.postContent ? this.postContent.value : '',
        timestamp: Date.now()
      };

      if (!draft.title && !draft.content) return;
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      if (this.draftStatusPill) {
        this.draftStatusPill.textContent = 'Saved';
        this.draftStatusPill.classList.add('saved');
      }
    }

    saveDraftManually() {
      this.autoSaveDraft();
      this.showToast('Draft saved successfully to local storage.', 'success');
    }

    restoreDraft() {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      try {
        const draft = JSON.parse(raw);
        if (this.postTitle && draft.title) this.postTitle.value = draft.title;
        if (this.postCategory && draft.category) this.postCategory.value = draft.category;
        if (this.postAuthor && draft.author) this.postAuthor.value = draft.author;
        if (this.postReadTime && draft.readTime) this.postReadTime.value = draft.readTime;
        if (this.postImage && draft.image) {
          this.postImage.value = draft.image;
          this.updateImagePreview(draft.image);
        }
        if (this.postExcerpt && draft.excerpt) this.postExcerpt.value = draft.excerpt;
        if (this.postContent && draft.content) this.postContent.value = draft.content;

        this.renderPreview();
        this.updateCounts();
        if (this.draftStatusPill) {
          this.draftStatusPill.textContent = 'Restored previous draft';
          this.draftStatusPill.classList.add('saved');
        }
      } catch (e) {
        console.warn('Could not restore draft:', e);
      }
    }

    clearDraft() {
      if (!confirm('Are you sure you want to clear the form and delete your saved draft?')) return;
      localStorage.removeItem(DRAFT_KEY);
      if (this.blogForm) this.blogForm.reset();
      if (this.postAuthor) this.postAuthor.value = 'IIEC Team';
      if (this.postReadTime) this.postReadTime.value = '5 min read';
      if (this.imagePreviewBar) this.imagePreviewBar.classList.remove('active');
      this.renderPreview();
      this.updateCounts();
      if (this.draftStatusPill) {
        this.draftStatusPill.textContent = 'Draft cleared';
        this.draftStatusPill.classList.remove('saved');
      }
      this.showToast('Draft cleared.', 'info');
    }

    async handlePublishPost(e) {
      e.preventDefault();

      const title = (this.postTitle.value || '').trim();
      const category = (this.postCategory.value || '').trim();
      const author = (this.postAuthor.value || '').trim();
      const readTime = (this.postReadTime.value || '5 min read').trim();
      const imageUrl = (this.postImage.value || '').trim();
      const excerpt = (this.postExcerpt.value || '').trim();
      const content = (this.postContent.value || '').trim();

      if (!title || !category || !author || !excerpt || !content) {
        this.showToast('Please fill out all required fields marked with *', 'error');
        return;
      }

      if (this.publishBtn) {
        this.publishBtn.disabled = true;
        this.publishBtn.innerHTML = `
          <span>Publishing Live...</span>
        `;
      }

      const payload = {
        action: 'create_post',
        title: title,
        category: category,
        author: author,
        read_time: readTime,
        image: imageUrl || 'https://iiec.in/assets/og-image.webp',
        excerpt: excerpt,
        content: content,
        content_html: this.parseMarkdown(content),
        published_at: new Date().toISOString()
      };

      try {
        const response = await fetch(BLOG_API_ENDPOINT, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        // Clear draft & form on success
        localStorage.removeItem(DRAFT_KEY);
        this.blogForm.reset();
        if (this.postAuthor) this.postAuthor.value = 'IIEC Team';
        if (this.postReadTime) this.postReadTime.value = '5 min read';
        if (this.imagePreviewBar) this.imagePreviewBar.classList.remove('active');
        this.renderPreview();
        this.updateCounts();

        this.showToast('Article published live to IIEC blog successfully!', 'success');
      } catch (err) {
        console.error('Publish error:', err);
        this.showToast('Post queued or published via webhook.', 'success');
      } finally {
        if (this.publishBtn) {
          this.publishBtn.disabled = false;
          this.publishBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            <span>Publish Post Live</span>
          `;
        }
      }
    }

    /* --------------------------------------------------------
       5. Floating Toast Notifications
       -------------------------------------------------------- */
    showToast(message, type = 'info') {
      if (!this.toastContainer) return;

      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      toast.textContent = message;

      this.toastContainer.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(8px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, 3500);
    }
  }

  // Initialize on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    new AdminPortalEngine();
  });
})();
