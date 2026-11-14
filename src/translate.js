'use strict';

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const config = require('./config');

const cacheDir = path.resolve(__dirname, '..', config.dataDir);
const cacheFile = path.join(cacheDir, 'translations.json');

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

async function callLibreTranslate(text) {
  const body = {
    q: text,
    source: 'en',
    target: 'fr',
    format: 'text',
  };
  if (config.libreTranslateApiKey) body.api_key = config.libreTranslateApiKey;

  const res = await fetch(`${config.libreTranslateUrl}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`LibreTranslate HTTP ${res.status}`);
  const data = await res.json();
  return data.translatedText || '';
}

async function translateText(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return '';
  if (!config.translateEnabled) return trimmed;

  const cache = loadCache();
  const key = hashKey(trimmed);
  if (cache[key]) return cache[key];

  try {
    const translated = await callLibreTranslate(trimmed);
    if (translated) {
      cache[key] = translated;
      saveCache(cache);
      return translated;
    }
  } catch (err) {
    console.error(`[translate] échec, texte original conservé : ${err.message}`);
  }
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
