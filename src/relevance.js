'use strict';

const STRONG_KEYWORDS = [
  'mathematic', 'mathematics', 'theorem', 'proof', 'conjecture', 'lemma',
  'corollary', 'axiom', 'topology', 'algebra', 'geometry', 'analysis',
  'number theory', 'combinatorics', 'probability', 'statistics', 'logic',
  'differential', 'manifold', 'group theory', 'graph theory', 'fractal',
  'prime number', 'calculus', 'equation', 'algorithm', 'optimization',
  'cryptograph', 'machine learning', 'category theory', 'dynamical system',
];

const MEDIUM_KEYWORDS = [
  'math', 'proof', 'theorem', 'formula', 'equation', 'geometry', 'algebra',
  'infinite', 'infinity', 'prime', 'vector', 'matrix', 'function', 'curve',
  'symmetry', 'pattern', 'logic', 'paradox', 'chaos', 'complexity',
];

const EXCLUDE_KEYWORDS = [
  'giveaway', 'sponsored', 'advertisement', 'casino', 'betting',
];

function scoreArticle(article) {
  const title = (article.originalTitle || '').toLowerCase();
  const summary = (article.originalSummary || '').toLowerCase();
  const haystack = `${title} ${summary}`;

  for (const word of EXCLUDE_KEYWORDS) {
    if (haystack.includes(word)) return 0;
  }

  let score = 0;
  for (const word of STRONG_KEYWORDS) {
    if (title.includes(word)) score += 5;
    else if (summary.includes(word)) score += 2;
  }
  for (const word of MEDIUM_KEYWORDS) {
    if (title.includes(word)) score += 2;
    else if (summary.includes(word)) score += 1;
  }

  if (article.topic === 'math') score += 3;

  const ageHours = (Date.now() - new Date(article.publishedAt).getTime()) / 3600000;
  if (Number.isFinite(ageHours)) {
    if (ageHours <= 12) score += 4;
    else if (ageHours <= 24) score += 2;
    else if (ageHours > 72) score -= 2;
  }

  if (summary.length > 200) score += 1;

  return Math.min(score, 100);
}

module.exports = { scoreArticle };
