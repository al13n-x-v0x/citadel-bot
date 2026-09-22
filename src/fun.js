const { EmbedBuilder } = require('discord.js');

const COLOR = 0x8b5cf6;
function base() { return new EmbedBuilder().setColor(COLOR).setFooter({ text: 'The Gaming Citadel ✨' }); }

const ROASTS = [
  '{u} ka K/D life me bhi 0.5 hai 💀',
  '{u} NPC hai, prove me wrong 🤡',
  '{u} ke DMs Sahara se bhi dry 🏜️',
  '{u} ne aaj tak clutch nahi mara, prove: life 😭'
];
const COMPLIMENTS = [
  '{u} literal W hai 🏆',
  'god-tier spotted: {u} 👑',
  '{u} ho toh lobby ka vibe alag hai ✨'
];
const BALL = ['🔥 Obviously yes', '💀 Nah bro', '🤔 Chai ke baad pucho', '✅ 100%', '❌ Bhool ja', '⏳ Waqt bataega', '🗿 Sigma says no'];

async function handleShip(interaction) {
  const a = interaction.options.getUser('user1');
  const b = interaction.options.getUser('user2') || interaction.user;
  const seed = (a.id + b.id).split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const pct = seed % 101;
  const bar = '█'.repeat(Math.round(pct / 10)).padEnd(10, '░');
  const verdict = pct > 85 ? '💖 MARRIED.' : pct > 60 ? '🔥 Couple goals' : pct > 35 ? '😏 Scope hai' : '💀 NASA ko report karo';
  await interaction.reply({ embeds: [base().setTitle(`💘 ${a.username} × ${b.username}`).setDescription(`\`${bar}\` **${pct}%**\n\n${verdict}`)] });
}

async function handleRoast(interaction) {
  const u = interaction.options.getUser('user') || interaction.user;
  await interaction.reply(ROASTS[Math.floor(Math.random() * ROASTS.length)].replace('{u}', `<@${u.id}>`));
}

async function handleCompliment(interaction) {
  const u = interaction.options.getUser('user') || interaction.user;
  await interaction.reply(COMPLIMENTS[Math.floor(Math.random() * COMPLIMENTS.length)].replace('{u}', `<@${u.id}>`));
}

async function handle8ball(interaction) {
  await interaction.reply({ embeds: [base().setTitle('🎱 8-Ball').setDescription(`**Q:** ${interaction.options.getString('question')}\n**A:** ${BALL[Math.floor(Math.random() * BALL.length)]}`)] });
}

async function handleAvatar(interaction) {
  const u = interaction.options.getUser('user') || interaction.user;
  await interaction.reply({ embeds: [base().setTitle(`🖼️ ${u.username}`).setImage(u.displayAvatarURL({ size: 512 }))] });
}

async function handleServerinfo(interaction) {
  const g = interaction.guild;
  const e = base().setTitle(`🏰 ${g.name}`)
    .setThumbnail(g.iconURL({ size: 256 }))
    .addFields(
      { name: 'Members', value: `${g.memberCount}`, inline: true },
      { name: 'Created', value: `<t:${Math.floor(g.createdTimestamp / 1000)}:D>`, inline: true },
      { name: 'Owner', value: `<@${g.ownerId}>`, inline: true },
      { name: 'Boosts', value: `${g.premiumSubscriptionCount || 0} (Lvl ${g.premiumTier})`, inline: true }
    );
  await interaction.reply({ embeds: [e] });
}

async function handlePoll(interaction) {
  const q = interaction.options.getString('question');
  const opts = [1, 2, 3, 4].map(n => interaction.options.getString(`option${n}`)).filter(Boolean);
  const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'].slice(0, Math.max(2, opts.length));
  const e = base().setTitle(`🗳️ ${q}`).setDescription(opts.map((o, i) => `${emojis[i]} ${o}`).join('\n'));
  const msg = await interaction.reply({ embeds: [e], fetchReply: true });
  for (const em of emojis) await msg.react(em).catch(() => {});
}


async function handleStats(interaction) {
  const g = interaction.guild;
  const store = require('./store');
  const top = store.coinLb(g.id).slice(0, 5);
  const medals = ['🥇', '🥈', '🥉', '4.', '5.'];
  const e = base().setTitle('🏰 ' + g.name + ' — Citadel Stats')
    .setThumbnail(g.iconURL({ size: 256 }))
    .addFields(
      { name: '👥 Members', value: String(g.memberCount), inline: true },
      { name: '📈 Boosts', value: String(g.premiumSubscriptionCount || 0), inline: true },
      { name: '🏆 Top Coins', value: top.length ? top.map(([uid, amt], i) => medals[i] + ' <@' + uid + '> — ' + amt + ' 🪙').join('\n') : 'Nobody yet', inline: false },
      { name: '🤖 Bot', value: 'Citadel Bot v1.0 — ' + require('./slash').length + ' commands', inline: true },
      { name: '⏱️ Uptime', value: Math.floor(process.uptime() / 3600) + 'h ' + Math.floor((process.uptime() % 3600) / 60) + 'm', inline: true }
    );
  await interaction.reply({ embeds: [e] });
}

module.exports = { handleStats, handleShip, handleRoast, handleCompliment, handle8ball, handleAvatar, handleServerinfo, handlePoll };
