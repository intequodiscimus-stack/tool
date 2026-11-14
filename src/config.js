'use strict';

const config = {
  port: Number(process.env.PORT || 3000),
  timezone: process.env.TIMEZONE || 'Europe/Paris',
  dailyCron: process.env.DAILY_CRON || '0 7 * * *',
  translateEnabled: (process.env.TRANSLATE_ENABLED || 'true') === 'true',
  libreTranslateUrl: process.env.LIBRETRANSLATE_URL || 'https://libretranslate.com',
  libreTranslateApiKey: process.env.LIBRETRANSLATE_API_KEY || '',
  maxArticles: Number(process.env.MAX_ARTICLES || 30),
  dataDir: 'data',
};

module.exports = config;
