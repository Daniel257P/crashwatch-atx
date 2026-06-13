// Stats & Visualization Module
import { activeFilter } from './filter.js';

// (chip filter or slider range)
export function updateStats(filteredData) {
  const now = new Date();

  const today = filteredData.filter(item => {
    const ts = item.published || item.date;
    if (!ts) return false;
    return new Date(ts).toDateString() === now.toDateString();
  });

  const thisMonth = filteredData.filter(item => {
    const ts = item.published || item.date;
    if (!ts) return false;
    const d = new Date(ts);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  // Casualties: crash records with any deaths or injuries in the filtered set
  const withCasualties = filteredData.filter(item => item.deaths > 0 || item.injuries > 0);

  setCard('stat-today', today.length);
  setCard('stat-fatal', withCasualties.length);
  setCard('stat-month', thisMonth.length);
  setCard('stat-ytd',   filteredData.length);

  renderCrashTypeChart(filteredData);
  renderPeakHoursChart(filteredData);
}

// Helper: Set Stat Card
function setCard(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// Crash Type Chart
function renderCrashTypeChart(data) {
  const container = document.getElementById('chart-types');
  if (!container) return;

  // Count by type
  const counts = {};
  data.forEach(item => {
    const type = item.type || 'Unknown';
    counts[type] = (counts[type] || 0) + 1;
  });

  // Sort by count descending, take top 6
  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const max = sorted[0]?.[1] || 1;

  container.innerHTML = sorted.map(([type, count]) => {
    const pct = Math.round((count / max) * 100);
    const total = data.length;
    const share = Math.round((count / total) * 100);
    return `
      <div class="bar-row">
        <div class="bar-label">${formatType(type)}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${pct}%; background: var(--color-primary);"></div>
        </div>
        <div class="bar-val">${share}%</div>
      </div>
    `;
  }).join('');
}

//Peak Hours Chart
function renderPeakHoursChart(data) {
  const container = document.getElementById('chart-hours');
  if (!container) return;

  // Incidents by hour bucket
  const buckets = {
    'Early AM (12–5)':  { hours: [0,1,2,3,4],    count: 0 },
    'Morning (6–9)':    { hours: [5,6,7,8],       count: 0 },
    'Midday (10–13)':   { hours: [9,10,11,12],    count: 0 },
    'Afternoon (14–17)':{ hours: [13,14,15,16],   count: 0 },
    'Evening (18–21)':  { hours: [17,18,19,20],   count: 0 },
    'Night (22–23)':    { hours: [21,22,23],       count: 0 },
  };

  data.forEach(item => {
    const ts = item.published || item.date;
    if (!ts) return;
    const hour = new Date(ts).getHours();
    Object.values(buckets).forEach(bucket => {
      if (bucket.hours.includes(hour)) bucket.count++;
    });
  });

  const entries = Object.entries(buckets);
  const max = Math.max(...entries.map(([, b]) => b.count)) || 1;

  const colors = {
    'Early AM (12–5)':   '#1A56DB',
    'Morning (6–9)':     '#D97706',
    'Midday (10–13)':    '#16A34A',
    'Afternoon (14–17)': '#DC2626',
    'Evening (18–21)':   '#DC2626',
    'Night (22–23)':     '#1A56DB',
  };

  container.innerHTML = entries.map(([label, bucket]) => {
    const pct = Math.round((bucket.count / max) * 100);
    return `
      <div class="bar-row">
        <div class="bar-label">${label}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${pct}%; background:${colors[label]};"></div>
        </div>
        <div class="bar-val">${bucket.count}</div>
      </div>
    `;
  }).join('');
}

// Format Type Label
function formatType(type) {
  return type.length > 22 ? type.slice(0, 20) + '…' : type;
}

//Build unique sorted date list from data for slider range
function getAvailableDates(data) {
  const dateSet = new Set();
  data.forEach(item => {
    const ts = item.published || item.date;
    if (!ts) return;
    const d = new Date(ts);
    if (!isNaN(d)) dateSet.add(d.toDateString());
  });
  return [...dateSet]
    .map(s => new Date(s))
    .sort((a, b) => a - b);
}

// Date Range Slider 
// setCustomDateRange(start, end)
export function initDateRangeSlider(getData, applyFilters, populateList, renderPins, renderHeatPoints, updateStats, setCustomDateRange) {
  const startSlider = document.getElementById('range-start');
  const endSlider   = document.getElementById('range-end');
  const startLabel  = document.getElementById('range-start-label');
  const endLabel    = document.getElementById('range-end-label');
  const fill        = document.getElementById('range-fill');
  const resetBtn    = document.getElementById('btn-reset-range');

  if (!startSlider || !endSlider) return;

  let availableDates = [];

  function initRange() {
    availableDates = getAvailableDates(getData());
    if (availableDates.length === 0) return;

    const max = availableDates.length - 1;
    startSlider.min   = 0;
    startSlider.max   = max;
    startSlider.value = 0;
    endSlider.min     = 0;
    endSlider.max     = max;
    endSlider.value   = max;

    updateLabels();
    updateFill();
  }

  function fmt(date) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function updateLabels() {
    const startDate = availableDates[parseInt(startSlider.value)];
    const endDate   = availableDates[parseInt(endSlider.value)];
    if (startLabel && startDate) startLabel.textContent = fmt(startDate);
    if (endLabel   && endDate)   endLabel.textContent   = fmt(endDate);
  }

  function updateFill() {
    if (!fill) return;
    const max = availableDates.length - 1 || 1;
    const s = (parseInt(startSlider.value) / max) * 100;
    const e = (parseInt(endSlider.value)   / max) * 100;
    fill.style.left  = s + '%';
    fill.style.width = (e - s) + '%';
  }

  function onSliderChange() {
    if (availableDates.length === 0) return;

    const startDate = availableDates[parseInt(startSlider.value)];
    const endDate   = availableDates[parseInt(endSlider.value)];
    if (!startDate || !endDate) return;

    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    updateLabels();
    updateFill();

    // Deactivate time chips, activate "custom" to signal slider is in control
    document.querySelectorAll('[data-time]').forEach(c => c.classList.remove('active'));
    document.querySelector('[data-time="custom"]')?.classList.add('active');

    // Keep activeFilter in sync so applyFilters knows slider is active
    activeFilter.time = 'custom';

    setCustomDateRange(startDate, endOfDay);
    applyFilters(activeFilter);
  }

  startSlider.addEventListener('input', () => {
    const s = parseInt(startSlider.value);
    const e = parseInt(endSlider.value);
    if (s >= e) startSlider.value = String(Math.max(0, e - 1));
    onSliderChange();
  });

  endSlider.addEventListener('input', () => {
    const s = parseInt(startSlider.value);
    const e = parseInt(endSlider.value);
    if (e <= s) endSlider.value = String(Math.min(availableDates.length - 1, s + 1));
    onSliderChange();
  });

  resetBtn?.addEventListener('click', () => {
    const max = availableDates.length - 1;
    startSlider.value = 0;
    endSlider.value   = max;

    // Restore Today chip and sync activeFilter
    document.querySelectorAll('[data-time]').forEach(c => c.classList.remove('active'));
    document.querySelector('[data-time="today"]')?.classList.add('active');
    activeFilter.time = 'today';

    updateLabels();
    updateFill();

    setCustomDateRange(null, null);
    applyFilters(activeFilter);
  });

  initRange();
}
