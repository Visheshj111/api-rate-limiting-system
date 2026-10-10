export function toCsv(rows: (string | number | null)[][]) {
  return rows.map(row => row.map(value => {
    let text = String(value ?? "");
    if (/^\s*[=+\-@]|^[\t\r\n]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  }).join(",")).join("\r\n");
}

export function downloadCsv(name: string, rows: (string | number | null)[][]) {
  const url = URL.createObjectURL(new Blob(["\ufeff", toCsv(rows)], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url);
}
