export function initExport(getFilteredData) {
  document.getElementById('btn-export')
    ?.addEventListener('click', () => {
      const data = getFilteredData();
      if (data.length === 0) {
        alert('No incidents to export with the current filter.');
        return;
      }
      downloadCSV(data);
    });
}

function downloadCSV(data) {
  const headers = [
    'Address', 'Type', 'Category', 'Date', 'Time',
    'Source', 'Latitude', 'Longitude'
  ];

  const rows = data.map(item => {
    const ts = item.published || item.date;
    const d  = ts ? new Date(ts) : null;
    return [
      item.address  || '',
      item.type     || '',
      item.severity || '',
      d ? d.toLocaleDateString() : '',
      d ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      item.source || '',
      item.lat    ?? '',
      item.lng    ?? ''
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });

  const csv  = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `crashwatch-atx-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
