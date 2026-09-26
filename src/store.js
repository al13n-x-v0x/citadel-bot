const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data.json');

let data = { guilds: {} };
try {
  if (fs.existsSync(DATA_PATH)) data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
} catch (e) {
  console.error('data.json load failed, starting fresh:', e.message);
}

function save() {
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('data.json save failed:', e.message);
  }
}

function rawGet() { return data; }

function guild(id) {
  if (!data.guilds[id]) {
    data.guilds[id] = {
      prefix: process.env.PREFIX || '-',
      welcome: { channelId: null, message: null, autoroleId: null, leaveChannelId: null },
      coins: {},        // userId -> coins
      daily: {},        // userId -> { lastAt, streak }
      lastWork: {},     // userId -> ts
      xp: {},           // userId -> { xp, lastAt }
      levelRoles: [],   // [{ level, roleId }]
      vouches: {},      // userId -> [{ by, reason, stars, at }]
      aura: {},         // userId -> number
      warnings: {},     // userId -> [{ by, reason, at }]
      tickets: {
        categoryId: null, supportRoleId: null, transcriptChannelId: null,
        types: { general: { description: 'General support', emoji: null } },
        open: {}, counter: 0
      },
      giveaways: {},    // messageId -> gw
      automod: { enabled: false, spamMsgs: 5, spamWindowSec: 5, punishment: 'delete', logChannelId: null, badWords: [], linkWhitelist: [], blockLinks: false, exemptRoleIds: [] },
      aiChannelId: null,
      arcadeStats: {},   // 'date:userId' -> { wins, losses, net }
      colorRoles: [],   // roleIds for color selector
      colorPanelMessageId: null,
      dmSentAt: {},     // dedupe map for broadcasts
      dmAllLast: 0
    };
  }
  return data.guilds[id];
}

process.on('SIGINT', () => { try { save(); } catch {} process.exit(0); });
process.on('SIGTERM', () => { try { save(); } catch {} process.exit(0); });

// ---------- economy ----------
function addCoins(guildId, userId, amount) {
  const g = guild(guildId);
  g.coins[userId] = Math.max(0, (g.coins[userId] || 0) + amount);
  save();
  return g.coins[userId];
}
function getCoins(guildId, userId) { return guild(guildId).coins[userId] || 0; }
function coinLb(guildId) { return Object.entries(guild(guildId).coins).sort((a, b) => b[1] - a[1]); }
function transferCoins(guildId, from, to, amount) {
  const g = guild(guildId);
  if ((g.coins[from] || 0) < amount) return false;
  g.coins[from] -= amount;
  g.coins[to] = (g.coins[to] || 0) + amount;
  save();
  return true;
}
function getDaily(guildId, userId) { return guild(guildId).daily[userId] || { lastAt: 0, streak: 0 }; }
function setDaily(guildId, userId, d) { guild(guildId).daily[userId] = d; save(); }
function setLastWork(guildId, userId, at) { guild(guildId).lastWork[userId] = at; save(); }
function getLastWork(guildId, userId) { return guild(guildId).lastWork[userId] || 0; }

// ---------- xp / levels ----------
const XP_COOLDOWN = 60000, XP_MIN = 15, XP_MAX = 25;
function xpForLevel(level) { return Math.ceil((level * 10) ** 2); }
function grantXp(guildId, userId) {
  const g = guild(guildId);
  if (!g.xp[userId]) g.xp[userId] = { xp: 0, lastAt: 0 };
  const u = g.xp[userId];
  if (Date.now() - u.lastAt < XP_COOLDOWN) return null;
  u.lastAt = Date.now();
  const old = Math.floor(Math.sqrt(u.xp) / 10);
  u.xp += XP_MIN + Math.floor(Math.random() * (XP_MAX - XP_MIN + 1));
  const lvl = Math.floor(Math.sqrt(u.xp) / 10);
  save();
  return { level: lvl, leveledUp: lvl > old };
}
function getXp(guildId, userId) {
  const u = guild(guildId).xp[userId];
  return u ? { xp: u.xp, level: Math.floor(Math.sqrt(u.xp) / 10) } : { xp: 0, level: 0 };
}
function setLevelRoles(guildId, entries) { guild(guildId).levelRoles = entries; save(); }
function getLevelRoles(guildId) { return guild(guildId).levelRoles || []; }
function levelRoleFor(guildId, level) {
  let best = null;
  for (const r of getLevelRoles(guildId)) if (level >= r.level && (!best || r.level > best.level)) best = r;
  return best;
}

// ---------- vouches / aura ----------
function addVouch(guildId, userId, by, reason, stars) {
  const g = guild(guildId);
  if (!g.vouches[userId]) g.vouches[userId] = [];
  g.vouches[userId].push({ by, reason, stars, at: Date.now() });
  g.aura[userId] = (g.aura[userId] || 0) + stars * 10;
  save();
}
function getVouches(guildId, userId) { return guild(guildId).vouches[userId] || []; }
function getAura(guildId, userId) { return guild(guildId).aura[userId] || 0; }
function addAura(guildId, userId, amount) { const g = guild(guildId); g.aura[userId] = (g.aura[userId] || 0) + amount; save(); return g.aura[userId]; }
function auraLb(guildId) { return Object.entries(guild(guildId).aura).sort((a, b) => b[1] - a[1]); }

// ---------- moderation ----------
function addWarning(guildId, userId, by, reason) {
  const g = guild(guildId);
  if (!g.warnings[userId]) g.warnings[userId] = [];
  g.warnings[userId].push({ by, reason, at: Date.now() });
  save();
}
function getWarnings(guildId, userId) { return guild(guildId).warnings[userId] || []; }
function clearWarnings(guildId, userId) { delete guild(guildId).warnings[userId]; save(); }

// ---------- welcome ----------
function setWelcome(guildId, patch) { Object.assign(guild(guildId).welcome, patch); save(); }
function getWelcome(guildId) { return guild(guildId).welcome; }

// ---------- tickets ----------
function setTicketConfig(guildId, patch) { Object.assign(guild(guildId).tickets, patch); save(); }
function getTicketConfig(guildId) { return guild(guildId).tickets; }
function setTicketType(guildId, key, cfg) { guild(guildId).tickets.types[key] = cfg; save(); }
function removeTicketType(guildId, key) { delete guild(guildId).tickets.types[key]; save(); }
function nextTicketNumber(guildId) { const n = ++guild(guildId).tickets.counter; save(); return n; }
function setOpenTicket(guildId, userId, info) { guild(guildId).tickets.open[userId] = info; save(); }
function removeOpenTicket(guildId, userId) { delete guild(guildId).tickets.open[userId]; save(); }
function findOpenTicketByChannel(guildId, channelId) {
  const open = guild(guildId).tickets.open;
  for (const [uid, info] of Object.entries(open)) if (info.channelId === channelId) return [uid, info];
  return null;
}

// ---------- giveaways ----------
function addGiveaway(guildId, messageId, gw) { guild(guildId).giveaways[messageId] = gw; save(); }
function setGiveaway(guildId, messageId, patch) { Object.assign(guild(guildId).giveaways[messageId] || {}, patch); save(); }
function getGiveaways(guildId) { return guild(guildId).giveaways; }
function allGiveaways() {
  const out = [];
  for (const [gid, g] of Object.entries(data.guilds)) {
    for (const [mid, gw] of Object.entries(g.giveaways || {})) out.push({ guildId: gid, messageId: mid, gw });
  }
  return out;
}

// ---------- automod ----------
function getAutomod(guildId) { return guild(guildId).automod; }
function setAutomod(guildId, patch) { Object.assign(guild(guildId).automod, patch); save(); }

// ---------- ai ----------
function setAiChannel(guildId, id) { guild(guildId).aiChannelId = id; save(); }
function setAutoTranslateChannel(guildId, id) { guild(guildId).autoTranslateChannelId = id; save(); }
function getAutoTranslateChannel(guildId) { return guild(guildId).autoTranslateChannelId; }
function getAiChannel(guildId) { return guild(guildId).aiChannelId; }

// ---------- broadcast ----------
function setDmSentAt(guildId, userId, at) { guild(guildId).dmSentAt[userId] = at; save(); }
function getDmSentAt(guildId, userId) { return guild(guildId).dmSentAt[userId] || 0; }
function setDmAllLast(guildId, at) { guild(guildId).dmAllLast = at; save(); }
function getDmAllLast(guildId) { return guild(guildId).dmAllLast || 0; }

module.exports = {
  save, guild, rawGet,
  addCoins, getCoins, coinLb, transferCoins, getDaily, setDaily, setLastWork, getLastWork,
  grantXp, getXp, xpForLevel, setLevelRoles, getLevelRoles, levelRoleFor,
  addVouch, getVouches, getAura, addAura, auraLb,
  addWarning, getWarnings, clearWarnings,
  setWelcome, getWelcome,
  setTicketConfig, getTicketConfig, setTicketType, removeTicketType, nextTicketNumber, setOpenTicket, removeOpenTicket, findOpenTicketByChannel,
  addGiveaway, setGiveaway, getGiveaways, allGiveaways,
  getAutomod, setAutomod,
  setAiChannel, getAiChannel, setAutoTranslateChannel, getAutoTranslateChannel,
  setDmSentAt, getDmSentAt, setDmAllLast, getDmAllLast,
  recordArcade, arcadeDailyLb, arcadeAllTimeLb,
  setColorRoles, getColorRoles, setColorPanelMessage, getColorPanelMessage
};

// ---------- arcade stats ----------
function todayKey() { return new Date().toISOString().slice(0, 10); }

function recordArcade(guildId, userId, net) {
  const g = guild(guildId);
  const k = todayKey() + ':' + userId;
  if (!g.arcadeStats[k]) g.arcadeStats[k] = { wins: 0, losses: 0, net: 0 };
  const st = g.arcadeStats[k];
  if (net > 0) st.wins++;
  else if (net < 0) st.losses++;
  st.net += net;
  save();
}

function arcadeDailyLb(guildId) {
  const g = guild(guildId);
  const day = todayKey();
  return Object.entries(g.arcadeStats)
    .filter(([k]) => k.startsWith(day + ':'))
    .map(([k, v]) => [k.split(':')[1], v])
    .sort((a, b) => b[1].net - a[1].net)
    .slice(0, 10);
}

function arcadeAllTimeLb(guildId) {
  const g = guild(guildId);
  const totals = {};
  for (const [k, v] of Object.entries(g.arcadeStats)) {
    const uid = k.split(':')[1];
    totals[uid] = (totals[uid] || 0) + v.net;
  }
  return Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 10);
}

// ---------- color roles ----------
function setColorRoles(guildId, roleIds) { guild(guildId).colorRoles = roleIds; save(); }
function getColorRoles(guildId) { return guild(guildId).colorRoles || []; }
function setColorPanelMessage(guildId, messageId) { guild(guildId).colorPanelMessageId = messageId; save(); }
function getColorPanelMessage(guildId) { return guild(guildId).colorPanelMessageId; }
