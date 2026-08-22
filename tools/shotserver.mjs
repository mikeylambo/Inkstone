/**
 * Dev-only capture sink. The page POSTs a data URL here and it lands on disk,
 * so screenshots can be reviewed without a compositing browser pane.
 *   node tools/shotserver.mjs
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('shots');
fs.mkdirSync(OUT, { recursive: true });

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.method !== 'POST') { res.writeHead(405); res.end('post only'); return; }

  const name = (new URL(req.url, 'http://x').searchParams.get('name') || 'shot')
    .replace(/[^a-z0-9_-]/gi, '');
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    const m = /^data:image\/(png|jpeg);base64,(.*)$/s.exec(body.trim());
    if (!m) { res.writeHead(400); res.end('not a data url'); return; }
    const file = path.join(OUT, `${name}.${m[1] === 'jpeg' ? 'jpg' : 'png'}`);
    fs.writeFileSync(file, Buffer.from(m[2], 'base64'));
    console.log('wrote', file, Buffer.from(m[2], 'base64').length, 'bytes');
    res.writeHead(200); res.end(file);
  });
}).listen(5199, () => console.log('shot sink on http://localhost:5199'));
