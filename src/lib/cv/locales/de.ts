import { escapeLatex, section, itemize, joinNonEmpty } from '@/lib/cv/latex';
import { preamble, header, fmtRange, fmtDob } from './preamble';
import type { CvData, CvEntry } from '@/lib/cv/types';

function renderEntry(e: CvEntry): string {
  const line = joinNonEmpty([`\\textbf{${escapeLatex(e.title)}}`, e.organization ? escapeLatex(e.organization) : ''], ', ');
  const meta = joinNonEmpty([e.location ? escapeLatex(e.location) : '', fmtRange(e.start_date, e.end_date, e.is_current, 'mm')], ' \\textbar{} ');
  const summary = e.summary ? `${escapeLatex(e.summary)}\\\\\n` : '';
  return `${line}\\\\\n${meta ? meta + '\\\\\n' : ''}${summary}${itemize(e.bullets.map(escapeLatex))}\\vspace{4pt}\n`;
}

export function render(data: CvData): string {
  const p = data.profile;
  const personal = joinNonEmpty([
    p.date_of_birth ? `Date of birth: ${fmtDob(p.date_of_birth)}` : '',
    p.nationality ? `Nationality: ${escapeLatex(p.nationality)}` : '',
    p.marital_status ? `Marital status: ${escapeLatex(p.marital_status)}` : '',
  ], ' \\textbar{} ');

  const parts: string[] = [preamble(), header(p, data.track.target_title)];
  if (personal) parts.push(section('Personal Details', personal));
  if (data.track.summary) parts.push(section('Summary', escapeLatex(data.track.summary)));
  const exp = data.entries.filter((e) => e.kind === 'experience');
  if (exp.length) parts.push(section('Experience', exp.map(renderEntry).join('')));
  const edu = data.entries.filter((e) => e.kind === 'education');
  if (edu.length) parts.push(section('Education', edu.map(renderEntry).join('')));
  if (data.skills.length) parts.push(section('Skills', data.skills.map((s) => escapeLatex(s.name)).join(' \\textbar{} ')));
  if (data.languages.length) parts.push(section('Languages', data.languages.map((l) => `${escapeLatex(l.name)} (${escapeLatex(l.cefr_level)})`).join(' \\textbar{} ')));
  parts.push('\\end{document}\n');
  return parts.join('\n');
}
