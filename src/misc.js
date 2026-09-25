// Citadel misc handlers — vouch, profile, leaderboard, level, rolelevels, ping, help, invite, rank
const { EmbedBuilder, AttachmentBuilder, MessageFlags } = require('discord.js');
const BC = String.fromCharCode(96);
const store = require('./store');
const cards = require('./cards');

const COLOR = 0x8b5cf6;
const fmt = (n) => `**${Number(n || 0).toLocaleString()}**`;

function isAdminCtx(interaction) {
  if ((process.env.BOT_OWNERS || '').split(/[\s,]+/).filter(Boolean).includes(interaction.user.id)) return true;
  if (interaction.guild && interaction.guild.ownerId === interaction.user.id) return true;
  return !!interaction.member?.permissions?.has?.('ManageGuild');
}

// ---------------- /vouch ----------------
async function handleVouch(interaction) {
  const user = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason') || 'No reason given';
  const stars = interaction.options.getInteger('stars') || 5;
  if (!user || user.bot) return interaction.reply({ content: 'Sirf real members ko vouch kar sakte ho.', flags: MessageFlags.Ephemeral });
  if (user.id === interaction.user.id) return interaction.reply({ content: 'Khud ko vouch nahi 😅', flags: MessageFlags.Ephemeral });
  const last = store.getVouches(interaction.guildId, user.id).filter(v => v.by === interaction.user.id && Date.now() - v.at < 24 * 60 * 60 * 1000);
  if (last.length >= 3) return interaction.reply({ content: 'Is member ko aaj 3 vouch de chuke ho — kal try karo.', flags: MessageFlags.Ephemeral });
  store.addVouch(interaction.guildId, user.id, interaction.user.id, reason, stars);
  const aura = store.getAura(interaction.guildId, user.id);
  const e = new EmbedBuilder().setColor(COLOR)
    .setTitle(`⭐ ${stars}★ Vouch given!`)
    .setDescription(`<@${user.id}> ko vouch mila: *${reason}*\nAura: **${aura}** (+${stars * 10})`)
    .setFooter({ text: 'The Gaming Citadel • Vouches' });
  await interaction.reply({ embeds: [e] });
}

// ---------------- /profile — full card ----------------
async function handleProfile(interaction) {
  const user = interaction.options.getUser('user') || interaction.user;
  await interaction.deferReply();
  const gId = interaction.guildId;
  const xp = store.getXp(gId, user.id);
  const need = store.xpForLevel(xp.level + 1);
  const vouches = store.getVouches(gId, user.id);
  const stars = vouches.reduce((a, v) => a + (v.stars || 0), 0);
  const png = await cards.rankCard({
    username: user.username,
    avatarUrl: user.displayAvatarURL({ extension: 'png', size: 256 }),
    level: xp.level,
    currentXp: xp.xp,
    neededXp: need,
    rank: null,
    accent: (store.guild(gId).welcome || {}).cardColor || '#8b5cf6'
  });
  const file = new AttachmentBuilder(png, { name: 'profile.png' });
  const e = new EmbedBuilder().setColor(COLOR)
    .setTitle(`👤 ${user.username} — Citadel Profile`)
    .setDescription(
      `💰 Coins: ${fmt(store.getCoins(gId, user.id))}\n` +
      `✨ Aura: **${store.getAura(gId, user.id)}**\n` +
      `⭐ Vouches: **${vouches.length}** (${stars}★ total)\n` +
      `🌌 Level: **${xp.level}**`
    )
    .setImage('attachment://profile.png')
    .setFooter({ text: 'The Gaming Citadel • Profile' });
  await interaction.editReply({ embeds: [e], files: [file] }).catch(() => interaction.editReply({ embeds: [e] }));
}

// ---------------- /leaderboard — aura top ----------------
async function handleLeaderboard(interaction) {
  await interaction.deferReply();
  const top = store.auraLb(interaction.guildId).slice(0, 10);
  if (!top.length) return interaction.editReply('Abhi koi aura nahi — `/vouch` se shuru karo!');
  const medals = ['🥇', '🥈', '🥉'];
  const lines = top.map(([uid, aura], i) => `${medals[i] || '▫️'} <@${uid}> — **${aura}** aura`);
  const e = new EmbedBuilder().setColor(COLOR)
    .setTitle('🏆 Citadel Aura Leaderboard')
    .setDescription(lines.join('\n'))
    .setFooter({ text: 'The Gaming Citadel • Top 10' });
  await interaction.editReply({ embeds: [e] });
}

// ---------------- /level ----------------
async function handleLevel(interaction) {
  const user = interaction.options.getUser('user') || interaction.user;
  await interaction.deferReply();
  const xp = store.getXp(interaction.guildId, user.id);
  const need = store.xpForLevel(xp.level + 1);
  const png = await cards.rankCard({
    username: user.username,
    avatarUrl: user.displayAvatarURL({ extension: 'png', size: 256 }),
    level: xp.level,
    currentXp: xp.xp,
    neededXp: need,
    rank: null,
    accent: (store.guild(interaction.guildId).welcome || {}).cardColor || '#8b5cf6'
  });
  const file = new AttachmentBuilder(png, { name: 'rank.png' });
  await interaction.editReply({ files: [file] }).catch(() => interaction.editReply(`🌌 Level **${xp.level}** (${xp.xp}/${need} XP)`));
}

// ---------------- /rolelevels ----------------
async function handleRolelevels(interaction) {
  if (!isAdminCtx(interaction)) return interaction.reply({ content: 'Admin only.', flags: MessageFlags.Ephemeral });
  const setup = interaction.options.getString('setup');
  if (setup) {
    const entries = [];
    for (const part of setup.split(/[,\s]+/).filter(Boolean)) {
      const m = part.match(/^(\d+):(\d+)$/);
      if (m) entries.push({ level: Number(m[1]), roleId: m[2] });
    }
    if (!entries.length) return interaction.reply({ content: 'Format: `5:ROLE_ID,10:ROLE_ID,20:ROLE_ID`', flags: MessageFlags.Ephemeral });
    store.setLevelRoles(interaction.guildId, entries);
  }
  const roles = store.getLevelRoles(interaction.guildId);
  const e = new EmbedBuilder().setColor(COLOR)
    .setTitle('🏷️ Level Roles')
    .setDescription(roles.length ? roles.sort((a, b) => a.level - b.level).map(r => `Level **${r.level}** → <@&${r.roleId}>`).join('\n') : 'Setup nahi hua. `setup:` option use karo: `5:ROLE_ID,10:ROLE_ID`')
    .setFooter({ text: 'Level up hote hi role auto-assign hota hai' });
  await interaction.reply({ embeds: [e], flags: MessageFlags.Ephemeral });
}

// ---------------- /ping ----------------
async function handlePing(interaction) {
  const start = Date.now();
  await interaction.reply({ content: '🏓 Pinging…', flags: MessageFlags.Ephemeral });
  const round = Date.now() - start;
  await interaction.editReply(`🏓 Pong! WS: ${BC}${interaction.client.ws.ping}ms${BC} | Roundtrip: ${BC}${round}ms${BC}`);
}

// ---------------- /help ----------------
async function handleHelp(interaction) {
  const e = new EmbedBuilder().setColor(COLOR)
    .setTitle('🏰 Citadel Bot — Commands')
    .setDescription(
      '**💰 Economy** — `/daily` `/work` `/coinflip` `/pay` `/coins` `/slots` `/rob`\n' +
      '**🛒 Shop** — `/shop` `/buy` `/inventory`\n' +
      '**⭐ Social** — `/vouch` `/profile` `/leaderboard` `/level` `/rolelevels`\n' +
      '**🎫 Tickets** — `/ticketsetup` `/ticketadd` `/ticketpanel` `/close`\n' +
      '**🎉 Giveaways** — `/gstart`\n' +
      '**🕹️ Arcade** — `/arcade setup` (5 minigames!)\n' +
      '**🎨 Colors** — `/colors setup` `/roleaudit`\n' +
      '**🛡️ Mod** — `/warn` `/warnings` `/timeout` `/purge` `/automod`\n' +
      '**⚙️ Setup** — `/welcome` `/counter` `/aichannel` `/poll`\n' +
      '**🤖 AI** — `/ask`\n' +
      '**✨ Fun** — `/ship` `/roast` `/compliment` `/8ball` `/avatar` `/serverinfo` `/stats`\n' +
      '**🔗 Misc** — `/ping` `/invite` `/help`'
    )
    .setFooter({ text: 'The Gaming Citadel • .gc prefix bhi chalta hai' });
  await interaction.reply({ embeds: [e] });
}

// ---------------- /invite ----------------
async function handleInvite(interaction) {
  const perms = interaction.options?.getString?.('perms') === 'administrator' ? 8 : 1100854324470;
  const url = `https://discord.com/oauth2/authorize?client_id=${interaction.client.user.id}&scope=bot+applications.commands&permissions=${perms}`;
  const e = new EmbedBuilder().setColor(COLOR)
    .setTitle('🔗 Invite Citadel Bot')
    .setDescription(`[**Click here to invite**](${url})\n\nDev portal check agar add fail ho: **Public Bot ON** + **Code Grant OFF**`)
    .setFooter({ text: 'The Gaming Citadel' });
  await interaction.reply({ embeds: [e], flags: MessageFlags.Ephemeral });
}

module.exports = { handleVouch, handleProfile, handleLeaderboard, handleLevel, handleRolelevels, handlePing, handleHelp, handleInvite };
