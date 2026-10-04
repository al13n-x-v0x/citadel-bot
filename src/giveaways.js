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
    return interaction.reply({ content: 'Manage Server permission required.', flags: MessageFlags.Ephemeral });
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
  // defer first: Discord expires an interaction token ~15 min after the click, and a late
  // reply used to throw 10062 "Unknown interaction" and leave the user with no feedback.
  try { await interaction.deferReply({ flags: MessageFlags.Ephemeral }); } catch { return; }
  const gw = store.getGiveaways(interaction.guildId)[interaction.message.id];
  if (!gw) return interaction.editReply('This giveaway message is old. Click Join on the newest giveaway message in the channel.').catch(() => {});
  if (gw.ended) return interaction.editReply('This giveaway has ended. ' + ((gw.winners && gw.winners.length) ? 'Winner: ' + gw.winners.map(id => '<@' + id + '>').join(', ') : 'No winner.') + ' Keep an eye out for the next one!').catch(() => {});
  if (gw.entries.includes(interaction.user.id)) return interaction.editReply('You are already in! Good luck 🍀').catch(() => {});
  gw.entries.push(interaction.user.id);
  store.setGiveaway(interaction.guildId, interaction.message.id, { entries: gw.entries });
  await interaction.editReply('You are in! **' + gw.entries.length + '** entrant(s).').catch(() => {});
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
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({ content: 'Staff only.', flags: MessageFlags.Ephemeral }).catch(() => {});
  const mid = interaction.customId.replace('ct_gw_reroll_', '');
  try { await interaction.deferReply({ flags: MessageFlags.Ephemeral }); } catch { return; }
  const gw = store.getGiveaways(interaction.guildId)[mid];
  if (!gw) return interaction.editReply('Giveaway not found.').catch(() => {});
  const pool = (gw.entries || []).filter(id => !(gw.winners || []).includes(id));
  if (!pool.length) return interaction.editReply('No entrants left.').catch(() => {});
  const winner = pool[Math.floor(Math.random() * pool.length)];
  gw.winners = [...(gw.winners || []), winner];
  store.setGiveaway(interaction.guildId, mid, { winners: gw.winners });
  await interaction.editReply('New winner: <@' + winner + '> - congratulations!').catch(() => {});
}

// ---------------- /gend /glist /greroll /gdelete ----------------
function adminOnly(interaction) {
  return interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);
}

async function handleGEnd(interaction) {
  if (!adminOnly(interaction)) return interaction.reply({ content: 'Manage Server permission required.', flags: MessageFlags.Ephemeral });
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const gws = store.getGiveaways(interaction.guildId);
  const live = Object.entries(gws).filter(([mid, gw]) => !gw.ended);
  if (!live.length) return interaction.editReply('There is no live giveaway right now.');
  const id = interaction.options.getString('message_id');
  if (id && !(gws[id] && !gws[id].ended)) return interaction.editReply('That message is not a live giveaway. Use /glist to see giveaway IDs.');
  const mid = id || live.sort((a, b) => a[1].endAt - b[1].endAt)[0][0];
  await endGiveaway(clientRef || interaction.client, interaction.guildId, mid);
  return interaction.editReply('Giveaway ended. Winners have been picked and notified.');
}

async function handleGList(interaction) {
  const gws = store.getGiveaways(interaction.guildId);
  const items = Object.entries(gws).sort((a, b) => (b[1].endAt || 0) - (a[1].endAt || 0)).slice(0, 10);
  if (!items.length) return interaction.reply({ content: 'No giveaways yet. Start o ne with /gstart.', flags: MessageFlags.Ephemeral });
  const lines = items.map(([mid, gw]) => {
    const state = gw.ended
      ? (gw.winners && gw.winners.length ? 'ENDED - winner: ' + gw.winners.map(id => '<@' + id + '>').join(', ') : 'ENDED - no entrants')
      : 'LIVE - ends <t:' + Math.floor(gw.endAt / 1000) + ':R>';
    return '**' + gw.prize + '**\n' + (gw.winners || 1) + ' winner(s) - ' + (gw.entries || []).length + ' entries - ' + state + '\nChannel: <#' + gw.channelId + '> - ID: `' + mid + '`';
  });
  return interaction.reply({ embeds: [embed().setTitle('Giveaways in this server').setDescription(lines.join('\n\n'))], flags: MessageFlags.Ephemeral });
}

async function handleGReroll(interaction) {
  if (!adminOnly(interaction)) return interaction.reply({ content: 'Manage Server permission required.', flags: MessageFlags.Ephemeral });
  const mid = interaction.options.getString('message_id').trim();
  const gw = store.getGiveaways(interaction.guildId)[mid];
  if (!gw) return interaction.reply({ content: 'Giveaway not found. Use /glist to see giveaway IDs.', flags: MessageFlags.Ephemeral });
  if (!gw.ended) return interaction.reply({ content: 'This giveaway is still live. End it first with /gend.', flags: MessageFlags.Ephemeral });
  const pool = (gw.entries || []).filter(id => !(gw.winners || []).includes(id));
  if (!pool.length) return interaction.reply({ content: 'No entrants left to reroll.', flags: MessageFlags.Ephemeral });
  const winner = pool[Math.floor(Math.random() * pool.length)];
  gw.winners = [...(gw.winners || []), winner];
  store.setGiveaway(interaction.guildId, mid, { winners: gw.winners });
  return interaction.reply({ content: 'New winner for **' + gw.prize + '**: <@' + winner + '> - congratulations!', allowedMentions: { users: [winner] } });
}

async function handleGDelete(interaction) {
  if (!adminOnly(interaction)) return interaction.reply({ content: 'Manage Server permission required.', flags: MessageFlags.Ephemeral });
  const mid = interaction.options.getString('message_id').trim();
  const gw = store.getGiveaways(interaction.guildId)[mid];
  if (!gw) return interaction.reply({ content: 'Giveaway not found.', flags: MessageFlags.Ephemeral });
  store.deleteGiveaway(interaction.guildId, mid);
  return interaction.reply({ content: 'Deleted giveaway record for **' + gw.prize + '**. The Discord message stays - delete it manually if you want it gone.', flags: MessageFlags.Ephemeral });
}

module.exports = { handleGStart, handleGEnd, handleGList, handleGReroll, handleGDelete, handleJoin, handleReroll, endGiveaway, rescheduleAll, setClient };
