const { EmbedBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const BC = String.fromCharCode(96);
const store = require('./store');
const { isAdmin } = require('./util');

const URL_REGEX = /(https?:\/\/|www\.)[^\s]+|discord\.gg\/[^\s]+/i;
const msgLog = new Map();

function logTo(guild, cfg, desc) {
  if (!cfg.logChannelId) return;
  const ch = guild.channels.cache.get(cfg.logChannelId);
  if (ch?.isTextBased()) {
    ch.send({ embeds: [new EmbedBuilder().setColor(0xff4d4d).setTitle('🛡️ Auto-Mod').setDescription(desc).setTimestamp()] }).catch(() => {});
  }
}

async function handleMessage(message) {
  if (!message.guild || message.author.bot) return false;
  const cfg = store.getAutomod(message.guild.id);
  if (!cfg.enabled) return false;
  if (message.member?.permissions?.has?.(PermissionFlagsBits.ManageMessages)) return false;
  if (cfg.exemptRoleIds?.some(id => message.member?.roles?.cache?.has(id))) return false;

  const key = `${message.guild.id}:${message.author.id}`;
  const now = Date.now();
  const arr = (msgLog.get(key) || []).filter(t => now - t < (cfg.spamWindowSec || 5) * 1000);
  arr.push(now);
  msgLog.set(key, arr);

  let reason = null;
  if (arr.length > (cfg.spamMsgs || 5)) reason = `Spam (${arr.length} msgs/${cfg.spamWindowSec}s)`;
  if (!reason && cfg.badWords.length) {
    const hit = cfg.badWords.find(w => message.content.toLowerCase().includes(w.toLowerCase()));
    if (hit) reason = 'Bad word';
  }
  if (!reason && (cfg.blockLinks || cfg.linkWhitelist.length > 0) && URL_REGEX.test(message.content)) {
    reason = 'Link not allowed';
  }
  if (!reason) return false;

  await message.delete().catch(() => {});
  message.channel.send(`🛡️ <@${message.author.id}> — auto-mod: ${reason}`)
    .then(m => setTimeout(() => m.delete().catch(() => {}), 5000)).catch(() => {});
  if (arr.length > (cfg.spamMsgs || 5) * 3 && cfg.punishment === 'timeout') {
    message.member?.timeout(10 * 60 * 1000, `Auto-mod: ${reason}`).catch(() => {});
  }
  logTo(message.guild, cfg, `<@${message.author.id}> — ${reason}`);
  return true;
}

async function handleAutomod(interaction) {
  if (!isAdmin(interaction)) return interaction.reply({ content: 'Admin only.', flags: MessageFlags.Ephemeral });
  const patch = {};
  const notes = [];
  const enabled = interaction.options.getBoolean('enabled');
  const spamMsgs = interaction.options.getInteger('spam_msgs');
  const addWords = interaction.options.getString('add_badwords');
  const blockLinks = interaction.options.getBoolean('block_links');
  const logChannel = interaction.options.getChannel('log_channel');
  const cfg = store.getAutomod(interaction.guildId);

  if (enabled !== null) { patch.enabled = enabled; notes.push(`Auto-mod **${enabled ? 'ON' : 'OFF'}**`); }
  if (spamMsgs !== null) { patch.spamMsgs = Math.max(3, Math.min(20, spamMsgs)); notes.push(`Spam: ${patch.spamMsgs} msgs/window`); }
  if (blockLinks !== null) { patch.blockLinks = blockLinks; notes.push(`Block links: **${blockLinks ? 'ON' : 'OFF'}**`); }
  if (logChannel) { patch.logChannelId = logChannel.id; notes.push(`Logs → ${logChannel}`); }
  if (addWords) {
    const words = addWords.split(/[,\s]+/).map(w => w.toLowerCase()).filter(Boolean);
    patch.badWords = [...new Set([...cfg.badWords, ...words])].slice(0, 100);
    notes.push(`+${words.length} bad words`);
  }
  store.setAutomod(interaction.guildId, patch);
  const f = store.getAutomod(interaction.guildId);
  const e = new EmbedBuilder().setColor(0x8b5cf6).setTitle('🛡️ Auto-Mod')
    .setDescription((notes.map(n => `✅ ${n}`).join('\n') || '*No changes*') +
      `\n\n**Status:** ${f.enabled ? '🟢 ON' : '🔴 OFF'}\n**Bad words:** ${f.badWords.length}\n**Block links:** ${f.blockLinks ? 'yes' : 'no'}`);
  await interaction.reply({ embeds: [e], flags: MessageFlags.Ephemeral });
}

async function handleWarn(interaction) {
  if (!isAdmin(interaction)) return interaction.reply({ content: 'Admin only.', flags: MessageFlags.Ephemeral });
  const user = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason') || 'No reason';
  store.addWarning(interaction.guildId, user.id, interaction.user.id, reason);
  await user.send(`⚠️ You were warned in **${interaction.guild.name}**: ${reason}`).catch(() => {});
  await interaction.reply(`⚠️ <@${user.id}> warned — **${reason}** (${store.getWarnings(interaction.guildId, user.id).length} total)`);
}

async function handleWarnings(interaction) {
  const user = interaction.options.getUser('user') || interaction.user;
  const warns = store.getWarnings(interaction.guildId, user.id);
  const e = new EmbedBuilder().setColor(0x8b5cf6).setTitle(`⚠️ Warnings — ${user.username}`)
    .setDescription(warns.length ? warns.map((w, i) => `**${i + 1}.** ${w.reason} — <@${w.by}>`).join('\n') : 'Clean slate ✨');
  await interaction.reply({ embeds: [e] });
}

async function handleClearWarnings(interaction) {
  if (!isAdmin(interaction)) return interaction.reply({ content: 'Admin only.', flags: MessageFlags.Ephemeral });
  const user = interaction.options.getUser('user');
  store.clearWarnings(interaction.guildId, user.id);
  await interaction.reply(`✅ Cleared warnings for <@${user.id}>.`);
}

async function handlePurge(interaction) {
  if (!isAdmin(interaction)) return interaction.reply({ content: 'Admin only.', flags: MessageFlags.Ephemeral });
  const n = Math.min(100, Math.max(1, interaction.options.getInteger('count')));
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const deleted = await interaction.channel.bulkDelete(n, true).catch(() => null);
  await interaction.editReply(`🧹 Deleted **${deleted ? deleted.size : 0}** messages.`);
}

async function handleTimeout(interaction) {
  if (!isAdmin(interaction)) return interaction.reply({ content: 'Admin only.', flags: MessageFlags.Ephemeral });
  const user = interaction.options.getUser('user');
  const mins = interaction.options.getInteger('minutes');
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);
  if (!member) return interaction.reply({ content: 'Member not found.', flags: MessageFlags.Ephemeral });
  await member.timeout(mins * 60000, `By ${interaction.user.tag}`).catch(() => {});
  await interaction.reply(`🔇 <@${user.id}> timed out for **${mins} min**.`);
}


// ---------------- /ban /kick /unban ----------------
async function handleBan(interaction) {
  if (!isAdmin(interaction)) return interaction.reply({ content: 'Admin only.', flags: MessageFlags.Ephemeral });
  const user = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason') || 'No reason';
  const dm = interaction.options.getBoolean('dm') ?? true;
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);
  if (!member) {
    // not in server — try direct ban by id
    await interaction.guild.members.ban(user.id, { reason: `${interaction.user.tag}: ${reason}` }).catch(() => null);
    return interaction.reply(`🔨 ${BC}<@${user.id}>${BC} banned (was not in server). Reason: ${reason}`);
  }
  if (!member.bannable) return interaction.reply({ content: '❌ Ye role hierarchy me upar hai — ban nahi kar sakta.', flags: MessageFlags.Ephemeral });
  if (dm) await user.send(`You were banned from **${interaction.guild.name}**. Reason: ${reason}`).catch(() => {});
  await member.ban({ reason: `${interaction.user.tag}: ${reason}` });
  await interaction.reply(`🔨 **${user.tag}** banned. Reason: ${reason}`);
}

async function handleKick(interaction) {
  if (!isAdmin(interaction)) return interaction.reply({ content: 'Admin only.', flags: MessageFlags.Ephemeral });
  const user = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason') || 'No reason';
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);
  if (!member) return interaction.reply({ content: 'Member server me nahi hai.', flags: MessageFlags.Ephemeral });
  if (!member.kickable) return interaction.reply({ content: '❌ Ye role hierarchy me upar hai — kick nahi kar sakta.', flags: MessageFlags.Ephemeral });
  await user.send(`You were kicked from **${interaction.guild.name}**. Reason: ${reason}`).catch(() => {});
  await member.kick(`${interaction.user.tag}: ${reason}`);
  await interaction.reply(`👢 **${user.tag}** kicked. Reason: ${reason}`);
}

async function handleUnban(interaction) {
  if (!isAdmin(interaction)) return interaction.reply({ content: 'Admin only.', flags: MessageFlags.Ephemeral });
  const id = interaction.options.getString('user_id').trim();
  if (!/^\d{17,20}$/.test(id)) return interaction.reply({ content: '❌ Valid user ID do (digits only).', flags: MessageFlags.Ephemeral });
  try {
    const user = await interaction.guild.members.unban(id, `By ${interaction.user.tag}`);
    await interaction.reply(`✅ **${user.tag}** unbanned.`);
  } catch {
    await interaction.reply({ content: '❌ Ye user ban list me nahi mila.', flags: MessageFlags.Ephemeral });
  }
}

module.exports = { handleMessage, handleAutomod, handleWarn, handleWarnings, handleClearWarnings, handlePurge, handleTimeout, handleBan, handleKick, handleUnban };
