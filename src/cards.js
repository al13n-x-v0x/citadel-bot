// Citadel Cards — welcome + rank cards (Arcane-style), pure canvas, no external fonts
const { createCanvas, loadImage } = require('canvas');

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

module.exports = { welcomeCard, rankCard };
