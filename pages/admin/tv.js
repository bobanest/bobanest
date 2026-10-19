'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useState, useEffect } from 'react';
import axios from 'axios';

const CLOUD = 'dyo42wvne';
const PRESET = 'bobanest_preset';

async function uploadImage(file) {
  const isVideo = file.type.startsWith('video/');
  if (isVideo && file.size > 100 * 1024 * 1024) throw new Error('Video must be under 100MB');
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', PRESET);
  fd.append('folder', 'bobanest/tv');
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/${isVideo ? 'video' : 'image'}/upload`, { method: 'POST', body: fd });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  if (!data.secure_url) throw new Error('Upload failed');
  // f_mp4 + q_auto gives a compact, iPad-compatible H.264 file
  const url = isVideo ? data.secure_url.replace('/upload/', '/upload/f_mp4,vc_h264,q_auto/').replace(/\.[a-z0-9]+$/i, '.mp4') : data.secure_url;
  return { url, type: isVideo ? 'video' : 'image' };
}

export default function AdminTv() {
  const [locations, setLocations] = useState([]);
  const [location, setLocation] = useState('');
  const [cfg, setCfg] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    axios.get('/api/locations').then((r) => {
      const list = (r.data || []).filter((l) => l.isActive);
      setLocations(list);
      if (list[0]) setLocation(list[0].slug);
    });
  }, []);

  useEffect(() => {
    if (!location) return;
    setCfg(null);
    axios.get('/api/admin/tv', { params: { location } }).then((r) => setCfg(r.data));
  }, [location]);

  const update = (patch) => setCfg((c) => ({ ...c, ...patch }));
  const updateSlide = (i, patch) =>
    setCfg((c) => ({ ...c, slides: c.slides.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) }));
  const move = (i, dir) =>
    setCfg((c) => {
      const slides = [...c.slides];
      const j = i + dir;
      if (j < 0 || j >= slides.length) return c;
      [slides[i], slides[j]] = [slides[j], slides[i]];
      return { ...c, slides };
    });
  const remove = (i) => setCfg((c) => ({ ...c, slides: c.slides.filter((_, idx) => idx !== i) }));

  const handleFiles = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    setMsg('');
    try {
      const items = [];
      for (const f of Array.from(files)) items.push(await uploadImage(f));
      setCfg((c) => ({
        ...c,
        slides: [...c.slides, ...items.map((u) => ({ imageUrl: u.url, type: u.type, durationSec: 0, isActive: true }))],
      }));
      setMsg('Uploaded. Click Save to publish.');
    } catch (e) {
      setMsg(`Upload error: ${e.message}`);
    } finally {
      setUploading(false);
    }
  };

  const replaceImage = async (i, file) => {
    if (!file) return;
    setUploading(true);
    try {
      const u = await uploadImage(file);
      updateSlide(i, { imageUrl: u.url, type: u.type });
      setMsg('Replaced. Click Save to publish.');
    } catch (e) {
      setMsg(`Upload error: ${e.message}`);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setMsg('');
    try {
      const { data } = await axios.put('/api/admin/tv', {
        location,
        defaultDuration: cfg.defaultDuration,
        transition: cfg.transition,
        fit: cfg.fit,
        slides: cfg.slides,
      });
      setCfg(data);
      setMsg('Saved! TVs update within 30 seconds.');
    } catch (e) {
      setMsg(e.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const tvUrl = typeof window !== 'undefined' && location ? `${window.location.origin}/tv/${location}` : '';

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="max-w-5xl mx-auto p-4">
          <h1 className="text-2xl font-bold mb-4">📺 TV Menu</h1>

          <div className="flex flex-wrap gap-2 mb-4">
            {locations.map((l) => (
              <button
                key={l.slug}
                onClick={() => setLocation(l.slug)}
                className={`px-4 py-2 rounded-full border ${location === l.slug ? 'bg-black text-white' : 'bg-white'}`}
              >
                {l.name}
              </button>
            ))}
          </div>

          {cfg && (
            <>
              <div className="bg-white border rounded-lg p-4 mb-4">
                <div className="text-sm text-gray-600 mb-1">TV link for this location (open it on the TV browser):</div>
                <div className="flex flex-wrap gap-2 items-center">
                  <input readOnly value={tvUrl} className="flex-1 min-w-[250px] border rounded px-2 py-1 text-sm" onFocus={(e) => e.target.select()} />
                  <button className="px-3 py-1 border rounded" onClick={() => navigator.clipboard?.writeText(tvUrl)}>Copy</button>
                  <a className="px-3 py-1 bg-black text-white rounded" href={tvUrl} target="_blank" rel="noreferrer">▶ Launch TV Menu</a>
                </div>
              </div>

              <div className="bg-white border rounded-lg p-4 mb-4 grid sm:grid-cols-3 gap-4">
                <label className="text-sm">
                  Default seconds per image
                  <input type="number" min={2} max={600} value={cfg.defaultDuration}
                    onChange={(e) => update({ defaultDuration: Number(e.target.value) })}
                    className="block w-full border rounded px-2 py-1 mt-1" />
                </label>
                <label className="text-sm">
                  Transition
                  <select value={cfg.transition} onChange={(e) => update({ transition: e.target.value })} className="block w-full border rounded px-2 py-1 mt-1">
                    <option value="fade">Fade</option>
                    <option value="slide">Slide</option>
                    <option value="none">None</option>
                  </select>
                </label>
                <label className="text-sm">
                  Image fit
                  <select value={cfg.fit} onChange={(e) => update({ fit: e.target.value })} className="block w-full border rounded px-2 py-1 mt-1">
                    <option value="contain">Fit whole image (no crop)</option>
                    <option value="cover">Fill screen (may crop)</option>
                  </select>
                </label>
              </div>

              <div className="bg-white border rounded-lg p-4 mb-4">
                <label className="inline-block px-4 py-2 bg-blue-600 text-white rounded cursor-pointer">
                  {uploading ? 'Uploading…' : '+ Upload images / MP4 videos'}
                  <input type="file" accept="image/*,video/mp4,video/quicktime,video/webm" multiple className="hidden" disabled={uploading}
                    onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }} />
                </label>
                <span className="text-xs text-gray-500 ml-3">Use 16:9 images/videos (1920×1080). Videos play muted; keep them short (under 30s).</span>

                <div className="mt-4 grid gap-3">
                  {cfg.slides.length === 0 && <div className="text-gray-500 text-sm">No images yet.</div>}
                  {cfg.slides.map((s, i) => (
                    <div key={`${i}-${s.imageUrl}`} className={`flex flex-wrap gap-3 items-center border rounded p-2 ${s.isActive ? '' : 'opacity-50'}`}>
                      <span className="font-bold w-6 text-center">{i + 1}</span>
                      {s.type === 'video' ? (
                        <video src={s.imageUrl} muted playsInline preload="metadata" className="w-40 h-24 object-contain bg-black rounded" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.imageUrl} alt="" className="w-40 h-24 object-contain bg-gray-100 rounded" />
                      )}
                      <label className="text-xs">
                        {s.type === 'video' ? '🎬 Seconds (0 = play full video)' : 'Seconds (0 = default)'}
                        <input type="number" min={0} max={600} value={s.durationSec || 0}
                          onChange={(e) => updateSlide(i, { durationSec: Number(e.target.value) })}
                          className="block w-24 border rounded px-2 py-1" />
                      </label>
                      <label className="text-xs flex items-center gap-1">
                        <input type="checkbox" checked={s.isActive} onChange={(e) => updateSlide(i, { isActive: e.target.checked })} /> Show
                      </label>
                      <div className="flex gap-1 ml-auto">
                        <button className="px-2 py-1 border rounded" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
                        <button className="px-2 py-1 border rounded" onClick={() => move(i, 1)} disabled={i === cfg.slides.length - 1}>↓</button>
                        <label className="px-2 py-1 border rounded cursor-pointer text-sm">
                          Replace
                          <input type="file" accept="image/*,video/mp4,video/quicktime,video/webm" className="hidden" onChange={(e) => { replaceImage(i, e.target.files?.[0]); e.target.value = ''; }} />
                        </label>
                        <button className="px-2 py-1 border rounded text-red-600" onClick={() => remove(i)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={save} disabled={saving || uploading} className="px-6 py-2 bg-green-600 text-white rounded disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save & Publish'}
                </button>
                {msg && <span className="text-sm">{msg}</span>}
              </div>
            </>
          )}
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
