# IIEC OPS Portal — Full Admin Panel Features Documentation

> This document describes all the admin panel features that were designed and built for the IIEC Operations Portal. Each feature is explained in detail — what it does, how it works, and how to implement it with a backend.

---

## Table of Contents

1. [Overview & Architecture](#overview--architecture)
2. [Password Authentication](#1-password-authentication)
3. [Sidebar Navigation](#2-sidebar-navigation)
4. [Dashboard Panel](#3-dashboard-panel)
5. [Applications Panel](#4-applications-panel)
6. [Team Management Panel](#5-team-management-panel)
7. [Events Panel](#6-events-panel)
8. [Domains Panel](#7-domains-panel)
9. [Communication Panel](#8-communication-panel)
10. [Certificates Panel](#9-certificates-panel)
11. [Website Content Panel](#10-website-content-panel)
12. [Blog Editor (Separate Overlay)](#11-blog-editor-separate-overlay)
13. [Settings Panel](#12-settings-panel)
14. [Reports Panel](#13-reports-panel)
15. [Activity Logs Panel](#14-activity-logs-panel)
16. [Implementation Guide](#implementation-guide)

---

## Overview & Architecture

The full admin panel was a multi-panel dashboard with a fixed sidebar navigation, 11 content panels, and a separate full-screen blog editor overlay. It was designed as a single-page app within `admin.html`.

### File Structure

| File | Purpose |
|---|---|
| `admin.html` | Full HTML with password screen, sidebar, 11 panels, blog editor overlay (~1300 lines) |
| `css/admin.css` | All dashboard styles including sidebar, panels, tables, forms, cards (~1700 lines) |
| `js/admin.js` | AdminPanel class with localStorage-backed CRUD for all panels (~600 lines) |
| `js/script.js` | AdminForm class with auth, sidebar nav, blog editor, text formatter |

### Layout Architecture

```
┌─────────────────────────────────────────────┐
│           Password Screen                    │
│   ┌─────────────────────────────────┐       │
│   │  OPS Portal                      │       │
│   │  [Password Input]                │       │
│   │  [Access Portal Button]          │       │
│   └─────────────────────────────────┘       │
└─────────────────────────────────────────────┘

After Login:
┌──────────┬──────────────────────────────────┐
│ Sidebar  │                                   │
│          │      Active Panel Content         │
│ Dashboard│                                   │
│ Apps     │   (Only one panel visible         │
│ Team     │    at a time)                     │
│ Events   │                                   │
│ Domains  │                                   │
│ Comms    │                                   │
│ Certs    │                                   │
│ Website  │                                   │
│ Blog Ed. │                                   │
│ Settings │                                   │
│ Reports  │                                   │
│ Logs     │                                   │
│          │                                   │
│ [Logout] │                                   │
└──────────┴──────────────────────────────────┘
```

---

## 1. Password Authentication

### What It Does
- Shows a password entry screen before granting access to the admin dashboard
- Validates against a hardcoded password
- Displays error animation on wrong password
- Shows/hides the dashboard upon successful login

### How It Works
- Password: `IIEC@CSMU@2026` (hardcoded in JavaScript)
- On correct password: hides `#password-screen`, shows `#admin-dashboard` with flex display
- On wrong password: shakes the input field, shows error message for 2 seconds
- Logout button reverses the process

### How to Implement with Backend
1. **Create an API endpoint** (e.g., Google Apps Script or Node.js) that accepts POST with `{ password: "..." }`
2. **Server-side validation**: Compare against stored hash (never plain text)
3. **Return a session token** (JWT or random string) on success
4. **Store the token** in `sessionStorage` and send it with every subsequent API call
5. **Add token expiration** (e.g., 1 hour) for security

### HTML Elements
```html
<section id="password-screen">
  <form id="password-form">
    <input type="password" id="admin-password">
    <button type="submit">Access Portal</button>
    <div class="form-message" role="alert"></div>
  </form>
</section>
<div id="admin-dashboard" style="display: none;">
  <!-- Dashboard content -->
</div>
```

---

## 2. Sidebar Navigation

### What It Does
- Fixed sidebar (260px wide) on the left side with all panel links
- Clicking a link shows the corresponding panel and hides all others
- Active link is highlighted with accent color and left border
- Mobile responsive: hamburger toggle button, overlay to close
- Remembers last active panel in `sessionStorage`

### How It Works
- Each sidebar link has a `data-panel` attribute matching the panel ID
- `switchPanel(panelName)` hides all `.admin-panel` elements and shows `#panel-{name}`
- Active state managed by toggling `.active` class on sidebar links
- Mobile sidebar slides in from left with `transform: translateX()`
- `sessionStorage.setItem('admin-active-panel', panelName)` persists the selection

### HTML Elements
```html
<aside class="admin-sidebar" id="admin-sidebar">
  <nav class="sidebar-nav">
    <a class="sidebar-link active" data-panel="dashboard">Dashboard</a>
    <a class="sidebar-link" data-panel="applications">Applications</a>
    <!-- ... more links ... -->
  </nav>
  <div class="sidebar-footer">
    <a class="sidebar-link" id="logout-btn">Logout</a>
  </div>
</aside>
<button class="sidebar-toggle" id="sidebar-toggle">☰</button>
<div class="sidebar-overlay" id="sidebar-overlay"></div>
```

### JavaScript Logic
```javascript
switchPanel(panelName) {
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + panelName)?.classList.add('active');
  this.sidebarLinks.forEach(link => {
    link.classList.toggle('active', link.dataset.panel === panelName);
  });
  sessionStorage.setItem('admin-active-panel', panelName);
}
```

---

## 3. Dashboard Panel

### What It Does
- Overview panel with stats cards, quick actions, recent activity feed, and system status
- Stats: Total Applications, Members, Blog Posts, Events (placeholder values)
- Quick Actions: links to other panels (Write Blog, Review Apps, Manage Team, Create Event, Send Announcement)
- Activity Feed: chronological log of admin actions (login, blog publish, etc.)
- System Status: shows Website, Blog API, Forms, Analytics status indicators

### How to Implement with Backend
1. **Stats API**: `GET /api/stats` → returns `{ applications: 42, members: 15, posts: 8, events: 3 }`
2. **Activity Feed**: stored in backend database, fetched on panel load, updated on each action
3. **System Status**: health-check endpoints for each service, polled every 30 seconds

### HTML Structure
```html
<div class="admin-panel active" id="panel-dashboard">
  <div class="stats-grid">
    <div class="stat-card glass-card">
      <span class="stat-value" id="stat-applications">--</span>
      <span class="stat-label">Applications</span>
    </div>
    <!-- 3 more stat cards -->
  </div>
  <div class="dashboard-row">
    <div class="dashboard-card glass-card"><!-- Quick Actions --></div>
    <div class="dashboard-card glass-card"><!-- Activity Feed --></div>
  </div>
  <div class="dashboard-card glass-card system-status-card">
    <!-- System Status indicators -->
  </div>
</div>
```

---

## 4. Applications Panel

### What It Does
- Displays a table of membership applications with Name, Email, Domain, Date, Status, and Actions columns
- Search bar to filter by name, email, or domain
- Filter dropdown: All / Pending / Approved / Rejected
- Status tabs with counts (All, Pending, Approved, Rejected)
- Refresh and Export buttons
- Each row has Approve/Reject action buttons

### How to Implement with Backend
1. **Google Sheets Integration**: Applications submitted via Google Forms → stored in a Google Sheet
2. **Apps Script API**: 
   - `GET /api/applications` → returns all applications as JSON
   - `POST /api/applications/update` → `{ id, status: "approved" }` to update status
3. **Frontend fetch**:
   ```javascript
   async loadApplications() {
     const res = await fetch(SCRIPT_URL + '?action=getApplications');
     const data = await res.json();
     this.renderApplicationsTable(data);
   }
   ```
4. **Export**: Convert table data to CSV and trigger download
5. **Search**: Client-side filtering of the loaded data array

### HTML Structure
```html
<div class="admin-panel" id="panel-applications">
  <div class="controls-bar glass-card">
    <input type="text" class="search-input" id="app-search">
    <select class="filter-select" id="app-filter">...</select>
    <button id="app-refresh">Refresh</button>
    <button id="app-export">Export</button>
  </div>
  <div class="tab-bar">
    <button class="tab-btn active" data-tab="all">All <span id="tab-all-count">0</span></button>
    <!-- More tabs -->
  </div>
  <table class="data-table" id="applications-table">
    <thead><tr><th>Name</th><th>Email</th>...</tr></thead>
    <tbody id="applications-tbody"></tbody>
  </table>
</div>
```

---

## 5. Team Management Panel

### What It Does
- Grid of team member cards with avatar, name, role, and domain
- "Add Member" button toggles a form with fields: Full Name, Role, Domain (select), Email, LinkedIn URL, Profile Photo URL
- Each member card has Edit and Delete action buttons
- Cancel button hides the form

### How to Implement with Backend
1. **Google Sheet** named "Team Members" with columns: Name, Role, Domain, Email, LinkedIn, Photo URL
2. **Apps Script**:
   - `GET ?action=getTeam` → returns array of members
   - `POST ?action=addMember` → adds new row
   - `POST ?action=updateMember` → updates existing row by ID
   - `POST ?action=deleteMember` → removes row by ID
3. **Frontend**:
   ```javascript
   // Add member
   document.getElementById('member-form').addEventListener('submit', async (e) => {
     e.preventDefault();
     const data = { name, role, domain, email, linkedin, photo };
     await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'addMember', ...data }) });
     this.loadTeam(); // Refresh grid
   });
   ```
4. **Member cards** rendered dynamically with avatar (image URL or initials fallback), name, role badge, and action buttons

### localStorage Implementation (No Backend)
```javascript
addMember(member) {
  const members = JSON.parse(localStorage.getItem('iiec-team') || '[]');
  member.id = Date.now();
  members.push(member);
  localStorage.setItem('iiec-team', JSON.stringify(members));
  this.renderTeam();
}
```

---

## 6. Events Panel

### What It Does
- List of events showing date badge (month + day), event name, metadata (type, venue, registrations), and status
- "Create Event" button toggles a form with: Event Name, Date, Time, Event Type (select), Venue, Registration Link, Description, Max Participants, Status
- Each event has Edit, Delete, and Status Change actions
- Event types: Workshop, Hackathon, Seminar, Bootcamp, Competition, Meetup
- Status options: Draft, Upcoming, Live, Completed

### How to Implement with Backend
1. **Google Sheet** "Events" with columns matching the form fields
2. **Apps Script**:
   - `GET ?action=getEvents` → returns events array
   - `POST ?action=createEvent` → adds event
   - `POST ?action=updateEventStatus` → `{ id, status }` to change status
3. **Frontend rendering**:
   - Date badge shows abbreviated month and day number from the event date
   - Status badges use color-coded classes (draft=gray, upcoming=blue, live=green, completed=purple)
4. **Registration link** displayed as a clickable external link

---

## 7. Domains Panel

### What It Does
- Grid of domain cards representing IIEC's working domains/sub-teams
- 6 domains: Technology, Design, Content, Marketing, Events, Operations
- Each card shows: domain name, description, color indicator, member count
- Color-coded by domain (blue=tech, pink=design, green=content, orange=marketing, purple=events, yellow=operations)

### How to Implement
- **Static data** — domains are predefined, so the cards can be hardcoded in HTML
- Member counts can be dynamically calculated from the team dataset:
  ```javascript
  const techCount = members.filter(m => m.domain === 'tech').length;
  document.querySelector('[data-domain="tech"] .domain-members').textContent = techCount + ' members';
  ```

### HTML Structure
```html
<div class="domain-card glass-card" data-domain="tech">
  <div class="domain-color domain-color-blue"></div>
  <div class="domain-info">
    <h3 class="domain-name">Technology</h3>
    <p class="domain-desc">Web development, app development, AI/ML, cloud infrastructure</p>
    <span class="domain-members">-- members</span>
  </div>
</div>
```

---

## 8. Communication Panel

### What It Does
- Compose form for sending announcements/emails to members
- Recipients dropdown: All Members, Tech Domain, Design Domain, Content Domain, Marketing Domain, Events Domain, Team Leads Only, Custom List
- Fields: Subject, Message (large textarea), Priority (Normal/High/Urgent), Channel (Email/WhatsApp/Both)
- Quick templates sidebar: Meeting Reminder, Event Announcement, Deadline Reminder, Welcome New Member, General Update
- Save Draft and Send buttons

### How to Implement with Backend
1. **Email sending via Apps Script**:
   ```javascript
   function sendAnnouncement(data) {
     const recipients = getRecipientEmails(data.recipientGroup);
     recipients.forEach(email => {
       GmailApp.sendEmail(email, data.subject, '', {
         htmlBody: formatAnnouncementHTML(data.message, data.priority)
       });
     });
   }
   ```
2. **WhatsApp integration**: Use WhatsApp Business API or generate wa.me links
3. **Templates**: Store template content in a JSON object, populate form fields on template click
4. **Draft saving**: Store drafts in localStorage or Google Sheet "Drafts" tab

### Template Implementation
```javascript
const templates = {
  meeting: {
    subject: 'Team Meeting Reminder',
    message: 'Hi team,\n\nThis is a reminder about our upcoming team meeting.\n\nDate: [DATE]\nTime: [TIME]\nVenue: [VENUE]\n\nPlease be on time.\n\nBest,\nIIEC Team'
  },
  event: { subject: 'Exciting Event Announcement!', message: '...' },
  // ... more templates
};

document.querySelectorAll('.template-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const template = templates[btn.dataset.template];
    document.getElementById('comm-subject').value = template.subject;
    document.getElementById('comm-message').value = template.message;
  });
});
```

---

## 9. Certificates Panel

### What It Does
- Form to generate event certificates in bulk
- Fields: Event (select), Certificate Type (Participation/Achievement/Winner/Volunteer/Speaker), Attendee List (CSV upload), Date on Certificate
- CSV file upload with drag-and-drop zone
- Certificate preview area (shows a preview of the certificate design)
- Preview and Generate & Send buttons

### How to Implement with Backend
1. **CSV parsing** (client-side):
   ```javascript
   const file = document.getElementById('csv-file').files[0];
   const reader = new FileReader();
   reader.onload = (e) => {
     const rows = e.target.result.split('\n').map(row => row.split(','));
     // rows[0] = headers: [Name, Email, Score]
     // rows[1..n] = data
   };
   reader.readAsText(file);
   ```
2. **Certificate generation** via Google Slides API:
   - Create a Google Slides template with placeholder text `{{NAME}}`, `{{EVENT}}`, `{{DATE}}`
   - Use Apps Script to duplicate the template for each attendee, replace placeholders, export as PDF
3. **Email certificates** using GmailApp:
   ```javascript
   function generateAndSendCerts(attendees, event, certType, date) {
     const templateId = 'GOOGLE_SLIDES_TEMPLATE_ID';
     attendees.forEach(({ name, email }) => {
       const copy = DriveApp.getFileById(templateId).makeCopy(name + ' - Certificate');
       const slides = SlidesApp.openById(copy.getId());
       slides.replaceAllText('{{NAME}}', name);
       slides.replaceAllText('{{EVENT}}', event);
       slides.replaceAllText('{{DATE}}', date);
       slides.saveAndClose();
       const pdf = copy.getAs('application/pdf');
       GmailApp.sendEmail(email, 'Your Certificate - ' + event, '', {
         attachments: [pdf],
         htmlBody: '<p>Congratulations! Please find your certificate attached.</p>'
       });
       copy.setTrashed(true); // Clean up
     });
   }
   ```

### Drag & Drop Implementation
```javascript
const zone = document.getElementById('csv-upload');
zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
zone.addEventListener('drop', (e) => {
  e.preventDefault();
  zone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file && file.name.endsWith('.csv')) {
    document.getElementById('csv-file').files = e.dataTransfer.files;
    // Parse CSV...
  }
});
```

---

## 10. Website Content Panel

### What It Does
- **Featured Event Control**: Toggle + fields for event name, date, registration URL
- **Site Controls**: Toggle switches for Maintenance Mode, Registration Open, Show Newsletter, Show Announcement Bar
- **Social Links**: Input fields for LinkedIn, Instagram, Twitter/X, Email

### How to Implement with Backend
1. **Site config stored in Google Sheet** tab "Config" with key-value pairs:
   ```
   | Key                | Value              |
   |--------------------|--------------------|
   | featured_event     | TechAstra 2.0     |
   | featured_date      | 2026-03-15        |
   | featured_url       | https://...       |
   | maintenance_mode   | false             |
   | registration_open  | true              |
   | show_newsletter    | true              |
   ```
2. **Apps Script API**:
   - `GET ?action=getConfig` → returns all config as JSON
   - `POST ?action=updateConfig` → `{ key, value }` to update
3. **Frontend reads config on page load** and applies settings:
   ```javascript
   // On main site (index.html)
   async function checkSiteConfig() {
     const res = await fetch(SCRIPT_URL + '?action=getConfig');
     const config = await res.json();
     if (config.maintenance_mode === 'true') {
       document.body.innerHTML = '<h1>Site under maintenance</h1>';
     }
   }
   ```

### Toggle Switch HTML
```html
<div class="toggle-item">
  <div class="toggle-info">
    <span class="toggle-name">Maintenance Mode</span>
    <span class="toggle-desc">Show maintenance page to visitors</span>
  </div>
  <label class="toggle-switch">
    <input type="checkbox" id="maintenance-toggle">
    <span class="toggle-slider"></span>
  </label>
</div>
```

---

## 11. Blog Editor (Separate Overlay)

### What It Does
- Full-screen overlay (`100vw × 100vh`) that appears on top of the dashboard
- Separate from the regular panels — accessed via sidebar "Blog Editor" link or dashboard quick action
- Top bar with: Back button, "Blog Editor" title, Save Draft button, Publish button
- Form fields: Title (large input), Category, Author, Read Time, Cover Image URL, Excerpt, Content (with markdown toolbar)
- Markdown toolbar with: Bold, Italic, Underline, H1-H3, Bullet List, Numbered List, Link, Quote, Code Block, Preview toggle
- Split-pane editor with live preview panel
- Keyboard shortcuts: Ctrl+B (bold), Ctrl+I (italic), Ctrl+U (underline)
- Submits to Google Apps Script endpoint via `fetch` with `no-cors` mode

### How It Works
- The blog editor is a `<div class="blog-editor-overlay">` with `display: none` by default
- `openBlogEditor()` sets `display: flex`, adds `.active` class, sets `body overflow: hidden`
- `closeBlogEditor()` reverses it and restores the last active panel
- The markdown toolbar uses `applyFormat(format)` to wrap selected text or insert placeholders
- Preview pane parses markdown to HTML using regex-based parsing (headers, bold, italic, links, blockquotes, code blocks, lists)

### Backend (Blog Posting)
The blog post is submitted to Google Apps Script:

```javascript
const SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';

const data = {
  title: 'Post Title',
  category: 'Technology',
  excerpt: 'Brief summary...',
  content: '# Full markdown content...',
  imageUrl: 'https://example.com/cover.jpg',
  author: 'IIEC Team',
  readTime: '5 min read'
};

await fetch(SCRIPT_URL, {
  method: 'POST',
  mode: 'no-cors',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});
```

### Apps Script (Server-Side)
```javascript
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Blog Posts');
  sheet.appendRow([
    new Date(),           // Timestamp
    data.title,
    data.category,
    data.excerpt,
    data.content,
    data.imageUrl,
    data.author,
    data.readTime,
    'published'           // Status
  ]);
  return ContentService.createTextOutput(JSON.stringify({ success: true }));
}
```

### Markdown Toolbar Format Map
```javascript
const formats = {
  bold:      { before: '**',   after: '**',     placeholder: 'bold text' },
  italic:    { before: '*',    after: '*',       placeholder: 'italic text' },
  underline: { before: '<u>',  after: '</u>',   placeholder: 'underlined text' },
  h1:        { before: '# ',   after: '',       placeholder: 'Heading 1',   newLine: true },
  h2:        { before: '## ',  after: '',       placeholder: 'Heading 2',   newLine: true },
  h3:        { before: '### ', after: '',       placeholder: 'Heading 3',   newLine: true },
  ul:        { before: '- ',   after: '',       placeholder: 'List item',   newLine: true },
  ol:        { before: '1. ',  after: '',       placeholder: 'List item',   newLine: true },
  link:      { before: '[',    after: '](url)', placeholder: 'link text' },
  quote:     { before: '> ',   after: '',       placeholder: 'Quote text',  newLine: true },
  code:      { before: '```\n', after: '\n```', placeholder: 'code here',  newLine: true }
};
```

---

## 12. Settings Panel

### What It Does
- **API Configuration**: Google Apps Script URL, Google Sheet ID, Analytics Property ID inputs
- **Security**: Change password form (Current Password, New Password, Confirm Password)
- **Notifications**: Toggle switches for New Applications, Blog Comments, System Alerts

### How to Implement with Backend
1. **API config**: Store in localStorage or a "Config" sheet tab
2. **Password change**: 
   ```javascript
   // Apps Script
   function changePassword(currentPw, newPw) {
     const config = getConfigSheet();
     const storedHash = config.getRange('B2').getValue(); // password hash
     if (hashPassword(currentPw) === storedHash) {
       config.getRange('B2').setValue(hashPassword(newPw));
       return { success: true };
     }
     return { success: false, error: 'Incorrect current password' };
   }
   ```
3. **Notifications**: Store preferences in localStorage; when backend is available, store in user profile

---

## 13. Reports Panel

### What It Does
- 4 report cards: Website Traffic, New Applications, Blog Engagement, Event Registrations
- Each shows: metric value, trend percentage (up/neutral), mini bar chart visualization, and description
- Period filter: Last 7 days / 30 days / 90 days / All Time
- Export Report button
- Link to the full Analytics Dashboard (`analytics.html`)

### How to Implement with Backend
1. **Google Analytics Data API** (GA4):
   ```javascript
   // Apps Script using Analytics Data API
   function getWebsiteTraffic(period) {
     const analytics = AnalyticsData.Properties.runReport(GA_PROPERTY_ID, {
       dateRanges: [{ startDate: period + 'daysAgo', endDate: 'today' }],
       metrics: [{ name: 'screenPageViews' }]
     });
     return analytics.rows[0].metricValues[0].value;
   }
   ```
2. **Application stats**: Query the Applications sheet, count by date range
3. **Blog stats**: Count blog posts and calculate engagement from a "Blog Views" sheet
4. **Mini bar charts**: 7-element `height` array rendered as div bars:
   ```html
   <div class="report-chart-placeholder">
     <div class="mini-bar" style="height:30%"></div>
     <div class="mini-bar" style="height:50%"></div>
     <!-- ... 5 more bars -->
   </div>
   ```

---

## 14. Activity Logs Panel

### What It Does
- Table of all portal activity with: Timestamp, Action Type (badge), Details, User columns
- Filter dropdown: All Activities, Authentication, Blog, Team, Settings
- Clear Logs button
- Logs automatically added by `addLogEntry(type, detail)` method whenever any action occurs

### How It Works (Client-Side)
```javascript
addLogEntry(type, detail) {
  const entry = {
    timestamp: new Date().toLocaleString(),
    type: type,      // 'auth', 'blog', 'team', 'settings'
    detail: detail,  // 'Admin logged in', 'Published: "Post Title"'
    user: 'Admin'
  };
  this.activityLogs.unshift(entry);
  
  // Insert row in logs table
  const tbody = document.getElementById('logs-tbody');
  const row = document.createElement('tr');
  row.innerHTML = `
    <td>${entry.timestamp}</td>
    <td><span class="status-badge">${entry.type}</span></td>
    <td>${entry.detail}</td>
    <td>${entry.user}</td>
  `;
  tbody.insertBefore(row, tbody.firstChild);
  
  // Also update dashboard activity feed
  // ...
}
```

### How to Implement with Backend
1. **Store logs in a "Logs" sheet tab** or a proper logging service
2. **Every API call** should log the action server-side
3. **Fetch logs** on panel load: `GET ?action=getLogs&filter=all&limit=100`
4. **Clear logs**: `POST ?action=clearLogs`

---

## Implementation Guide

### Option A: localStorage (No Backend, Demo/Testing)

All data is stored in the browser's localStorage. This is how the `js/admin.js` AdminPanel class worked:

```javascript
class AdminPanel {
  constructor() {
    this.data = {
      team: JSON.parse(localStorage.getItem('iiec-team') || '[]'),
      events: JSON.parse(localStorage.getItem('iiec-events') || '[]'),
      applications: JSON.parse(localStorage.getItem('iiec-applications') || '[]'),
      logs: JSON.parse(localStorage.getItem('iiec-logs') || '[]')
    };
  }
  
  saveData(key) {
    localStorage.setItem('iiec-' + key, JSON.stringify(this.data[key]));
  }
  
  addMember(member) {
    member.id = Date.now();
    this.data.team.push(member);
    this.saveData('team');
    this.renderTeam();
  }
  
  // ... similar for events, applications, etc.
}
```

**Pros**: No setup needed, instant, works offline  
**Cons**: Data is browser-specific, lost on clear, not shared between devices

---

### Option B: Google Sheets + Apps Script (Recommended)

Use Google Sheets as a free database and Google Apps Script as the API layer:

1. **Create a Google Sheet** with tabs: Blog Posts, Team, Events, Applications, Config, Logs
2. **Create an Apps Script** attached to the sheet
3. **Deploy as Web App** (Execute as: Me, Access: Anyone)
4. **Frontend calls the Apps Script URL** with action parameter

#### Complete Apps Script Template

```javascript
// === MAIN HANDLER ===
function doGet(e) {
  const action = e.parameter.action;
  let result;
  
  switch(action) {
    case 'getTeam':
      result = getSheetData('Team');
      break;
    case 'getEvents':
      result = getSheetData('Events');
      break;
    case 'getApplications':
      result = getSheetData('Applications');
      break;
    case 'getConfig':
      result = getConfig();
      break;
    case 'getLogs':
      result = getSheetData('Logs');
      break;
    default:
      result = { error: 'Unknown action' };
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  let result;
  
  switch(data.action) {
    case 'addBlogPost':
      result = addRow('Blog Posts', [new Date(), data.title, data.category, data.excerpt, data.content, data.imageUrl, data.author, data.readTime, 'published']);
      break;
    case 'addMember':
      result = addRow('Team', [new Date(), data.name, data.role, data.domain, data.email, data.linkedin, data.photo]);
      break;
    case 'createEvent':
      result = addRow('Events', [new Date(), data.name, data.date, data.time, data.type, data.venue, data.regLink, data.description, data.maxParticipants, data.status]);
      break;
    case 'updateStatus':
      result = updateCell(data.sheet, data.row, data.column, data.value);
      break;
    case 'deleteRow':
      result = deleteRow(data.sheet, data.row);
      break;
    default:
      result = { error: 'Unknown action' };
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// === HELPER FUNCTIONS ===
function getSheetData(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function addRow(sheetName, values) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  sheet.appendRow(values);
  return { success: true };
}

function updateCell(sheetName, row, column, value) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  sheet.getRange(row, column).setValue(value);
  return { success: true };
}

function deleteRow(sheetName, row) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  sheet.deleteRow(row);
  return { success: true };
}

function getConfig() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Config');
  const data = sheet.getDataRange().getValues();
  const config = {};
  data.forEach(([key, value]) => config[key] = value);
  return config;
}
```

---

### Option C: Node.js + Database (Advanced)

For a full production setup:

1. **Backend**: Express.js with JWT authentication
2. **Database**: MongoDB Atlas or PostgreSQL (Supabase)
3. **File storage**: Cloudinary or AWS S3 for images
4. **Email**: Nodemailer with Gmail or SendGrid
5. **Deploy**: Vercel, Railway, or Render

This requires significantly more setup but gives full control over data, security, and scalability.

---

## CSS Classes Reference

| Class | Purpose |
|---|---|
| `.admin-sidebar` | Fixed left sidebar (260px) |
| `.sidebar-link` | Navigation link in sidebar |
| `.sidebar-link.active` | Highlighted active link |
| `.admin-panel` | Content panel container |
| `.admin-panel.active` | Visible panel |
| `.glass-card` | Glassmorphism card style |
| `.stat-card` | Dashboard stat card |
| `.data-table` | Full-width data table |
| `.controls-bar` | Search + filter bar |
| `.tab-bar` / `.tab-btn` | Status filter tabs |
| `.domain-card` | Domain grid card |
| `.toggle-switch` | On/off toggle |
| `.blog-editor-overlay` | Full-screen blog editor |
| `.formatter-toolbar` | Markdown toolbar |
| `.editor-container` | Split editor + preview |
| `.preview-pane` | Live markdown preview |
| `.status-badge` | Colored status pill |
| `.form-row` / `.form-row-3` | Grid form layouts |
| `.add-form-card` | Expandable add/create form |

---

## Element IDs Reference

| ID | Element | Panel |
|---|---|---|
| `password-screen` | Password section | Auth |
| `admin-dashboard` | Dashboard wrapper | All |
| `password-form` | Login form | Auth |
| `admin-password` | Password input | Auth |
| `logout-btn` | Logout button | Sidebar |
| `admin-sidebar` | Sidebar element | Nav |
| `sidebar-toggle` | Mobile menu button | Nav |
| `sidebar-overlay` | Mobile overlay | Nav |
| `panel-dashboard` | Dashboard panel | Dashboard |
| `panel-applications` | Applications panel | Applications |
| `panel-team` | Team panel | Team |
| `panel-events` | Events panel | Events |
| `panel-domains` | Domains panel | Domains |
| `panel-communication` | Communication panel | Communication |
| `panel-certificates` | Certificates panel | Certificates |
| `panel-website` | Website panel | Website |
| `panel-settings` | Settings panel | Settings |
| `panel-reports` | Reports panel | Reports |
| `panel-logs` | Logs panel | Logs |
| `blog-editor` | Blog overlay | Blog Editor |
| `blog-editor-trigger` | Sidebar blog link | Sidebar |
| `blog-editor-back` | Back button | Blog Editor |
| `blog-post-form` | Blog form | Blog Editor |
| `post-title` | Blog title input | Blog Editor |
| `post-category` | Category select | Blog Editor |
| `post-author` | Author input | Blog Editor |
| `post-read-time` | Read time input | Blog Editor |
| `post-image` | Cover image URL | Blog Editor |
| `post-excerpt` | Excerpt textarea | Blog Editor |
| `post-content` | Content textarea | Blog Editor |
| `toggle-preview` | Preview toggle btn | Blog Editor |
| `preview-pane` | Preview panel | Blog Editor |
| `preview-content` | Preview HTML area | Blog Editor |
| `stat-applications` | App count | Dashboard |
| `stat-members` | Member count | Dashboard |
| `stat-posts` | Post count | Dashboard |
| `stat-events` | Event count | Dashboard |
| `activity-feed` | Activity list | Dashboard |
| `app-search` | Search input | Applications |
| `app-filter` | Filter select | Applications |
| `applications-tbody` | Table body | Applications |
| `add-member-btn` | Add member button | Team |
| `add-member-form` | Member form | Team |
| `member-form` | Form element | Team |
| `cancel-member-btn` | Cancel button | Team |
| `create-event-btn` | Create event button | Events |
| `create-event-form` | Event form | Events |
| `event-form` | Form element | Events |
| `cancel-event-btn` | Cancel button | Events |
| `logs-tbody` | Logs table body | Logs |

---

*Document created: February 15, 2026*  
*For: IIEC OPS Portal Admin Panel*  
*Repository: Mohd-Monish/iiec.in-Website*
