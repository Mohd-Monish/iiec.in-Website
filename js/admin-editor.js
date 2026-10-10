/**
 * IIEC OPS Portal — Blog Studio Enhancer & Live Controller
 * - View Switching (Dashboard Overview <-> Blog Studio)
 * - Bidirectional Live Sync (Markdown <-> Direct ContentEditable Preview)
 * - Auto-Calculated Read Time & Live Word Count
 * - Draft Auto-Save & Recovery
 * - Floating Recruitment Pill Suppression on Admin
 */

(function () {
  'use strict';

  const DRAFT_KEY = 'iiec_admin_blog_draft_v2';
  const APPWRITE_CONFIG = {
    endpoint: 'https://cloud.appwrite.io/v1',
    projectId: '6ac5db02000db126dbac',
    bucketId: '6ac5db260028625f06bb'
  };

  class BlogStudioEnhancer {
    constructor() {
      // Views & Navigation
      this.mainView = document.getElementById('admin-main-view');
      this.studioSection = document.getElementById('admin-blog-studio-section');
      this.articleManagerSection = document.getElementById('admin-article-manager-section');
      this.openStudioCta = document.getElementById('open-blog-studio-cta');
      this.openStudioLink = document.getElementById('open-blog-studio-link');
      this.closeStudioBtn = document.getElementById('close-blog-studio-btn');
      this.openArticleManagerCta = document.getElementById('open-article-manager-cta');
      this.openArticleManagerLink = document.getElementById('open-article-manager-link');
      this.closeArticleManagerBtn = document.getElementById('close-article-manager-btn');

      // Form Inputs
      this.blogForm = document.getElementById('blog-post-form');
      this.titleInput = document.getElementById('post-title');
      this.categorySelect = document.getElementById('post-category');
      this.customCategoryInput = document.getElementById('post-custom-category');
      this.authorInput = document.getElementById('post-author');
      this.readTimeInput = document.getElementById('post-read-time');
      this.imageInput = document.getElementById('post-image');
      this.imageFileInput = document.getElementById('post-image-file');
      this.coverUploadBtn = document.getElementById('post-image-file-btn');
      this.removeCoverBtn = document.getElementById('remove-cover-btn');
      this.excerptInput = document.getElementById('post-excerpt');
      this.contentInput = document.getElementById('post-content');

      // Cover Preview
      this.imagePreviewCard = document.getElementById('post-image-preview-card');
      this.imagePreviewImg = document.getElementById('post-image-preview-img');
      this.imagePreviewUrl = document.getElementById('post-image-preview-url');

      // Live Stats & Indicators
      this.wordCountEl = document.getElementById('blog-live-word-count');
      this.readTimeEl = document.getElementById('blog-live-read-time');
      this.draftIndicator = document.getElementById('blog-draft-indicator');

      // Editor & Preview Pane
      this.editorContainer = document.getElementById('blog-editor-container');
      this.previewPane = document.getElementById('preview-pane');
      this.previewContent = document.getElementById('preview-content');
      this.viewButtons = document.querySelectorAll('.view-mode-btn');
      this.clearDraftBtn = document.getElementById('clear-blog-draft-btn');

      // Edit Mode Controls & UI Elements
      this.postEditIdInput = document.getElementById('post-edit-id');
      this.studioEditBanner = document.getElementById('studio-edit-banner');
      this.studioEditArticleTitle = document.getElementById('studio-edit-article-title');
      this.bannerCancelEditBtn = document.getElementById('banner-cancel-edit-btn');
      this.cancelEditBtn = document.getElementById('cancel-edit-btn');
      this.publishBtn = document.getElementById('publish-submit-btn');
      this.publishBtnText = document.getElementById('publish-btn-text');
      this.studioMainTitle = document.getElementById('blog-studio-title');
      this.studioPanelTag = document.getElementById('studio-panel-tag');
      this.studioSubtitle = document.getElementById('blog-studio-subtitle');
      this.currentEditingPost = null;

      // Sync State Flags
      this.isSyncing = false;
      this.isUserTypingInPreview = false;

      // Article & Layout Manager Elements
      this.articlesListEl = document.getElementById('admin-articles-sortable-list');
      this.activeFeaturedTitleEl = document.getElementById('active-featured-title');
      this.managerCountEl = document.getElementById('manager-articles-count');
      this.layoutStateEl = document.getElementById('manager-layout-state');
      this.saveLayoutBtn = document.getElementById('save-article-layout-btn');
      this.resetOrderBtn = document.getElementById('reset-article-order-btn');

      // Manager State
      this.managedPosts = [];
      this.currentFeaturedId = null;
      this.hasUnsavedOrder = false;

      window.iiecStudioEnhancer = this;
      this.init();
    }

    init() {
      this.initViewToggles();
      this.initBidirectionalEditor();
      this.initCoverPreview();
      this.initCategoryControls();
      this.initAutoSave();
      this.initViewModes();
      this.initDraftClearing();
      this.initEditModeControls();
      this.initArticleManager();
      this.suppressRecruitmentPill();

      // Restore saved draft
      this.restoreDraft();
      this.updateStats();
      this.updateCoverPreview();
      this.renderMarkdownToPreview();

      // Check URL Hash for direct view
      if (window.location.hash === '#blog-studio') {
        this.openStudio();
      } else if (window.location.hash === '#article-manager' || window.location.hash === '#curate-articles') {
        this.openArticleManager();
      }
    }

    /* ------------------------------------------------------------
       1. VIEW NAVIGATION (Overview <-> Blog Studio <-> Article Manager)
       ------------------------------------------------------------ */
    initViewToggles() {
      // Open Blog Studio
      if (this.openStudioCta) {
        this.openStudioCta.addEventListener('click', () => this.openStudio());
      }
      if (this.openStudioLink) {
        this.openStudioLink.addEventListener('click', (e) => {
          e.preventDefault();
          this.openStudio();
        });
      }
      if (this.closeStudioBtn) {
        this.closeStudioBtn.addEventListener('click', () => this.closeStudio());
      }

      // Open Article Manager / Editorial Curation
      if (this.openArticleManagerCta) {
        this.openArticleManagerCta.addEventListener('click', () => this.openArticleManager());
      }
      if (this.openArticleManagerLink) {
        this.openArticleManagerLink.addEventListener('click', (e) => {
          e.preventDefault();
          this.openArticleManager();
        });
      }
      if (this.closeArticleManagerBtn) {
        this.closeArticleManagerBtn.addEventListener('click', () => this.closeArticleManager());
      }
    }

    openStudio() {
      if (this.mainView) this.mainView.style.display = 'none';
      if (this.articleManagerSection) this.articleManagerSection.style.display = 'none';
      if (this.studioSection) {
        this.studioSection.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      history.replaceState(null, '', '#blog-studio');
    }

    closeStudio() {
      if (this.studioSection) this.studioSection.style.display = 'none';
      if (this.articleManagerSection) this.articleManagerSection.style.display = 'none';
      if (this.mainView) {
        this.mainView.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      history.replaceState(null, '', window.location.pathname);
    }

    openArticleManager() {
      if (this.mainView) this.mainView.style.display = 'none';
      if (this.studioSection) this.studioSection.style.display = 'none';
      if (this.articleManagerSection) {
        this.articleManagerSection.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      history.replaceState(null, '', '#article-manager');
    }

    closeArticleManager() {
      if (this.articleManagerSection) this.articleManagerSection.style.display = 'none';
      if (this.studioSection) this.studioSection.style.display = 'none';
      if (this.mainView) {
        this.mainView.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      history.replaceState(null, '', window.location.pathname);
    }

    /* ------------------------------------------------------------
       2. BIDIRECTIONAL EDITING (Markdown <-> Live Preview)
       ------------------------------------------------------------ */
    initBidirectionalEditor() {
      if (!this.contentInput || !this.previewContent) return;

      // When user types in Markdown Textarea -> update Preview
      this.contentInput.addEventListener('input', () => {
        if (this.isSyncing || this.isUserTypingInPreview) return;
        this.isSyncing = true;
        this.renderMarkdownToPreview();
        this.updateStats();
        this.saveDraft();
        this.isSyncing = false;
      });

      // When user clicks / types directly in ContentEditable Preview -> update Textarea
      this.previewContent.addEventListener('input', () => {
        if (this.isSyncing) return;
        this.isUserTypingInPreview = true;
        this.isSyncing = true;

        const md = this.domToMarkdown(this.previewContent);
        this.contentInput.value = md;
        this.updateStats();
        this.saveDraft();

        this.isSyncing = false;
        setTimeout(() => {
          this.isUserTypingInPreview = false;
        }, 100);
      });

      // Handle focus/blur placeholder in preview
      this.previewContent.addEventListener('focus', () => {
        const placeholder = this.previewContent.querySelector('.preview-placeholder');
        if (placeholder) {
          this.previewContent.innerHTML = '';
        }
      });

      this.previewContent.addEventListener('blur', () => {
        const text = this.previewContent.innerText.trim();
        if (!text && !this.contentInput.value.trim()) {
          this.previewContent.innerHTML = '<p class="preview-placeholder">Start typing in the editor on the left (or click here to type directly) to compose your article...</p>';
        }
      });
    }

    /* Markdown -> HTML Converter */
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

      // Images & Links
      html = html.replace(/!\[(.*?)\]\((.*?)\)/gim, '<img alt="$1" src="$2" style="max-width:100%; border-radius:10px; margin:12px 0;" />');
      html = html.replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

      // Unordered lists
      html = html.replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>');
      html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

      // Numbered lists
      html = html.replace(/^\s*\d+\.\s+(.*$)/gim, '<li>$1</li>');

      // Paragraphs
      const paragraphs = html.split(/\n\n+/);
      html = paragraphs.map(p => {
        p = p.trim();
        if (!p) return '';
        if (p.startsWith('<h') || p.startsWith('<blockquote') || p.startsWith('<pre') || p.startsWith('<ul') || p.startsWith('<ol') || p.startsWith('<img')) {
          return p;
        }
        return `<p>${p.replace(/\n/g, '<br>')}</p>`;
      }).join('\n\n');

      return html;
    }

    renderMarkdownToPreview() {
      if (!this.previewContent || !this.contentInput) return;
      const text = this.contentInput.value.trim();
      if (!text) {
        this.previewContent.innerHTML = '<p class="preview-placeholder">Start typing in the editor on the left (or click here to type directly) to compose your article...</p>';
        return;
      }
      this.previewContent.innerHTML = this.parseMarkdown(this.contentInput.value);
    }

    /* DOM / HTML -> Markdown Converter */
    domToMarkdown(element) {
      if (!element) return '';

      const processNode = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          return node.nodeValue;
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
          return '';
        }

        const tag = node.tagName.toLowerCase();
        let childrenMd = '';
        node.childNodes.forEach(child => {
          childrenMd += processNode(child);
        });

        switch (tag) {
          case 'h1':
            return `\n\n# ${childrenMd.trim()}\n\n`;
          case 'h2':
            return `\n\n## ${childrenMd.trim()}\n\n`;
          case 'h3':
            return `\n\n### ${childrenMd.trim()}\n\n`;
          case 'strong':
          case 'b':
            return `**${childrenMd}**`;
          case 'em':
          case 'i':
            return `*${childrenMd}*`;
          case 'u':
            return `<u>${childrenMd}</u>`;
          case 'blockquote':
            return `\n\n> ${childrenMd.trim()}\n\n`;
          case 'pre':
            return `\n\n\`\`\`\n${node.innerText.trim()}\n\`\`\`\n\n`;
          case 'code':
            if (node.parentElement && node.parentElement.tagName.toLowerCase() === 'pre') {
              return node.innerText;
            }
            return `\`${childrenMd}\``;
          case 'a':
            const href = node.getAttribute('href') || '';
            return `[${childrenMd}](${href})`;
          case 'img':
            const src = node.getAttribute('src') || '';
            const alt = node.getAttribute('alt') || 'image';
            return `\n\n![${alt}](${src})\n\n`;
          case 'ul':
            return `\n\n${childrenMd.trim()}\n\n`;
          case 'ol':
            return `\n\n${childrenMd.trim()}\n\n`;
          case 'li':
            return `- ${childrenMd.trim()}\n`;
          case 'p':
          case 'div':
            if (node.classList.contains('preview-placeholder')) return '';
            return `\n\n${childrenMd.trim()}\n\n`;
          case 'br':
            return '\n';
          default:
            return childrenMd;
        }
      };

      let result = '';
      element.childNodes.forEach(child => {
        result += processNode(child);
      });

      // Clean up multiple newlines
      return result
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }

    /* ------------------------------------------------------------
       3. AUTO-CALCULATED READ TIME & LIVE STATS
       ------------------------------------------------------------ */
    updateStats() {
      const text = (this.contentInput?.value || '').trim();
      const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
      const readMin = Math.max(1, Math.ceil(words / 200));
      const readTimeFormatted = `${readMin} min read`;

      if (this.wordCountEl) {
        this.wordCountEl.textContent = `${words} ${words === 1 ? 'word' : 'words'}`;
      }
      if (this.readTimeEl) {
        this.readTimeEl.textContent = readTimeFormatted;
      }
      if (this.readTimeInput) {
        this.readTimeInput.value = readTimeFormatted;
      }
    }

    /* ------------------------------------------------------------
       4. COVER IMAGE PREVIEW & APPWRITE STORAGE UPLOAD
       ------------------------------------------------------------ */
    initCoverPreview() {
      // Direct text/URL input
      if (this.imageInput) {
        this.imageInput.addEventListener('input', () => {
          this.updateCoverPreview();
          this.saveDraft();
        });
      }

      // File input picker
      if (this.imageFileInput) {
        this.imageFileInput.addEventListener('change', (e) => {
          const file = e.target.files?.[0];
          if (file) {
            this.uploadImageToAppwrite(file);
          }
        });
      }

      // Remove cover button
      if (this.removeCoverBtn) {
        this.removeCoverBtn.addEventListener('click', () => {
          if (this.imageInput) this.imageInput.value = '';
          if (this.imagePreviewCard) this.imagePreviewCard.style.display = 'none';
          if (this.imageFileInput) this.imageFileInput.value = '';
          this.saveDraft();
          this.showToast('Cover image removed', 'success');
        });
      }

      // Drag and drop onto image input wrapper
      const dropZone = this.imageInput?.closest('.cover-upload-group');
      if (dropZone) {
        ['dragenter', 'dragover'].forEach(eventName => {
          dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('drag-over');
          });
        });

        ['dragleave', 'drop'].forEach(eventName => {
          dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('drag-over');
          });
        });

        dropZone.addEventListener('drop', (e) => {
          const file = e.dataTransfer?.files?.[0];
          if (file && file.type.startsWith('image/')) {
            this.uploadImageToAppwrite(file);
          }
        });
      }
    }

    async uploadImageToAppwrite(file) {
      if (!file) return;

      // Validate format
      if (!file.type.startsWith('image/')) {
        this.showToast('Please select a valid image file (PNG, JPG, WebP, GIF, SVG)', 'error');
        return;
      }

      // Max size check: 10MB
      if (file.size > 10 * 1024 * 1024) {
        this.showToast('Image file size must be under 10MB', 'error');
        return;
      }

      // Instant optimistic thumbnail preview
      const localBlobUrl = URL.createObjectURL(file);
      if (this.imagePreviewImg && this.imagePreviewCard) {
        this.imagePreviewImg.src = localBlobUrl;
        if (this.imagePreviewUrl) this.imagePreviewUrl.textContent = `Uploading ${file.name} to Appwrite Storage...`;
        const statusTag = document.getElementById('cover-preview-status-tag');
        if (statusTag) statusTag.textContent = 'UPLOADING...';
        this.imagePreviewCard.style.display = 'flex';
      }

      const uploadBtn = this.coverUploadBtn || document.getElementById('post-image-file-btn');
      const uploadText = uploadBtn?.querySelector('.upload-btn-text');
      if (uploadBtn) uploadBtn.classList.add('is-uploading');
      if (uploadText) uploadText.textContent = 'Uploading...';

      try {
        const formData = new FormData();
        // Generate a clean safe unique file ID (alphanumeric, lowercase, max 36 chars)
        const safeId = 'img_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
        formData.append('fileId', safeId);
        formData.append('file', file);
        formData.append('permissions[]', 'read("any")');

        const uploadUrl = `${APPWRITE_CONFIG.endpoint}/storage/buckets/${APPWRITE_CONFIG.bucketId}/files`;

        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'X-Appwrite-Project': APPWRITE_CONFIG.projectId
          },
          body: formData
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || `Upload failed with status ${response.status}`);
        }

        const data = await response.json();
        const uploadedFileId = data.$id || safeId;

        // Construct public direct view URL for the uploaded image
        const publicFileUrl = `${APPWRITE_CONFIG.endpoint}/storage/buckets/${APPWRITE_CONFIG.bucketId}/files/${uploadedFileId}/view?project=${APPWRITE_CONFIG.projectId}`;

        if (this.imageInput) {
          this.imageInput.value = publicFileUrl;
        }

        if (this.imagePreviewImg) this.imagePreviewImg.src = publicFileUrl;
        if (this.imagePreviewUrl) this.imagePreviewUrl.textContent = publicFileUrl;
        const statusTag = document.getElementById('cover-preview-status-tag');
        if (statusTag) statusTag.textContent = 'APPWRITE CLOUD ACTIVE';
        if (this.imagePreviewCard) this.imagePreviewCard.style.display = 'flex';

        this.saveDraft();
        this.showToast('✓ Cover image uploaded to Appwrite Storage!', 'success');
      } catch (err) {
        console.error('Appwrite upload error:', err);
        this.showToast(`Upload failed: ${err.message}. Ensure Appwrite Storage Bucket has "Any" role with Create & Read permissions.`, 'error');
        const statusTag = document.getElementById('cover-preview-status-tag');
        if (statusTag) statusTag.textContent = 'UPLOAD FAILED';
      } finally {
        if (uploadBtn) uploadBtn.classList.remove('is-uploading');
        if (uploadText) uploadText.textContent = 'Upload';
      }
    }

    updateCoverPreview() {
      const url = (this.imageInput?.value || '').trim();
      if (!this.imagePreviewCard || !this.imagePreviewImg) return;

      if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/') || url.startsWith('./'))) {
        this.imagePreviewImg.src = url;
        if (this.imagePreviewUrl) this.imagePreviewUrl.textContent = url;
        const statusTag = document.getElementById('cover-preview-status-tag');
        if (statusTag) {
          statusTag.textContent = url.includes('appwrite.io') ? 'APPWRITE CLOUD ACTIVE' : 'COVER ACTIVE';
        }
        this.imagePreviewCard.style.display = 'flex';
        this.imagePreviewImg.onerror = () => {
          this.imagePreviewCard.style.display = 'none';
        };
      } else {
        this.imagePreviewCard.style.display = 'none';
      }
    }

    /* ------------------------------------------------------------
       5. CATEGORY CONTROLS & DRAFT AUTO-SAVE
       ------------------------------------------------------------ */
    initCategoryControls() {
      if (this.categorySelect) {
        this.categorySelect.addEventListener('change', () => {
          if (this.categorySelect.value === '__custom__') {
            if (this.customCategoryInput) {
              this.customCategoryInput.style.display = 'block';
              this.customCategoryInput.focus();
            }
          } else {
            if (this.customCategoryInput) {
              this.customCategoryInput.style.display = 'none';
            }
          }
          this.saveDraft();
        });
      }
      if (this.customCategoryInput) {
        this.customCategoryInput.addEventListener('input', () => this.saveDraft());
      }
    }

    getCategoryValue() {
      if (this.categorySelect?.value === '__custom__') {
        return (this.customCategoryInput?.value || '').trim() || 'General';
      }
      return (this.categorySelect?.value || '').trim();
    }

    initAutoSave() {
      [this.titleInput, this.categorySelect, this.customCategoryInput, this.authorInput, this.excerptInput].forEach(el => {
        if (el) {
          el.addEventListener('input', () => this.saveDraft());
          el.addEventListener('change', () => this.saveDraft());
        }
      });
    }

    saveDraft() {
      const draft = {
        title: this.titleInput?.value || '',
        category: this.getCategoryValue(),
        author: this.authorInput?.value || '',
        readTime: this.readTimeInput?.value || '',
        image: this.imageInput?.value || '',
        excerpt: this.excerptInput?.value || '',
        content: this.contentInput?.value || '',
        updatedAt: Date.now()
      };

      if (!draft.title && !draft.content) return;
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));

      if (this.draftIndicator) {
        this.draftIndicator.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          <span>Saved</span>
        `;
      }
    }

    restoreDraft() {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      try {
        const draft = JSON.parse(raw);
        if (this.titleInput && draft.title) this.titleInput.value = draft.title;
        if (this.categorySelect && draft.category) {
          const cat = draft.category.trim();
          let matched = false;
          for (let i = 0; i < this.categorySelect.options.length; i++) {
            if (this.categorySelect.options[i].value.toLowerCase() === cat.toLowerCase()) {
              this.categorySelect.selectedIndex = i;
              matched = true;
              break;
            }
          }
          if (!matched) {
            this.categorySelect.value = '__custom__';
            if (this.customCategoryInput) {
              this.customCategoryInput.value = cat;
              this.customCategoryInput.style.display = 'block';
            }
          } else if (this.customCategoryInput) {
            this.customCategoryInput.style.display = 'none';
          }
        }
        if (this.authorInput && draft.author) this.authorInput.value = draft.author;
        if (this.imageInput && draft.image) this.imageInput.value = draft.image;
        if (this.excerptInput && draft.excerpt) this.excerptInput.value = draft.excerpt;
        if (this.contentInput && draft.content) this.contentInput.value = draft.content;

        if (this.draftIndicator) {
          this.draftIndicator.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            <span>Draft restored</span>
          `;
        }
      } catch (err) {
        console.warn('Could not restore draft:', err);
      }
    }

    /* ------------------------------------------------------------
       6. VIEW MODE SWITCHING (Split / Editor Only / Preview Only)
       ------------------------------------------------------------ */
    initViewModes() {
      this.viewButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          this.viewButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const view = btn.dataset.view;
          if (this.editorContainer) {
            this.editorContainer.classList.remove('view-editor-only', 'view-preview-only');
            if (view === 'editor') {
              this.editorContainer.classList.add('view-editor-only');
            } else if (view === 'preview') {
              this.editorContainer.classList.add('view-preview-only');
              this.renderMarkdownToPreview();
            }
          }
        });
      });
    }

    initDraftClearing() {
      if (this.clearDraftBtn) {
        this.clearDraftBtn.addEventListener('click', () => {
          if (confirm('Clear the current article draft? This will reset all fields.')) {
            localStorage.removeItem(DRAFT_KEY);
            if (this.blogForm) this.blogForm.reset();
            if (this.authorInput) this.authorInput.value = 'IIEC Team';
            if (this.readTimeInput) this.readTimeInput.value = '1 min read';
            if (this.imagePreviewCard) this.imagePreviewCard.style.display = 'none';
            this.updateStats();
            this.renderMarkdownToPreview();
            if (this.draftIndicator) {
              this.draftIndicator.innerHTML = '<span>Form cleared</span>';
            }
          }
        });
      }
    }

    /* ------------------------------------------------------------
       7. ARTICLE MANAGER & FEATURED EDITION ENGINE
       ------------------------------------------------------------ */
    initArticleManager() {
      if (!this.articlesListEl) return;

      // Save & Reset Button Handlers
      if (this.saveLayoutBtn) {
        this.saveLayoutBtn.addEventListener('click', () => this.saveLayout());
      }
      if (this.resetOrderBtn) {
        this.resetOrderBtn.addEventListener('click', () => this.resetLayout());
      }

      this.fetchAndSetupArticles();
    }

    async fetchAndSetupArticles() {
      const DEFAULT_POSTS = [
        {
          id: "b7e4521a-4712-4fbc-b40b-46bf8d8e5900",
          timestamp: "2026-03-04T12:08:44.839Z",
          title: "Gen- Z redefining Entrepreneurship",
          category: "Entrepreneurship",
          excerpt: "The arena where businesses compete now isn't just a playground to push each other behind - That is what Gen Z has managed to prove with their ways of turning business ventures into yet another fun quest.",
          content: `### GEN-Z: REDEFINING ENTREPRENEURSHIP\n\nMove over, traditional playbooks! Gen-Z entrepreneurs are here, rewriting the rules of business.\nUnlike earlier generations, they aren't waiting for degrees, promotions, or years of experience to begin. Many are starting their ventures in their late teens or early twenties, powered by technology, creativity, and a strong sense of purpose.\n\nGen-Z doesn't just value profit, they prioritise IMPACT.\nThey are building startups in climate tech, mental health, creator economy, and education- areas that shape lives and communities. This generation views entrepreneurship as a means to address problems they deeply care about, rather than just a way to accumulate wealth.\n\nAnother defining trait? Speed and adaptability!\nGen-Z founders are digital natives; it's their niche.\nThey experiment quickly, fail fast, and pivot with confidence swiftly. Social media isn't just their marketing channel- it's their testing ground, community space, and storytelling platform. Unlike older generations, they don't see collaboration as a weakness. They actively co-create, network, and leverage ecosystems.\n\nWhat sets them apart is also their authenticity. Gen-Z founders connect with audiences by being real- sharing struggles as openly as successes. Not ashamed of their setbacks, which leads to the still-growing entrepreneurs feeling related and understood rather than being called a failure and left demotivated. This transparency builds stronger brands and deeper trust.\n\nIf entrepreneurship used to be about profits, Gen-Z is proving it's about purpose with profits. They are demonstrating that businesses can scale and still stay socially conscious.\n\nThe future of entrepreneurship is already here, and it looks bold, inclusive, and disruptive.\n\nWith Gen-Z leading the charge, we aren't just seeing startups- we're seeing co-operation and movements.`,
          author: "Sarah Sameer",
          readTime: "5 min read",
          imageUrl: "assets/images/blog/blog-genz-entrepreneurship.jpg"
        },
        {
          id: "9144387c-ac86-4d3b-9624-c22198050133",
          timestamp: "2026-03-04T16:30:26.894Z",
          title: "Balancing Studies and Start-Up as a full-time student",
          category: "Entrepreneurship",
          excerpt: "There could be nothing more overwhelming than the constant juggling between start-up drive as an individual and managing the duties of a student at the college. Discover efficient and feasible hacks!",
          content: `For student founders, the struggle is real: balancing assignments, exams, projects, pitch decks, prototypes, and investor calls can feel like running two full-time jobs.\nHowever, with discipline and clarity, it is possible to manage both your studies and your startup and still thrive!\n\nHere are three strategies that can make a significant difference:\n\n1. **Time-blocking:** Set aside fixed hours dedicated to your startup work. Treat this time as non-negotiable, just like your classes.\n\n2. **Leverage your circle:** Collaborate with classmates and peers. Group projects can serve as valuable testing grounds for your ideas.\n\n3. **Prioritize:** Not every email, feature, or meeting is urgent. Focus on high-impact tasks that drive your venture forward.\n\nMany successful founders launched their companies while still in college. Their success came not from superhuman effort, but from focus and synergy. They didn't view their studies and startups as opposing forces; instead, they utilized their education to fuel their entrepreneurial journey.\n\nFor instance, coursework in finance may help you refine your revenue model, while a marketing assignment could inspire your next campaign idea. When approached this way, your degree and your startup can COMPLEMENT each other rather than COMPETE.\n\nRemember: burnout is real!\n\nBalance is not about doing everything at once; it's about knowing what matters most at the moment.\n\nYour degree is an investment in your knowledge. Your startup is an investment in your vision.\nIf you can nurture both, you'll graduate not just with a certificate but also with a company.`,
          author: "Sarah Sameer",
          readTime: "5 min read",
          imageUrl: "assets/images/blog/blog-balancing-studies.jpg"
        },
        {
          id: "945a638a-9f8d-4fc9-9045-9cf05ffd8b82",
          timestamp: "2026-03-29T20:44:34.079Z",
          title: "Side Hustle: Beyond just a culture, a stepping stone.",
          category: "Startup Stories",
          excerpt: "Hustling is an essential element to acquiring almost anything extraordinary. Getting fuel ready for your own Start-Up is hardly any different — exploring how young student ventures excel behind the scenes.",
          content: `We've all seen the "hustle culture" reels — the 5:00 AM routines, the aesthetic desk setups, and the pressure to be the next teenage billionaire. It's exhausting, right? Honestly, when you're staring down a thermodynamics lab report or a 2,000-word sociology essay, the idea of "starting a company" feels like trying to climb Everest in flip-flops.\n\nBut here's a secret we don't talk about enough at the E-Cell: **Entrepreneurship doesn't have to be a grand explosion. Sometimes, it's just a slow burn.**\n\n### Redefining the "Startup"\nIf you are a Literature major selling hand-painted bookmarks on Instagram, you are a founder. If you're a Psych student offering freelance tutoring, you're managing a service-based startup. If you're an artist taking commissions for digital portraits, you're navigating supply and demand.\n\nThe "Side-Hustle" isn't just a trendy buzzword to add to your LinkedIn bio. It is a low-stakes laboratory where you can fail, pivot, and learn without the world watching.\n\n### Why the "Small Start" is Your Superpower\nWhen you start small, you're doing more than just earning extra coffee money. You're building a toolkit that your future self will thank you for:\n\n- **The "Yes/No" Muscle:** You learn how to prioritize your time between a mid-term and a client deadline.\n- **The Language of Value:** You stop thinking about "tasks" and start thinking about "solutions." You aren't just selling a product; you're solving a peer's problem.\n- **The Community Effect:** A side-hustle connects you with people outside your major. It turns the campus from a collection of classrooms into a network of collaborators.\n\n### A Space for Everyone\nInnovation isn't reserved for the person who can write 1,000 lines of code before breakfast. It's for the person who notices a gap — a missing service, a clunky process, or a need for something beautiful — and decides to fill it.\n\nWhether your "stepping stone" leads to a global corporation or simply makes you the most resourceful person in your future workplace, it matters. This campus isn't just a place to get a degree; it's a sandbox.\n\nSo, what's that one small idea you've been sitting on? Don't worry about the "scaling" yet.\n\nJust worry about the first step.`,
          author: "Sarah Sameer",
          readTime: "5 min read",
          imageUrl: "assets/images/blog/blog-side-hustle.jpg"
        },
        {
          id: "3b021725-a990-4a13-807f-44a65624e432",
          timestamp: "2026-03-30T06:47:19.477Z",
          title: "The Midterm Manoeuvre: Why Your \"Failed\" Startup is Your Best Grade Yet",
          category: "Startup Stories",
          excerpt: "Getting an idea and wanting to make it a reality is a canon event for university students. Early failure isn't meant to demotivate you — it is the highest-value laboratory curriculum in entrepreneurship.",
          content: `In the pressure cooker of Indian universities, we are conditioned to fear the "F." Whether it's a dreaded red mark on a Fluid Mechanics paper or a low CGPA, failure feels like a dead end. But in the world of entrepreneurship, "failure" isn't a grade — it's a prerequisite.\n\nThink about that project you started in your second year. Maybe it was a campus delivery service that crashed after three days, or a custom merchandise startup that left you with a box of unsold hoodies under your hostel bed. On paper, it looks like a loss of pocket money and time. But look closer at your "DMC" (Detailed Mark Certificate) of life.\n\nWhile your peers were solely focused on rote learning for the midterms, you were learning things no lecture hall can teach:\n\n- **The "Jugaad" Strategy:** You learned how to build a landing page with zero budget and how to negotiate with the local printer in the market.\n- **The Pitch:** You learned how to convince your skeptical roommates (and maybe a professor) that your idea actually had legs.\n- **The Resilience:** You faced the "silence" of zero orders and kept going anyway.\n\nIf you're heading into placements or your first job, don't hide your "failed" ventures. To a recruiter, a student who tried to solve a campus problem and failed is infinitely more valuable than one who never tried at all. It shows initiative, ownership, and a high "Adversity Quotient."\n\nThe IIEC isn't just a place for the "toppers" of the startup world. It's a space for the hustlers who are currently failing their way toward something great.\n\nYour botched, messy prototype is just a rough draft.\n\nYour midterms will come and go, but the skin you developed while trying to build something from scratch? That stays for life.\n\nSo, if your current hustle is struggling, take a breath.\nYou aren't failing; you're just in the middle of a very intense, very practical lab session.`,
          author: "Sarah Sameer",
          readTime: "4 min read",
          imageUrl: "assets/images/blog/blog-failed-startup-pivot.jpg"
        }
      ];

      let rawPosts = DEFAULT_POSTS;
      let remoteFeaturedId = null;
      let remoteOrderedIds = null;

      // Fetch live from Google Sheets CMS
      try {
        const SCRIPT_URL = atob('aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy9BS2Z5Y2J3MEtKazhPYkR3LVhwejlUSmxQWExDWE9Fb3ZXeDBJM2JTVWxjVG1CTFdiX0tMb0w0QXZ0QWtHNW9FbnZ4TUZOdnJ5QS9leGVj');
        const response = await fetch(SCRIPT_URL, { method: 'GET', redirect: 'follow' });
        const data = await response.json();
        if (data && data.success && Array.isArray(data.posts) && data.posts.length > 0) {
          rawPosts = data.posts;
          if (data.featuredPostId || data.featuredId) {
            remoteFeaturedId = data.featuredPostId || data.featuredId;
          }
          if (Array.isArray(data.orderedIds)) {
            remoteOrderedIds = data.orderedIds;
          }
        }
      } catch (err) {
        console.log('Using default articles dataset for curation:', err);
      }

      // Ensure every post has an ID
      rawPosts = rawPosts.map((p, idx) => ({
        ...p,
        id: p.id || `post_${idx}_${p.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`
      }));

      // Check if any post in rawPosts is marked as isFeatured
      if (!remoteFeaturedId) {
        const marked = rawPosts.find(p => p.isFeatured === true || String(p.isFeatured).toLowerCase() === 'true');
        if (marked) {
          remoteFeaturedId = marked.id;
        }
      }

      // Load saved layout & featured setting (Remote Google Sheet Priority -> LocalStorage Fallback)
      const savedLayoutRaw = localStorage.getItem('iiec_blog_layout_v1');
      let localConfig = null;
      if (savedLayoutRaw) {
        try { localConfig = JSON.parse(savedLayoutRaw); } catch (e) { }
      }

      const activeFeaturedId = remoteFeaturedId || localConfig?.featuredId || (rawPosts.length > 0 ? rawPosts[0].id : null);
      const activeOrderedIds = remoteOrderedIds || localConfig?.orderedIds || null;

      this.currentFeaturedId = activeFeaturedId;

      if (Array.isArray(activeOrderedIds) && activeOrderedIds.length > 0) {
        const postMap = new Map(rawPosts.map(p => [p.id, p]));
        const ordered = [];
        activeOrderedIds.forEach(id => {
          if (postMap.has(id)) {
            ordered.push(postMap.get(id));
            postMap.delete(id);
          }
        });
        postMap.forEach(p => ordered.push(p));
        this.managedPosts = ordered;
      } else {
        this.managedPosts = [...rawPosts];
      }

      this.renderArticlesList();
    }

    renderArticlesList() {
      if (!this.articlesListEl) return;

      if (!this.managedPosts || this.managedPosts.length === 0) {
        this.articlesListEl.innerHTML = '<div class="manager-loading-state"><span>No published articles available to curate.</span></div>';
        return;
      }

      const featuredPost = this.managedPosts.find(p => p.id === this.currentFeaturedId) || this.managedPosts[0];

      // Update Top Status Bar
      if (this.activeFeaturedTitleEl) {
        this.activeFeaturedTitleEl.textContent = featuredPost ? featuredPost.title : 'None selected';
      }
      if (this.managerCountEl) {
        this.managerCountEl.textContent = `${this.managedPosts.length} Articles`;
      }
      if (this.layoutStateEl) {
        if (this.hasUnsavedOrder) {
          this.layoutStateEl.textContent = 'Unsaved Changes';
          this.layoutStateEl.style.background = '#fff3e0';
          this.layoutStateEl.style.color = '#e65100';
        } else {
          this.layoutStateEl.textContent = 'Live Synced';
          this.layoutStateEl.style.background = '#e8f5e9';
          this.layoutStateEl.style.color = '#1b5e20';
        }
      }

      const html = this.managedPosts.map((post, idx) => {
        const isFeatured = post.id === this.currentFeaturedId;
        const imageUrl = post.imageUrl || post.image || 'assets/images/blog/blog-genz-entrepreneurship.jpg';
        const isFirst = idx === 0;
        const isLast = idx === this.managedPosts.length - 1;

        return `
          <div class="article-manage-card ${isFeatured ? 'article-manage-card--featured' : ''}" data-post-id="${this.escapeHtml(post.id)}" data-index="${idx}">
            
            <!-- Order Sequence Controls -->
            <div class="article-order-controls">
              <button type="button" class="btn-order-arrow btn-order-up" data-index="${idx}" ${isFirst ? 'disabled' : ''} title="Move article up in order">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 15l7-7 7 7"/>
                </svg>
              </button>
              <span class="order-index-badge">#${idx + 1}</span>
              <button type="button" class="btn-order-arrow btn-order-down" data-index="${idx}" ${isLast ? 'disabled' : ''} title="Move article down in order">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>
            </div>

            <!-- Thumbnail -->
            <div class="article-manage-thumb">
              <img src="${this.escapeHtml(imageUrl)}" alt="${this.escapeHtml(post.title)}" onerror="this.src='assets/images/blog/blog-genz-entrepreneurship.jpg'">
            </div>

            <!-- Details -->
            <div class="article-manage-info">
              <div class="article-manage-title-row">
                <span class="article-category-tag">${this.escapeHtml(post.category || 'General')}</span>
                ${isFeatured ? `
                  <span class="article-featured-badge">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                    </svg>
                    SPOTLIGHT FEATURED
                  </span>
                ` : ''}
                <h4 class="article-manage-title">${this.escapeHtml(post.title)}</h4>
              </div>
              <div class="article-manage-meta">
                <span>By <strong>${this.escapeHtml(post.author || 'IIEC Team')}</strong></span>
                <span>&bull;</span>
                <span>${this.escapeHtml(post.readTime || '5 min read')}</span>
              </div>
              <p class="article-manage-excerpt">${this.escapeHtml(post.excerpt || '')}</p>
            </div>

            <!-- Action Buttons -->
            <div class="article-manage-actions">
              <button type="button" class="btn-toggle-featured ${isFeatured ? 'is-active' : ''}" data-post-id="${this.escapeHtml(post.id)}" title="${isFeatured ? 'Currently spotlighted on blog hero' : 'Set this article as the Featured Edition'}">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="${isFeatured ? 'currentColor' : 'none'}">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                </svg>
                <span>${isFeatured ? '★ Active Featured' : '☆ Set as Featured'}</span>
              </button>

              <button type="button" class="btn-action-icon btn-edit-post" data-index="${idx}" title="Edit in Publisher Studio">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </button>

              <a href="blog-post.html?${post.id ? `id=${encodeURIComponent(post.id)}` : `index=${idx}`}" target="_blank" class="btn-action-icon" title="Preview article live on site">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
              </a>
            </div>

          </div>
        `;
      }).join('');

      this.articlesListEl.innerHTML = html;

      // Attach Event Listeners
      this.attachManagerEvents();
    }

    attachManagerEvents() {
      if (!this.articlesListEl) return;

      // 1. Move Up
      this.articlesListEl.querySelectorAll('.btn-order-up').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.index);
          if (idx > 0) {
            this.moveArticle(idx, -1);
          }
        });
      });

      // 2. Move Down
      this.articlesListEl.querySelectorAll('.btn-order-down').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.index);
          if (idx < this.managedPosts.length - 1) {
            this.moveArticle(idx, 1);
          }
        });
      });

      // 3. Set as Featured
      this.articlesListEl.querySelectorAll('.btn-toggle-featured').forEach(btn => {
        btn.addEventListener('click', () => {
          const postId = btn.dataset.postId;
          this.setFeaturedArticle(postId);
        });
      });

      // 4. Edit in Studio
      this.articlesListEl.querySelectorAll('.btn-edit-post').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.index);
          const post = this.managedPosts[idx];
          if (post) {
            this.loadPostIntoStudio(post);
          }
        });
      });
    }

    moveArticle(index, direction) {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= this.managedPosts.length) return;

      const temp = this.managedPosts[index];
      this.managedPosts[index] = this.managedPosts[targetIndex];
      this.managedPosts[targetIndex] = temp;

      this.hasUnsavedOrder = true;
      this.renderArticlesList();
      this.saveLayout(true); // Auto-save on order change
    }

    setFeaturedArticle(postId) {
      if (!postId) return;
      this.currentFeaturedId = postId;
      this.hasUnsavedOrder = true;
      const target = this.managedPosts.find(p => p.id === postId);
      this.renderArticlesList();
      this.saveLayout(false);
      this.showToast(`★ Set "${target ? target.title : 'Article'}" as the Spotlight Featured Edition!`, 'success');
    }

    async saveLayout(silent = false) {
      const config = {
        action: 'update_layout',
        featuredId: this.currentFeaturedId,
        orderedIds: this.managedPosts.map(p => p.id),
        updatedAt: Date.now()
      };

      // 1. Local Cache for instant feedback
      try {
        localStorage.setItem('iiec_blog_layout_v1', JSON.stringify(config));
        this.hasUnsavedOrder = false;
        if (this.layoutStateEl) {
          this.layoutStateEl.textContent = 'Saving to Sheet...';
          this.layoutStateEl.style.background = '#fff3e0';
          this.layoutStateEl.style.color = '#e65100';
        }
      } catch (err) { }

      // 2. Remote Save to Google Sheet CMS
      const SCRIPT_URL = atob('aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy9BS2Z5Y2J3MEtKazhPYkR3LVhwejlUSmxQWExDWE9Fb3ZXeDBJM2JTVWxjVG1CTFdiX0tMb0w0QXZ0QWtHNW9FbnZ4TUZOdnJ5QS9leGVj');
      try {
        await fetch(SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        });

        if (this.layoutStateEl) {
          this.layoutStateEl.textContent = 'Saved in Sheet';
          this.layoutStateEl.style.background = '#e8f5e9';
          this.layoutStateEl.style.color = '#1b5e20';
        }
        if (!silent) {
          this.showToast('✓ Layout and Featured Edition saved to Google Sheet for all visitors!', 'success');
        }
      } catch (err) {
        console.warn('Google Sheet remote sync notice:', err);
        if (this.layoutStateEl) {
          this.layoutStateEl.textContent = 'Saved Locally';
        }
        if (!silent) {
          this.showToast('✓ Layout updated locally. Please verify network connection.', 'success');
        }
      }
    }

    async resetLayout() {
      if (confirm('Reset blog order to default chronological order?')) {
        localStorage.removeItem('iiec_blog_layout_v1');
        this.hasUnsavedOrder = false;

        const SCRIPT_URL = atob('aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy9BS2Z5Y2J3MEtKazhPYkR3LVhwejlUSmxQWExDWE9Fb3ZXeDBJM2JTVWxjVG1CTFdiX0tMb0w0QXZ0QWtHNW9FbnZ4TUZOdnJ5QS9leGVj');
        try {
          fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'update_layout', featuredId: '', orderedIds: [] })
          }).catch(function () { });
        } catch (e) { }

        this.fetchAndSetupArticles();
        this.showToast('Reset blog layout to default chronological sequence.', 'success');
      }
    }

    initEditModeControls() {
      if (this.bannerCancelEditBtn) {
        this.bannerCancelEditBtn.addEventListener('click', () => {
          this.exitEditMode(true);
          this.showToast('Exited edit mode. Ready to compose a new article.', 'success');
        });
      }
      if (this.cancelEditBtn) {
        this.cancelEditBtn.addEventListener('click', () => {
          this.exitEditMode(true);
          this.showToast('Exited edit mode. Ready to compose a new article.', 'success');
        });
      }
    }

    loadPostIntoStudio(post) {
      if (!post) return;
      this.enterEditMode(post);
    }

    enterEditMode(post) {
      if (!post) return;
      this.currentEditingPost = post;

      if (this.postEditIdInput) this.postEditIdInput.value = post.id || '';
      if (this.titleInput) this.titleInput.value = post.title || '';
      if (this.categorySelect) {
        const cat = (post.category || 'Entrepreneurship').trim();
        let matched = false;
        for (let i = 0; i < this.categorySelect.options.length; i++) {
          if (this.categorySelect.options[i].value.toLowerCase() === cat.toLowerCase()) {
            this.categorySelect.selectedIndex = i;
            matched = true;
            break;
          }
        }
        if (!matched) {
          const opt = document.createElement('option');
          opt.value = cat;
          opt.textContent = cat;
          opt.selected = true;
          const customOpt = this.categorySelect.querySelector('option[value="__custom__"]');
          if (customOpt) {
            this.categorySelect.insertBefore(opt, customOpt);
          } else {
            this.categorySelect.appendChild(opt);
          }
        }
        if (this.customCategoryInput) {
          this.customCategoryInput.style.display = 'none';
        }
      }
      if (this.authorInput) this.authorInput.value = post.author || 'IIEC Team';
      if (this.imageInput) this.imageInput.value = post.imageUrl || post.image || '';
      if (this.excerptInput) this.excerptInput.value = post.excerpt || '';
      if (this.contentInput) this.contentInput.value = post.content || '';
      if (this.readTimeInput) this.readTimeInput.value = post.readTime || '5 min read';

      // Update Studio Header
      if (this.studioMainTitle) {
        this.studioMainTitle.innerHTML = 'Edit &amp; <span>Update Article</span>';
      }
      if (this.studioPanelTag) {
        this.studioPanelTag.textContent = 'EDITING MODE';
        this.studioPanelTag.style.background = 'rgba(245, 158, 11, 0.2)';
        this.studioPanelTag.style.borderColor = 'rgba(245, 158, 11, 0.5)';
        this.studioPanelTag.style.color = '#fbbf24';
      }
      if (this.studioSubtitle) {
        this.studioSubtitle.textContent = 'Modify article details below and click "Update Article" to sync with Google Sheets.';
      }

      // Show Edit Mode Banner
      if (this.studioEditBanner) {
        this.studioEditBanner.style.display = 'flex';
      }
      if (this.studioEditArticleTitle) {
        this.studioEditArticleTitle.textContent = post.title || 'Untitled Post';
      }

      // Show Cancel Action Button & Update Submit Button Text
      if (this.cancelEditBtn) {
        this.cancelEditBtn.style.display = 'inline-flex';
      }
      if (this.publishBtnText) {
        this.publishBtnText.textContent = 'Update Article';
      }

      this.updateStats();
      this.updateCoverPreview();
      this.renderMarkdownToPreview();

      // Switch to Studio View
      this.openStudio();
      this.showToast(`Loaded "${post.title}" for editing.`, 'success');
    }

    exitEditMode(clearForm = true) {
      this.currentEditingPost = null;
      if (this.postEditIdInput) this.postEditIdInput.value = '';

      // Reset Studio Header
      if (this.studioMainTitle) {
        this.studioMainTitle.innerHTML = 'Compose &amp; <span>Publish Article</span>';
      }
      if (this.studioPanelTag) {
        this.studioPanelTag.textContent = 'STUDIO';
        this.studioPanelTag.style.background = '';
        this.studioPanelTag.style.borderColor = '';
        this.studioPanelTag.style.color = '';
      }
      if (this.studioSubtitle) {
        this.studioSubtitle.textContent = 'Bidirectional Markdown workspace with instant live editorial preview.';
      }

      // Hide Edit Banner & Cancel Button
      if (this.studioEditBanner) {
        this.studioEditBanner.style.display = 'none';
      }
      if (this.cancelEditBtn) {
        this.cancelEditBtn.style.display = 'none';
      }
      if (this.publishBtnText) {
        this.publishBtnText.textContent = 'Publish Post';
      }

      if (clearForm) {
        if (this.blogForm) this.blogForm.reset();
        if (this.authorInput) this.authorInput.value = 'IIEC Team';
        if (this.categorySelect) this.categorySelect.value = 'Entrepreneurship';
        if (this.contentInput) this.contentInput.value = '';
        if (this.excerptInput) this.excerptInput.value = '';
        if (this.titleInput) this.titleInput.value = '';
        if (this.imageInput) this.imageInput.value = '';
        this.updateStats();
        this.updateCoverPreview();
        this.renderMarkdownToPreview();
        localStorage.removeItem(DRAFT_KEY);
      }
    }

    showToast(message, type = 'success') {
      // Remove any existing toast
      document.querySelectorAll('.admin-toast').forEach(t => t.remove());

      const toast = document.createElement('div');
      toast.className = `admin-toast admin-toast--${type}`;
      toast.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
        </svg>
        <span>${this.escapeHtml(message)}</span>
      `;
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, 4000);
    }

    escapeHtml(str) {
      if (!str) return '';
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    /* ------------------------------------------------------------
       8. SUPPRESS FLOATING RECRUITMENT PILL ON ADMIN
       ------------------------------------------------------------ */
    suppressRecruitmentPill() {
      const removePill = () => {
        const pill = document.getElementById('iiec-recruitment-pill');
        if (pill) pill.remove();
        document.querySelectorAll('.iiec-floating-pill').forEach(el => el.remove());
      };
      removePill();
      setTimeout(removePill, 300);
      setTimeout(removePill, 1000);
    }
  }

  // Clear draft on successful form publish
  document.addEventListener('submit', (e) => {
    if (e.target && e.target.id === 'blog-post-form') {
      setTimeout(() => {
        localStorage.removeItem(DRAFT_KEY);
      }, 1000);
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    new BlogStudioEnhancer();
  });
})();

