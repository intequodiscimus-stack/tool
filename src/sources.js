'use strict';

const SOURCES = [
  {
    id: 'quanta',
    name: 'Quanta Magazine',
    url: 'https://www.quantamagazine.org/feed/',
    topic: 'math',
  },
  {
    id: 'ams',
    name: 'American Mathematical Society',
    url: 'https://blogs.ams.org/matheducation/feed/',
    topic: 'math',
  },
  {
    id: 'tao',
    name: "What's new (Terence Tao)",
    url: 'https://terrytao.wordpress.com/feed/',
    topic: 'math',
  },
  {
    id: 'arxiv-front',
    name: 'arXiv MathFront',
    url: 'https://rss.arxiv.org/rss/math.GM',
    topic: 'research',
  },
];

module.exports = { SOURCES };
