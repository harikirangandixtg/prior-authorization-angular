import { Component, computed, input } from '@angular/core';

type SegKind = 'text' | 'cite' | 'flag';
interface Seg { kind: SegKind; value: string }
interface Line { type: 'title' | 'heading' | 'bullet' | 'text' | 'blank'; segs: Seg[] }

const HEADING = /^(criteria summary|clinical summary|open items|missing documentation)$/i;
const CITATION = /^[A-Za-z]+\/[A-Za-z0-9._-]+(\s*,\s*[A-Za-z]+\/[A-Za-z0-9._-]+)*$/;

function segments(text: string): Seg[] {
  const out: Seg[] = [];
  let last = 0;
  for (const m of text.matchAll(/\[([^\]]+)\]/g)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push({ kind: 'text', value: text.slice(last, idx) });
    const inner = m[1];
    if (inner === 'UNVERIFIED') out.push({ kind: 'flag', value: inner });
    else if (CITATION.test(inner)) out.push({ kind: 'cite', value: inner });
    else out.push({ kind: 'text', value: m[0] });
    last = idx + m[0].length;
  }
  if (last < text.length) out.push({ kind: 'text', value: text.slice(last) });
  return out;
}

function parse(text: string): Line[] {
  let titleDone = false;
  return text.split(/\r?\n/).map((raw): Line => {
    const line = raw.trim();
    if (!line) return { type: 'blank', segs: [] };
    if (!titleDone) {
      titleDone = true;
      if (line === line.toUpperCase()) return { type: 'title', segs: segments(line) };
    }
    if (HEADING.test(line)) return { type: 'heading', segs: segments(line) };
    const bullet = /^-\s+(.*)$/.exec(line);
    if (bullet) return { type: 'bullet', segs: segments(bullet[1]) };
    return { type: 'text', segs: segments(line) };
  });
}

/**
 * Renders the AI draft narrative as a readable document: headings, bullets, FHIR citations as tags and
 * [UNVERIFIED] as a visible flag. Text is bound with interpolation only, so nothing is injected as HTML.
 */
@Component({
  selector: 'app-cited-text',
  template: `
    @for (line of lines(); track $index) {
      <div [class]="'doc-line doc-' + line.type">
        @for (s of line.segs; track $index) {
          @switch (s.kind) {
            @case ('cite') {
              <span class="cite">{{ s.value }}</span>
            }
            @case ('flag') {
              <span class="flag-unverified">Unverified</span>
            }
            @default {
              {{ s.value }}
            }
          }
        }
      </div>
    }
  `,
})
export class CitedTextComponent {
  readonly text = input.required<string>();
  readonly lines = computed(() => parse(this.text() ?? ''));
}
