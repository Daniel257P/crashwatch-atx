// Active filter state
export const activeFilter = {
  time: 'today',
  type: 'all',       //all,crash,hazard,other
  customStart: null,
  customEnd: null
};

// Date range calculation based on activeFilter
export function getTimeRange(filter) {
  const now = new Date();

  if (filter.time === 'custom' && filter.customStart) {
    return {
      start: new Date(filter.customStart),
      end: filter.customEnd ? new Date(filter.customEnd) : now
    };
  }

  //Today = from midnight of the current calendar day
  if (filter.time === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { start, end: now };
  }

  const msMap = {
    week:  7   * 24 * 60 * 60 * 1000,
    month: 30  * 24 * 60 * 60 * 1000,
    year:  365 * 24 * 60 * 60 * 1000
  };
  const ms = msMap[filter.time] ?? msMap.week;
  return { start: new Date(now - ms), end: now };
}

// items with no timestamp are excluded 
export function matchesTimeFilter(item, filter) {
  const ts = item.published || item.date;
  if (!ts) return false;
  const { start, end } = getTimeRange(filter);
  const d = new Date(ts);
  return d >= start && d <= end;
}

// true if item type matches filter (or filter is 'all')
export function matchesTypeFilter(item, filter) {
  return filter.type === 'all' || item.severity === filter.type;
}

// onFilterChange is called with a snapshot of activeFilter on every change
export function initFilters(onFilterChange) {
  const tabs = document.querySelectorAll('.tab');
  const contents = document.querySelectorAll('.tab-content');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      contents.forEach(c => {
        c.classList.remove('active');
        if (c.id === `tab-${target}`) c.classList.add('active');
      });
    });
  });

  //Time range chips
  const timeChips = document.querySelectorAll('[data-time]');
  const customRange = document.getElementById('custom-range');
  timeChips.forEach(chip => {
    chip.addEventListener('click', () => {
      timeChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeFilter.time = chip.dataset.time;
      if (customRange) {
        customRange.style.display = chip.dataset.time === 'custom' ? 'flex' : 'none';
      }
      onFilterChange({ ...activeFilter });
    });
  });

  //Custom date range inputs
  const startInput = document.getElementById('custom-start');
  const endInput   = document.getElementById('custom-end');
  if (startInput) {
    startInput.addEventListener('change', () => {
      activeFilter.customStart = startInput.value;
      onFilterChange({ ...activeFilter });
    });
  }
  if (endInput) {
    endInput.addEventListener('change', () => {
      activeFilter.customEnd = endInput.value;
      onFilterChange({ ...activeFilter });
    });
  }

  //Type filter chips (data-type="all,crash,hazard,other")
  const typeChips = document.querySelectorAll('[data-type]');
  typeChips.forEach(chip => {
    chip.addEventListener('click', () => {
      typeChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeFilter.type = chip.dataset.type;
      onFilterChange({ ...activeFilter });
    });
  });
}
