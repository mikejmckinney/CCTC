/**
 * Render a fixed-width ASCII table for terminal output.
 */
export function renderTable(columns, rows) {
  if (rows.length === 0) {
    return '(no rows)\n';
  }

  const widths = columns.map((column, index) => {
    const headerWidth = column.header.length;
    const dataWidth = Math.max(
      ...rows.map((row) => String(row[index] ?? '').length),
      0,
    );
    return Math.min(column.maxWidth ?? 48, Math.max(headerWidth, dataWidth, column.minWidth ?? 4));
  });

  const lines = [];
  lines.push(formatBorder(widths, '┌', '┬', '┐'));
  lines.push(formatRow(columns.map((column) => column.header), widths));
  lines.push(formatBorder(widths, '├', '┼', '┤'));

  for (const row of rows) {
    lines.push(formatRow(row.map((cell) => String(cell ?? '')), widths));
  }

  lines.push(formatBorder(widths, '└', '┴', '┘'));
  return `${lines.join('\n')}\n`;
}

function formatBorder(widths, left, middle, right) {
  const segments = widths.map((width) => '─'.repeat(width + 2));
  return `${left}${segments.join(middle)}${right}`;
}

function formatRow(cells, widths) {
  const padded = cells.map((cell, index) => {
    const text = truncate(String(cell ?? ''), widths[index]);
    return ` ${text.padEnd(widths[index])} `;
  });
  return `│${padded.join('│')}│`;
}

function truncate(text, maxWidth) {
  if (text.length <= maxWidth) {
    return text;
  }
  if (maxWidth <= 1) {
    return text.slice(0, maxWidth);
  }
  return `${text.slice(0, maxWidth - 1)}…`;
}
