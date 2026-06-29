import { describe, it, expect } from 'vitest';
import { escapeLatex, section, itemize, joinNonEmpty } from './latex';

describe('escapeLatex', () => {
  it('escapes all LaTeX special characters', () => {
    expect(escapeLatex('R&D 100% {x} #1 a_b $5 ~ ^')).toBe(
      'R\\&D 100\\% \\{x\\} \\#1 a\\_b \\$5 \\textasciitilde{} \\textasciicircum{}',
    );
  });
  it('escapes backslash without double-escaping the replacements', () => {
    expect(escapeLatex('a\\b')).toBe('a\\textbackslash{}b');
  });
  it('passes plain text through unchanged', () => {
    expect(escapeLatex('Senior Engineer, London')).toBe('Senior Engineer, London');
  });
});

describe('building blocks', () => {
  it('section wraps a titled block', () => {
    expect(section('Skills', 'TypeScript')).toBe('\\section*{Skills}\nTypeScript\n');
  });
  it('itemize emits an ATS-safe list', () => {
    expect(itemize(['a', 'b'])).toBe('\\begin{itemize}\n  \\item a\n  \\item b\n\\end{itemize}\n');
  });
  it('itemize of an empty list emits nothing', () => {
    expect(itemize([])).toBe('');
  });
  it('joinNonEmpty drops null/empty and joins', () => {
    expect(joinNonEmpty(['London', null, '', 'UK'], ' \\textbar{} ')).toBe('London \\textbar{} UK');
  });
});
