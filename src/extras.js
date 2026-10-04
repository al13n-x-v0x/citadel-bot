// extras.js — 4 naye features: Birthdays, Starboard, Anti-raid, Weekly Leaderboard
const { EmbedBuilder, PermissionFlagsBits, MessageFlags, ChannelType } = require('discord.js');
const store = require('./store');
const { isAdmin } = require('./util');

const COLOR = 0x8b5cf6;
const DAY_MS = 24 * 60 * 60 * 1000;

function todayKey() { return new Date().toISOString().slice(0, 10); }

// ================= 1) BIRTHDAYS =================
// store per guild: birthdays: { userId: 'MM-DD' }, birthdayChannelId, lastBirthday: { 'date:uid': true }

function handleBirthday(interaction) {
  const sub = interaction.options.getSubcommand();
  const g = store.guild(interaction.guildId);

  if (sub === 'set') {
    const raw = interaction.options.getString('date');
    const m = raw.match(/^(\d{1,2})-(\d{1,2})$/);
    if (!m) return interaction.reply({ content: '❌ Format: `MM-DD` (jaise `07-15` = 15 July).', flags: MessageFlags.Ephemeral });
    const mm = +m[1], dd = +m[2];
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return interaction.reply({ content: '❌ Invalid date — month 1-12, day 1-31.', flags: MessageFlags.Ephemeral });
    if (!g.birthdays) g.birthdays = {};
    g.birthdays[interaction.user.id] = `${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    store.save();
    return interaction.reply({ content: `🎂 Birthday set: **${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}**! Us din server in wish milegi 🎉`, flags: MessageFlags.Ephemeral });
  }

  if (sub === 'remove') {
    if (g.birthdays) { delete g.birthdays[interaction.user.id]; store.save(); }
    return interaction.reply({ content: '🗑️ Birthday hata diya.', flags: MessageFlags.Ephemeral });
  }

  if (sub === 'list') {
    const bdays = g.birthdays || {};
    const lines = Object.entries(bdays).slice(0, 20).map(([uid, d]) => `<@${uid}> — **${d}**`);
    return interaction.reply({ content: lines.length ? '🎂 **Birthdays:**\n' + lines.join('\n') : 'Any birthday set not is — `/birthday set` by your daalo!', flags: MessageFlags.Ephemeral });
  }

  if (sub === 'channel') {
    if (!isAdmin(interaction)) return interaction.reply({ content: 'Admin only.', flags: MessageFlags.Ephemeral });
    g.birthdayChannelId = interaction.channelId;
    store.save();
    return interaction.reply({ content: `✅ Birthday wishes now is channel in jayengi!`, flags: MessageFlags.Ephemeral });
  }
}

// scheduler: har ghante check — aaj kiska birthday
async function birthdayTick(client) {
  const today = todayKey().slice(5); // MM-DD
  for (const [, guild] of client.guilds.cache) {
    const g = store.guild(guild.id);
    if (!g.birthdays) continue;
    if (!g.lastBirthday) g.lastBirthday = {};
    for (const [uid, d] of Object.entries(g.birthdays)) {
      if (d !== today) continue;
      const k = todayKey() + ':' + uid;
      if (g.lastBirthday[k]) continue;
      g.lastBirthday[k] = true;
      store.save();
      const ch = g.birthdayChannelId ? guild.channels.cache.get(g.birthdayChannelId) : guild.systemChannel;
      if (!ch || !ch.isTextBased()) continue;
      store.addCoins(guild.id, uid, 500);
      const e = new EmbedBuilder().setColor(COLOR)
        .setTitle('🎂 HAPPY BIRTHDAY!')
        .setDescription(`🎉 <@${uid}> of aaj **birthday** is!\nSab wish doo — and **500 coins** of gift bot of taraf by! 🎁`)
        .setTimestamp();
      ch.send({ content: `<@${uid}>`, embeds: [e] }).catch(() => {});
    }
  }
}

// ================= 2) STARBOARD =================
// store per guild: starboard: { channelId, threshold, starred: { origMsgId: starMsgId } }

function handleStarboard(interaction) {
  const g = store.guild(interaction.guildId);
  if (!g.starboard) g.starboard = { channelId: null, threshold: 3, starred: {} };
  if (!isAdmin(interaction)) return interaction.reply({ content: 'Admin only.', flags: MessageFlags.Ephemeral });

  const sub = interaction.options.getSubcommand();
  if (sub === 'setup') {
    const threshold = interaction.options.getInteger('threshold') || 3;
    g.starboard.channelId = interaction.channelId;
    g.starboard.threshold = Math.max(1, threshold);
    store.save();
    return interaction.reply({ content: `⭐ **Starboard live!** Is channel in post honge. Threshold: **${g.starboard.threshold}** ⭐ reacts.`, flags: MessageFlags.Ephemeral });
  }
  if (sub === 'remove') {
    g.starboard.channelId = null;
    store.save();
    return interaction.reply({ content: '🗑️ Starboard off.', flags: MessageFlags.Ephemeral });
  }
}

async function onReaction(reaction) {
  try {
    if (reaction.emoji.name !== '⭐') return;
    if (reaction.partial) reaction = await reaction.fetch().catch(() => null);
    if (!reaction || !reaction.message.guildId) return;
    const g = store.guild(reaction.message.guildId);
    const sb = g.starboard;
    if (!sb || !sb.channelId) return;
    const count = reaction.count || 0;
    if (count < (sb.threshold || 3)) return;
    if (sb.starred[reaction.message.id]) return; // already on board
    const ch = reaction.client.channels.cache.get(sb.channelId);
    if (!ch || !ch.isTextBased()) return;
    const msg = reaction.message;
    const e = new EmbedBuilder().setColor(0xffd700)
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
      .setDescription((msg.content || '*media only*').slice(0, 1000) + `\n\n**➡️ [Original message](${msg.url})**`)
      .setFooter({ text: `⭐ ${count} • #${msg.channel.name}` })
      .setTimestamp();
    if (msg.attachments.size) {
      const att = msg.attachments.find(a => a.contentType && a.contentType.startsWith('image/'));
      if (att) e.setImage(att.url);
    }
    const sent = await ch.send({ embeds: [e] }).catch(() => null);
    if (sent) { sb.starred[msg.id] = sent.id; store.save(); }
  } catch (e) { console.error('starboard:', e.message); }
}

// ================= 3) ANTI-RAID =================
// store per guild: antiraid: { enabled, joinWindowSec, joinLimit, action: 'kick'|'alert', lockdownUntil, alertChannelId }
// runtime (in-memory): recentJoins per guild

const joinTracker = new Map(); // guildId -> [timestamps]

function handleAntiraid(interaction) {
  const g = store.guild(interaction.guildId);
  if (!g.antiraid) g.antiraid = { enabled: true, joinWindowSec: 30, joinLimit: 8, action: 'alert', alertChannelId: null, lockdownUntil: 0 };
  if (!isAdmin(interaction)) return interaction.reply({ content: 'Admin only.', flags: MessageFlags.Ephemeral });

  const sub = interaction.options.getSubcommand();
  if (sub === 'setup') {
    const limit = interaction.options.getInteger('joins');
    const windowSec = interaction.options.getInteger('seconds');
    const action = interaction.options.getString('action') || 'alert';
    g.antiraid.enabled = true;
    g.antiraid.joinLimit = Math.max(3, limit);
    g.antiraid.joinWindowSec = Math.max(5, windowSec);
    g.antiraid.action = action;
    g.antiraid.alertChannelId = interaction.channelId;
    store.save();
    return interaction.reply({ content: `🛡️ **Anti-raid ON!** ${g.antiraid.joinLimit} joins in ${g.antiraid.joinWindowSec}s → **${action}**. Alerts is channel in.`, flags: MessageFlags.Ephemeral });
  }
  if (sub === 'off') {
    g.antiraid.enabled = false;
    store.save();
    return interaction.reply({ content: '🛡️ Anti-raid OFF.', flags: MessageFlags.Ephemeral });
  }
  if (sub === 'lockdown') {
    const mins = interaction.options.getInteger('minutes') || 5;
    g.antiraid.lockdownUntil = Date.now() + mins * 60 * 1000;
    store.save();
    return interaction.reply({ content: `🔒 **Lockdown ${mins} min!** Naye members auto-kick honge when until active is.`, flags: MessageFlags.Ephemeral });
  }
  if (sub === 'unlock') {
    g.antiraid.lockdownUntil = 0;
    store.save();
    return interaction.reply({ content: '🔓 Lockdown end.', flags: MessageFlags.Ephemeral });
  }
}

async function onMemberJoin(member) {
  try {
    const g = store.guild(member.guild.id);
    const ar = g.antiraid;
    if (!ar || !ar.enabled) return;
    const now = Date.now();
    // manual lockdown: naye members kick
    if (ar.lockdownUntil && ar.lockdownUntil > now) {
      await member.send('🔒 Server right now lockdown in is — a little der baad join to do.').catch(() => {});
      await member.kick('Lockdown active').catch(() => {});
      console.log(`[antiraid] ${member.guild.name}: lockdown kick ${member.user.tag}`);
      return;
    }
    // raid detection
    const windowMs = (ar.joinWindowSec || 30) * 1000;
    let arr = joinTracker.get(member.guild.id) || [];
    arr = arr.filter(t => now - t < windowMs);
    arr.push(now);
    joinTracker.set(member.guild.id, arr);
    if (arr.length >= (ar.joinLimit || 8)) {
      joinTracker.set(member.guild.id, []);
      const desc = `🚨 **Raid alert!** ${arr.length} joins in ${ar.joinWindowSec}s.\nAction: **${ar.action}**\n\nManual lockdown: \`/antiraid lockdown minutes:10\``;
      console.log(`[antiraid] ${member.guild.name}: RAID — ${arr.length} joins/${ar.joinWindowSec}s`);
      if (ar.action === 'kick') {
        const cutoff = now - windowMs;
        let kicked = 0;
        for (const [, m] of member.guild.members.cache) {
          if (m.joinedTimestamp && m.joinedTimestamp > cutoff && m.kickable && m.id !== member.client.user.id) {
            await m.kick('Anti-raid: mass join').catch(() => {});
            kicked++;
            if (kicked >= 50) break;
          }
        }
      }
      const ch = ar.alertChannelId ? member.guild.channels.cache.get(ar.alertChannelId) : member.guild.systemChannel;
      if (ch && ch.isTextBased()) {
        ch.send({ embeds: [new EmbedBuilder().setColor(0xff4444).setTitle('🚨 RAID DETECTED').setDescription(desc).setTimestamp()] }).catch(() => {});
      }
    }
  } catch (e) { console.error('antiraid:', e.message); }
}

// ================= 4) WEEKLY LEADERBOARD =================
// store per guild: weeklylb: { channelId, lastSent, lastWinners: [uid] }
// Har Sunday 20:00 UTC: economy+XP+arcade combined top-10, top-3 ko prize

function handleWeeklylb(interaction) {
  const g = store.guild(interaction.guildId);
  if (!g.weeklylb) g.weeklylb = { channelId: null, lastSent: 0 };
  if (!isAdmin(interaction)) return interaction.reply({ content: 'Admin only.', flags: MessageFlags.Ephemeral });

  const sub = interaction.options.getSubcommand();
  if (sub === 'setup') {
    const prize = interaction.options.getInteger('prize') || 5000;
    g.weeklylb.channelId = interaction.channelId;
    g.weeklylb.prize = Math.max(100, prize);
    store.save();
    return interaction.reply({ content: `🏆 **Weekly leaderboard ON!** Har **Sunday 8PM UTC** is channel in — top 1 to **${g.weeklylb.prize}** coins auto-prize!`, flags: MessageFlags.Ephemeral });
  }
  if (sub === 'off') {
    g.weeklylb.channelId = null;
    store.save();
    return interaction.reply({ content: '🗑️ Weekly leaderboard OFF.', flags: MessageFlags.Ephemeral });
  }
  if (sub === 'preview') {
    return interaction.reply({ embeds: [buildWeeklyEmbed(interaction.guild)] }).catch(() => interaction.reply('Data not ban paya.'));
  }
}

function combinedScores(guildId) {
  const g = store.guild(guildId);
  const users = new Set([...Object.keys(g.coins || {}), ...Object.keys(g.xp || {})]);
  const scores = [];
  for (const uid of users) {
    const coins = g.coins[uid] || 0;
    const level = g.xp[uid] ? Math.floor(Math.sqrt(g.xp[uid].xp) / 10) : 0;
    scores.push({ uid, score: coins + level * 1000, coins, level });
  }
  return scores.sort((a, b) => b.score - a.score).slice(0, 10);
}

function buildWeeklyEmbed(guild) {
  const top = combinedScores(guild.id);
  const medals = ['🥇', '🥈', '🥉'];
  const lines = top.map((s, i) => {
    const tag = (i < 3 ? medals[i] : `**${i + 1}.**`) + ` <@${s.uid}>`;
    return `${tag} — score **${s.score}** (${s.coins} coins, Lv ${s.level})`;
  });
  return new EmbedBuilder().setColor(COLOR)
    .setTitle('🏆 Weekly Leaderboard — Economy + Levels')
    .setDescription(lines.length ? lines.join('\n') : 'No data not — talk doo, XP kamao, coins jeeto!')
    .setFooter({ text: 'Score = coins + level × 1000 • Har Sunday 8PM UTC auto-post' })
    .setTimestamp();
}

async function weeklyTick(client) {
  const now = new Date();
  // Sunday = 0; 20:00 UTC
  if (now.getUTCDay() !== 0 || now.getUTCHours() !== 20) return;
  const weekKey = todayKey(); // date of that Sunday
  for (const [, guild] of client.guilds.cache) {
    const g = store.guild(guild.id);
    const wlb = g.weeklylb;
    if (!wlb || !wlb.channelId) continue;
    if (wlb.lastSent === weekKey) continue;
    wlb.lastSent = weekKey;
    store.save();
    const ch = guild.channels.cache.get(wlb.channelId);
    if (!ch || !ch.isTextBased()) continue;
    const e = buildWeeklyEmbed(guild);
    const top = combinedScores(guild.id).slice(0, 3);
    const prizes = [Math.round((wlb.prize || 5000) * 0.5), Math.round((wlb.prize || 5000) * 0.3), Math.round((wlb.prize || 5000) * 0.2)];
    for (let i = 0; i < top.length; i++) store.addCoins(guild.id, top[i].uid, prizes[i]);
    if (top.length) {
      e.setDescription(e.data.description + `\n\n💰 **Prizes:** 🥇 ${prizes[0]} • 🥈 ${prizes[1]} • 🥉 ${prizes[2]} — wallets in daal diye!`);
    }
    ch.send({ content: top.length ? `🥇 <@${top[0].uid}> — congratulations!` : undefined, embeds: [e] }).catch(() => {});
  }
}

// ================= scheduler =================
function startSchedulers(client) {
  setInterval(() => {
    birthdayTick(client).catch(e => console.error('birthday:', e.message));
    weeklyTick(client).catch(e => console.error('weeklylb:', e.message));
  }, 10 * 60 * 1000); // har 10 min
}

module.exports = { handleBirthday, handleStarboard, handleAntiraid, handleWeeklylb, onReaction, onMemberJoin, startSchedulers };
