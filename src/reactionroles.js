// Reaction Roles — emoji picker + role mapping, persisted panels
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { isAdmin } = require('./util');
const store = require('./store');

function makeEmbed() {
  return new EmbedBuilder().setColor(0x5865f2).setFooter({ text: 'The Gaming Citadel • Reaction Roles' });
}

// ---------------- /reactionrole ----------------
async function handleReactionRole(interaction) {
  if (!isAdmin(interaction)) {
    return interaction.reply({ content: '❌ Admin only.', flags: MessageFlags.Ephemeral });
  }
  const sub = interaction.options.getSubcommand();

  if (sub === 'setup') {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const title = interaction.options.getString('title') || 'Pick your roles!';
    const gid = interaction.guild.id;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const data = store.getData();
    if (!data.guilds[gid]) data.guilds[gid] = {};
    if (!data.guilds[gid].reactionRoles) data.guilds[gid].reactionRoles = { nextId: 1, panels: {} };
    const rr = data.guilds[gid].reactionRoles;

    const panelEmbed = makeEmbed()
      .setTitle(title)
      .setDescription('Select roles from the menu below.\n\n*No roles added yet — use `/reactionrole add` with this panel.*')
      .addFields({ name: 'Panel ID', value: `\`pending\``, inline: true });

    const sel = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder().setCustomId('rr_placeholder_select').setPlaceholder('Roles appear here once added').setMinValues(0).setMaxValues(1).addOptions([{ label: 'Coming soon', value: 'none' }])
    );

    try {
      const msg = await channel.send({ embeds: [panelEmbed], components: [sel] });
      const panelId = 'rr' + rr.nextId++;
      rr.panels[panelId] = { channelId: channel.id, messageId: msg.id, title, roles: [] };
      store.save();
      msg.edit({ embeds: [panelEmbed.setFields({ name: 'Panel ID', value: `\`${panelId}\``, inline: true })] }).catch(() => {});

      return interaction.editReply({
        content: `✅ Panel created in ${channel} — **ID: \`${panelId}\`**\nAb roles add karo: \`/reactionrole add panel:${panelId} role:@Role emoji:😀\` (repeat for each role).`
      });
    } catch (e) {
      return interaction.editReply({ content: '❌ Post fail: ' + e.message });
    }
  }

  if (sub === 'add') {
    const panelId = interaction.options.getString('panel');
    const role = interaction.options.getRole('role');
    const emoji = interaction.options.getString('emoji');
    const gid = interaction.guild.id;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const data = store.getData();
    const rr = data.guilds[gid] && data.guilds[gid].reactionRoles;
    const panel = rr && rr.panels[panelId];
    if (!panel) return interaction.editReply({ content: '❌ Panel nahi mila — `/reactionrole setup` se pehle banao.' });
    if (panel.roles.length >= 20) return interaction.editReply({ content: '❌ Max 20 roles per panel.' });
    if (role.managed || role.id === interaction.guild.id) return interaction.editReply({ content: '❌ Wo role assign nahi kar sakta (managed/@everyone).' });

    // role validation: hierarchy
    if (role.position >= interaction.guild.members.me.roles.highest.position) {
      return interaction.editReply({ content: '❌ Mera role `' + role.name + '` se upar hona chahiye (Server Settings → Roles → mera role drag to top).' });
    }

    if (panel.roles.some(r => r.roleId === role.id)) return interaction.editReply({ content: '❌ Wo role already panel pe hai.' });
    if (panel.roles.some(r => r.emoji === emoji)) return interaction.editReply({ content: '❌ Wo emoji already used hai.' });

    panel.roles.push({ roleId: role.id, roleName: role.name, emoji });
    store.save();
    await refreshPanel(interaction.guild, panelId);

    const list = panel.roles.map(r => `${r.emoji} → <@&${r.roleId}>`).join('\n');
    return interaction.editReply({ content: `✅ Added! Panel \`${panelId}\` me ab ${panel.roles.length} roles:\n${list}` });
  }

  if (sub === 'remove') {
    const panelId = interaction.options.getString('panel');
    const role = interaction.options.getRole('role');
    const gid = interaction.guild.id;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const data = store.getData();
    const rr = data.guilds[gid] && data.guilds[gid].reactionRoles;
    const panel = rr && rr.panels[panelId];
    if (!panel) return interaction.editReply({ content: '❌ Panel nahi mila.' });

    const before = panel.roles.length;
    panel.roles = panel.roles.filter(r => r.roleId !== role.id);
    if (panel.roles.length === before) return interaction.editReply({ content: '❌ Wo role panel pe nahi tha.' });
    store.save();
    await refreshPanel(interaction.guild, panelId);
    return interaction.editReply({ content: `✅ Removed \`${role.name}\` from \`${panelId}\`.` });
  }

  if (sub === 'list') {
    const data = store.getData();
    const rr = data.guilds[interaction.guild.id] && data.guilds[interaction.guild.id].reactionRoles;
    if (!rr || !Object.keys(rr.panels).length) {
      return interaction.reply({ content: 'Koi reaction-role panel nahi hai. `/reactionrole setup` se banao.', flags: MessageFlags.Ephemeral });
    }
    const desc = Object.entries(rr.panels).map(([id, p]) => {
      const ch = `<#${p.channelId}>`;
      return p.roles.length
        ? `**\`${id}\`** — ${ch} — ${p.roles.length} roles:\n` + p.roles.map(r => `  ${r.emoji} → <@&${r.roleId}>`).join('\n')
        : `**\`${id}\`** — ${ch} — *empty*`;
    }).join('\n\n');
    return interaction.reply({ embeds: [makeEmbed().setTitle('Reaction Role Panels').setDescription(desc.slice(0, 4000))], flags: MessageFlags.Ephemeral });
  }

  if (sub === 'delete') {
    const panelId = interaction.options.getString('panel');
    const data = store.getData();
    const rr = data.guilds[interaction.guild.id] && data.guilds[interaction.guild.id].reactionRoles;
    if (!rr || !rr.panels[panelId]) return interaction.reply({ content: '❌ Panel nahi mila.', flags: MessageFlags.Ephemeral });
    delete rr.panels[panelId];
    store.save();
    return interaction.reply({ content: `✅ Panel \`${panelId}\` deleted (message rehta rahega — delete manually kar lena).`, flags: MessageFlags.Ephemeral });
  }
}

async function refreshPanel(guild, panelId) {
  const data = store.getData();
  const rr = data.guilds[guild.id] && data.guilds[guild.id].reactionRoles;
  const panel = rr && rr.panels[panelId];
  if (!panel) return;
  try {
    const channel = await guild.channels.fetch(panel.channelId).catch(() => null);
    if (!channel) return;
    const msg = await channel.messages.fetch(panel.messageId).catch(() => null);
    if (!msg) return;

    const embed = makeEmbed().setTitle(panel.title);
    let components;
    if (panel.roles.length) {
      embed.setDescription('Select roles from the menu below.\n\n' + panel.roles.map(r => `${r.emoji} → **${r.roleName}**`).join('\n')).slice(0, 4000);
      // Discord select max 25 options; page if needed
      const options = panel.roles.slice(0, 25).map((r, i) => ({
        label: r.roleName.slice(0, 100),
        value: 'rr:' + panelId + ':' + i,
        emoji: isCustomEmoji(r.emoji) ? undefined : r.emoji,
        description: r.emoji.startsWith('<') ? r.emoji.replace(/<a?:?(\w+):\d+>/, '$1').slice(0, 90) : undefined
      }));
      components = [new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId('rr_select_' + panelId).setPlaceholder('Pick your roles').setMinValues(0).setMaxValues(panel.roles.slice(0, 25).length).addOptions(options)
      )];
    } else {
      embed.setDescription('No roles yet — admin can add with `/reactionrole add`.');
      components = [new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId('rr_placeholder_select').setPlaceholder('Roles appear here once added').setMinValues(0).setMaxValues(1).addOptions([{ label: 'Coming soon', value: 'none' }])
      )];
    }
    await msg.edit({ embeds: [embed], components });
  } catch (e) { /* panel gone */ }
}

function isCustomEmoji(e) { return /^<a?:\w+:\d+>$/.test(e); }

// ---------------- select menu interaction ----------------
async function handleReactionRoleSelect(interaction) {
  if (!interaction.customId.startsWith('rr_select_')) return false;
  const panelId = interaction.customId.replace('rr_select_', '');
  const gid = interaction.guild.id;
  const data = store.getData();
  const rr = data.guilds[gid] && data.guilds[gid].reactionRoles;
  const panel = rr && rr.panels[panelId];
  if (!panel) return interaction.update({ content: '❌ Panel deleted.' }).catch(() => {});

  const chosen = interaction.values.filter(v => v.startsWith('rr:'));
  const pickedIdx = chosen.map(v => parseInt(v.split(':')[2]));
  const member = interaction.member;

  const added = [], removed = [];
  for (let i = 0; i < panel.roles.length; i++) {
    const role = interaction.guild.roles.cache.get(panel.roles[i].roleId);
    if (!role) continue;
    const has = member.roles.cache.has(role.id);
    const want = pickedIdx.includes(i);
    if (want && !has) {
      try { await member.roles.add(role, 'Reaction role'); added.push(role); } catch { /* hierarchy */ }
    } else if (!want && has) {
      try { await member.roles.remove(role, 'Reaction role'); removed.push(role); } catch { /* hierarchy */ }
    }
  }

  const parts = [];
  if (added.length) parts.push('✅ Added: ' + added.map(r => r.name).join(', '));
  if (removed.length) parts.push('🗑️ Removed: ' + removed.map(r => r.name).join(', '));
  if (!parts.length) parts.push('Koi change nahi.');

  await interaction.reply({ content: parts.join('\n'), flags: MessageFlags.Ephemeral });
  return true;
}

module.exports = { handleReactionRole, handleReactionRoleSelect, refreshPanel };
