'use strict';

const cron = require('node-cron');
const config = require('./config');
const { runPipeline } = require('./run-pipeline');

function startScheduler() {
  if (!cron.validate(config.dailyCron)) {
    console.error(`[scheduler] expression cron invalide : ${config.dailyCron}`);
    return;
  }
  cron.schedule(
    config.dailyCron,
    () => {
      runPipeline().catch((err) => console.error('[scheduler] erreur :', err));
    },
    { timezone: config.timezone }
  );
  console.log(`[scheduler] planifié : « ${config.dailyCron} » (${config.timezone}).`);
}

module.exports = { startScheduler };
