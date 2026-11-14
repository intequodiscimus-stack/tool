# Maths News du Jour

Site de news mathématiques en français : chaque matin, le site agrège les articles
de plusieurs sources publiques (Quanta Magazine, blogs mathématiques, arXiv), les
trie par pertinence, les traduit en français et les affiche dans une interface
épurée et responsive.

## Fonctionnement

1. **Collecte quotidienne** — un planificateur (`node-cron`) lance le pipeline chaque
   matin à 7 h (heure de Paris par défaut). Il récupère les flux RSS de `src/sources.js`,
   filtre les articles des dernières 36 heures et déduplique.
2. **Tri par pertinence** — chaque article reçoit un score basé sur des mots-clés
   mathématiques (titre pondéré plus fort que le résumé), la fraîcheur et la source
   (`src/relevance.js`). Les articles hors-sujet sont écartés.
3. **Traduction française** — titres et résumés sont traduits via une API
   LibreTranslate, avec cache disque pour ne jamais traduire deux fois le même texte.
   En cas d'échec, le texte original est conservé.
4. **Stockage** — un fichier JSON par journée dans `data/` (aucune base de données
   requise).
5. **Affichage** — le frontend appelle `/api/news` et affiche les articles triés
   (rang, source, score de pertinence, lien vers l'original).

## Démarrage

```bash
npm install
cp .env.example .env   # optionnel : personnaliser port, cron, traduction
npm start
```

Le site est disponible sur http://localhost:3000. Au premier lancement, si aucune
news du jour n'existe, la collecte est déclenchée automatiquement.

## Variables d'environnement

| Variable | Défaut | Description |
|---|---|---|
| `PORT` | `3000` | Port d'écoute du serveur |
| `TIMEZONE` | `Europe/Paris` | Fuseau du planificateur |
| `DAILY_CRON` | `0 7 * * *` | Expression cron de la collecte quotidienne |
| `TRANSLATE_ENABLED` | `true` | Activer/désactiver la traduction |
| `LIBRETRANSLATE_URL` | `https://libretranslate.com` | Instance LibreTranslate utilisée |
| `LIBRETRANSLATE_API_KEY` | — | Clé API (recommandé pour l'instance publique) |
| `MAX_ARTICLES` | `30` | Nombre maximum d'articles par jour |

## API

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/api/news?date=AAAA-MM-JJ` | Articles du jour (collecte à la volée si absent) |
| `GET` | `/api/days` | Liste des journées enregistrées |
| `POST` | `/api/refresh` | Force une nouvelle collecte maintenant |

## Ajouter une source

Ajoutez une entrée dans `src/sources.js` :

```js
{
  id: 'ma-source',
  name: 'Nom affiché',
  url: 'https://exemple.com/feed.xml',
  topic: 'math',
}
```

## Structure

```
server.js              Serveur Express + API + planificateur
src/config.js          Configuration (variables d'environnement)
src/sources.js         Flux RSS agrégés
src/fetchNews.js       Collecte, déduplication, tri
src/relevance.js       Score de pertinence mathématique
src/translate.js       Traduction française + cache
src/store.js           Stockage JSON par journée
src/scheduler.js       Tâche quotidienne (node-cron)
src/run-pipeline.js    Pipeline exécutable (npm run refresh)
public/                Frontend (HTML, CSS, JS) épuré et responsive
data/                  Cache JSON généré (non versionné)
```
