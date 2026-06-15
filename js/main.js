import { initMap, renderPins, renderHeatPoints } from './modules/maps.js';
import { fetchTrafficIncidents, fetchCrashRecords, normalizeIncident, normalizeCrash } from './modules/api.js';
import { initFilters, matchesTimeFilter, matchesTypeFilter, activeFilter } from './modules/filter.js';
import { updateStats, initDateRangeSlider } from './modules/stats.js';
import { initExport } from './modules/exports.js';
import { initCommunity, getReportsForLocation, setReportCoords, getDistanceMeters } from './modules/community.js';
import { initAutocomplete } from './modules/autocomplete.js';

let allData = [];
window._allData = allData;

// Set by the date range slider; overrides time chip filter when non-null
let customDateRange = null;

function setCustomDateRange(start, end) {
  customDateRange = (start && end) ? { start, end } : null;
}

// App Init
async function init() {
  console.log('CrashWatch ATX — initializing...');
  initMap();
  initFilters(applyFilters);
  initCommunity();

  initAutocomplete(
    document.getElementById('search-bar'),
    (place) => {
      const lat = parseFloat(place.lat);
      const lng = parseFloat(place.lon);
      window._map.setView([lat, lng], 15);
      const marker = L.marker([lat, lng])
        .addTo(window._map)
        .bindPopup(place.display_name.split(',').slice(0, 2).join(','))
        .openPopup();
      setTimeout(() => window._map.removeLayer(marker), 5000);
    }
  );

  initAutocomplete(
    document.getElementById('report-location'),
    (place) => {
      const shortName = place.display_name.split(',').slice(0, 3).join(',');
      document.getElementById('report-location').value = shortName;
      setReportCoords(parseFloat(place.lat), parseFloat(place.lon));
    }
  );
  initExport(() => allData.filter(item =>
    matchesTimeFilter(item, activeFilter) && matchesTypeFilter(item, activeFilter)
  ));
  await loadIncidents();
  initDateRangeSlider(
    () => allData,
    applyFilters,
    populateList,
    (items) => renderPins(items, openDetail),
    renderHeatPoints,
    updateStats,
    setCustomDateRange
  );
  setInterval(loadIncidents, 5 * 60 * 1000);
}

// Apply current filters
async function loadIncidents() {
  console.log('Fetching incident data...');

  const [trafficData, crashData] = await Promise.all([
    fetchTrafficIncidents(),
    fetchCrashRecords()
  ]);

  allData = [
    ...trafficData.map(normalizeIncident),
    ...crashData.map(normalizeCrash)
  ];

  window._allData = allData; // Expose for debugging

  applyFilters(activeFilter);
  console.log(`${allData.length} total incidents loaded`);
}

// Filter allData and push results to map + sidebar
function applyFilters(filter) {
  // A time chip click (any value except 'custom') always resets the slider range
  if (filter.time !== 'custom') {
    customDateRange = null;
  }

  const filtered = allData.filter(item => {
    if (customDateRange) {
      const ts = item.published || item.date;
      if (!ts) return false;
      const d = new Date(ts);
      return d >= customDateRange.start && d <= customDateRange.end && matchesTypeFilter(item, filter);
    }
    return matchesTimeFilter(item, filter) && matchesTypeFilter(item, filter);
  });

  renderPins(filtered, openDetail);
  renderHeatPoints(filtered);
  populateList(filtered, filter);
  updateStats(filtered);
}

// Open detail panel 
function openDetail(item, liEl) {
  document.querySelectorAll('.incident-item.selected').forEach(el => el.classList.remove('selected'));
  liEl?.classList.add('selected');

  const panel   = document.getElementById('detail-panel');
  const titleEl = document.getElementById('detail-title');
  const metaEl  = document.getElementById('detail-meta');
  if (!panel || !titleEl || !metaEl) return;

  const ts = item.published || item.date;
  const dateStr = ts
    ? new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

  titleEl.textContent = item.address || 'Unknown location';

  const parts = [
    item.severity?.toUpperCase(),  
    item.type,                     
    dateStr,
    item.source === 'crash' && item.deaths > 0  ? `${item.deaths} death${item.deaths !== 1 ? 's' : ''}` : null,
    item.source === 'crash' && item.injuries > 0 ? `${item.injuries} injur${item.injuries !== 1 ? 'ies' : 'y'}` : null,
    item.source === 'traffic' ? item.status : null
  ].filter(Boolean);

  metaEl.textContent = parts.join(' · ');
  panel.style.display = 'block';

  // Street-level imagery
  const streetViewEl = document.getElementById('street-view');
  if (streetViewEl) {
    streetViewEl.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--color-text-muted);font-size:11px;">
        Street-level imagery coming soon Layer two of the map will include recent photos from this location, sourced from public APIs. Stay tuned!
      </div>`;
  }

  // Community reports — GPS proximity or address fallback
  const commentsEl = document.getElementById('detail-comments');
  if (commentsEl) {
    const reports = getReportsForLocation(item.lat, item.lng, item.address);
    if (reports.length > 0) {
      commentsEl.innerHTML = `
        <div class="community-section-label">
          ${reports.length} community report${reports.length !== 1 ? 's' : ''} nearby
        </div>
        ${reports.map(r => `
          <div class="community-report">
            <div class="report-header">
              <span class="report-author">${r.author}</span>
              <span class="report-time">
                ${new Date(r.submitted).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <div class="report-comment">${r.comment}</div>
            ${r.lat && item.lat ? `
              <div class="report-distance">
                📍 ${Math.round(getDistanceMeters(item.lat, item.lng, r.lat, r.lng))}m from this incident
              </div>
            ` : ''}
            ${r.photo ? `
              <div class="report-photo-wrapper">
                <img src="${r.photo}" alt="Photo by ${r.author}" class="report-photo" onerror="this.style.display='none'">
              </div>
            ` : ''}
          </div>
        `).join('')}
      `;
    } else {
      commentsEl.innerHTML = '<p class="no-reports">No community reports near this location yet.</p>';
    }
  }

  // Related news placeholder
  const newsEl = document.getElementById('detail-news');
  if (newsEl) newsEl.innerHTML = '';
}

// Show a temporary inline message for items with no GPS coordinates
function showNoGpsMessage(liEl) {
  document.querySelectorAll('.no-gps-msg').forEach(el => el.remove());

  const msg = document.createElement('li');
  msg.className = 'no-gps-msg';
  msg.textContent = 'No map location available for this record.';
  liEl.insertAdjacentElement('afterend', msg);

  setTimeout(() => msg.remove(), 3000);
}

// Populate sidebar incident list
function populateList(data, filter) {
  const list     = document.getElementById('incident-list');
  const headerEl = document.getElementById('incident-list-header');
  if (!list) return;

  // Only count items with a readable address, sorted newest first
  const visible = data
    .filter(item => item.address && item.address !== 'Unknown location')
    .sort((a, b) => {
      const ta = new Date(a.published || a.date || 0).getTime();
      const tb = new Date(b.published || b.date || 0).getTime();
      return tb - ta;
    });

  if (headerEl) {
    const timeLabel = filter.time === 'custom' ? 'custom range' : filter.time;
    const typeLabel = filter.type !== 'all' ? ` ${filter.type}` : '';
    headerEl.textContent = `${visible.length}${typeLabel} incidents · ${timeLabel}`;
  }

  list.innerHTML = '';

  visible.forEach(item => {
    const severity    = item.severity || 'unknown';
    const noGps       = !item.lat;
    const ts          = item.published || item.date;
    const dateLabel   = ts
      ? new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '—';
    const sourceLabel = item.source === 'crash' ? 'Crash Record' : 'Live Incident';
    const noGpsBadge  = noGps ? `<span class="no-gps-badge">No GPS</span>` : '';

    const li = document.createElement('li');
    li.className = 'incident-item';
    li.innerHTML = `
      <div class="incident-dot ${severity}"></div>
      <div class="incident-info">
        <div class="incident-location">${item.address}</div>
        <div class="incident-meta">${dateLabel} · ${sourceLabel}</div>
      </div>
      <div class="badge-stack">
        <div class="badge ${severity}">${severity.charAt(0).toUpperCase() + severity.slice(1)}</div>
        ${noGpsBadge}
        <div class="badge-sub">${item.type}</div>
      </div>
    `;

    li.addEventListener('click', () => {
      if (noGps) {
        showNoGpsMessage(li);
      } else {
        openDetail(item, li);
      }
    });

    list.appendChild(li);
  });
}

document.addEventListener('DOMContentLoaded', () => { init(); });
