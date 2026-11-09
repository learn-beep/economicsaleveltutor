import questions from '../data/questions.json';
import papers from '../data/papers.json';
import topics from '../data/topics.json';

export type Q = (typeof questions)[number];
export type Paper = (typeof papers)[number];
export type Topic = (typeof topics)[number];

export const allQuestions: Q[] = questions as Q[];
export const allPapers: Paper[] = papers as Paper[];
export const allTopics: Topic[] = topics as Topic[];

export const byId = new Map(allQuestions.map((q) => [q.id, q]));
export const topicByslug = new Map(allTopics.map((t) => [t.slug, t]));

export function questionsForTopic(slug: string): Q[] {
  return allQuestions.filter((q) => q.topics.includes(slug)).sort((a, b) => b.year - a.year || a.paper.localeCompare(b.paper) || a.question.localeCompare(b.question, undefined, { numeric: true }));
}

export const PEARSON_MATERIALS = 'https://qualifications.pearson.com/en/qualifications/edexcel-a-levels/economics-a-2015.coursematerials.html';
