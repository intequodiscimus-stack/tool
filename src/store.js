'use strict';

const fs = require('fs');
const path = require('path');
const config = require('./config');

const dataDir = path.resolve(__dirname, '..', config.dataDir);

function filePathFor(dateKey) {
  return path.join(dataDir, `news-${dateKey}.json`);
}

function ensureDir() {
  fs.mkdirSync(dataDir, { recursive: true });
}

function saveDay(dateKey, articles) {
  ensureDir();
  const payload = { date: dateKey, generatedAt: new Date().toISOString(), articles };
  fs.writeFileSync(filePathFor(dateKey), JSON.stringify(payload, null, 2), 'utf8');
  return payload;
}

function loadDay(dateKey) {
  const file = filePathFor(dateKey);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function listDays() {
  ensureDir();
  return fs
    .readdirSync(dataDir)
    .filter((f) => f.startsWith('news-') && f.endsWith('.json'))
    .map((f) => f.slice('news-'.length, -'.json'.length))
    .sort()
    .reverse();
}

module.exports = { saveDay, loadDay, listDays };
