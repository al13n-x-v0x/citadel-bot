const { PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const BC = String.fromCharCode(96);
const store = require('./store');
const { isAdmin } = require('./util');

// guildId -> [{ channelId, type, lastText }]
const KEY = '_counters';

function get(guildId) {
  const g = store.guild(guildId);
  if (!g[KEY]) g[KEY] = [];
  return g[KEY];
}

function textFor(guild, type) {
  const count = guild.memberCount;
  const boosts = guild.premiumSubscriptionCount || 0;
  switch (type) {
    case 'members': return `👥 Members: ${count}`;
    case 'online': return `🟢 Online: ${guild.presences?.cache?.size ?? count}`;
    case 'boosts': return `💎 Boosts: ${boosts}`;
    case 'humans': return `🧍 Humans: ${count}`; // bots subtracted on refresh
    default: return `${type}: ${count}`;
  }
}

async function refreshOne(guild, entry) {
  const ch = guild.channels.cache.get(entry.channelId);
  if (!ch) return false; // deleted — will be pruned by caller
  let text = textFor(guild, entry.type);
  if (entry.type === 'humans') {
    const bots = guild.members.cache.filter(m => m.user.bot).size;
    text = `🧍 Humans: ${Math.max(0, guild.memberCount - bots)}`;
  }
  if (text !== entry.lastText && text.length <= 100) {
    await ch.setName(text, 'Counter refresh').catch(() => {});
    entry.lastText = text;
    store.save();
  }
  return true;
}

async function refreshAll(client) {
  for (const [, guild] of client.guilds.cache) {
    const counters = get(guild.id);
    if (!counters.length) continue;
    // fetch members so humans count is accurate
    await guild.members.fetch().catch(() => {});
    for (const entry of counters) {
      const alive = await refreshOne(guild, entry).catch(() => false);
      if (!alive) {
        const idx = counters.indexOf(entry);
        if (idx >= 0) counters.splice(idx, 1);
        store.save();
      }
    }
  }
}

async function handleCounter(interaction) {
  if (!isAdmin(interaction)) return interaction.reply({ content: 'Admin only.', flags: MessageFlags.Ephemeral });
  const sub = interaction.options.getSubcommand();
  const counters = get(interaction.guildId);

  if (sub === 'setup') {
    const type = interaction.options.getString('type');
    if (counters.length >= 5) return interaction.reply({ content: 'Max 5 counters (Discord limit bhi hai).', flags: MessageFlags.Ephemeral });
    if (counters.some(c => c.type === type)) return interaction.reply({ content: `${BC}${type}${BC} counter already exists.`, flags: MessageFlags.Ephemeral });

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const me = interaction.guild.members.me;
    const ch = await interaction.guild.channels.create({
      name: textFor(interaction.guild, type),
      type: ChannelType.GuildVoice,
      permissionOverwrites: [{ id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.Connect] }]
    }).catch(() => null);
    if (!ch) return interaction.editReply('❌ Channel create fail — **Manage Channels** perm chahiye.');

    counters.push({ channelId: ch.id, type, lastText: ch.name });
    store.save();
    // immediate accurate refresh
    await interaction.guild.members.fetch().catch(() => {});
    await refreshOne(interaction.guild, counters[counters.length - 1]).catch(() => {});
    return interaction.editReply(`✅ ${BC}${type}${BC} counter created: ${ch}\nHar 10 min me auto-update hoga.`);
  }

  if (sub === 'remove') {
    const idx = parseInt(interaction.options.getInteger('index'), 10) - 1;
    const entry = counters[idx];
    if (!entry) return interaction.reply({ content: `No counter #${idx + 1} — /counter list dekho.`, flags: MessageFlags.Ephemeral });
    const ch = interaction.guild.channels.cache.get(entry.channelId);
    if (ch) await ch.delete('Counter removed').catch(() => {});
    counters.splice(idx, 1);
    store.save();
    return interaction.reply({ content: '🗑️ Counter removed.', flags: MessageFlags.Ephemeral });
  }

  if (sub === 'list') {
    const e = counters.length
      ? { embeds: [{ color: 0x8b5cf6, title: '🔢 Counters', description: counters.map((c, i) => `**${i + 1}.** ${BC}${c.type}${BC} → <#${c.channelId}>`).join('\n') }] }
      : { content: 'No counters — `/counter setup` se banao.' };
    return interaction.reply({ ...e, flags: MessageFlags.Ephemeral });
  }
}

module.exports = { handleCounter, refreshAll, get };
