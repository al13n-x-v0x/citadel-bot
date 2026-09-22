const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags } = require('discord.js');
const store = require('./store');

const COLOR = 0x8b5cf6;
const JOIN = '🎉';
let clientRef = null;
const timers = new Map();

function embed() { return new EmbedBuilder().setColor(COLOR).setFooter({ text: 'The Gaming Citadel • Giveaways' }); }
function setClient(c) { clientRef = c; }

function parseDuration(str) {
  if (!str) return 0;
  let total = 0, m;
  const re = /(\d+)(s|m|h|d)/g;
  while ((m = re.exec(str.toLowerCase())) !== null) {
    const n = parseInt(m[1], 10);
    total += { s: n, m: n * 60, h: n * 3600, d: n * 86400 }[m[2]];
  }
  return total;
}

async function handleGStart(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({ content: 'Manage Server chahiye.', flags: MessageFlags.Ephemeral });
  }
  const prize = interaction.options.getString('prize').slice(0, 200);
  const dur = parseDuration(interaction.options.getString('duration'));
  const winners = Math.min(20, Math.max(1, interaction.options.getInteger('winners') || 1));
  const channel = interaction.options.getChannel('channel') || interaction.channel;
  if (!dur) return interaction.reply({ content: 'Duration invalid — `30s`, `10m`, `2h`, `1d`', flags: MessageFlags.Ephemeral });

  const endAt = Date.now() + dur * 1000;
  const e = embed().setTitle('🎉 GIVEAWAY')
    .setDescription(`**Prize:** ${prize}\n**Winners:** ${winners}\n**Ends:** <t:${Math.floor(endAt / 1000)}:R>\n\nClick 🎉 to enter!`);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ct_gw_join').setLabel('Join').setEmoji(JOIN).setStyle(ButtonStyle.Primary)
  );
  const msg = await channel.send({ embeds: [e], components: [row] });
  store.addGiveaway(interaction.guildId, msg.id, { prize, winners, endAt, channelId: channel.id, entries: [], ended: false, hostId: interaction.user.id });
  schedule(interaction.guildId, msg.id, endAt);
  await interaction.reply({ content: `✅ Giveaway live in ${channel} — ends <t:${Math.floor(endAt / 1000)}:R>`, flags: MessageFlags.Ephemeral });
}

function schedule(guildId, messageId, endAt) {
  const key = `${guildId}:${messageId}`;
  const old = timers.get(key);
  if (old) clearTimeout(old);
  const t = setTimeout(() => {
    timers.delete(key);
    if (clientRef) endGiveaway(clientRef, guildId, messageId).catch(err => console.error('gw end:', err.message));
  }, Math.max(0, endAt - Date.now()));
  if (typeof t.unref === 'function') t.unref();
  timers.set(key, t);
}

function rescheduleAll() {
  for (const { guildId, messageId, gw } of store.allGiveaways()) {
    if (!gw.ended && gw.endAt > Date.now()) schedule(guildId, messageId, gw.endAt);
    else if (!gw.ended && clientRef) endGiveaway(clientRef, guildId, messageId).catch(() => {});
  }
}

async function handleJoin(interaction) {
  const gw = store.getGiveaways(interaction.guildId)[interaction.message.id];
  if (!gw || gw.ended) return interaction.reply({ content: 'Giveaway over.', flags: MessageFlags.Ephemeral });
  if (gw.entries.includes(interaction.user.id)) return interaction.reply({ content: 'Already in! 🍀', flags: MessageFlags.Ephemeral });
  gw.entries.push(interaction.user.id);
  store.setGiveaway(interaction.guildId, interaction.message.id, { entries: gw.entries });
  await interaction.reply({ content: `🍀 You're in! **${gw.entries.length}** entrants.`, flags: MessageFlags.Ephemeral });
}

async function endGiveaway(client, guildId, messageId) {
  const gw = store.getGiveaways(guildId)[messageId];
  if (!gw || gw.ended) return;
  const guild = client.guilds.cache.get(guildId);
  const channel = guild?.channels.cache.get(gw.channelId);
  const message = channel ? await channel.messages.fetch(messageId).catch(() => null) : null;
  if (!guild || !channel || !message) { store.setGiveaway(guildId, messageId, { ended: true }); return; }

  let pool = [...gw.entries];
  if (!pool.length) {
    const reacted = await message.reactions.resolve(JOIN)?.users.fetch().catch(() => null);
    if (reacted) pool = [...reacted.filter(u => !u.bot).keys()];
  }
  const winners = [];
  for (const uid of pool.sort(() => Math.random() - 0.5)) {
    if (winners.length >= gw.winners) break;
    if (!winners.includes(uid)) winners.push(uid);
  }
  store.setGiveaway(guildId, messageId, { ended: true, winners, winnersAt: Date.now() });

  const e = EmbedBuilder.from(message.embeds[0] || embed()).setTitle('🎉 GIVEAWAY ENDED').setDescription(
    winners.length
      ? `**Prize:** ${gw.prize}\n**Winner(s):** ${winners.map(id => `<@${id}>`).join(', ')}\n\n**📦 Claim:** DM <@${gw.hostId}> within 48h with this message as proof.`
      : `**Prize:** ${gw.prize}\n\nNo entrants — nobody won 😔`
  );
  const doneRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ct_gw_ended').setLabel('Ended').setEmoji('🏁').setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId(`ct_gw_reroll_${messageId}`).setLabel('Reroll').setStyle(ButtonStyle.Secondary)
  );
  await message.edit({ embeds: [e], components: [doneRow] }).catch(() => {});
  await channel.send({ content: winners.length ? `🎊 ${winners.map(id => `<@${id}>`).join(', ')} won **${gw.prize}**!` : 'No winners.', allowedMentions: { users: winners } }).catch(() => {});

  for (const uid of winners) {
    try {
      const user = await client.users.fetch(uid);
      await user.send({ embeds: [embed().setTitle('🎉 You WON!').setDescription(`**Prize:** ${gw.prize}\n**Server:** ${guild.name}\nDM <@${gw.hostId}> within 48h to claim.`)] });
    } catch {}
  }
}

async function handleReroll(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({ content: 'Staff only.', flags: MessageFlags.Ephemeral });
  }
  const mid = interaction.customId.replace('ct_gw_reroll_', '');
  const gw = store.getGiveaways(interaction.guildId)[mid];
  if (!gw) return interaction.reply({ content: 'Not found.', flags: MessageFlags.Ephemeral });
  const pool = (gw.entries || []).filter(id => !(gw.winners || []).includes(id));
  if (!pool.length) return interaction.reply({ content: 'No entrants left.', flags: MessageFlags.Ephemeral });
  const winner = pool[Math.floor(Math.random() * pool.length)];
  gw.winners = [...(gw.winners || []), winner];
  store.setGiveaway(interaction.guildId, mid, { winners: gw.winners });
  await interaction.reply({ content: `🔄 New winner: <@${winner}> — congrats!`, allowedMentions: { users: [winner] } });
}

module.exports = { handleGStart, handleJoin, handleReroll, endGiveaway, rescheduleAll, setClient };
