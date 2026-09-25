const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const BC = String.fromCharCode(96);
const store = require('./store');
const { isAdmin } = require('./util');

const COLOR = 0x8b5cf6;
function embed() { return new EmbedBuilder().setColor(COLOR).setFooter({ text: 'The Gaming Citadel • Tickets' }); }

function isStaff(interaction, supportRoleId) {
  if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) return true;
  if (supportRoleId && interaction.member?.roles?.cache.has(supportRoleId)) return true;
  return false;
}

async function handleTicketSetup(interaction) {
  if (!isAdmin(interaction)) return interaction.reply({ content: 'Admin only.', flags: MessageFlags.Ephemeral });
  const patch = {};
  const cat = interaction.options.getChannel('category');
  const role = interaction.options.getRole('support_role');
  const tc = interaction.options.getChannel('transcript_channel');
  if (cat) patch.categoryId = cat.id;
  if (role) patch.supportRoleId = role.id;
  if (tc) patch.transcriptChannelId = tc.id;
  store.setTicketConfig(interaction.guildId, patch);
  const cfg = store.getTicketConfig(interaction.guildId);
  const types = Object.entries(cfg.types);
  const e = embed().setTitle('⚙️ Ticket Setup').setDescription(
    `**Category:** ${cfg.categoryId ? `<#${cfg.categoryId}>` : 'not set'}\n` +
    `**Support role:** ${cfg.supportRoleId ? `<@&${cfg.supportRoleId}>` : 'not set'}\n` +
    `**Transcripts:** ${cfg.transcriptChannelId ? `<#${cfg.transcriptChannelId}>` : 'not set'}\n\n` +
    `**Types:** ${types.map(([k, t]) => `${BC}${k}${BC}`).join(', ')}`
  );
  await interaction.reply({ embeds: [e], flags: MessageFlags.Ephemeral });
}

async function handleTicketAdd(interaction) {
  if (!isAdmin(interaction)) return interaction.reply({ content: 'Admin only.', flags: MessageFlags.Ephemeral });
  const key = interaction.options.getString('key').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 20);
  if (!key) return interaction.reply({ content: 'Invalid key.', flags: MessageFlags.Ephemeral });
  store.setTicketType(interaction.guildId, key, {
    description: interaction.options.getString('description') || key,
    emoji: null
  });
  await interaction.reply({ content: `✅ Type ${BC}${key}${BC} added. Repost the panel.`, flags: MessageFlags.Ephemeral });
}

async function handleTicketPanel(interaction) {
  if (!isAdmin(interaction)) return interaction.reply({ content: 'Admin only.', flags: MessageFlags.Ephemeral });
  const types = Object.entries(store.getTicketConfig(interaction.guildId).types);
  if (!types.length) return interaction.reply({ content: 'No types — /ticketadd first.', flags: MessageFlags.Ephemeral });

  const e = embed().setTitle('🎫 Citadel Support').setDescription(
    'Pick a ticket type below — a private channel will be created.\n• One open ticket per type\n• Only you + staff can see it\n• Transcript saved on close'
  ).addFields({ name: 'Types', value: types.map(([k, t]) => `**${t.description}** (${BC}${k}${BC})`).join('\n').slice(0, 1024) });

  const buttons = types.map(([key, t]) =>
    new ButtonBuilder().setCustomId(`ct_ticket_open_${key}`).setLabel((t.description || key).slice(0, 80)).setStyle(ButtonStyle.Primary)
  );
  const rows = [];
  for (let i = 0; i < Math.min(5, Math.ceil(buttons.length / 5)); i++) {
    rows.push(new ActionRowBuilder().addComponents(...buttons.slice(i * 5, i * 5 + 5)));
  }

  let channel = interaction.channel;
  if (!channel) channel = await interaction.client.channels.fetch(interaction.channelId).catch(() => null);
  if (!channel?.isTextBased()) return interaction.reply({ content: '❌ Channel resolve nahi hua.', flags: MessageFlags.Ephemeral });
  try {
    await channel.send({ embeds: [e], components: rows });
  } catch (err) {
    return interaction.reply({ content: `❌ Post fail: ${err.message.slice(0, 120)}`, flags: MessageFlags.Ephemeral });
  }
  await interaction.reply({ content: '✅ Panel posted.', flags: MessageFlags.Ephemeral });
}

async function openTicket(interaction, typeKey) {
  const cfg = store.getTicketConfig(interaction.guildId);
  const open = cfg.open || {};
  if (open[interaction.user.id] && interaction.guild.channels.cache.has(open[interaction.user.id].channelId)) {
    return interaction.reply({ content: `You already have an open ticket: <#${open[interaction.user.id].channelId}>`, flags: MessageFlags.Ephemeral });
  }
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const num = String(store.nextTicketNumber(interaction.guildId)).padStart(4, '0');
  const basic = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory];
  const overwrites = [
    { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: interaction.user.id, allow: basic },
    { id: interaction.client.user.id, allow: [...basic, PermissionFlagsBits.ManageChannels] }
  ];
  if (cfg.supportRoleId) overwrites.push({ id: cfg.supportRoleId, allow: basic });

  const typeCfg = cfg.types[typeKey] || {};
  const channel = await interaction.guild.channels.create({
    name: `${typeKey}-${num}`,
    type: ChannelType.GuildText,
    parent: cfg.categoryId || null,
    permissionOverwrites: overwrites,
    topic: `[${typeKey}] Ticket #${num} — ${interaction.user.tag}`
  }).catch(() => null);
  if (!channel) return interaction.editReply('❌ Channel create fail — perms check karo.');

  store.setOpenTicket(interaction.guildId, interaction.user.id, { channelId: channel.id, type: typeKey });
  const e = embed().setTitle(`🎫 ${typeCfg.description || typeKey} — #${num}`)
    .setDescription(`Hey <@${interaction.user.id}>!\nDescribe your issue.\n• Close: **Close** button ya ${BC}/close${BC}\n• Staff **Claim** karega`);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ct_ticket_close').setLabel('Close').setEmoji('🔒').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('ct_ticket_claim').setLabel('Claim').setEmoji('🙋').setStyle(ButtonStyle.Secondary)
  );
  const ping = cfg.supportRoleId ? `<@&${cfg.supportRoleId}> ` : '';
  await channel.send({ content: `${ping}<@${interaction.user.id}>`, embeds: [e], components: [row] });
  await interaction.editReply(`✅ Ticket created: ${channel}`);
}

async function requestClose(interaction) {
  const entry = store.findOpenTicketByChannel(interaction.guildId, interaction.channelId);
  if (!entry) return interaction.reply({ content: 'Not a ticket channel.', flags: MessageFlags.Ephemeral });
  const isOwner = entry[0] === interaction.user.id;
  const cfg = store.getTicketConfig(interaction.guildId);
  if (!isOwner && !isStaff(interaction, cfg.supportRoleId)) {
    return interaction.reply({ content: 'Owner ya staff hi close kar sakta hai.', flags: MessageFlags.Ephemeral });
  }
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ct_ticket_close_confirm').setLabel('Confirm — save transcript & delete').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('ct_ticket_close_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
  );
  await interaction.reply({ content: '🔒 Close this ticket?', components: [row], flags: MessageFlags.Ephemeral });
}

async function finalizeClose(interaction) {
  const entry = store.findOpenTicketByChannel(interaction.guildId, interaction.channelId);
  if (!entry) return;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const msgs = [];
  let lastId;
  for (;;) {
    const batch = await interaction.channel.messages.fetch({ limit: 100, before: lastId }).catch(() => null);
    if (!batch || batch.size === 0) break;
    msgs.push(...batch.values());
    lastId = batch.last().id;
    if (batch.size < 100) break;
  }
  msgs.reverse();
  const lines = [
    'The Gaming Citadel — ticket transcript',
    `Channel: #${interaction.channel.name} | Type: ${entry[1].type}`,
    `Opened by: ${entry[0]} | Closed by: ${interaction.user.tag}`,
    `Date: ${new Date().toISOString()}`, ''.padEnd(50, '='), ''
  ];
  for (const m of msgs) {
    const att = m.attachments.size ? ` [${m.attachments.map(a => a.url).join(' ')}]` : '';
    lines.push(`[${new Date(m.createdTimestamp).toISOString()}] ${m.author?.tag}: ${(m.content || '').replace(/\n/g, ' ')}${att}`);
  }
  const file = { attachment: Buffer.from(lines.join('\n'), 'utf8'), name: `transcript-${interaction.channel.name}.txt` };

  const cfg = store.getTicketConfig(interaction.guildId);
  if (cfg.transcriptChannelId) {
    const tch = interaction.guild.channels.cache.get(cfg.transcriptChannelId);
    if (tch?.isTextBased()) {
      const te = embed().setTitle(`📄 Transcript — ${interaction.channel.name}`).setDescription(`Opened by <@${entry[0]}>\nClosed by <@${interaction.user.id}>`);
      await tch.send({ embeds: [te], files: [file] }).catch(() => {});
    }
  }
  store.removeOpenTicket(interaction.guildId, entry[0]);
  await interaction.editReply('📄 Transcript saved. Deleting in 5s...');
  setTimeout(() => interaction.channel.delete('Ticket closed').catch(() => {}), 5000);
}

async function claimTicket(interaction) {
  const entry = store.findOpenTicketByChannel(interaction.guildId, interaction.channelId);
  if (!entry) return;
  const cfg = store.getTicketConfig(interaction.guildId);
  if (!isStaff(interaction, cfg.supportRoleId)) {
    return interaction.reply({ content: '❌ **Only staff can claim.**', flags: MessageFlags.Ephemeral });
  }
  await interaction.channel.permissionOverwrites.edit(entry[0], { SendMessages: false }).catch(() => {});
  await interaction.channel.permissionOverwrites.edit(interaction.user.id, { ViewChannel: true, SendMessages: true, ManageMessages: true }).catch(() => {});
  await interaction.reply(`🙋 Claimed by <@${interaction.user.id}> — opener, staff will handle it.`);
}

async function handleButton(interaction) {
  try {
    if (interaction.customId.startsWith('ct_ticket_open_')) return await openTicket(interaction, interaction.customId.replace('ct_ticket_open_', ''));
    switch (interaction.customId) {
      case 'ct_ticket_close': return await requestClose(interaction);
      case 'ct_ticket_close_confirm': return await finalizeClose(interaction);
      case 'ct_ticket_close_cancel': return await interaction.update({ content: 'Cancelled.', components: [], embeds: [] });
      case 'ct_ticket_claim': return await claimTicket(interaction);
    }
  } catch (err) {
    console.error('Ticket button error:', err);
    const payload = { content: 'Something went wrong 😔', flags: MessageFlags.Ephemeral };
    if (interaction.deferred || interaction.replied) await interaction.editReply(payload).catch(() => {});
    else await interaction.reply(payload).catch(() => {});
  }
}

module.exports = { handleTicketSetup, handleTicketAdd, handleTicketPanel, handleCloseCommand: requestClose, handleButton };
