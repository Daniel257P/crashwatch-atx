let map;
let pinsLayer;
let isHeatMap = true; 

const BOUNDS = { minLat: 30.0, maxLat: 30.6, minLng: -98.1, maxLng: -97.4 };

const heatLayers = { crash: null, hazard: null, other: null };
const heatPoints = { crash: [], hazard: [], other: [] };

function inBounds(lat, lng) {
  return lat >= BOUNDS.minLat && lat <= BOUNDS.maxLat &&
         lng >= BOUNDS.minLng && lng <= BOUNDS.maxLng;
}

// Initialize Map 
export function initMap() {
  map = L.map('map', { center: [30.2672, -97.7431], zoom: 12 });
  window._map = map;

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);

  //Heat mode as the default
  pinsLayer = L.layerGroup();

  setTimeout(() => {
    document.getElementById('btn-heatmap')?.addEventListener('click', () => {
      isHeatMap = true;
      setActiveChip('btn-heatmap', 'btn-pins');
      if (map.hasLayer(pinsLayer)) map.removeLayer(pinsLayer);
      rebuildHeatLayers();
    });

    document.getElementById('btn-pins')?.addEventListener('click', () => {
      isHeatMap = false;
      setActiveChip('btn-pins', 'btn-heatmap');
      removeAllHeatLayers();
      if (!map.hasLayer(pinsLayer)) map.addLayer(pinsLayer);
    });

    document.getElementById('detail-close')?.addEventListener('click', () => {
      document.getElementById('detail-panel').style.display = 'none';
    });
  }, 100);
}

// Render pins for the given filtered items
export function renderPins(items) {
  pinsLayer.clearLayers();

  const colors = {
    crash: '#DC2626', hazard: '#D97706', other: '#1A56DB', unknown: '#6B7280'
  };

  items.forEach(item => {
    if (!item.lat || !item.lng || !inBounds(item.lat, item.lng)) return;
    const color = colors[item.severity] || colors.unknown;

    const marker = L.circleMarker([item.lat, item.lng], {
      radius: 7,
      fillColor: color,
      color: '#ffffff',
      weight: 1.5,
      opacity: 1,
      fillOpacity: 0.9
    });

    marker.bindTooltip(item.address || 'Incident', { permanent: false, direction: 'top' });
    marker.on('click', () => showDetailPanel(item.address, item.severity, item.lat, item.lng));
    pinsLayer.addLayer(marker);
  });

  if (isHeatMap) {
    if (map.hasLayer(pinsLayer)) map.removeLayer(pinsLayer);
  } else {
    if (!map.hasLayer(pinsLayer)) map.addLayer(pinsLayer);
  }
}

// Recalculate heat points from filtered items
export function renderHeatPoints(items) {
  heatPoints.crash  = [];
  heatPoints.hazard = [];
  heatPoints.other  = [];

  items.forEach(item => {
    if (!item.lat || !item.lng || !inBounds(item.lat, item.lng)) return;
    const key = item.severity in heatPoints ? item.severity : 'property';
    heatPoints[key].push([item.lat, item.lng, 1.0]);
  });

  if (isHeatMap) rebuildHeatLayers();
}

//Rebuild heat layers from current heatPoints
function rebuildHeatLayers() {
  removeAllHeatLayers();

  const configs = {
    crash: {
      gradient: { 0.0: '#FEE2E2', 0.4: '#FCA5A5', 0.7: '#EF4444', 1.0: '#DC2626' },
      radius: 50, blur: 40, max: 0.1, minOpacity: 0.5
    },
    hazard: {
      gradient: { 0.0: '#FEF3C7', 0.4: '#FCD34D', 0.7: '#F59E0B', 1.0: '#D97706' },
      radius: 50, blur: 40, max: 0.1, minOpacity: 0.5
    },
    other: {
      gradient: { 0.0: '#DBEAFE', 0.4: '#93C5FD', 0.7: '#3B82F6', 1.0: '#1A56DB' },
      radius: 50, blur: 40, max: 0.1, minOpacity: 0.5
    }
  };

  Object.keys(heatPoints).forEach(sev => {
    const pts = heatPoints[sev];
    if (pts.length > 0 && typeof L.heatLayer === 'function') {
      heatLayers[sev] = L.heatLayer(pts, configs[sev]).addTo(map);
    }
  });
}

//Remove all active heat layers from map
function removeAllHeatLayers() {
  Object.keys(heatLayers).forEach(sev => {
    if (heatLayers[sev]) {
      map.removeLayer(heatLayers[sev]);
      heatLayers[sev] = null;
    }
  });
}

//Detail panel
function showDetailPanel(title, severity, lat, lng) {
  const panel   = document.getElementById('detail-panel');
  const titleEl = document.getElementById('detail-title');
  const metaEl  = document.getElementById('detail-meta');
  if (panel && titleEl && metaEl) {
    titleEl.textContent = title || 'Unknown location';
    metaEl.textContent  = `${severity?.toUpperCase()} · Lat: ${lat?.toFixed(4)} · Lng: ${lng?.toFixed(4)}`;
    panel.style.display = 'block';
  }
}

function setActiveChip(activeId, inactiveId) {
  document.getElementById(activeId)?.classList.add('active');
  document.getElementById(inactiveId)?.classList.remove('active');
}
