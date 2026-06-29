import { escapeLatex, section, itemize, joinNonEmpty } from '@/lib/cv/latex';
import { preamble, header, fmtRange } from './preamble';
import type { CvData, CvEntry } from '@/lib/cv/types';

function entriesOfKind(data: CvData, kinds: CvEntry['kind'][]): CvEntry[] {
  return data.entries.filter((e) => kinds.includes(e.kind));
}

function renderEntry(e: CvEntry): string {
  const title = escapeLatex(e.title);
  const org = e.organization ? escapeLatex(e.organization) : '';
  const line = joinNonEmpty([`\\textbf{${title}}`, org], ', ');
  const meta = joinNonEmpty([e.location ? escapeLatex(e.location) : '', fmtRange(e.start_date, e.end_date, e.is_current, 'mon')], ' \\textbar{} ');
  const summary = e.summary ? `${escapeLatex(e.summary)}\\\\\n` : '';
  const bullets = itemize(e.bullets.map(escapeLatex));
  return `${line}\\\\\n${meta ? meta + '\\\\\n' : ''}${summary}${bullets}\\vspace{4pt}\n`;
}

export function render(data: CvData): string {
  const parts: string[] = [preamble(), header(data.profile, data.track.target_title)];
  if (data.track.summary) parts.push(section('Summary', escapeLatex(data.track.summary)));
  if (data.skills.length) parts.push(section('Skills', data.skills.map((s) => escapeLatex(s.name)).join(' \\textbar{} ')));
  const exp = entriesOfKind(data, ['experience']);
  if (exp.length) parts.push(section('Experience', exp.map(renderEntry).join('')));
  const edu = entriesOfKind(data, ['education']);
  if (edu.length) parts.push(section('Education', edu.map(renderEntry).join('')));
  const other = entriesOfKind(data, ['project', 'certification', 'award', 'publication', 'volunteering']);
  if (other.length) parts.push(section('Projects \\& Other', other.map(renderEntry).join('')));
  if (data.languages.length) parts.push(section('Languages', data.languages.map((l) => `${escapeLatex(l.name)} (${escapeLatex(l.cefr_level)})`).join(' \\textbar{} ')));
  parts.push('\\end{document}\n');
  return parts.join('\n');
}
