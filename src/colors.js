const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const store = require('./store');
const { isAdmin } = require('./util');

const COLOR = 0x9146ff;
const MAX_COLORS = 10;

// ---------------- /colors ----------------
async function handleColors(interaction) {
  if (!isAdmin(interaction)) return interaction.reply({ content: 'Admin only.', flags: MessageFlags.Ephemeral });
  const sub = interaction.options.getSubcommand();
  const guild = interaction.guild;

  if (sub === 'setup') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const raw = interaction.options.getString('colors');
    const hexes = raw.split(/[,\s]+/).filter(h => /^#?[0-9a-fA-F]{6}$/.test(h)).map(h => h.replace('#', '')).slice(0, MAX_COLORS);
    if (hexes.length < 2) return interaction.editReply('Kam se kam 2 valid hex colors do: `ff0000,00ff00,0000ff`');

    const me = guild.members.me;
    if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return interaction.editReply('❌ Mujhe **Manage Roles** permission chahiye.');
    }

    const roleIds = [];
    for (const hex of hexes) {
      const existing = guild.roles.cache.find(r => r.name === `ct-${hex}`);
      if (existing) { roleIds.push(existing.id); continue; }
      try {
        const r = await guild.roles.create({
          name: `ct-${hex}`,
          color: parseInt(hex, 16),
          mentionable: false,
          reason: 'Citadel color selector setup'
        });
        roleIds.push(r.id);
      } catch { /* skip failed ones */ }
    }
    if (roleIds.length < 2) return interaction.editReply('Roles create nahi ho paye — mera role hierarchy me upar hona chahiye.');
    store.setColorRoles(guild.id, roleIds);

    const panel = await postPanel(interaction.channel, guild).catch(() => null);
    if (panel) store.setColorPanelMessage(guild.id, panel.id);
    return interaction.editReply(`✅ **${roleIds.length}** color roles ready + panel posted${panel ? ` in ${interaction.channel}` : ''}.\nUser panel se color select karega — purana color auto-hat jayega.`);
  }

  if (sub === 'remove') {
    const roleIds = store.getColorRoles(guild.id);
    let removed = 0;
    for (const id of roleIds) {
      const r = guild.roles.cache.get(id);
      if (r) { await r.delete('Color selector removed').catch(() => {}); removed++; }
    }
    store.setColorRoles(guild.id, []);
    return interaction.reply({ content: `🗑️ Removed **${removed}** color roles + panel.`, flags: MessageFlags.Ephemeral });
  }
}

// unicode gradient swatch bar — no canvas needed, renders in every client
function gradientBar(roles) {
  const blocks = [];
  const n = roles.length;
  for (let i = 0; i < n; i++) {
    const hex = (roles[i].color || 0).toString(16).padStart(6, '0');
    blocks.push(':no_entry_sign_:'.replace(':no_entry_sign_:', '')); // placeholder removed below
  }
  // Discord embeds can't color text per-character, so we fake a gradient with emoji squares
  const palette = {
    'ff0000': '🟥', 'e91e63': '🩷', 'ff69b4': '🌸', 'ffa500': '🟧', 'ffd700': '🟨',
    'ffff00': '🟨', '00ff00': '🟩', '008000': '🟢', '00ffff': '🩵', '0000ff': '🟦',
    '800080': '🟪', '9146ff': '🟣', 'ff4500': '🟥', '8b0000': '🟥', 'ffffff': '⬜',
    '000000': '⬛', '808080': '🩶', 'c0c0c0': '⬜', 'ffdab9': '🍑'
  };
  // nearest-palette mapping by hue distance
  const hue = (hexStr) => {
    const r = parseInt(hexStr.slice(0, 2), 16), g = parseInt(hexStr.slice(2, 4), 16), b = parseInt(hexStr.slice(4, 6), 16);
    if (r < 60 && g < 60 && b < 60) return '⬛';
    if (r > 220 && g > 220 && b > 220) return '⬜';
    if (Math.abs(r - g) < 25 && Math.abs(g - b) < 25) return '🩶';
    if (r > 180 && g < 90 && b < 90) return '🟥';
    if (r > 200 && g >= 90 && g < 200 && b < 100) return '🟧';
    if (r > 200 && g > 180 && b < 120) return '🟨';
    if (r > 180 && g < 160 && b >= 140) return '🩷';
    if (g > 160 && r < 140 && b < 140) return '🟩';
    if (g > 200 && b > 200 && r < 220 && b >= g) return '🩵';
    if (b > 160 && g < 160 && r < 140) return '🟦';
    if (r > 100 && b > 100 && g < 100 && b >= r - 60) return '🟪';
    return '🟫';
  };
  return roles.map(r => hue((r.color || 0).toString(16).padStart(6, '0'))).join('');
}

async function postPanel(channel, guild) {
  const roleIds = store.getColorRoles(guild.id);
  if (!roleIds.length) return null;
  const swatches = roleIds.map(id => guild.roles.cache.get(id)).filter(Boolean);
  const e = new EmbedBuilder().setColor(COLOR)
    .setTitle('🎨 Citadel Color Selector')
    .setDescription(
      'Apna color niche se choose karo — **ek time pe ek hi color** rahega, naya choose karte hi purana auto-remove.\n\n' +
      '**Preview:** ' + gradientBar(swatches) + '\n\n' +
      swatches.map(r => `• <@&${r.id}>`).join('\n')
    )
    .setFooter({ text: 'The Gaming Citadel • Color Roles' });
  const menu = new StringSelectMenuBuilder()
    .setCustomId('ct_color_select')
    .setPlaceholder('🎨 Pick your color…')
    .addOptions(
      swatches.map((r, i) => ({
        label: r.name.replace('ct-', '#'),
        value: r.id,
        description: `Color role #${i + 1}`
      })),
      { label: 'No color (remove)', value: 'none', description: 'Hata do mera color role' }
    );
  return channel.send({ embeds: [e], components: [new ActionRowBuilder().addComponents(menu)] });
}

// ---------------- select handler ----------------
async function handleColorSelect(interaction) {
  try {
    const chosen = interaction.values[0];
    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    if (!member) return interaction.reply({ content: 'Member fetch fail.', flags: MessageFlags.Ephemeral });

    const roleIds = store.getColorRoles(interaction.guildId);
    // remove all color roles user has
    for (const id of roleIds) {
      if (member.roles.cache.has(id)) await member.roles.remove(id, 'Color swap').catch(() => {});
    }
    if (chosen === 'none') {
      return interaction.reply({ content: '🎨 Color removed.', flags: MessageFlags.Ephemeral });
    }
    const role = interaction.guild.roles.cache.get(chosen);
    if (!role) return interaction.reply({ content: 'Role not found — admin ne remove kar diya hoga.', flags: MessageFlags.Ephemeral });
    await member.roles.add(role, 'Color selector').catch(() => null);
    return interaction.reply({ content: `🎨 Color set: <@&${chosen}>`, flags: MessageFlags.Ephemeral });
  } catch (err) {
    console.error('colorSelect:', err);
    return interaction.reply({ content: 'Color lag nahi paya — role hierarchy check karo.', flags: MessageFlags.Ephemeral });
  }
}

// ---------------- /roleaudit ----------------
async function handleRoleAudit(interaction) {
  if (!isAdmin(interaction)) return interaction.reply({ content: 'Admin only.', flags: MessageFlags.Ephemeral });
  await interaction.deferReply();

  const members = await interaction.guild.members.fetch().catch(() => null);
  if (!members) return interaction.editReply('Members fetch fail — **Server Members Intent** on hai?');

  const roles = interaction.guild.roles.cache
    .filter(r => !r.managed && r.id !== interaction.guild.id)
    .sort((a, b) => b.position - a.position);

  const lines = [];
  for (const [, role] of roles) {
    const count = members.filter(m => m.roles.cache.has(role.id)).size;
    lines.push(`<@&${role.id}> — **${count}** member${count === 1 ? '' : 's'}`);
  }
  const total = lines.length;
  const chunks = [];
  let cur = '';
  for (const line of lines) {
    if ((cur + line).length > 1000) { chunks.push(cur); cur = ''; }
    cur += line + '\n';
  }
  if (cur) chunks.push(cur);

  const e0 = new EmbedBuilder().setColor(COLOR)
    .setTitle(`🏷️ Role Audit — ${total} roles`)
    .setDescription(chunks[0] || 'No roles')
    .setFooter({ text: `The Gaming Citadel • ${members.size} members scanned` });
  await interaction.editReply({ embeds: [e0] });

  // additional chunks as follow-up embeds (max 3 more)
  for (let i = 1; i < Math.min(4, chunks.length); i++) {
    await interaction.channel.send({ embeds: [new EmbedBuilder().setColor(COLOR).setDescription(chunks[i])] }).catch(() => {});
  }
}

module.exports = { handleColors, handleColorSelect, handleRoleAudit, postPanel };
