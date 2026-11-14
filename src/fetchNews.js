'use strict';

const Parser = require('rss-parser');
const { SOURCES } = require('./sources');
const { scoreArticle } = require('./relevance');
const { translateArticle } = require('./translate');

const parser = new Parser({ timeout: 15000 });

function stripHtml(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toArticle(item, source) {
  const publishedAt = item.isoDate || (item.pubDate ? new Date(item.pubDate).toISOString() : null);
  return {
    id: `${source.id}:${item.guid || item.link || item.title}`,
    sourceId: source.id,
    sourceName: source.name,
    url: item.link || '',
    originalTitle: stripHtml(item.title),
    originalSummary: stripHtml(item.contentSnippet || item.content || item.summary).slice(0, 600),
    publishedAt,
    topic: source.topic,
  };
}

async function fetchFromSource(source, sinceMs) {
  try {
    const feed = await parser.parseURL(source.url);
    return (feed.items || [])
      .map((item) => toArticle(item, source))
      .filter((a) => a.originalTitle && a.url)
      .filter((a) => {
        if (!a.publishedAt) return true;
        const t = new Date(a.publishedAt).getTime();
        return Number.isFinite(t) ? t >= sinceMs : true;
      });
  } catch (err) {
    console.error(`[fetch] source « ${source.name} » indisponible : ${err.message}`);
    return [];
  }
}

function dedupe(articles) {
  const seen = new Set();
  return articles.filter((a) => {
    const key = a.url.replace(/[?#].*$/, '').toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchDailyNews({ sinceMs = Date.now() - 36 * 3600 * 1000, max = 30 } = {}) {
  const batches = await Promise.all(SOURCES.map((s) => fetchFromSource(s, sinceMs)));
  let articles = dedupe(batches.flat());

  for (const a of articles) {
    a.score = scoreArticle(a);
  }

  articles = articles
    .filter((a) => a.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max);

  articles = await Promise.all(articles.map(translateArticle));

  articles.forEach((a, i) => {
    a.rank = i + 1;
  });

  return articles;
}

module.exports = { fetchDailyNews, toArticle };
