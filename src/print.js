/**
 * The scroll print — a top-down drawing of one run, rendered from RunRecord.
 *
 * Since V0.4 the recognised glyphs are stamped over it in vermilion, so the
 * scroll says not just what you drew but what it *became*.
 *
 * Since V0.3 the ink is the subject. Every stroke the registry laid is in the
 * record, and the print draws them as the dominant layer — weighted by the
 * stroke's own ink width, in the player's sumi or an enemy's grey wash, with
 * the movement path demoted to a faint thread underneath. Before the registry
 * existed this was a drawing of where you walked; now it is a drawing of what
 * you wrote, which is the thing worth keeping.
 */
import { TUNING } from './tuning.js';
import { EV } from './record.js';

const PAPER = '#e8dfcb';
const SUMI = '#1c1917';
const VERMILION = '#b91c1c';
const WASH = '#8c806e';

/**
 * @param {import('./record.js').RunRecord} record
 * @param {object} summary
 * @param {{size?:number, pad?:number}} opts
 * @returns {HTMLCanvasElement}
 */
export function renderPrint(record, summary, opts = {}) {
  const size = opts.size || 720;
  const pad = opts.pad ?? 46;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  // --- paper ---
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, size, size);
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = SUMI;
  for (let i = 0; i < 1400; i++) {
    ctx.fillRect(Math.random() * size, Math.random() * size, Math.random() * 9 + 1, 1);
  }
  ctx.globalAlpha = 1;

  // --- frame ---
  ctx.strokeStyle = SUMI;
  ctx.lineWidth = 3;
  ctx.strokeRect(pad * 0.5, pad * 0.5, size - pad, size - pad);
  ctx.lineWidth = 1;
  ctx.strokeRect(pad * 0.5 + 6, pad * 0.5 + 6, size - pad - 12, size - pad - 12);

  // --- world -> paper ---
  const R = TUNING.player.arenaRadius;
  const inner = size - pad * 2;
  const toPx = (x, z) => [
    pad + ((x + R) / (R * 2)) * inner,
    pad + ((z + R) / (R * 2)) * inner,
  ];

  // arena rim
  ctx.strokeStyle = WASH;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, (inner / 2), 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // --- the ink: every stroke the run laid, oldest first ---
  //
  // Drawn before the path and heavier than it, because this is what the run
  // actually was. Enemy splotches go down first and in a grey wash so the
  // player's own marks read on top.
  const strokes = record.filter(EV.STROKE);
  const mPerPx = (R * 2) / inner;
  if (strokes.length) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const draw = (enemy) => {
      for (const s of strokes) {
        if (!!s.o !== enemy) continue;
        const [x1, y1] = toPx(s.x, s.z);
        const [x2, y2] = toPx(s.x2, s.z2);
        // ink weight is the stroke's real width, in paper pixels
        const w = Math.max(2, (s.w || 0.5) / mPerPx);
        ctx.strokeStyle = enemy ? WASH : SUMI;
        ctx.globalAlpha = enemy ? 0.34 : 0.8;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        // a lighter second pass just off-axis gives the mark a loaded-brush
        // edge instead of a flat cap
        ctx.globalAlpha = enemy ? 0.16 : 0.3;
        ctx.lineWidth = w * 0.45;
        ctx.beginPath();
        ctx.moveTo(x1 + 1.5, y1 - 1.5);
        ctx.lineTo(x2 + 1.5, y2 - 1.5);
        ctx.stroke();
      }
    };
    draw(true);
    draw(false);
    ctx.globalAlpha = 1;
  }

  // --- glyphs: stamped where they were drawn ---
  //
  // Above the ink and below the seal. A run that wrote three shapes should be
  // readable as such from across a room, which is the whole point of the print.
  const glyphs = record.filter(EV.GLYPH);
  for (const g of glyphs) {
    const [gx, gy] = toPx(g.x, g.z);
    const rr = Math.max(16, (g.r || 3) / mPerPx);
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = VERMILION;
    ctx.beginPath();
    ctx.arc(gx, gy, rr, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = VERMILION;
    ctx.font = `${Math.round(rr * 1.1)}px "Yuji Syuku", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(g.k || '·', gx, gy);
    ctx.restore();
  }

  // --- movement path: a thread under the ink, not the subject ---
  const path = record.path;
  if (path.length > 1) {
    ctx.strokeStyle = WASH;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    let started = false;
    for (const p of path) {
      const [px, py] = toPx(p.x, p.z);
      if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    // where the run began
    const [sx, sy] = toPx(path[0].x, path[0].z);
    ctx.fillStyle = WASH;
    ctx.beginPath();
    ctx.arc(sx, sy, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- kills: ink blots ---
  ctx.fillStyle = SUMI;
  for (const k of record.kills) {
    const [x, y] = toPx(k.x, k.z);
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    const r = 5 + Math.random() * 3;
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    // a couple of satellite specks so it reads as a splat, not a dot
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(x + (Math.random() - 0.5) * 22, y + (Math.random() - 0.5) * 22,
        1 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // --- where you were hit: vermilion crosses ---
  ctx.strokeStyle = VERMILION;
  ctx.lineWidth = 2.5;
  for (const h of record.hurts) {
    const [x, y] = toPx(h.x, h.z);
    ctx.beginPath();
    ctx.moveTo(x - 5, y - 5); ctx.lineTo(x + 5, y + 5);
    ctx.moveTo(x + 5, y - 5); ctx.lineTo(x - 5, y + 5);
    ctx.stroke();
  }

  // --- caption ---
  ctx.fillStyle = SUMI;
  ctx.font = '600 16px "IBM Plex Mono", monospace';
  ctx.textBaseline = 'alphabetic';
  const line = `${summary.modeLabel}   WAVE ${summary.wave}   ${Math.floor(summary.timeSeconds)}s   ${summary.score} PTS`;
  ctx.fillText(line, pad, size - pad * 0.62);
  ctx.fillStyle = WASH;
  ctx.font = '400 12px "IBM Plex Mono", monospace';
  ctx.fillText(`SEED ${summary.seed}   ·   V${summary.version || ''}`, pad, size - pad * 0.62 + 18);

  // --- hanko seal ---
  const seal = summary.rank;
  if (seal) {
    const sx = size - pad - 64;
    const sy = size - pad - 74;
    ctx.strokeStyle = VERMILION;
    ctx.lineWidth = 3;
    ctx.strokeRect(sx, sy, 62, 62);
    ctx.fillStyle = 'rgba(185,28,28,0.10)';
    ctx.fillRect(sx, sy, 62, 62);
    ctx.fillStyle = VERMILION;
    ctx.font = '700 40px "Yuji Syuku", serif';
    ctx.textAlign = 'center';
    ctx.fillText(seal.kanji, sx + 31, sy + 46);
    ctx.textAlign = 'left';
  }

  return c;
}

/** Trigger a PNG download of the print. */
export function exportPrintPNG(canvas, filename = 'sumi-scroll.png') {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      resolve(url);
    }, 'image/png');
  });
}
