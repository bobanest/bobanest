const LIVE_STATUSES = new Set(['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE']);
const DEFAULT_KEYWORDS = ['fifa', 'world cup'];
const LIVE_REFRESH_MS = 5 * 60 * 1000;
const IDLE_REFRESH_MS = 30 * 60 * 1000;
const ERROR_REFRESH_MS = 5 * 60 * 1000;

const cache = {
  payload: null,
  fetchedAt: 0,
  ttlMs: IDLE_REFRESH_MS,
};

function setCache(payload, ttlMs) {
  cache.payload = payload;
  cache.fetchedAt = Date.now();
  cache.ttlMs = ttlMs;
}

function hasFreshCache() {
  if (!cache.payload || !cache.fetchedAt || !cache.ttlMs) return false;
  return Date.now() - cache.fetchedAt < cache.ttlMs;
}

function sendPayload(res, payload, ttlMs) {
  const cacheSeconds = Math.max(1, Math.floor(ttlMs / 1000));
  res.setHeader('Cache-Control', `public, s-maxage=${cacheSeconds}, stale-while-revalidate=60`);
  return res.status(200).json({
    ...payload,
    pollIntervalMs: ttlMs,
  });
}

function pickLiveFifaFixture(fixtures, keywords) {
  const keywordList = keywords.map((keyword) => keyword.toLowerCase().trim()).filter(Boolean);
  const fifaFixtures = fixtures.filter((fixture) => {
    const leagueName = String(fixture?.league?.name || '').toLowerCase();
    return keywordList.some((keyword) => leagueName.includes(keyword));
  });

  return fifaFixtures.find((fixture) => LIVE_STATUSES.has(String(fixture?.fixture?.status?.short || '')));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.FOOTBALL_API_KEY || process.env.APISPORTS_API_KEY;
  if (!apiKey) {
    return res.status(200).json({
      isLive: false,
      configured: false,
      message: 'FOOTBALL_API_KEY is not configured',
    });
  }

  if (hasFreshCache()) {
    return sendPayload(res, cache.payload, cache.ttlMs);
  }

  const keywords = (process.env.FOOTBALL_TOURNAMENT_KEYWORDS || DEFAULT_KEYWORDS.join(',')).split(',');

  try {
    const response = await fetch('https://v3.football.api-sports.io/fixtures?live=all', {
      headers: { 'x-apisports-key': apiKey },
    });

    if (!response.ok) {
      const payload = {
        isLive: false,
        configured: true,
        error: `Live score provider error (${response.status})`,
      };
      setCache(payload, ERROR_REFRESH_MS);
      return sendPayload(res, payload, ERROR_REFRESH_MS);
    }

    const providerPayload = await response.json();
    const fixtures = Array.isArray(providerPayload?.response) ? providerPayload.response : [];
    const liveFixture = pickLiveFifaFixture(fixtures, keywords);

    if (!liveFixture) {
      const payload = { isLive: false, configured: true };
      setCache(payload, IDLE_REFRESH_MS);
      return sendPayload(res, payload, IDLE_REFRESH_MS);
    }

    const home = liveFixture?.teams?.home?.name || 'Home';
    const away = liveFixture?.teams?.away?.name || 'Away';
    const homeGoals = Number(liveFixture?.goals?.home ?? 0);
    const awayGoals = Number(liveFixture?.goals?.away ?? 0);
    const elapsed = liveFixture?.fixture?.status?.elapsed;
    const league = liveFixture?.league?.name || 'FIFA';
    const minuteLabel = typeof elapsed === 'number' ? `${elapsed}'` : 'LIVE';

    const payload = {
      isLive: true,
      configured: true,
      text: `${league}: ${home} ${homeGoals}-${awayGoals} ${away} (${minuteLabel})`,
    };
    setCache(payload, LIVE_REFRESH_MS);
    return sendPayload(res, payload, LIVE_REFRESH_MS);
  } catch (error) {
    console.error('Live score fetch failed:', error);
    const payload = {
      isLive: false,
      configured: true,
      error: 'Unable to fetch live score',
    };
    setCache(payload, ERROR_REFRESH_MS);
    return sendPayload(res, payload, ERROR_REFRESH_MS);
  }
}
