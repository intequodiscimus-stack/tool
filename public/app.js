'use strict';

const articlesEl = document.getElementById('articles');
const statusEl = document.getElementById('status');
const dateInput = document.getElementById('date-input');
const refreshBtn = document.getElementById('refresh-btn');

function todayKey() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now - offset).toISOString().slice(0, 10);
}

function formatDateFr(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str || '');
  return div.innerHTML;
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle('error', isError);
}

function renderEmpty() {
  articlesEl.innerHTML = `
    <div class="empty">
      <span class="empty-mark">∅</span>
      <p>Aucun article mathématique trouvé pour cette date.</p>
    </div>`;
}

function renderArticles(articles) {
  if (!articles.length) {
    renderEmpty();
    return;
  }
  articlesEl.innerHTML = articles
    .map(
      (a) => `
      <article class="article">
        <span class="rank" aria-hidden="true">${a.rank}</span>
        <div class="article-body">
          <h2 class="article-title">
            <a href="${escapeHtml(a.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(a.title)}</a>
          </h2>
          <p class="article-summary">${escapeHtml(a.summary)}</p>
          <div class="article-meta">
            <span class="badge">${escapeHtml(a.sourceName)}</span>
            <span class="badge score">Pertinence ${a.score}</span>
            ${
              a.publishedAt
                ? `<time datetime="${escapeHtml(a.publishedAt)}">${new Date(a.publishedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</time>`
                : ''
            }
            <a href="${escapeHtml(a.url)}" target="_blank" rel="noopener noreferrer">Article original ↗</a>
          </div>
        </div>
      </article>`
    )
    .join('');
}

async function loadNews(dateKey) {
  setStatus('Chargement des news du jour…');
  articlesEl.innerHTML = '';
  try {
    const res = await fetch(`/api/news?date=${encodeURIComponent(dateKey)}`);
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error || 'Impossible de charger les news.', true);
      renderEmpty();
      return;
    }
    setStatus(
      `${data.count} article${data.count > 1 ? 's' : ''} — ${formatDateFr(data.date)}` +
        (data.generatedAt ? ` · mis à jour à ${new Date(data.generatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : '')
    );
    renderArticles(data.articles);
  } catch {
    setStatus('Erreur réseau : impossible de contacter le serveur.', true);
    renderEmpty();
  }
}

refreshBtn.addEventListener('click', async () => {
  refreshBtn.disabled = true;
  setStatus('Collecte et traduction en cours… Cela peut prendre quelques secondes.');
  try {
    const res = await fetch('/api/refresh', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error || 'Rafraîchissement impossible.', true);
    } else {
      dateInput.value = data.date;
      await loadNews(data.date);
    }
  } catch {
    setStatus('Erreur réseau pendant le rafraîchissement.', true);
  } finally {
    refreshBtn.disabled = false;
  }
});

dateInput.addEventListener('change', () => {
  if (dateInput.value) loadNews(dateInput.value);
});

dateInput.value = todayKey();
loadNews(dateInput.value);
