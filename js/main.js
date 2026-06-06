import { initMap, renderPins, renderHeatPoints } from './modules/maps.js';
import { fetchTrafficIncidents, fetchCrashRecords, normalizeIncident, normalizeCrash } from './modules/api.js';
import { initFilters, matchesTimeFilter, matchesTypeFilter, activeFilter } from './modules/filter.js';

let allData = [];

// App Init
async function init() {
  console.log('CrashWatch ATX — initializing...');
  initMap();
  initFilters(applyFilters);
  await loadIncidents();
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

  applyFilters(activeFilter);
  console.log(`${allData.length} total incidents loaded`);
}

// Filter allData and push results to map + sidebar 
function applyFilters(filter) {
  const filtered = allData.filter(item =>
    matchesTimeFilter(item, filter) && matchesTypeFilter(item, filter)
  );

  renderPins(filtered);
  renderHeatPoints(filtered);
  populateList(filtered, filter);
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
}

// Show a temporary inline message for items with no GPS coordinates
function showNoGpsMessage(liEl) {
  document.querySelectorAll('.no-gps-msg').forEach(el => el.remove());

  const msg = document.createElement('li');
  msg.className = 'no-gps-msg';
  msg.textContent = '📍 No map location available for this record.';
  liEl.insertAdjacentElement('afterend', msg);

  setTimeout(() => msg.remove(), 3000);
}

// Populate sidebar incident list
function populateList(data, filter) {
  const list     = document.getElementById('incident-list');
  const headerEl = document.getElementById('incident-list-header');
  if (!list) return;

  // Only count items with a readable address
  const visible = data.filter(item => item.address && item.address !== 'Unknown location');

  if (headerEl) {
    const timeLabel = filter.time === 'custom' ? 'custom range' : filter.time;
    const typeLabel = filter.type !== 'all' ? ` ${filter.type}` : '';
    headerEl.textContent = `${visible.length}${typeLabel} incidents · ${timeLabel}`;
  }

  list.innerHTML = '';

  visible.slice(0, 50).forEach(item => {
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
