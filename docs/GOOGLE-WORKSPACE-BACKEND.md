# Google Workspace Backend Setup

## Overview
This guide explains how to set up a free backend using Google Apps Script and Google Sheets to handle newsletter subscriptions and blog posts for the IIEC website.

---

## 1. Newsletter Subscription System

### Step 1: Create Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet named "IIEC Newsletter Subscribers"
3. Set up the following columns in Row 1:
   - A1: `Timestamp`
   - B1: `Email`
   - C1: `Status`

### Step 2: Create Apps Script

1. In your Google Sheet, go to **Extensions → Apps Script**
2. Delete the default code and paste the following:

```javascript
// Newsletter Subscription Script

const SHEET_NAME = 'Sheet1';

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const data = JSON.parse(e.postData.contents);
    
    // Validate email
    if (!data.email || !validateEmail(data.email)) {
      return createResponse(false, 'Invalid email address');
    }
    
    // Check for duplicates
    const emails = sheet.getRange('B:B').getValues().flat();
    if (emails.includes(data.email)) {
      return createResponse(false, 'Email already subscribed');
    }
    
    // Add new subscriber
    sheet.appendRow([
      new Date().toISOString(),
      data.email,
      'Active'
    ]);
    
    return createResponse(true, 'Successfully subscribed!');
    
  } catch (error) {
    return createResponse(false, 'Server error: ' + error.message);
  }
}

function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

function createResponse(success, message) {
  return ContentService
    .createTextOutput(JSON.stringify({ success, message }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Handle CORS preflight
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'OK' }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

### Step 3: Deploy as Web App

1. Click **Deploy → New deployment**
2. Select type: **Web app**
3. Configure:
   - Description: "Newsletter API"
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy**
5. Copy the **Web app URL** (you'll need this for the frontend)

### Step 4: Update Frontend

In `script.js`, update the `NEWSLETTER_API_URL` constant:

```javascript
const NEWSLETTER_API_URL = 'YOUR_WEB_APP_URL_HERE';
```

---

## 2. Blog Posts System

### Step 1: Create Google Sheet

1. Create a new spreadsheet named "IIEC Blog Posts"
2. Set up the following columns in Row 1:
   - A1: `ID`
   - B1: `Timestamp`
   - C1: `Title`
   - D1: `Category`
   - E1: `Excerpt`
   - F1: `Content`
   - G1: `Image URL`
   - H1: `Author`
   - I1: `Read Time`
   - J1: `Status`

### Step 2: Create Apps Script

```javascript
// Blog Posts Script

const BLOG_SHEET_NAME = 'Sheet1';

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(BLOG_SHEET_NAME);
    const data = JSON.parse(e.postData.contents);
    
    // Validate required fields
    if (!data.title || !data.category || !data.excerpt || !data.content || !data.author) {
      return createResponse(false, 'Missing required fields');
    }
    
    // Generate unique ID
    const id = Utilities.getUuid();
    
    // Add new post
    sheet.appendRow([
      id,
      new Date().toISOString(),
      data.title,
      data.category,
      data.excerpt,
      data.content,
      data.imageUrl || '',
      data.author,
      data.readTime || '5 min read',
      'Published'
    ]);
    
    return createResponse(true, 'Post published successfully!', { id });
    
  } catch (error) {
    return createResponse(false, 'Server error: ' + error.message);
  }
}

function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(BLOG_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    
    // Skip header row
    const posts = data.slice(1).map(row => ({
      id: row[0],
      timestamp: row[1],
      title: row[2],
      category: row[3],
      excerpt: row[4],
      content: row[5],
      imageUrl: row[6],
      author: row[7],
      readTime: row[8],
      status: row[9]
    })).filter(post => post.status === 'Published');
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, posts }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, message: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function createResponse(success, message, data = {}) {
  return ContentService
    .createTextOutput(JSON.stringify({ success, message, ...data }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

### Step 3: Deploy as Web App

Follow the same deployment steps as the newsletter script.

---

## 3. Frontend Integration

### Newsletter Form Integration

The `script.js` file already includes the `NewsletterForm` class. Update the API URL:

```javascript
// In NewsletterForm class
async submitEmail(email) {
  const response = await fetch('YOUR_NEWSLETTER_API_URL', {
    method: 'POST',
    mode: 'no-cors', // Required for Apps Script
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email })
  });
  
  // Note: With no-cors mode, you can't read the response
  // The form will show a success message regardless
  return true;
}
```

### Blog Posts Integration

Add to `script.js`:

```javascript
// Blog Posts Loader
class BlogPostsLoader {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.apiUrl = 'YOUR_BLOG_API_URL';
    this.init();
  }
  
  async init() {
    try {
      const response = await fetch(this.apiUrl);
      const data = await response.json();
      
      if (data.success) {
        this.renderPosts(data.posts);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  }
  
  renderPosts(posts) {
    this.container.innerHTML = posts.map(post => `
      <article class="blog-card" data-animate>
        <div class="blog-card-image">
          <img src="${post.imageUrl || './Assests/blog/default.webp'}" 
               alt="${post.title}" 
               width="400" height="250" loading="lazy">
          <span class="blog-card-category">${post.category}</span>
        </div>
        <div class="blog-card-content">
          <div class="blog-card-meta">
            <span class="blog-card-date">${this.formatDate(post.timestamp)}</span>
            <span class="blog-card-read">${post.readTime}</span>
          </div>
          <h2 class="blog-card-title">${post.title}</h2>
          <p class="blog-card-excerpt">${post.excerpt}</p>
          <a href="#" class="blog-card-link">
            Read More
            <svg>...</svg>
          </a>
        </div>
      </article>
    `).join('');
  }
  
  formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}

// Initialize on blog page
if (document.getElementById('blog-posts')) {
  new BlogPostsLoader('blog-posts');
}
```

---

## 4. Admin Form Integration

The admin form in `admin.html` should submit to the blog API:

```javascript
// In AdminForm class
async submitPost(formData) {
  const response = await fetch('YOUR_BLOG_API_URL', {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: formData.get('title'),
      category: formData.get('category'),
      excerpt: formData.get('excerpt'),
      content: formData.get('content'),
      imageUrl: formData.get('imageUrl'),
      author: formData.get('author'),
      readTime: formData.get('readTime')
    })
  });
  
  return true;
}
```

---

## 5. CORS Considerations

Google Apps Script has CORS restrictions. Options to handle:

### Option 1: Use `no-cors` mode (Recommended for simple use)
```javascript
fetch(url, { mode: 'no-cors', ... })
```
**Limitation:** Can't read response body

### Option 2: JSONP (Legacy)
Not recommended for modern applications.

### Option 3: Proxy Server
Set up a simple proxy (Cloudflare Workers, Vercel, etc.) that forwards requests to Apps Script.

---

## 6. Google Sheets Structure

### Newsletter Subscribers Sheet

| Timestamp | Email | Status |
|-----------|-------|--------|
| 2024-05-15T10:30:00Z | user@example.com | Active |
| 2024-05-15T11:45:00Z | another@email.com | Active |

### Blog Posts Sheet

| ID | Timestamp | Title | Category | Excerpt | Content | Image URL | Author | Read Time | Status |
|----|-----------|-------|----------|---------|---------|-----------|--------|-----------|--------|
| uuid-1 | 2024-05-15T10:00:00Z | Post Title | insights | Short excerpt... | Full content... | https://... | Author Name | 5 min read | Published |

---

## 7. Security Considerations

### Password Protection
The admin page uses client-side password protection. For production:
- Consider server-side authentication
- Use environment variables for sensitive data
- Implement rate limiting

### Data Validation
- Always validate input on both client and server
- Sanitize HTML content before rendering
- Limit content length to prevent abuse

### Access Control
- Apps Script runs with your Google account permissions
- Anyone with the web app URL can submit data
- Consider adding API keys or tokens for sensitive operations

---

## 8. Monitoring & Maintenance

### View Logs
1. Open Apps Script editor
2. Go to **Executions** to see request logs
3. Check for errors and debugging info

### Spreadsheet Maintenance
- Regularly backup your Google Sheets
- Monitor for spam submissions
- Clean up test data before production

### Quotas
Google Apps Script has daily quotas:
- URL Fetch calls: 20,000/day
- Script runtime: 6 min/execution
- Spreadsheet operations: 50,000 cells/minute

---

## 9. Alternative Solutions

If you outgrow Google Sheets, consider:

### Free Tier Options
- **Supabase**: PostgreSQL with REST API
- **Firebase**: Realtime database + auth
- **PlanetScale**: MySQL with generous free tier
- **Netlify Forms**: Built-in form handling

### Paid Options
- **Airtable**: Spreadsheet + API
- **Notion API**: Content management
- **Sanity.io**: Headless CMS

---

## 10. Quick Reference

### API Endpoints

| Purpose | Method | URL Pattern |
|---------|--------|-------------|
| Subscribe Newsletter | POST | `https://script.google.com/macros/s/[ID]/exec` |
| Get Blog Posts | GET | `https://script.google.com/macros/s/[ID]/exec` |
| Create Blog Post | POST | `https://script.google.com/macros/s/[ID]/exec` |

### Request Format

```javascript
// Newsletter
{ "email": "user@example.com" }

// Blog Post
{
  "title": "Post Title",
  "category": "insights",
  "excerpt": "Brief description",
  "content": "Full markdown content",
  "imageUrl": "https://example.com/image.jpg",
  "author": "Author Name",
  "readTime": "5 min read"
}
```

### Response Format

```javascript
// Success
{ "success": true, "message": "Action completed" }

// Error
{ "success": false, "message": "Error description" }
```

---

## Support

For issues with this implementation:
1. Check Google Apps Script logs
2. Verify API URLs are correct
3. Test with Postman or curl first
4. Contact tech team: tech@iiec.in
