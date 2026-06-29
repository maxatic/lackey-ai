import { escapeLatex, section, itemize, joinNonEmpty } from '@/lib/cv/latex';
import { preamble, header, fmtRange, fmtDob } from './preamble';
import type { CvData, CvEntry } from '@/lib/cv/types';

// DE Lebenslauf uses German headings/labels and 'heute' for current roles — the locale wedge.
const OTHER_KINDS: CvEntry['kind'][] = ['project', 'certification', 'award', 'publication', 'volunteering'];

function renderEntry(e: CvEntry): string {
  const line = joinNonEmpty([`\\textbf{${escapeLatex(e.title)}}`, e.organization ? escapeLatex(e.organization) : ''], ', ');
  const meta = joinNonEmpty([e.location ? escapeLatex(e.location) : '', fmtRange(e.start_date, e.end_date, e.is_current, 'mm', 'heute')], ' \\textbar{} ');
  const summary = e.summary ? `${escapeLatex(e.summary)}\\\\\n` : '';
  return `${line}\\\\\n${meta ? meta + '\\\\\n' : ''}${summary}${itemize(e.bullets.map(escapeLatex))}\\vspace{4pt}\n`;
}

export function render(data: CvData): string {
  const p = data.profile;
  const personal = joinNonEmpty([
    p.date_of_birth ? `Geburtsdatum: ${fmtDob(p.date_of_birth)}` : '',
    p.nationality ? `Staatsangehörigkeit: ${escapeLatex(p.nationality)}` : '',
    p.marital_status ? `Familienstand: ${escapeLatex(p.marital_status)}` : '',
  ], ' \\textbar{} ');

  const parts: string[] = [preamble(), header(p, data.track.target_title)];
  if (personal) parts.push(section('Persönliche Daten', personal));
  if (data.track.summary) parts.push(section('Profil', escapeLatex(data.track.summary)));
  const exp = data.entries.filter((e) => e.kind === 'experience');
  if (exp.length) parts.push(section('Berufserfahrung', exp.map(renderEntry).join('')));
  const edu = data.entries.filter((e) => e.kind === 'education');
  if (edu.length) parts.push(section('Ausbildung', edu.map(renderEntry).join('')));
  const other = data.entries.filter((e) => OTHER_KINDS.includes(e.kind));
  if (other.length) parts.push(section('Projekte \\& Weiteres', other.map(renderEntry).join('')));
  if (data.skills.length) parts.push(section('Kenntnisse', data.skills.map((s) => escapeLatex(s.name)).join(' \\textbar{} ')));
  if (data.languages.length) parts.push(section('Sprachen', data.languages.map((l) => `${escapeLatex(l.name)} (${escapeLatex(l.cefr_level)})`).join(' \\textbar{} ')));
  parts.push('\\end{document}\n');
  return parts.join('\n');
}
