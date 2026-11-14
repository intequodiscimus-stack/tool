'use strict';

const path = require('path');
const express = require('express');
const config = require('./src/config');
const { runPipeline, dateKeyFor } = require('./src/run-pipeline');
const { loadDay, listDays } = require('./src/store');
const { startScheduler } = require('./src/scheduler');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/news', async (req, res) => {
  const dateKey = req.query.date || dateKeyFor();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return res.status(400).json({ error: 'Paramètre « date » invalide (format attendu : AAAA-MM-JJ).' });
  }

  let day = loadDay(dateKey);
  if (!day && dateKey === dateKeyFor()) {
    try {
      const articles = await runPipeline();
      day = { date: dateKey, articles };
    } catch (err) {
      console.error('[api] échec de la collecte :', err.message);
      return res.status(502).json({ error: 'Collecte des news impossible pour le moment.' });
    }
  }

  if (!day) {
    return res.status(404).json({ error: `Aucune news enregistrée pour le ${dateKey}.` });
  }

  res.json({
    date: day.date,
    generatedAt: day.generatedAt,
    count: day.articles.length,
    articles: day.articles,
  });
});

app.get('/api/days', (_req, res) => {
  res.json({ days: listDays() });
});

app.post('/api/refresh', async (_req, res) => {
  try {
    const articles = await runPipeline();
    res.json({ date: dateKeyFor(), count: articles.length });
  } catch (err) {
    console.error('[api] échec du rafraîchissement :', err.message);
    res.status(502).json({ error: 'Rafraîchissement impossible pour le moment.' });
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Ressource introuvable.' });
});

startScheduler();

app.listen(config.port, () => {
  console.log(`Maths News du Jour démarré sur http://localhost:${config.port}`);
});
