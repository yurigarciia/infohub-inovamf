/** Serializa linhas (array de objetos com as mesmas chaves) em CSV,
 * escapando campos que contenham vírgula, aspas ou quebra de linha —
 * RF-23 (exportação client-side, sem chamada de API). */
export function toCsv(rows: Record<string, string | number>[], headers: string[]): string {
  const escape = (value: string | number) => {
    const str = String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h] ?? "")).join(",")),
  ];
  return lines.join("\n");
}

/** Dispara o download de um arquivo de texto no navegador (sem backend). */
export function downloadTextFile(filename: string, content: string, mimeType = "text/csv;charset=utf-8;") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
