const STORAGE_KEY = 'crashwatch_reports';
let selectedCoords = null; // { lat, lng } set by autocomplete selection

export function setReportCoords(lat, lng) {
  selectedCoords = { lat, lng };
}

export function initCommunity() {
  document.getElementById('photo-upload')
    ?.addEventListener('click', () => {
      document.getElementById('photo-input')?.click();
    });

  document.getElementById('photo-input')
    ?.addEventListener('change', handlePhotoPreview);

  document.getElementById('btn-submit')
    ?.addEventListener('click', handleSubmit);
}

function handlePhotoPreview(e) {
  const files    = Array.from(e.target.files);
  const uploadEl = document.getElementById('photo-upload');
  if (files.length > 0 && uploadEl) {
    uploadEl.textContent = `${files.length} photo(s) selected`;
    uploadEl.style.color = 'var(--color-primary)';
  }
}

async function handleSubmit() {
  const location   = document.getElementById('report-location')?.value.trim();
  const datetime   = document.getElementById('report-datetime')?.value;
  const comment    = document.getElementById('report-comment')?.value.trim();
  const author     = document.getElementById('report-author')?.value.trim() || 'Anonymous';
  const photoInput = document.getElementById('photo-input');

  if (!location) { alert('Please enter a location.'); return; }
  if (!comment)  { alert('Please add a comment.'); return; }

  let photo = null;
  if (photoInput?.files?.length > 0) {
    photo = await fileToBase64(photoInput.files[0]);
  }

  const report = {
    id:        Date.now(),
    location,
    datetime:  datetime || new Date().toISOString(),
    comment,
    author,
    submitted: new Date().toISOString(),
    lat:       selectedCoords?.lat || null,
    lng:       selectedCoords?.lng || null,
    photo
  };

  saveReport(report);
  showSuccess();
  resetForm();
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = () => reject(null);
    reader.readAsDataURL(file);
  });
}

function saveReport(report) {
  const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  existing.push(report);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export function getReportsForLocation(itemLat, itemLng, address) {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

  return all.filter(report => {
    // Primary: GPS proximity within 300m
    if (report.lat && report.lng && itemLat && itemLng) {
      return getDistanceMeters(itemLat, itemLng, report.lat, report.lng) <= 300;
    }
    // Fallback: first word of address match
    if (address && report.location) {
      const firstWord = address.split(' ')[0].toLowerCase();
      return report.location.toLowerCase().includes(firstWord);
    }
    return false;
  });
}

export function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R    = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function showSuccess() {
  const btn = document.getElementById('btn-submit');
  if (!btn) return;
  const original = btn.textContent;
  btn.textContent      = 'Report submitted!';
  btn.style.background = '#16A34A';
  setTimeout(() => {
    btn.textContent      = original;
    btn.style.background = '';
  }, 3000);
}

function resetForm() {
  selectedCoords = null;
  ['report-location', 'report-datetime', 'report-comment', 'report-author']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  const uploadEl = document.getElementById('photo-upload');
  if (uploadEl) {
    uploadEl.textContent = '+ Add photos';
    uploadEl.style.color = '';
  }
  const fileInput = document.getElementById('photo-input');
  if (fileInput) fileInput.value = '';
}
