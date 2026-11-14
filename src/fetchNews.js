'use strict';

const Parser = require('rss-parser');
const { SOURCES } = require('./sources');
const { scoreArticle } = require('./relevance');
const { translateArticle } = require('./translate');
const config = require('./config');

const parser = new Parser({ timeout: 15000 });

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  hellip: '…', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘',
  rdquo: '”', ldquo: '“', eacute: 'é', egrave: 'è', agrave: 'à',
  ccedil: 'ç', ocirc: 'ô', icirc: 'î', laquo: '«', raquo: '»',
};

function decodeEntities(text) {
  return String(text || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] || ' ');
}

function stripHtml(html) {
  return decodeEntities(String(html || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function splitSentences(text) {
  return text.split(/(?<=[.!?…])\s+(?=[A-ZÀ-Ý«"‘0-9])/g).filter(Boolean);
}

function truncateAtSentence(text, maxChars) {
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars);
  const lastStop = Math.max(
    cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '), cut.lastIndexOf('… ')
  );
  if (lastStop > maxChars * 0.5) return cut.slice(0, lastStop + 1);
  return cut.replace(/\s+\S*$/, '') + '…';
}

function extractMetaDescription(html) {
  const patterns = [
    /<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:description["']/i,
    /<meta[^>]+name=["']description["'][^>]*content=["']([^"']+)["']/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1].trim().length > 80) return stripHtml(match[1]);
  }
  return '';
}

const UI_JUNK = /(se connecter|se d[ée]connecter|mot de passe|enregistrer l['’]article|lire plus tard|ajouter comme source|cliquez pour|copi[ée]\s*!|s['’]abonner|abonnez-vous|skip to content|\baccueil\b|leave a comment|demandez [àa] google|save article|read later|add as preferred source|click to tell|sign in|log in|sign up|subscribe|share this article|donate now)/i

function extractParagraphs(html) {
  return [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => stripHtml(m[1]))
    .filter((p) => p.length > 60 && !/^[\[\(]/.test(p) && !UI_JUNK.test(p));
}

function isolateMainContent(html) {
  const entryMatch = html.match(/class=["'][^"']*(?:entry-content|post-content|article-body|article__body)[^"']*["']/i);
  if (entryMatch && entryMatch.index !== undefined) {
    return html.slice(entryMatch.index, entryMatch.index + 60000);
  }
  const articleMatch = html.match(/<article[\s\S]*?<\/article>/i);
  if (articleMatch) return articleMatch[0];
  return html;
}

async function extractArticleText(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MathsNewsDuJour/1.0)' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return '';
    const html = (await res.text())
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
      .replace(/<header[\s\S]*?<\/header>/gi, ' ')
      .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
      .replace(/<form[\s\S]*?<\/form>/gi, ' ');

    const meta = extractMetaDescription(html);
    const mainText = extractParagraphs(isolateMainContent(html)).join(' ');
    const text = mainText || meta;
    return text.replace(/\$latex[^$]*\$/gi, ' ').replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
}

function buildSummaryFromText(text) {
  const sentences = splitSentences(text);
  let summary = '';
  for (const s of sentences) {
    if (summary.length >= 300 || summary.split(' ').length > 80) break;
    summary += (summary ? ' ' : '') + s;
  }
  return truncateAtSentence(summary || text, 600);
}

function buildSummaryFromSnippet(item) {
  const text = stripHtml(item.contentSnippet || item.content || item.summary);
  return truncateAtSentence(text, 600);
}

function toArticle(item, source, articleText) {
  const publishedAt = item.isoDate || (item.pubDate ? new Date(item.pubDate).toISOString() : null);
  return {
    id: `${source.id}:${item.guid || item.link || item.title}`,
    sourceId: source.id,
    sourceName: source.name,
    url: item.link || '',
    originalTitle: stripHtml(item.title),
    originalSummary: articleText
      ? buildSummaryFromText(articleText)
      : buildSummaryFromSnippet(item),
    publishedAt,
    topic: source.topic,
  };
}

async function fetchFromSource(source, sinceMs) {
  try {
    const feed = await parser.parseURL(source.url);
    const items = (feed.items || [])
      .filter((a) => a.title && a.link)
      .filter((a) => {
        if (!a.isoDate && !a.pubDate) return true;
        const t = new Date(a.isoDate || a.pubDate).getTime();
        return Number.isFinite(t) ? t >= sinceMs : true;
      })
      .slice(0, 15);

    const articles = [];
    for (const item of items) {
      const articleText = await extractArticleText(item.link);
      articles.push(toArticle(item, source, articleText));
    }
    return articles;
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

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function fetchDailyNews({ sinceMs, max } = {}) {
  const windowMs = (config.newsWindowHours || 72) * 3600 * 1000;
  const since = sinceMs || Date.now() - windowMs;
  const limit = max || config.maxArticles;

  const batches = await Promise.all(SOURCES.map((s) => fetchFromSource(s, since)));
  let articles = dedupe(batches.flat());

  for (const a of articles) {
    a.score = scoreArticle(a);
  }

  articles = articles
    .filter((a) => a.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  articles = await mapWithConcurrency(articles, 3, translateArticle);

  articles.forEach((a, i) => {
    a.rank = i + 1;
  });

  return articles;
}

module.exports = { fetchDailyNews, toArticle, truncateAtSentence, buildSummaryFromText };
