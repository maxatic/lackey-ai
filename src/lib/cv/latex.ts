// ATS-safe LaTeX building blocks. All user text MUST pass through escapeLatex.
const REPLACEMENTS: [RegExp, string][] = [
  [/\\/g, '\\textbackslash{}'], // must run first
  [/&/g, '\\&'],
  [/%/g, '\\%'],
  [/\$/g, '\\$'],
  [/#/g, '\\#'],
  [/_/g, '\\_'],
  [/\{/g, '\\{'],
  [/\}/g, '\\}'],
  [/~/g, '\\textasciitilde{}'],
  [/\^/g, '\\textasciicircum{}'],
];

export function escapeLatex(s: string): string {
  // ponytail: NUL placeholder prevents the backslash replacement from re-escaping subsequent replacements
  let out = s.replace(/\\/g, '\x00');
  for (const [re, rep] of REPLACEMENTS.slice(1)) out = out.replace(re, rep);
  return out.replace(/\x00/g, '\\textbackslash{}');
}

export function section(title: string, body: string): string {
  return `\\section*{${title}}\n${body}\n`;
}

export function itemize(items: string[]): string {
  if (items.length === 0) return '';
  return `\\begin{itemize}\n${items.map((i) => `  \\item ${i}`).join('\n')}\n\\end{itemize}\n`;
}

export function joinNonEmpty(parts: (string | null | undefined)[], sep: string): string {
  return parts.filter((p): p is string => !!p && p.trim() !== '').join(sep);
}
