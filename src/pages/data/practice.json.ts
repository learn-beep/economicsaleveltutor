import { allQuestions, allTopics } from '../../lib/data';
export function GET() {
  const q = allQuestions.map((x) => ({
    id: x.id, t: x.topics, s: x.series, y: x.year, p: x.paper, l: x.level, q: x.question, m: x.marks, f: x.format, ao: x.aoText,
    d: x.difficulty, c: x.crop, ms: x.msCrop, st: x.stemCrop, old: x.notCurrentSpec ? 1 : 0, ans: x.mcqAnswers || null, def: x.format === 'Definition' ? 1 : 0, dr: (x.features || []).includes('dataref') ? 1 : 0,
    g: x.paperId + '#' + String(x.question).replace(/\(.*$/, ''), ch: x.choice ? 1 : 0,
    e: x.erText && x.erText.length > 280 ? x.erText.slice(0, 277).replace(/\s+\S*$/, '') + '…' : x.erText,
  }));
  const topics = allTopics.map((t) => ({ slug: t.slug, name: t.name, paper: t.paper, parts: t.parts }));
  return new Response(JSON.stringify({ q, topics }), { headers: { 'Content-Type': 'application/json' } });
}
