/**
 * Dev-only sink. The page POSTs a data URL and it lands on disk under export/.
 * Used to bounce the procedural audio out to WAV files.
 *   node tools/filesink.mjs
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('export');
fs.mkdirSync(OUT, { recursive: true });

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.method !== 'POST') { res.writeHead(405); res.end('post only'); return; }

  const raw = new URL(req.url, 'http://x').searchParams.get('name') || 'file.bin';
  // keep sub-directories but refuse anything that climbs out of export/
  const safe = raw.split('/').map((p) => p.replace(/[^a-z0-9_.-]/gi, '')).filter(Boolean).join('/');
  const dest = path.resolve(OUT, safe);
  if (!dest.startsWith(OUT)) { res.writeHead(400); res.end('bad path'); return; }

  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    const m = /^data:[^;]+;base64,(.*)$/s.exec(body.trim());
    if (!m) { res.writeHead(400); res.end('not a base64 data url'); return; }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const bytes = Buffer.from(m[1], 'base64');
    fs.writeFileSync(dest, bytes);
    console.log('wrote', safe, bytes.length, 'bytes');
    res.writeHead(200); res.end(safe);
  });
}).listen(5200, () => console.log('file sink on http://localhost:5200'));
