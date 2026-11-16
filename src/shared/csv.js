import { $ } from "./dom.js";

const exportsByIndicator = new Map();

function escapeCsvValue(value) {
  let text = String(value ?? "");
  if (/^\s*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function setCsvExport(key, button, headers, rows) {
  exportsByIndicator.set(key, { headers, rows });
  $(button).disabled = rows.length === 0;
}

export function clearCsvExports() {
  exportsByIndicator.clear();
  ["#export-passengers", "#export-approvers", "#export-cost-centers"].forEach((selector) => {
    $(selector).disabled = true;
  });
}

export function downloadCsv(key, filename) {
  const data = exportsByIndicator.get(key);
  if (!data?.rows.length) return;

  const contents = [data.headers, ...data.rows]
    .map((row) => row.map(escapeCsvValue).join(";"))
    .join("\r\n");
  const blob = new Blob(["\uFEFF", contents], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
