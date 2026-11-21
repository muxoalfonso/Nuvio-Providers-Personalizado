/**
 * EstrenosCinesaa provider for Nuvio / Hermes JS.
 *
 * Resolves the site's WordPress search results and exposes only official
 * YouTube / YouTube-nocookie video embeds (e.g. trailers). Third-party
 * file-hosting players are intentionally not extracted.
 *
 * Nuvio contract: getStreams(tmdbId, mediaType, season, episode)
 */

const BASE = 'https://www.estrenoscinesaa.com';
const WP_SEARCH = BASE + '/wp-json/wp/v2/search';
const ALLOWED_VIDEO_HOSTS = new Set([
  'www.youtube.com',
  'youtube.com',
  'www.youtube-nocookie.com',
  'youtube-nocookie.com',
  'youtu.be'
]);

function safeUrl(value) {
  try {
    const url = new URL(value, BASE);
    if (url.protocol !== 'https:') return null;
    return url;
  } catch (_) {
    return null;
  }
}

function youtubeId(url) {
  const host = url.hostname.toLowerCase();
  if (!ALLOWED_VIDEO_HOSTS.has(host)) return null;

  if (host === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0] || null;
  if (url.pathname === '/watch') return url.searchParams.get('v');
  const match = url.pathname.match(/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{6,})/);
  return match ? match[1] : null;
}

function extractYouTubeLinks(html) {
  const found = [];
  const seen = new Set();
  const patterns = [
    /<iframe[^>]+src=[\"']([^\"']+)[\"']/gi,
    /[\"'](https?:\\?\/\\?\/(?:www\\?\.)?(?:youtube(?:-nocookie)?\\?\.com|youtu\\?\.be)[^\"']*)[\"']/gi
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const raw = match[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/').replace(/&amp;/g, '&');
      const parsed = safeUrl(raw);
      if (!parsed) continue;
      const id = youtubeId(parsed);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      found.push({ id, url: 'https://www.youtube.com/watch?v=' + id });
    }
  }
  return found;
}

async function getJson(url) {
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'NuvioProvider/1.0'
    }
  });
  if (!response.ok) throw new Error('EstrenosCinesaa HTTP ' + response.status);
  return response.json();
}

async function getText(url) {
  const response = await fetch(url, {
    headers: {
      'Accept': 'text/html,application/xhtml+xml',
      'User-Agent': 'NuvioProvider/1.0'
    }
  });
  if (!response.ok) throw new Error('EstrenosCinesaa HTTP ' + response.status);
  return response.text();
}

async function getStreams(tmdbId, mediaType, season, episode) {
  if (!tmdbId || !['movie', 'tv'].includes(mediaType)) return [];

  // WordPress REST search is used as a best-effort lookup. Some sites index
  // TMDB IDs in searchable metadata; if not, the provider safely returns [].
  const searchUrl = WP_SEARCH + '?search=' + encodeURIComponent(String(tmdbId)) + '&per_page=10';
  let results;
  try {
    results = await getJson(searchUrl);
  } catch (_) {
    return [];
  }

  if (!Array.isArray(results) || results.length === 0) return [];

  const streams = [];
  const visited = new Set();

  for (const item of results) {
    if (!item || typeof item.url !== 'string' || visited.has(item.url)) continue;
    const pageUrl = safeUrl(item.url);
    if (!pageUrl || pageUrl.hostname !== 'www.estrenoscinesaa.com') continue;
    visited.add(item.url);

    let html;
    try {
      html = await getText(pageUrl.href);
    } catch (_) {
      continue;
    }

    const videos = extractYouTubeLinks(html);
    for (const video of videos) {
      streams.push({
        title: (item.title && item.title) ? String(item.title) + ' - Tráiler' : 'EstrenosCinesaa - Tráiler',
        url: video.url,
        quality: 'trailer',
        type: 'youtube',
        pageUrl: pageUrl.href
      });
    }
  }

  return streams;
}

module.exports = { getStreams };
