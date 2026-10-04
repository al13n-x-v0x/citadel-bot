// Citadel Cards — welcome + rank cards (Arcane-style), pure canvas, no external fonts
// Try every known canvas binding first, then self-install once in the background so a
// fresh host does not need a manual npm step from the panel.
let createCanvas, loadImage;
let CANVAS_OK = false;
const CANVAS_CANDIDATES = ['@napi-rs/canvas', 'canvas', 'skia-canvas'];
function tryLoadCanvas() {
  for (const name of CANVAS_CANDIDATES) {
    try {
      const mod = require(name);
      if (!mod || typeof mod.createCanvas !== 'function') continue;
      createCanvas = mod.createCanvas;
      loadImage = typeof mod.loadImage === 'function' ? mod.loadImage : (mod.Image ? null : null);
      CANVAS_OK = true;
      return name;
    } catch (e) { /* try the next one */ }
  }
  return null;
}
let canvasLib = tryLoadCanvas();
if (!canvasLib && process.env.CITADEL_NO_CANVAS_INSTALL !== '1') {
  console.warn('[cards] no canvas module found - installing @napi-rs/canvas in the background');
  try {
    const { spawn } = require('child_process');
    const child = spawn('npm', ['install', '@napi-rs/canvas', '--no-audit', '--no-fund', '--loglevel=error'], {
      cwd: process.cwd(), stdio: "ignore", env: process.env
    });
    child.on('error', (e) => console.warn('[cards] npm install could not start: ' + e.message));
    child.on('exit', (code) => {
      canvasLib = code === 0 ? tryLoadCanvas() : null;
      console.log('[cards] canvas install finished (exit ' + code + ') - ' + (canvasLib ? 'ready: ' + canvasLib : 'still missing, cards stay off'));
    });
  } catch (e) {
    console.warn('[cards] npm install failed: ' + e.message);
  }
} else if (canvasLib) {
  console.log('[cards] canvas ready: ' + canvasLib);
} else {
  console.warn('[cards] canvas unavailable - install skipped, cards disabled');
}

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function hexOr(color, fallback) {
  return /^#?[0-9a-fA-F]{6}$/.test(color || '') ? (color.startsWith('#') ? color : '#' + color) : fallback;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function safeAvatar(url, size) {
  try {
    const img = await loadImage(url);
    return img;
  } catch {
    // fallback: colored circle with initial
    return null;
  }
}

function drawFallbackAvatar(ctx, cx, cy, r, initial, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.floor(r * 1.1)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initial || '?', cx, cy + r * 0.05);
  ctx.restore();
}

function clipCircleAvatar(ctx, img, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  const s = r * 2;
  ctx.drawImage(img, cx - r, cy - r, s, s);
  ctx.restore();
}

// ---------------- WELCOME CARD (1000x380) ----------------
async function welcomeCard({ username, discriminator, avatarUrl, guildName, memberCount, accent = '#8b5cf6', subText = 'Welcome to the Citadel' }) {
  const W = 1000, H = 380;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#1a1b26');
  bg.addColorStop(1, '#0f0f17');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // accent glow strip on left + soft radial
  ctx.fillStyle = hexOr(accent, '#8b5cf6');
  roundRect(ctx, 0, 0, 10, H, 5);
  ctx.fill();
  const glow = ctx.createRadialGradient(W - 120, 60, 10, W - 120, 60, 320);
  glow.addColorStop(0, hexOr(accent, '#8b5cf6') + '55');
  glow.addColorStop(1, '#00000000');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // avatar
  const cx = 210, cy = H / 2, r = 105;
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, Math.PI * 2); ctx.closePath();
  ctx.fillStyle = hexOr(accent, '#8b5cf6'); ctx.fill();
  ctx.restore();
  const img = await safeAvatar(avatarUrl);
  if (img) clipCircleAvatar(ctx, img, cx, cy, r);
  else drawFallbackAvatar(ctx, cx, cy, r, (username || '?')[0].toUpperCase(), hexOr(accent, '#8b5cf6'));

  // texts
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 54px sans-serif';
  const name = username + (discriminator && discriminator !== '0' ? '#' + discriminator : '');
  ctx.fillText(name.slice(0, 18), 360, cy - 60, 560);

  ctx.fillStyle = '#b9bbbe';
  ctx.font = '30px sans-serif';
  ctx.fillText(subText.slice(0, 40), 360, cy + 4, 560);

  ctx.fillStyle = hexOr(accent, '#8b5cf6');
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(`${guildName} • Member #${memberCount}`, 360, cy + 62, 560);

  return canvas.toBuffer('image/png');
}

// ---------------- RANK CARD (930x300) — Arcane-style ----------------
async function rankCard({ username, avatarUrl, level, currentXp, neededXp, rank, accent = '#8b5cf6' }) {
  const W = 930, H = 300;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // bg card
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#232433');
  bg.addColorStop(1, '#15161f');
  ctx.fillStyle = bg;
  roundRect(ctx, 0, 0, W, H, 24);
  ctx.fill();

  // accent border line
  ctx.strokeStyle = hexOr(accent, '#8b5cf6');
  ctx.lineWidth = 4;
  roundRect(ctx, 2, 2, W - 4, H - 4, 22);
  ctx.stroke();

  // avatar
  const cx = 150, cy = H / 2, r = 90;
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r + 5, 0, Math.PI * 2); ctx.closePath();
  ctx.fillStyle = hexOr(accent, '#8b5cf6'); ctx.fill();
  ctx.restore();
  const img = await safeAvatar(avatarUrl);
  if (img) clipCircleAvatar(ctx, img, cx, cy, r);
  else drawFallbackAvatar(ctx, cx, cy, r, (username || '?')[0].toUpperCase(), hexOr(accent, '#8b5cf6'));

  // username
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText(username.slice(0, 16), 285, 92, 420);

  // rank badge (right top)
  if (rank) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#b9bbbe';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('RANK', W - 60, 70);
    ctx.fillStyle = hexOr(accent, '#8b5cf6');
    ctx.font = 'bold 46px sans-serif';
    ctx.fillText('#' + rank, W - 60, 115);
  }

  // level badge (left of bar area, Arcane style box)
  ctx.textAlign = 'center';
  const lvlBoxX = W - 175, lvlBoxY = 170, lvlBoxW = 115, lvlBoxH = 62;
  ctx.fillStyle = hexOr(accent, '#8b5cf6');
  roundRect(ctx, lvlBoxX, lvlBoxY, lvlBoxW, lvlBoxH, 12);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('LEVEL', lvlBoxX + lvlBoxW / 2, lvlBoxY + 20);
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(String(level ?? 0), lvlBoxX + lvlBoxW / 2, lvlBoxY + 46);

  // XP bar
  const barX = 285, barY = 205, barW = 460, barH = 34;
  ctx.fillStyle = '#0f1018';
  roundRect(ctx, barX, barY, barW, barH, barH / 2);
  ctx.fill();
  const pct = clamp((currentXp || 0) / Math.max(1, neededXp || 1), 0, 1);
  if (pct > 0) {
    const fillW = Math.max(barH, barW * pct);
    const barGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    barGrad.addColorStop(0, hexOr(accent, '#8b5cf6'));
    barGrad.addColorStop(1, '#ffffff');
    ctx.fillStyle = barGrad;
    roundRect(ctx, barX, barY, fillW, barH, barH / 2);
    ctx.fill();
  }
  // xp text inside bar
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  const cur = Number(currentXp || 0).toLocaleString();
  const need = Number(neededXp || 0).toLocaleString();
  ctx.fillText(`${cur} / ${need} XP`, barX + barW / 2, barY + barH / 2 + 1);

  return canvas.toBuffer('image/png');
}

// ---------------- STATS CARD (1200x880) — member activity dashboard ----------------
const NL = String.fromCharCode(10);

function toPng(canvas) {
  if (typeof canvas.toBuffer === 'function') return canvas.toBuffer('image/png');
  if (typeof canvas.encodeSync === 'function') return canvas.encodeSync('png');
  if (typeof canvas.toDataURL === 'function') return Buffer.from(canvas.toDataURL().split(',')[1], 'base64');
  throw new Error('canvas cannot encode png');
}

function panel(ctx, x, y, w, h, title) {
  ctx.fillStyle = 'rgba(255,255,255,0.045)';
  roundRect(ctx, x, y, w, h, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.09)';
  ctx.lineWidth = 1;
  ctx.stroke();
  if (title) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(title, x + 26, y + 42);
  }
}

function statRow(ctx, x, y, w, label, value) {
  ctx.fillStyle = '#9fb0d0';
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, x, y);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(value, x + w, y);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + 16);
  ctx.lineTo(x + w, y + 16);
  ctx.stroke();
}

function voiceText(minutes) {
  const m = Math.max(0, Math.round(minutes || 0));
  if (m < 60) return m + ' min';
  const hrs = Math.floor(m / 60);
  const rem = m % 60;
  if (hrs < 24) return hrs + 'h' + (rem ? ' ' + rem + 'm' : '');
  return Math.floor(hrs / 24) + 'd ' + (hrs % 24) + 'h';
}

function shortDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

async function statsCard(opts) {
  const o = opts || {};
  const accent = hexOr(o.accent, '#8b5cf6');
  const W = 1200, H = 880, pad = 44, gap = 24;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0d1430');
  bg.addColorStop(1, '#070a16');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // soft accent blobs, like the reference card
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(W - 120, 40, 200, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(120, H - 60, 240, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // ---- header ----
  const ax = pad + 62, ay = 118;
  let img = null;
  if (loadImage && o.avatarUrl) img = await safeAvatar(o.avatarUrl, 124);
  if (img) clipCircleAvatar(ctx, img, ax, ay, 62);
  else drawFallbackAvatar(ctx, ax, ay, 62, (o.username || '?').slice(0, 1).toUpperCase(), accent);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(ax, ay, 62, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 50px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText((o.username || 'member').slice(0, 22), pad + 150, 106, 620);

  ctx.fillStyle = '#9fb0d0';
  ctx.font = '22px sans-serif';
  const sub = [];
  if (o.tag) sub.push(o.tag);
  sub.push('Joined ' + shortDate(o.joinedAt));
  if (o.serverName) sub.push(o.serverName);
  ctx.fillText(sub.join('  •  '), pad + 152, 146, 620);

  ctx.fillStyle = '#9fb0d0';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('ALL-TIME MESSAGES', W - pad, 96);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 46px sans-serif';
  ctx.fillText(Number(o.total || 0).toLocaleString(), W - pad, 142);

  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, 194);
  ctx.lineTo(W - pad, 194);
  ctx.stroke();

  // ---- three summary panels ----
  const colW = Math.floor((W - pad * 2 - gap * 2) / 3);
  const py = 222, ph = 196;
  const cols = [pad, pad + colW + gap, pad + (colW + gap) * 2];

  panel(ctx, cols[0], py, colW, ph, 'Messages');
  statRow(ctx, cols[0] + 26, py + 96, colW - 52, '24 hours', Number(o.last24h || 0).toLocaleString());
  statRow(ctx, cols[0] + 26, py + 142, colW - 52, '7 days', Number(o.last7d || 0).toLocaleString());
  statRow(ctx, cols[0] + 26, py + 188, colW - 52, '28 days', Number(o.last28d || 0).toLocaleString());

  panel(ctx, cols[1], py, colW, ph, 'Voice activity');
  statRow(ctx, cols[1] + 26, py + 96, colW - 52, '24 hours', voiceText(o.voice24h));
  statRow(ctx, cols[1] + 26, py + 142, colW - 52, '7 days', voiceText(o.voice7d));
  statRow(ctx, cols[1] + 26, py + 188, colW - 52, '28 days', voiceText(o.voice28d));

  panel(ctx, cols[2], py, colW, ph, 'Activity highlights');
  const peakLabel = 'Peak day';
  const peakValue = o.peakDay ? Number(o.peakDay.count).toLocaleString() + ' msgs' : 'No data yet';
  statRow(ctx, cols[2] + 26, py + 96, colW - 52, peakLabel, peakValue);
  statRow(ctx, cols[2] + 26, py + 142, colW - 52, 'Daily average', Number(o.dailyAvg || 0).toLocaleString());
  statRow(ctx, cols[2] + 26, py + 188, colW - 52, 'Top channel', o.topChannelName || 'No data yet');

  // ---- bottom: top channels + chart ----
  const by = py + ph + 24, bh = H - by - pad;
  const leftW = 520, rightX = pad + leftW + gap;

  panel(ctx, pad, by, leftW, bh, 'Top channels');
  const chans = (o.channels || []).slice(0, 5);
  const maxCh = chans.reduce((m, c) => Math.max(m, c.count || 0), 0) || 1;
  ctx.textAlign = 'left';
  if (!chans.length) {
    ctx.fillStyle = '#9fb0d0';
    ctx.font = '22px sans-serif';
    ctx.fillText('No channel activity recorded yet.', pad + 26, by + 92);
  }
  chans.forEach((c, i) => {
    const cy2 = by + 92 + i * 56;
    ctx.fillStyle = '#8b98b8';
    ctx.font = '20px sans-serif';
    ctx.fillText('0' + (i + 1), pad + 26, cy2);
    ctx.fillStyle = accent;
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('#' + String(c.name || 'unknown').slice(0, 18), pad + 62, cy2);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(Number(c.count || 0).toLocaleString(), pad + leftW - 26, cy2);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(ctx, pad + 62, cy2 + 12, leftW - 120, 10, 5);
    ctx.fill();
    ctx.fillStyle = accent;
    roundRect(ctx, pad + 62, cy2 + 12, Math.max(6, Math.round((leftW - 120) * (c.count / maxCh))), 10, 5);
    ctx.fill();
  });

  panel(ctx, rightX, by, W - pad - rightX, bh, 'Charts');
  const daily = o.daily || [];
  const chartX = rightX + 44, chartY = by + 74;
  const chartW = W - pad - rightX - 88, chartH = bh - 150;
  const maxDay = daily.reduce((m, d) => Math.max(m, d.count || 0), 0) || 1;
  const gapPx = 3;
  const barW = Math.max(3, Math.floor((chartW - gapPx * daily.length) / Math.max(daily.length, 1)));
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.moveTo(chartX, chartY + chartH);
  ctx.lineTo(chartX + chartW, chartY + chartH);
  ctx.stroke();
  if (maxDay > 0) {
    ctx.fillStyle = '#9fb0d0';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(Number(maxDay).toLocaleString(), chartX - 8, chartY + 12);
  }
  daily.forEach((d, i) => {
    const h = Math.round(chartH * ((d.count || 0) / maxDay));
    const x = chartX + i * (barW + gapPx);
    ctx.fillStyle = accent;
    roundRect(ctx, x, chartY + chartH - Math.max(h, (d.count ? 3 : 1)), barW, Math.max(h, (d.count ? 3 : 1)), 3);
    ctx.fill();
  });
  ctx.fillStyle = '#9fb0d0';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('28d ago', chartX, chartY + chartH + 26);
  ctx.textAlign = 'right';
  ctx.fillText('today', chartX + chartW, chartY + chartH + 26);
  if (o.peakDay && o.peakDay.count) {
    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('peak ' + o.peakDay.count + ' msgs on ' + shortDate(o.peakDay.day), chartX + chartW / 2, chartY + chartH + 26);
  }

  return toPng(canvas);
}

async function _guard(fn, interaction) {
  if (!CANVAS_OK) {
    // interaction arg kabhi-kabhi plain options object hota hai (rankCard({...})) — sirf real interaction pe reply karo
    if (interaction && typeof interaction.reply === 'function') {
      const payload = { content: '🖼️ Cards temporarily disabled (canvas module missing on host).', flags: 64 };
      if (interaction.deferred || interaction.replied) await interaction.editReply(payload).catch(()=>{});
      else await interaction.reply(payload).catch(()=>{});
    }
    return null;
  }
  return fn(interaction);
}
module.exports = { welcomeCard: (i) => _guard(welcomeCard, i), rankCard: (i) => _guard(rankCard, i), statsCard: (i) => _guard(statsCard, i), isReady: () => CANVAS_OK };
