const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

async function fetchSuggestions(query) {
  if (!query || query.length < 3) return [];
  try {
    const params = new URLSearchParams({
      q: `${query}, Austin TX`,
      format: 'json',
      limit: 5,
      countrycodes: 'us',
      addressdetails: 1
    });
    const response = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'CrashWatch-ATX/1.0'
      }
    });
    if (!response.ok) return [];
    return await response.json();
  } catch (err) {
    console.error('Nominatim error:', err);
    return [];
  }
}

function showDropdown(inputEl, suggestions, onSelect) {
  removeDropdown();
  if (suggestions.length === 0) return;

  const dropdown = document.createElement('div');
  dropdown.id = 'autocomplete-dropdown';
  dropdown.className = 'autocomplete-dropdown';

  suggestions.forEach(place => {
    const item = document.createElement('div');
    item.className = 'autocomplete-item';
    const name = place.display_name.split(',').slice(0, 3).join(',');
    item.textContent = name;
    item.addEventListener('click', () => {
      inputEl.value = name;
      removeDropdown();
      onSelect(place);
    });
    dropdown.appendChild(item);
  });

  const rect = inputEl.getBoundingClientRect();
  dropdown.style.top   = `${rect.bottom + window.scrollY}px`;
  dropdown.style.left  = `${rect.left  + window.scrollX}px`;
  dropdown.style.width = `${rect.width}px`;
  document.body.appendChild(dropdown);

  setTimeout(() => {
    document.addEventListener('click', removeDropdown, { once: true });
  }, 0);
}

function removeDropdown() {
  document.getElementById('autocomplete-dropdown')?.remove();
}

export function initAutocomplete(inputEl, onSelect) {
  if (!inputEl) return;

  const debouncedSearch = debounce(async (query) => {
    const suggestions = await fetchSuggestions(query);
    showDropdown(inputEl, suggestions, onSelect);
  }, 400);

  inputEl.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    if (query.length >= 3) {
      debouncedSearch(query);
    } else {
      removeDropdown();
    }
  });

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') removeDropdown();
  });
}
