'use strict';

const config = require('./config');
const { fetchDailyNews } = require('./fetchNews');
const { saveDay } = require('./store');

function dateKeyFor(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

async function runPipeline({ date = new Date() } = {}) {
  const dateKey = dateKeyFor(date);
  console.log(`[pipeline] collecte des news pour ${dateKey}...`);
  const articles = await fetchDailyNews({ max: config.maxArticles });
  saveDay(dateKey, articles);
  console.log(`[pipeline] ${articles.length} articles enregistrés pour ${dateKey}.`);
  return articles;
}

if (require.main === module) {
  runPipeline()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[pipeline] erreur :', err);
      process.exit(1);
    });
}

module.exports = { runPipeline, dateKeyFor };
