'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const POLL_MS = 30000;

export default function TvMenu() {
  const router = useRouter();
  const location = router.query.location;
  const [cfg, setCfg] = useState(null);
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [cursorHidden, setCursorHidden] = useState(false);
  const wakeLock = useRef(null);
  const versionRef = useRef(null);

  const enterFullscreen = useCallback(() => {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (req && !document.fullscreenElement && !document.webkitFullscreenElement) {
      try { Promise.resolve(req.call(el)).catch(() => {}); } catch {}
    }
    if (navigator.wakeLock) {
      navigator.wakeLock.request('screen').then((l) => { wakeLock.current = l; }).catch(() => {});
    }
  }, []);

  const start = useCallback(() => {
    setStarted(true);
    enterFullscreen();
  }, [enterFullscreen]);

  // Load config, poll for changes, fall back to last cached copy when offline
  useEffect(() => {
    if (!location) return undefined;
    const key = `tv-menu:${location}`;
    let cancelled = false;
    try {
      const cached = JSON.parse(localStorage.getItem(key) || 'null');
      if (cached) { setCfg(cached); versionRef.current = cached.version; }
    } catch {}
    const load = async () => {
      try {
        const r = await fetch(`/api/tv/${encodeURIComponent(location)}`, { cache: 'no-store' });
        if (!r.ok) return;
        const data = await r.json();
        if (cancelled) return;
        if (data.version !== versionRef.current) {
          versionRef.current = data.version;
          setCfg(data);
          setIndex(0);
          try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
        }
      } catch {}
    };
    load();
    const t = setInterval(load, POLL_MS);
    return () => { cancelled = true; clearInterval(t); };
  }, [location]);

  // Slide timer
  const slides = cfg?.slides || [];
  useEffect(() => {
    if (!started || slides.length < 2) return undefined;
    const cur = slides[index % slides.length];
    const secs = cur?.durationSec || cfg.defaultDuration || 10;
    const t = setTimeout(() => setIndex((i) => (i + 1) % slides.length), secs * 1000);
    return () => clearTimeout(t);
  }, [started, index, slides, cfg]);

  // Preload every image so changes are instant
  useEffect(() => {
    slides.forEach((s) => { const i = new Image(); i.src = s.imageUrl; });
  }, [slides]);

  // Hide cursor when idle, re-acquire wake lock and fullscreen on tab return
  useEffect(() => {
    if (!started) return undefined;
    let timer;
    const onMove = () => {
      setCursorHidden(false);
      clearTimeout(timer);
      timer = setTimeout(() => setCursorHidden(true), 3000);
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible' && navigator.wakeLock) {
        navigator.wakeLock.request('screen').then((l) => { wakeLock.current = l; }).catch(() => {});
      }
    };
    onMove();
    window.addEventListener('mousemove', onMove);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [started]);

  // Keys: F = fullscreen, arrows = manual navigation
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'f' || e.key === 'F') enterFullscreen();
      if (!slides.length) return;
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % slides.length);
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + slides.length) % slides.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [slides.length, enterFullscreen]);

  // Autostart when the page was opened with ?autostart=1 (fullscreen may still need one click)
  useEffect(() => {
    if (router.query.autostart === '1' && cfg) {
      setStarted(true);
      enterFullscreen();
    }
  }, [router.query.autostart, cfg, enterFullscreen]);

  const transition = cfg?.transition || 'fade';
  const fit = cfg?.fit === 'cover' ? 'cover' : 'contain';

  return (
    <div
      onClick={() => { if (started) enterFullscreen(); }}
      style={{
        position: 'fixed', inset: 0, background: '#000', overflow: 'hidden',
        cursor: started && cursorHidden ? 'none' : 'default',
      }}
    >
      <Head>
        <title>TV Menu</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="robots" content="noindex" />
      </Head>

      {started && slides.map((s, i) => {
        const active = i === index % slides.length;
        const style = {
          position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: fit,
          transition: transition === 'none' ? 'none' : 'opacity 0.8s ease, transform 0.8s ease',
          opacity: active ? 1 : 0,
          transform: transition === 'slide' ? `translateX(${active ? 0 : i < index % slides.length ? '-100%' : '100%'})` : 'none',
          pointerEvents: 'none',
        };
        // eslint-disable-next-line @next/next/no-img-element
        return <img key={`${i}-${s.imageUrl}`} src={s.imageUrl} alt="" style={style} />;
      })}

      {started && cfg && slides.length === 0 && (
        <div style={{ color: '#888', display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', fontSize: 24 }}>
          No menu images uploaded yet.
        </div>
      )}

      {!started && (
        <button
          onClick={start}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', background: '#111', color: '#fff',
            border: 'none', fontFamily: 'sans-serif', cursor: 'pointer', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 16,
          }}
        >
          <span style={{ fontSize: 'clamp(32px, 6vw, 72px)', fontWeight: 700 }}>▶ Start TV Menu</span>
          <span style={{ fontSize: 'clamp(14px, 2vw, 24px)', opacity: 0.7 }}>Tap or click anywhere to go full screen</span>
        </button>
      )}
    </div>
  );
}
