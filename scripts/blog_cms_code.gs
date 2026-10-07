/**
 * ============================================================================
 * IIEC Blog Posts CMS — Google Apps Script Backend
 * Target Sheet: Sheet1 (Existing content 100% preserved)
 * ============================================================================
 * 
 * FEATURES:
 * 1. doGet: Returns published posts sorted by custom order + active featuredPostId.
 * 2. doPost: Handles both publishing new articles and saving layout / featured settings.
 * 3. autoSetup: Non-destructive setup. Enhances headers with "Is Featured" & "Order",
 *               formats the sheet with IIEC styling, and creates the "_config" sheet.
 * 
 * HOW TO DEPLOY:
 * 1. Open your Spreadsheet: Extensions > Apps Script
 * 2. Paste this entire code into Code.gs and Save (Ctrl+S).
 * 3. Select "autoSetup" in the function dropdown and click "Run".
 *    (Approve permissions. Your existing content is completely untouched).
 * 4. Click Deploy > Manage Deployments > Edit (pencil) > Version: New Version > Deploy.
 * ============================================================================
 */

const BLOG_SHEET_NAME = 'Sheet1';
const CONFIG_SHEET_NAME = '_config';

const HEADERS = [
  'ID',
  'Timestamp',
  'Title',
  'Category',
  'Excerpt',
  'Content',
  'Image URL',
  'Author',
  'Read Time',
  'Status',
  'Is Featured',
  'Order'
];

/**
 * Handle GET Requests — Fetches posts with live featured spotlight & custom order
 */
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(BLOG_SHEET_NAME) || ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return createResponse(true, 'No posts found', { posts: [], featuredPostId: null, orderedIds: [] });
    }
    
    // Read raw posts from sheet
    let posts = data.slice(1).map((row, index) => {
      const isFeaturedVal = row[10];
      const isFeatured = (isFeaturedVal === true || String(isFeaturedVal).toLowerCase() === 'true' || String(isFeaturedVal).toLowerCase() === 'yes');
      const orderVal = parseInt(row[11]);
      const order = !isNaN(orderVal) ? orderVal : (index + 1);
      
      return {
        id: row[0] ? String(row[0]).trim() : ('post_' + (index + 1)),
        timestamp: row[1] ? (row[1] instanceof Date ? row[1].toISOString() : String(row[1])) : new Date().toISOString(),
        title: row[2] ? String(row[2]).trim() : '',
        category: row[3] ? String(row[3]).trim() : 'General',
        excerpt: row[4] ? String(row[4]).trim() : '',
        content: row[5] ? String(row[5]).trim() : '',
        imageUrl: row[6] ? String(row[6]).trim() : '',
        author: row[7] ? String(row[7]).trim() : 'IIEC Team',
        readTime: row[8] ? String(row[8]).trim() : '5 min read',
        status: row[9] ? String(row[9]).trim() : 'Published',
        isFeatured: isFeatured,
        order: order
      };
    }).filter(post => post.title && post.status.toLowerCase() !== 'archived' && post.status.toLowerCase() !== 'draft');
    
    // Read saved configuration from _config tab
    const config = readConfig(ss);
    let featuredPostId = config.featuredPostId;
    
    // Fallback: If no config featuredPostId, find post with isFeatured=true
    if (!featuredPostId) {
      const marked = posts.find(p => p.isFeatured);
      if (marked) featuredPostId = marked.id;
    }
    if (!featuredPostId && posts.length > 0) {
      featuredPostId = posts[0].id;
    }
    
    // Sort posts according to config.orderedIds or post.order
    if (Array.isArray(config.orderedIds) && config.orderedIds.length > 0) {
      const postMap = new Map(posts.map(p => [p.id, p]));
      const arranged = [];
      config.orderedIds.forEach(id => {
        if (postMap.has(id)) {
          arranged.push(postMap.get(id));
          postMap.delete(id);
        }
      });
      // Append any remaining posts
      postMap.forEach(p => arranged.push(p));
      posts = arranged;
    } else {
      posts.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        posts: posts,
        featuredPostId: featuredPostId,
        orderedIds: posts.map(p => p.id)
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, message: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle POST Requests — Publish articles OR Update layout & featured settings
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(BLOG_SHEET_NAME) || ss.getSheets()[0];
    
    let data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }
    
    // ACTION 1: Update Layout & Featured Article Selection
    if (data.action === 'update_layout' || data.action === 'set_featured' || data.action === 'reorder') {
      const featuredId = data.featuredId || data.featuredPostId || null;
      const orderedIds = Array.isArray(data.orderedIds) ? data.orderedIds : [];
      
      // Save in _config sheet
      saveConfig(ss, featuredId, orderedIds);
      
      // Update Is Featured & Order columns in Sheet1
      updateSheetMetadata(sheet, featuredId, orderedIds);
      
      return createResponse(true, 'Blog layout and Featured Edition saved to Google Sheet!', {
        featuredId: featuredId,
        orderedIds: orderedIds
      });
    }
    
    // ACTION 2: Edit / Update Existing Post in Sheet1
    if (data.action === 'edit_post' || data.action === 'update_post') {
      const targetId = String(data.id || '').trim();
      if (!targetId) {
        return createResponse(false, 'Missing post ID for edit');
      }
      
      const rows = sheet.getDataRange().getValues();
      let foundRowIndex = -1;
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]).trim() === targetId) {
          foundRowIndex = i + 1; // 1-indexed row in Google Sheet
          break;
        }
      }
      
      if (foundRowIndex === -1) {
        return createResponse(false, 'Post not found in Google Sheet with ID: ' + targetId);
      }
      
      // Update fields: Title (col 3), Category (col 4), Excerpt (col 5), Content (col 6), Image URL (col 7), Author (col 8), Read Time (col 9)
      if (data.title) sheet.getRange(foundRowIndex, 3).setValue(data.title.trim());
      if (data.category) sheet.getRange(foundRowIndex, 4).setValue(data.category.trim());
      if (data.excerpt) sheet.getRange(foundRowIndex, 5).setValue(data.excerpt.trim());
      if (data.content) sheet.getRange(foundRowIndex, 6).setValue(data.content.trim());
      sheet.getRange(foundRowIndex, 7).setValue((data.imageUrl || data.image || '').trim());
      if (data.author) sheet.getRange(foundRowIndex, 8).setValue(data.author.trim());
      if (data.readTime) sheet.getRange(foundRowIndex, 9).setValue(data.readTime.trim());
      
      return createResponse(true, 'Post updated successfully in Google Sheet!', { id: targetId });
    }
    
    // ACTION 3: Publish New Post
    if (!data.title || !data.category || !data.excerpt || !data.content || !data.author) {
      return createResponse(false, 'Missing required fields');
    }
    
    const id = data.id || Utilities.getUuid();
    const isFeatured = (data.isFeatured === true || String(data.isFeatured).toLowerCase() === 'true');
    const order = 1; // Top priority by default
    
    sheet.appendRow([
      id,
      new Date().toISOString(),
      data.title.trim(),
      data.category.trim(),
      data.excerpt.trim(),
      data.content.trim(),
      (data.imageUrl || data.image || '').trim(),
      data.author.trim(),
      (data.readTime || '5 min read').trim(),
      'Published',
      isFeatured,
      order
    ]);
    
    // If newly published post is featured, update config
    if (isFeatured) {
      const currentConfig = readConfig(ss);
      const updatedOrder = [id].concat(currentConfig.orderedIds || []);
      saveConfig(ss, id, updatedOrder);
    }
    
    return createResponse(true, 'Post published successfully!', { id });
    
  } catch (error) {
    return createResponse(false, 'Server error: ' + error.message);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Standardized JSON response helper
 */
function createResponse(success, message, data = {}) {
  return ContentService
    .createTextOutput(JSON.stringify({ success, message, ...data }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Read Config from _config tab
 */
function readConfig(ss) {
  const config = { featuredPostId: null, orderedIds: [] };
  const configSheet = ss.getSheetByName(CONFIG_SHEET_NAME);
  if (!configSheet) return config;
  
  const data = configSheet.getDataRange().getValues();
  for (let i = 0; i < data.length; i++) {
    const key = String(data[i][0] || '').trim().toLowerCase();
    const val = String(data[i][1] || '').trim();
    if (key === 'featured_post_id' || key === 'featuredid') {
      config.featuredPostId = val;
    } else if (key === 'ordered_ids' || key === 'post_order') {
      try {
        config.orderedIds = JSON.parse(val);
      } catch (e) {
        config.orderedIds = val.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
  }
  return config;
}

/**
 * Save Config to _config tab
 */
function saveConfig(ss, featuredId, orderedIds) {
  let configSheet = ss.getSheetByName(CONFIG_SHEET_NAME);
  if (!configSheet) {
    configSheet = ss.insertSheet(CONFIG_SHEET_NAME);
    configSheet.appendRow(['Key', 'Value', 'Last Updated']);
    configSheet.getRange(1, 1, 1, 3).setBackground('#111111').setFontColor('#ffffff').setFontWeight('bold');
  }
  
  const now = new Date().toISOString();
  const rows = [
    ['featured_post_id', featuredId || '', now],
    ['ordered_ids', JSON.stringify(orderedIds || []), now]
  ];
  
  configSheet.getRange(2, 1, Math.max(1, configSheet.getLastRow()), 3).clearContent();
  configSheet.getRange(2, 1, rows.length, 3).setValues(rows);
}

/**
 * Update existing rows in Sheet1 for Is Featured (Col 11) and Order (Col 12)
 */
function updateSheetMetadata(sheet, featuredId, orderedIds) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return;
  
  const orderLookup = {};
  if (Array.isArray(orderedIds)) {
    orderedIds.forEach((id, idx) => {
      orderLookup[id] = idx + 1;
    });
  }
  
  for (let i = 1; i < data.length; i++) {
    const rowId = String(data[i][0] || '').trim();
    if (!rowId) continue;
    
    // Update Col 11 (Is Featured)
    const isThisFeatured = (rowId === featuredId);
    sheet.getRange(i + 1, 11).setValue(isThisFeatured);
    
    // Update Col 12 (Order)
    if (orderLookup[rowId] !== undefined) {
      sheet.getRange(i + 1, 12).setValue(orderLookup[rowId]);
    }
  }
}

/**
 * Non-Destructive Auto-Setup:
 * 1. Enhances header in Sheet1 without touching existing rows
 * 2. Populates default order & featured tags for existing rows if empty
 * 3. Builds the _config tab
 * 4. Applies styling & formatting
 */
function autoSetup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(BLOG_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.getSheets()[0];
    sheet.setName(BLOG_SHEET_NAME);
  }
  
  // 1. Check & Update Headers on Row 1
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  
  // Format Header Row
  sheet.getRange(1, 1, 1, HEADERS.length)
    .setBackground('#ff5a1f')
    .setFontColor('#ffffff')
    .setFontFamily('Inter')
    .setFontSize(10)
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
  
  sheet.setFrozenRows(1);
  
  // Set clean column widths
  sheet.setColumnWidth(1, 180); // ID
  sheet.setColumnWidth(2, 180); // Timestamp
  sheet.setColumnWidth(3, 260); // Title
  sheet.setColumnWidth(4, 140); // Category
  sheet.setColumnWidth(5, 300); // Excerpt
  sheet.setColumnWidth(6, 420); // Content
  sheet.setColumnWidth(7, 160); // Image URL
  sheet.setColumnWidth(8, 140); // Author
  sheet.setColumnWidth(9, 110); // Read Time
  sheet.setColumnWidth(10, 100); // Status
  sheet.setColumnWidth(11, 110); // Is Featured
  sheet.setColumnWidth(12, 90);  // Order
  
  // 2. Safely populate default Is Featured & Order for existing rows if blank
  const lastRow = sheet.getLastRow();
  const existingIds = [];
  
  if (lastRow > 1) {
    const data = sheet.getRange(2, 1, lastRow - 1, 12).getValues();
    for (let i = 0; i < data.length; i++) {
      const rowId = data[i][0];
      if (rowId) existingIds.push(String(rowId));
      
      // If Is Featured is empty, set first row to TRUE, others to FALSE
      if (data[i][10] === '' || data[i][10] === null || data[i][10] === undefined) {
        sheet.getRange(i + 2, 11).setValue(i === 0 ? true : false);
      }
      
      // If Order is empty, set sequential order (1, 2, 3...)
      if (data[i][11] === '' || data[i][11] === null || data[i][11] === undefined || isNaN(parseInt(data[i][11]))) {
        sheet.getRange(i + 2, 12).setValue(i + 1);
      }
    }
  }
  
  // 3. Initialize _config Tab
  let configSheet = ss.getSheetByName(CONFIG_SHEET_NAME);
  if (!configSheet) {
    configSheet = ss.insertSheet(CONFIG_SHEET_NAME);
    configSheet.appendRow(['Key', 'Value', 'Last Updated']);
    configSheet.getRange(1, 1, 1, 3).setBackground('#111111').setFontColor('#ffffff').setFontWeight('bold');
    
    const firstId = existingIds.length > 0 ? existingIds[0] : '';
    configSheet.appendRow(['featured_post_id', firstId, new Date().toISOString()]);
    configSheet.appendRow(['ordered_ids', JSON.stringify(existingIds), new Date().toISOString()]);
  }
  
  Logger.log('✅ Auto-Setup Complete! Your existing posts were 100% preserved and enhanced with Featured & Ordering capabilities.');
}
