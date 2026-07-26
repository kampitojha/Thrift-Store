export function exportToCSV<T extends Record<string, unknown>>(data: T[], filename: string, columns?: { key: string; label: string }[]) {
  const headers = columns || Object.keys(data[0] || {}).map((k) => ({ key: k, label: k }));
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = row[h.key];
      const str = val == null ? '' : String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(','),
  );
  const csv = [headers.map((h) => h.label).join(','), ...rows].join('\n');
  downloadFile(csv, `${filename}.csv`, 'text/csv;charset=utf-8;');
}

export function exportToJSON<T>(data: T, filename: string) {
  const json = JSON.stringify(data, null, 2);
  downloadFile(json, `${filename}.json`, 'application/json;charset=utf-8;');
}

export function exportToText(text: string, filename: string) {
  downloadFile(text, `${filename}.txt`, 'text/plain;charset=utf-8;');
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function timestampFilename(base: string) {
  const now = new Date();
  const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
  return `${base}_${ts}`;
}
