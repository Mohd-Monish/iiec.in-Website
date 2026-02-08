/**
 * IIEC Analytics Dashboard — GA4 Data API Integration
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a project (or use existing)
 * 3. Enable "Google Analytics Data API"
 * 4. Go to Credentials → Create OAuth 2.0 Client ID (Web application)
 * 5. Add your domain (https://iiec.in) to Authorized JavaScript Origins
 * 6. Copy the Client ID and paste it below
 * 7. Get your GA4 Property ID from GA4 → Admin → Property Settings
 * 8. Paste the Property ID below
 */
(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════
  //  CONFIGURATION — UPDATE THESE VALUES
  // ═══════════════════════════════════════════════════════════
  const CONFIG = {
    GA4_PROPERTY_ID: '523722289',
    OAUTH_CLIENT_ID: '146875268755-d86b6d97g3lhdd8t43ulb7s8l1lskfva.apps.googleusercontent.com',
    SCOPES: 'https://www.googleapis.com/auth/analytics.readonly',
    API_BASE: 'https://analyticsdata.googleapis.com/v1beta'
  };

  // ═══════════════════════════════════════════════════════════
  //  STATE
  // ═══════════════════════════════════════════════════════════
  let accessToken = null;
  let currentPeriod = 'today';
  let tokenClient = null;

  // Date range mappings
  const DATE_RANGES = {
    today:  { startDate: 'today', endDate: 'today', compareStart: 'yesterday', compareEnd: 'yesterday' },
    '7d':   { startDate: '7daysAgo', endDate: 'today', compareStart: '14daysAgo', compareEnd: '8daysAgo' },
    '30d':  { startDate: '30daysAgo', endDate: 'today', compareStart: '60daysAgo', compareEnd: '31daysAgo' },
    '90d':  { startDate: '90daysAgo', endDate: 'today', compareStart: '180daysAgo', compareEnd: '91daysAgo' }
  };

  // ═══════════════════════════════════════════════════════════
  //  INITIALIZATION
  // ═══════════════════════════════════════════════════════════
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    setupFilterButtons();
    setupRefreshButton();
    checkConfig();
  }

  function checkConfig() {
    if (CONFIG.GA4_PROPERTY_ID === 'YOUR_GA4_PROPERTY_ID' || CONFIG.OAUTH_CLIENT_ID === 'YOUR_OAUTH_CLIENT_ID') {
      showSetupMessage();
      return;
    }
    loadGIS();
  }

  // ═══════════════════════════════════════════════════════════
  //  GOOGLE IDENTITY SERVICES (OAuth 2.0)
  // ═══════════════════════════════════════════════════════════
  function loadGIS() {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initializeGIS;
    script.onerror = () => showError('Failed to load Google Identity Services');
    document.head.appendChild(script);
  }

  function initializeGIS() {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.OAUTH_CLIENT_ID,
      scope: CONFIG.SCOPES,
      callback: handleTokenResponse
    });
    showSignInButton();
  }

  function handleTokenResponse(response) {
    if (response.error) {
      showError('Authentication failed: ' + response.error);
      return;
    }
    accessToken = response.access_token;
    hideNoDataMessage();
    fetchAllData();
    renderTrafficChart();
  }

  function requestAccess() {
    if (tokenClient) {
      tokenClient.requestAccessToken();
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  GA4 DATA API — FETCH
  // ═══════════════════════════════════════════════════════════
  async function ga4Request(body) {
    const url = `${CONFIG.API_BASE}/properties/${CONFIG.GA4_PROPERTY_ID}:runReport`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (res.status === 401) {
      accessToken = null;
      showSignInButton();
      throw new Error('Token expired');
    }
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'API request failed');
    }
    return res.json();
  }

  async function fetchAllData() {
    const range = DATE_RANGES[currentPeriod];
    showLoading(true);

    try {
      const [overview, pages, sources, devices, geo, realtime] = await Promise.all([
        fetchOverview(range),
        fetchTopPages(range),
        fetchTrafficSources(range),
        fetchDevices(range),
        fetchGeoData(range),
        fetchRealtimeUsers()
      ]);

      renderOverview(overview);
      renderTopPages(pages);
      renderTrafficSources(sources);
      renderDevices(devices);
      renderGeoData(geo);
      renderRealtime(realtime);
    } catch (err) {
      console.error('Analytics fetch error:', err);
      if (err.message !== 'Token expired') {
        showError('Failed to load analytics: ' + err.message);
      }
    } finally {
      showLoading(false);
    }
  }

  function fetchOverview(range) {
    return ga4Request({
      dateRanges: [
        { startDate: range.startDate, endDate: range.endDate },
        { startDate: range.compareStart, endDate: range.compareEnd }
      ],
      metrics: [
        { name: 'totalUsers' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' }
      ]
    });
  }

  function fetchTopPages(range) {
    return ga4Request({
      dateRanges: [{ startDate: range.startDate, endDate: range.endDate }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 8
    });
  }

  function fetchTrafficSources(range) {
    return ga4Request({
      dateRanges: [{ startDate: range.startDate, endDate: range.endDate }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'totalUsers' }],
      orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
      limit: 6
    });
  }

  function fetchDevices(range) {
    return ga4Request({
      dateRanges: [{ startDate: range.startDate, endDate: range.endDate }],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [{ name: 'totalUsers' }],
      orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }]
    });
  }

  function fetchGeoData(range) {
    return ga4Request({
      dateRanges: [{ startDate: range.startDate, endDate: range.endDate }],
      dimensions: [{ name: 'country' }],
      metrics: [{ name: 'totalUsers' }],
      orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
      limit: 8
    });
  }

  async function fetchRealtimeUsers() {
    const url = `${CONFIG.API_BASE}/properties/${CONFIG.GA4_PROPERTY_ID}:runRealtimeReport`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ metrics: [{ name: 'activeUsers' }] })
    });
    if (!res.ok) return null;
    return res.json();
  }

  async function fetchTrafficOverTime(range) {
    return ga4Request({
      dateRanges: [{ startDate: range.startDate, endDate: range.endDate }],
      dimensions: [{ name: 'date' }],
      metrics: [
        { name: 'totalUsers' },
        { name: 'screenPageViews' }
      ],
      orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }]
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  RENDER FUNCTIONS
  // ═══════════════════════════════════════════════════════════

  function renderOverview(data) {
    if (!data?.rows?.length) return;

    const current = data.rows[0].metricValues;
    const previous = data.rows[1]?.metricValues;

    const visitors = parseInt(current[0].value) || 0;
    setText('total-visitors', formatNumber(visitors));
    if (previous) renderChange('visitors-change', visitors, parseInt(previous[0].value) || 0);

    const views = parseInt(current[1].value) || 0;
    setText('page-views', formatNumber(views));
    if (previous) renderChange('views-change', views, parseInt(previous[1].value) || 0);

    const duration = parseFloat(current[2].value) || 0;
    setText('avg-duration', formatDuration(duration));
    if (previous) renderChange('duration-change', duration, parseFloat(previous[2].value) || 0);

    const bounce = parseFloat(current[3].value) || 0;
    setText('bounce-rate', (bounce * 100).toFixed(1) + '%');
    if (previous) renderChange('bounce-change', bounce, parseFloat(previous[3].value) || 0, true);
  }

  function renderChange(id, current, previous, invertColors) {
    const el = document.getElementById(id);
    if (!el) return;

    let pct = previous > 0 ? ((current - previous) / previous) * 100 : (current > 0 ? 100 : 0);
    const isUp = pct >= 0;
    const isPositive = invertColors ? !isUp : isUp;

    el.className = `card-change ${isPositive ? 'positive' : 'negative'}`;
    const svg = isUp
      ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />'
      : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />';

    el.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">${svg}</svg>
      <span>${isUp ? '+' : ''}${pct.toFixed(1)}%</span>
    `;
  }

  function renderTopPages(data) {
    const tbody = document.getElementById('top-pages-table');
    if (!tbody || !data?.rows?.length) return;

    const totalViews = data.rows.reduce((sum, r) => sum + parseInt(r.metricValues[0].value), 0);

    tbody.innerHTML = data.rows.map(row => {
      const path = row.dimensionValues[0].value;
      const views = parseInt(row.metricValues[0].value);
      const pct = totalViews > 0 ? (views / totalViews) * 100 : 0;
      return `
        <tr>
          <td><span class="page-path">${escapeHtml(path)}</span></td>
          <td>${formatNumber(views)}</td>
          <td>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${pct.toFixed(1)}%"></div>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderTrafficSources(data) {
    const tbody = document.getElementById('traffic-sources-table');
    if (!tbody || !data?.rows?.length) return;

    const totalUsers = data.rows.reduce((sum, r) => sum + parseInt(r.metricValues[0].value), 0);

    tbody.innerHTML = data.rows.map(row => {
      const source = row.dimensionValues[0].value;
      const users = parseInt(row.metricValues[0].value);
      const pct = totalUsers > 0 ? (users / totalUsers) * 100 : 0;
      return `
        <tr>
          <td>${escapeHtml(source)}</td>
          <td>${formatNumber(users)}</td>
          <td>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${pct.toFixed(1)}%"></div>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderDevices(data) {
    const container = document.getElementById('device-chart');
    if (!container || !data?.rows?.length) return;

    const total = data.rows.reduce((sum, r) => sum + parseInt(r.metricValues[0].value), 0);
    const colors = { desktop: '#c8a96e', mobile: '#6ec8a8', tablet: '#6ea8c8' };

    let cumulativePct = 0;
    const segments = data.rows.map(row => {
      const category = row.dimensionValues[0].value.toLowerCase();
      const users = parseInt(row.metricValues[0].value);
      const pct = total > 0 ? (users / total) * 100 : 0;
      const start = cumulativePct;
      cumulativePct += pct;
      return { category, users, pct, start, color: colors[category] || '#888' };
    });

    const gradientStops = segments.map(s =>
      `${s.color} ${s.start}% ${s.start + s.pct}%`
    ).join(', ');

    container.innerHTML = `
      <div class="device-breakdown">
        <div class="donut-chart" style="background: conic-gradient(${gradientStops});">
          <div class="donut-hole">
            <span class="donut-total">${formatNumber(total)}</span>
            <span class="donut-label">Users</span>
          </div>
        </div>
        <div class="device-legend">
          ${segments.map(s => `
            <div class="legend-item">
              <span class="legend-dot" style="background: ${s.color}"></span>
              <span class="legend-name">${capitalize(s.category)}</span>
              <span class="legend-value">${s.pct.toFixed(1)}%</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderGeoData(data) {
    const container = document.getElementById('geo-chart');
    if (!container || !data?.rows?.length) return;

    const total = data.rows.reduce((sum, r) => sum + parseInt(r.metricValues[0].value), 0);

    container.innerHTML = `
      <div class="geo-list">
        ${data.rows.map((row, i) => {
          const country = row.dimensionValues[0].value;
          const users = parseInt(row.metricValues[0].value);
          const pct = total > 0 ? (users / total) * 100 : 0;
          return `
            <div class="geo-item">
              <div class="geo-rank">${i + 1}</div>
              <div class="geo-info">
                <span class="geo-country">${escapeHtml(country)}</span>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${pct.toFixed(1)}%"></div>
                </div>
              </div>
              <span class="geo-value">${formatNumber(users)}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderRealtime(data) {
    const indicator = document.querySelector('.realtime-indicator');
    if (!indicator || !data) return;

    const active = data.rows?.[0]?.metricValues?.[0]?.value || '0';
    indicator.innerHTML = `
      <span class="realtime-dot"></span>
      <span>${active} active now</span>
    `;
  }

  async function renderTrafficChart() {
    const range = DATE_RANGES[currentPeriod];
    if (!accessToken) return;

    try {
      const data = await fetchTrafficOverTime(range);
      if (!data?.rows?.length) return;

      const container = document.getElementById('traffic-chart');
      if (!container) return;

      const points = data.rows.map(row => ({
        date: row.dimensionValues[0].value,
        users: parseInt(row.metricValues[0].value),
        views: parseInt(row.metricValues[1].value)
      }));

      if (points.length < 2) {
        container.innerHTML = '<div class="chart-placeholder-content"><p>Not enough data for the selected period</p></div>';
        return;
      }

      const maxVal = Math.max(...points.map(p => Math.max(p.users, p.views)), 1);
      const w = 800, h = 300, pad = 40;
      const stepX = (w - pad * 2) / (points.length - 1);

      function toY(val) { return h - pad - ((val / maxVal) * (h - pad * 2)); }

      function polyline(key, color) {
        const pts = points.map((p, i) => `${pad + i * stepX},${toY(p[key])}`).join(' ');
        return `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
      }

      let gridLines = '';
      for (let i = 0; i <= 4; i++) {
        const y = pad + (i / 4) * (h - pad * 2);
        const val = Math.round(maxVal - (i / 4) * maxVal);
        gridLines += `<line x1="${pad}" y1="${y}" x2="${w - pad}" y2="${y}" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>`;
        gridLines += `<text x="${pad - 8}" y="${y + 4}" fill="rgba(255,255,255,0.4)" font-size="11" text-anchor="end">${formatNumber(val)}</text>`;
      }

      let xLabels = '';
      const labelStep = Math.max(1, Math.floor(points.length / 6));
      points.forEach((p, i) => {
        if (i % labelStep === 0 || i === points.length - 1) {
          const label = formatDateLabel(p.date);
          xLabels += `<text x="${pad + i * stepX}" y="${h - 8}" fill="rgba(255,255,255,0.4)" font-size="11" text-anchor="middle">${label}</text>`;
        }
      });

      container.innerHTML = `
        <svg viewBox="0 0 ${w} ${h}" class="traffic-svg" preserveAspectRatio="xMidYMid meet">
          ${gridLines}
          ${xLabels}
          ${polyline('views', 'rgba(200, 169, 110, 0.5)')}
          ${polyline('users', '#c8a96e')}
        </svg>
        <div class="chart-legend">
          <span class="chart-legend-item"><span class="legend-dot" style="background:#c8a96e"></span> Users</span>
          <span class="chart-legend-item"><span class="legend-dot" style="background:rgba(200,169,110,0.5)"></span> Page Views</span>
        </div>
      `;
    } catch (err) {
      console.error('Traffic chart error:', err);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  UI HELPERS
  // ═══════════════════════════════════════════════════════════

  function showSignInButton() {
    const notice = document.querySelector('.no-data-message');
    if (!notice) return;
    notice.style.display = '';

    notice.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 64px; height: 64px; margin: 0 auto 1rem; display: block; opacity: 0.5;">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
      </svg>
      <h3 style="font-size: 1.25rem; color: var(--text-primary); margin-bottom: 0.5rem;">Sign in to View Analytics</h3>
      <p style="max-width: 500px; margin: 0 auto 1.5rem;">
        Sign in with your Google account (the one that owns the GA4 property) to view live analytics data.
      </p>
      <div class="connect-analytics">
        <button class="btn btn-primary" id="ga-sign-in-btn">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" style="margin-right: 8px;">
            <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>Sign in with Google</span>
        </button>
      </div>
    `;

    document.getElementById('ga-sign-in-btn')?.addEventListener('click', requestAccess);
  }

  function hideNoDataMessage() {
    const notice = document.querySelector('.no-data-message');
    if (notice) notice.style.display = 'none';
  }

  function showSetupMessage() {
    const notice = document.querySelector('.no-data-message');
    if (!notice) return;

    notice.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 64px; height: 64px; margin: 0 auto 1rem; display: block; opacity: 0.5;">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
      <h3 style="font-size: 1.25rem; color: var(--text-primary); margin-bottom: 0.5rem;">Setup Required</h3>
      <p style="max-width: 560px; margin: 0 auto 1rem;">
        To display live analytics, open <code style="background: rgba(200,169,110,0.15); padding: 2px 6px; border-radius: 4px; color: #c8a96e;">js/analytics.js</code> and set your <strong>GA4 Property ID</strong> and <strong>OAuth Client ID</strong>.
      </p>
      <ol style="text-align: left; max-width: 520px; margin: 0 auto 1.5rem; line-height: 2; color: var(--text-secondary);">
        <li>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener" style="color: #c8a96e;">Google Cloud Console</a></li>
        <li>Enable the <strong>Google Analytics Data API</strong></li>
        <li>Create an <strong>OAuth 2.0 Client ID</strong> (Web application)</li>
        <li>Add <code style="background: rgba(200,169,110,0.15); padding: 2px 6px; border-radius: 4px; color: #c8a96e;">https://iiec.in</code> to Authorized JavaScript Origins</li>
        <li>Copy the Client ID & your GA4 Property ID into <code style="background: rgba(200,169,110,0.15); padding: 2px 6px; border-radius: 4px; color: #c8a96e;">js/analytics.js</code></li>
      </ol>
      <div class="connect-analytics">
        <a href="https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com" target="_blank" rel="noopener" class="btn btn-primary">
          <span>Open Google Cloud Console</span>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
          </svg>
        </a>
      </div>
    `;
  }

  function showError(msg) {
    const notice = document.querySelector('.no-data-message');
    if (!notice) return;
    notice.style.display = '';
    notice.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 64px; height: 64px; margin: 0 auto 1rem; display: block; opacity: 0.5; color: #e74c3c;">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"/>
      </svg>
      <h3 style="font-size: 1.25rem; color: var(--text-primary); margin-bottom: 0.5rem;">Error</h3>
      <p style="max-width: 500px; margin: 0 auto;">${escapeHtml(msg)}</p>
      <div class="connect-analytics" style="margin-top: 1rem;">
        <button class="btn btn-primary" onclick="location.reload()"><span>Retry</span></button>
      </div>
    `;
  }

  function showLoading(show) {
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) refreshBtn.classList.toggle('loading', show);
    document.querySelectorAll('.analytics-card .card-value').forEach(el => {
      el.classList.toggle('loading-pulse', show);
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════

  function setupFilterButtons() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', function () {
        filterBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentPeriod = this.dataset.period;
        if (accessToken) {
          fetchAllData();
          renderTrafficChart();
        }
      });
    });
  }

  function setupRefreshButton() {
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', function () {
        if (accessToken) {
          fetchAllData();
          renderTrafficChart();
        } else if (tokenClient) {
          requestAccess();
        }
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  UTILITIES
  // ═══════════════════════════════════════════════════════════

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function formatNumber(n) {
    return Number(n).toLocaleString('en-IN');
  }

  function formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
  }

  function formatDateLabel(dateStr) {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    const month = parseInt(dateStr.substring(4, 6));
    const day = parseInt(dateStr.substring(6, 8));
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[month - 1]} ${day}`;
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

})();
