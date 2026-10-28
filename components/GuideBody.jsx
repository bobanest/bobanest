import { Fragment } from 'react';

// Safe renderer for the simple guide format: "# heading", "- bullet", "1. step", blank line = new block.
export default function GuideBody({ text }) {
  const blocks = [];
  let list = null;
  String(text || '').split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trimEnd();
    const h = /^#\s+(.*)/.exec(line);
    const b = /^[-*]\s+(.*)/.exec(line);
    const n = /^\d+\.\s+(.*)/.exec(line);
    if (b || n) {
      const type = n ? 'ol' : 'ul';
      if (!list || list.type !== type) { list = { type, items: [], key: i }; blocks.push(list); }
      list.items.push((b || n)[1]);
      return;
    }
    list = null;
    if (h) blocks.push({ type: 'h', text: h[1], key: i });
    else if (line.trim()) blocks.push({ type: 'p', text: line, key: i });
  });

  return (
    <Fragment>
      {blocks.map((b) => {
        if (b.type === 'h') return <h4 key={b.key} className="mt-4 mb-1 font-semibold text-gray-900">{b.text}</h4>;
        if (b.type === 'p') return <p key={b.key} className="my-2 text-gray-700">{b.text}</p>;
        const Tag = b.type;
        return (
          <Tag key={b.key} className={`my-2 pl-6 text-gray-700 space-y-1 ${b.type === 'ol' ? 'list-decimal' : 'list-disc'}`}>
            {b.items.map((t, j) => <li key={j}>{t}</li>)}
          </Tag>
        );
      })}
    </Fragment>
  );
}
