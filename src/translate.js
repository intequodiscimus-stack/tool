'use strict';

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const config = require('./config');

const cacheDir = path.resolve(__dirname, '..', config.dataDir);
const cacheFile = path.join(cacheDir, 'translations.json');

const DEFAULT_LIBRETRANSLATE_URL = 'https://libretranslate.com';

function loadCache() {
  try {
    return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  } catch {
    return {};
  }
}

function saveCache(cache) {
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2), 'utf8');
}

function hashKey(text) {
  return crypto.createHash('sha1').update(text).digest('hex');
}

function chunkText(text, max = 450) {
  const pieces = [];
  for (const sentence of text.split(/(?<=[.!?…])\s+/)) {
    if (sentence.length <= max) {
      pieces.push(sentence);
      continue;
    }
    for (let i = 0; i < sentence.length; i += max) {
      pieces.push(sentence.slice(i, i + max));
    }
  }
  const chunks = [];
  let current = '';
  for (const piece of pieces) {
    if ((current + ' ' + piece).trim().length > max) {
      if (current) chunks.push(current.trim());
      current = piece;
    } else {
      current = (current ? current + ' ' : '') + piece;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

async function callLibreTranslate(text) {
  const body = { q: text, source: 'en', target: 'fr', format: 'text' };
  if (config.libreTranslateApiKey) body.api_key = config.libreTranslateApiKey;

  const res = await fetch(`${config.libreTranslateUrl}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`LibreTranslate HTTP ${res.status}`);
  const data = await res.json();
  if (!data.translatedText) throw new Error('LibreTranslate : réponse vide');
  return data.translatedText;
}

async function callMyMemory(text) {
  const res = await fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|fr`,
    { signal: AbortSignal.timeout(15000) }
  );
  if (!res.ok) throw new Error(`MyMemory HTTP ${res.status}`);
  const data = await res.json();
  const translated = data && data.responseData && data.responseData.translatedText;
  if (!translated || /^MYMEMORY WARNING/i.test(translated)) {
    throw new Error('MyMemory : quota atteint ou réponse invalide');
  }
  return translated;
}

async function translateVia(provider, text) {
  const chunks = chunkText(text);
  const parts = [];
  for (const chunk of chunks) {
    parts.push(await provider(chunk));
  }
  return parts.join(' ');
}

function libreTranslateUsable() {
  return Boolean(config.libreTranslateApiKey) || config.libreTranslateUrl !== DEFAULT_LIBRETRANSLATE_URL;
}

async function translateText(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return '';
  if (!config.translateEnabled) return trimmed;

  const cache = loadCache();
  const key = hashKey(trimmed);
  if (cache[key]) return cache[key];

  const providers = [];
  if (libreTranslateUsable()) providers.push(['libretranslate', callLibreTranslate]);
  providers.push(['mymemory', callMyMemory]);

  for (const [name, provider] of providers) {
    try {
      const translated = await translateVia(provider, trimmed);
      if (translated && translated.trim()) {
        cache[key] = translated;
        saveCache(cache);
        return translated;
      }
    } catch (err) {
      console.error(`[translate] ${name} a échoué : ${err.message}`);
    }
  }

  console.error('[translate] tous les fournisseurs ont échoué, texte original conservé');
  return trimmed;
}

async function translateArticle(article) {
  const [title, summary] = await Promise.all([
    translateText(article.originalTitle),
    translateText(article.originalSummary),
  ]);
  return {
    ...article,
    title: title || article.originalTitle,
    summary: summary || article.originalSummary,
  };
}

module.exports = { translateArticle, translateText };
