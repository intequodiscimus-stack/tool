'use strict';

const SOURCES = [
  {
    id: 'quanta',
    name: 'Quanta Magazine',
    url: 'https://api.quantamagazine.org/feed/1',
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
    url: 'http://export.arxiv.org/rss/math.MA',
    topic: 'research',
  },
];

module.exports = { SOURCES };
