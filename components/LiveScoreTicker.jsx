import { useEffect, useMemo, useState } from 'react';

const LIVE_POLL_MS = 5 * 60 * 1000;
const IDLE_POLL_MS = 30 * 60 * 1000;

export default function LiveScoreTicker() {
  const [ticker, setTicker] = useState({ isLive: false, text: '' });

  useEffect(() => {
    let mounted = true;
    let timeoutId;

    function scheduleNextPoll(delayMs) {
      if (!mounted) return;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(loadScore, delayMs);
    }

    async function loadScore() {
      let nextPollMs = IDLE_POLL_MS;
      try {
        const res = await fetch('/api/live-score');
        if (!res.ok) throw new Error('Failed to fetch live score');
        const data = await res.json();
        if (!mounted) return;
        const isLive = Boolean(data?.isLive);
        const providedPollInterval = Number(data?.pollIntervalMs);
        if (Number.isFinite(providedPollInterval) && providedPollInterval > 0) {
          nextPollMs = providedPollInterval;
        } else if (isLive) {
          nextPollMs = LIVE_POLL_MS;
        }
        setTicker({
          isLive,
          text: data?.text || '',
        });
      } catch (err) {
        if (!mounted) return;
        setTicker({ isLive: false, text: '' });
        nextPollMs = LIVE_POLL_MS;
      } finally {
        scheduleNextPoll(nextPollMs);
      }
    }

    loadScore();
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  const marqueeText = useMemo(() => {
    if (!ticker.isLive || !ticker.text) return '';
    return `${ticker.text} \u2022 ${ticker.text} \u2022 ${ticker.text}`;
  }, [ticker.isLive, ticker.text]);

  if (!ticker.isLive || !marqueeText) return null;

  return (
    <div className="bg-black text-white overflow-hidden py-2 px-3">
      <div className="live-score-track text-sm font-semibold whitespace-nowrap">{marqueeText}</div>
    </div>
  );
}
