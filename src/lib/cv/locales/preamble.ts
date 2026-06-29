import { escapeLatex } from '@/lib/cv/latex';
import type { CvData } from '@/lib/cv/types';

// ponytail: one ATS-safe preamble shared by every locale. No color/graphics/multicol.
export function preamble(): string {
  return [
    '\\documentclass[11pt,a4paper]{article}',
    '\\usepackage[margin=1.8cm]{geometry}',
    '\\usepackage[T1]{fontenc}',
    '\\usepackage{enumitem}',
    '\\setlist[itemize]{leftmargin=*,nosep}',
    '\\usepackage[hidelinks]{hyperref}',
    '\\pagestyle{empty}',
    '\\setlength{\\parindent}{0pt}',
    '\\begin{document}',
  ].join('\n') + '\n';
}

// Header used by both locales: name (large), headline, contact line, links.
export function header(p: CvData['profile'], titleFallback: string | null): string {
  const name = escapeLatex(p.full_name ?? titleFallback ?? '');
  const headline = p.headline ? escapeLatex(p.headline) : '';
  const contact = [p.email, p.phone, p.location].filter(Boolean).map((s) => escapeLatex(s as string)).join(' \\textbar{} ');
  const links = p.links.map((l) => `\\href{${encodeURI(l.url)}}{${escapeLatex(l.label)}}`).join(' \\textbar{} ');
  return [
    `{\\Large \\textbf{${name}}}\\\\[2pt]`,
    headline ? `${headline}\\\\[2pt]` : '',
    contact ? `${contact}\\\\` : '',
    links ? `${links}\\\\` : '',
    '\\vspace{6pt}',
    '',
  ].filter((l) => l !== '').join('\n') + '\n';
}

// `current` is the locale's word for an ongoing role (UK 'Present', DE 'heute').
export function fmtRange(start: string | null, end: string | null, isCurrent: boolean, sep: 'mon' | 'mm', current = 'Present'): string {
  const fmt = (iso: string | null) => {
    if (!iso) return '';
    const [y, m] = iso.split('-');
    if (sep === 'mm') return `${m}/${y}`;
    const mon = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(m, 10)] ?? '';
    return `${mon} ${y}`;
  };
  const left = fmt(start);
  const right = isCurrent ? current : fmt(end);
  return [left, right].filter(Boolean).join(' – ');
}

export function fmtDob(iso: string | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
