// Citadel Color Selector v2 — 120+ named colors, hex-code popup (modal), paged menus.
// Panel = embed + "Open color picker" button -> ephemeral paged select menus -> instant role swap.
// Custom hex: type any hex in the popup, bot creates a one-off role for you.
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits, MessageFlags } = require('discord.js');
const store = require('./store');
const { isAdmin } = require('./util');

const COLOR = 0x9146ff;

// 120 named colors: [name, hex]
const NAMED = [
  // Reds
  ['Fire Red', 'ff0000'], ['Orange Red', 'ff4500'], ['Tomato', 'ff6347'], ['Coral', 'ff7f50'],
  ['Crimson', 'dc143c'], ['Dark Red', '8b0000'], ['Brick Red', 'b22222'], ['Salmon', 'fa8072'],
  ['Light Coral', 'f08080'], ['Indian Red', 'cd5c5c'],
  // Oranges
  ['Orange', 'ffa500'], ['Dark Orange', 'ff8c00'], ['Peach', 'ffdab9'], ['Apricot', 'fbceb1'],
  ['Bronze', 'cd7f32'], ['Rust', 'b7410e'],
  // Yellows
  ['Gold', 'ffd700'], ['Yellow', 'ffff00'], ['Khaki', 'f0e68c'], ['Lemon', 'fff44f'],
  ['Mustard', 'ffdb58'], ['Amber', 'ffbf00'], ['Sand', 'ecdfc8'], ['Wheat', 'f5deb3'],
  // Greens
  ['Lime', '00ff00'], ['Green', '008000'], ['Forest', '228b22'], ['Sea Green', '2e8b57'],
  ['Medium Sea', '3cb371'], ['Spring Green', '00ff7f'], ['Medium Spring', '00fa9a'], ['Lawn Green', '7cfc00'],
  ['Chartreuse', '7fff00'], ['Olive', '808000'], ['Dark Olive', '556b2f'], ['Olive Drab', '6b8e23'],
  ['Mint', '98ff98'], ['Emerald', '50c878'], ['Jade', '00a86b'], ['Hunter Green', '355e3b'],
  // Cyans / Teals
  ['Cyan', '00ffff'], ['Aqua', '00ffff'], ['Turquoise', '40e0d0'], ['Medium Turquoise', '48d1cc'],
  ['Dark Turquoise', '00ced1'], ['Teal', '008080'], ['Dark Cyan', '008b8b'], ['Light Sea Green', '20b2aa'],
  ['Aquamarine', '7fffd4'], ['Pale Turquoise', 'afeeee'],
  // Blues
  ['Blue', '0000ff'], ['Royal Blue', '4169e1'], ['Sky Blue', '87ceeb'], ['Light Sky', '87cefa'],
  ['Deep Sky', '00bfff'], ['Dodger Blue', '1e90ff'], ['Steel Blue', '4682b4'], ['Cornflower', '6495ed'],
  ['Navy', '000080'], ['Midnight Blue', '191970'], ['Dark Blue', '00008b'], ['Baby Blue', '89cff0'],
  ['Powder Blue', 'b0e0e6'], ['Light Blue', 'add8e6'], ['Azure', '007fff'], ['Sapphire', '0f52ba'],
  // Purples
  ['Purple', '800080'], ['Violet', '7f00ff'], ['Dark Violet', '9400d3'], ['Blue Violet', '8a2be2'],
  ['Dark Orchid', '9932cc'], ['Medium Orchid', 'ba55d3'], ['Medium Purple', '9370db'], ['Thistle', 'd8bfd8'],
  ['Indigo', '4b0082'], ['Rebecca Purple', '663399'], ['Dark Magenta', '8b008b'], ['Lavender', 'e6e6fa'],
  // Pinks / Magentas
  ['Magenta', 'ff00ff'], ['Hot Pink', 'ff69b4'], ['Deep Pink', 'ff1493'], ['Pink', 'ffc0cb'],
  ['Light Pink', 'ffb6c1'], ['Pale Violet Red', 'db7093'], ['Rose', 'ff007f'], ['Fuchsia', 'ff77ff'],
  ['Bubblegum', 'ffc1cc'], ['Flamingo', 'fc8eac'],
  // Browns
  ['Brown', 'a52a2a'], ['Saddle Brown', '8b4513'], ['Sienna', 'a0522d'], ['Chocolate', 'd2691e'],
  ['Peru', 'cd853f'], ['Tan', 'd2b48c'], ['Burlywood', 'deb887'], ['Coffee', '6f4e37'],
  // Grays / Neutrals
  ['Black', '000000'], ['Dim Gray', '696969'], ['Gray', '808080'], ['Dark Gray', 'a9a9a9'],
  ['Silver', 'c0c0c0'], ['Light Gray', 'd3d3d3'], ['Gainsboro', 'dcdcdc'], ['White Smoke', 'f5f5f5'],
  ['White', 'ffffff'], ['Ghost White', 'f8f8ff'], ['Slate Gray', '708090'], ['Light Slate', '778899'],
  // Extras
  ['Discord Blurple', '5865f2'], ['Citadel Purple', '9146ff'], ['Neon Green', '39ff14'], ['Electric Blue', '7df9ff'],
  ['Hot Magenta', 'ff1dce'], ['Cyber Yellow', 'ffd300'], ['Blood Red', '660000'], ['Royal Purple', '7851a9']
];

const PAGE_SIZE = 24; // 24 options per page (max 25)
const RAND_WORDS = ['Nova', 'Blaze', 'Frost', 'Storm', 'Pulse', 'Vortex', 'Neon', 'Ember', 'Zephyr', 'Prism', 'Cosmic', 'Void', 'Lumen', 'Drift', 'Shard', 'Wave'];

function pages() {
  const out = [];
  for (let i = 0; i < NAMED.length; i += PAGE_SIZE) out.push(NAMED.slice(i, i + PAGE_SIZE));
  return out;
}

// ---------------- /colors (admin) ----------------
async function handleColors(interaction) {
  if (!isAdmin(interaction)) return interaction.reply({ content: 'Admin only.', flags: MessageFlags.Ephemeral });
  const sub = interaction.options.getSubcommand();
  const guild = interaction.guild;

  if (sub === 'setup') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    // optional custom hexes from admin; otherwise default 10 hue roles
    const raw = (interaction.options.getString('colors') || '').trim();
    let hexes;
    if (raw) {
      hexes = raw.split(/[,\s]+/).filter(h => /^#?[0-9a-fA-F]{6}$/.test(h)).map(h => h.replace('#', '').toLowerCase()).slice(0, 30);
      if (hexes.length < 2) return interaction.editReply('Kam se kam 2 valid hex colors do: `ff0000,00ff00,0000ff` — ya colors option khali chhod do (default pack).');
    } else {
      hexes = ['ff0000', 'ffa500', 'ffd700', '00ff00', '00ffff', '0000ff', '800080', 'ff00ff', 'ffffff', '000000'];
    }

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
    return interaction.editReply(`✅ **${roleIds.length}** base color roles ready + panel posted${panel ? ` in ${interaction.channel}` : ''}.\nUsers **${NAMED.length} named colors + unlimited custom hex** picker se choose karenge (naye roles auto-create honge).`);
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

// ---------------- panel ----------------
async function postPanel(channel, guild) {
  const e = new EmbedBuilder().setColor(COLOR)
    .setTitle('🎨 Citadel Color Selector')
    .setDescription(
      `**${NAMED.length}+ colors** available!\n\n` +
      '**🎨 Browse Colors** — paged menu se named color choose karo\n' +
      '**🔢 Enter Hex Code** — koi bhi custom color popup me type karo (jaise `#39FF14`)\n' +
      '**❌ Remove Color** — color hata do\n\n' +
      'Ek time pe **ek hi color** — naya choose karte hi purana auto-remove.'
    )
    .setFooter({ text: `The Gaming Citadel • ${NAMED.length} named colors + custom hex` });

  const browse = new ButtonBuilder().setCustomId('ct_color_browse').setLabel('🎨 Browse Colors').setStyle(ButtonStyle.Primary);
  const hexBtn = new ButtonBuilder().setCustomId('ct_color_hex').setLabel('🔢 Enter Hex Code').setStyle(ButtonStyle.Secondary);
  const noneBtn = new ButtonBuilder().setCustomId('ct_color_none').setLabel('❌ Remove').setStyle(ButtonStyle.Danger);
  return channel.send({
    embeds: [e],
    components: [new ActionRowBuilder().addComponents(browse, hexBtn, noneBtn)]
  });
}

// ---------------- browse page (ephemeral) ----------------
async function sendColorPage(interaction, page) {
  const all = pages();
  const p = Math.max(0, Math.min(page, all.length - 1));
  const g = interaction.guild;

  const options = all[p].map(([name, hex]) => {
    let reuseId = null;
    for (const rid of store.getColorRoles(g.id)) {
      const r = g.roles.cache.get(rid);
      if (r && r.color === parseInt(hex, 16)) { reuseId = rid; break; }
    }
    return {
      label: name,
      value: 'named:' + hex + (reuseId ? ':' + reuseId : ''),
      description: `#${hex}` + (reuseId ? ' • instant' : ' • auto-create')
    };
  });
  options.push({ label: 'No color (remove)', value: 'none', description: 'Hata do mera color role' });

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`ct_color_page:${p}`)
    .setPlaceholder(`🎨 Page ${p + 1}/${all.length} — pick a color…`)
    .addOptions(options);

  const navRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ct_color_prev:${p}`).setLabel('◀ Prev').setStyle(ButtonStyle.Secondary).setDisabled(p === 0),
    new ButtonBuilder().setCustomId(`ct_color_next:${p}`).setLabel('Next ▶').setStyle(ButtonStyle.Secondary).setDisabled(p === all.length - 1)
  );

  const payload = {
    embeds: [new EmbedBuilder().setColor(COLOR).setTitle('🎨 Color Picker')
      .setDescription(`Page **${p + 1}/${all.length}** • **${NAMED.length}** named colors.\nCustom chahiye? Panel pe **🔢 Enter Hex Code** dabao.`)],
    components: [new ActionRowBuilder().addComponents(menu), navRow],
    flags: MessageFlags.Ephemeral
  };
  if (interaction.deferred || interaction.replied) return interaction.editReply(payload);
  return interaction.reply(payload);
}

async function handleColorNav(interaction) {
  const [action, p] = interaction.customId.split(':');
  const page = action === 'ct_color_prev' ? Number(p) - 1 : Number(p) + 1;
  return sendColorPage(interaction, page);
}

// ---------------- hex modal ----------------
async function handleColorHexButton(interaction) {
  const modal = new ModalBuilder().setCustomId('ct_color_modal').setTitle('🔢 Custom Color');
  const input = new TextInputBuilder()
    .setCustomId('ct_hex_input')
    .setLabel('Hex color (e.g. #39FF14 ya 8A2BE2)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('#39FF14')
    .setMaxLength(7)
    .setRequired(true);
  const nameInput = new TextInputBuilder()
    .setCustomId('ct_name_input')
    .setLabel('Naam (optional — random milega agar khaali)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('My Glow')
    .setMaxLength(30)
    .setRequired(false);
  modal.addComponents(new ActionRowBuilder().addComponents(input), new ActionRowBuilder().addComponents(nameInput));
  return interaction.showModal(modal);
}

function randomName() {
  return RAND_WORDS[Math.floor(Math.random() * RAND_WORDS.length)] + RAND_WORDS[Math.floor(Math.random() * RAND_WORDS.length)];
}

async function handleColorModal(interaction) {
  const raw = interaction.fields.getTextInputValue('ct_hex_input').trim().replace('#', '');
  const name = interaction.fields.getTextInputValue('ct_name_input')?.trim();
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) {
    return interaction.reply({ content: '❌ Invalid hex — 6 characters chahiye, jaise `39FF14`.', flags: MessageFlags.Ephemeral });
  }
  const hex = raw.toLowerCase();
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  if (!member) return interaction.editReply('Member fetch fail.');

  const g = interaction.guild;
  let role = g.roles.cache.find(r => r.color === parseInt(hex, 16) && (r.name.startsWith('ct-') || r.name.startsWith('cc-')));
  if (!role) {
    try {
      const roleName = `cc-${name ? name.replace(/[^\w '-]/g, '').slice(0, 24) : randomName()}-${hex}`;
      role = await g.roles.create({
        name: roleName,
        color: parseInt(hex, 16),
        mentionable: false,
        reason: `Custom color for ${interaction.user.tag}`
      });
    } catch {
      return interaction.editReply('❌ Role create nahi hua — mera role hierarchy upar hona chahiye ya role limit (250) full hai.');
    }
  }

  const toRemove = member.roles.cache.filter(r => (r.name.startsWith('ct-') || r.name.startsWith('cc-')) && r.id !== role.id);
  for (const [, r] of toRemove) await member.roles.remove(r, 'Color swap').catch(() => {});
  await member.roles.add(role, 'Custom color').catch(() => {});
  return interaction.editReply(`🎨 Color set: **${role.name}** (#${hex})`);
}

// ---------------- select handler ----------------
async function handleColorSelect(interaction) {
  try {
    const chosen = interaction.values[0];
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    if (!member) return interaction.editReply('Member fetch fail.');

    const g = interaction.guild;
    const current = member.roles.cache.filter(r => r.name.startsWith('ct-') || r.name.startsWith('cc-'));
    if (chosen === 'none') {
      for (const [, r] of current) await member.roles.remove(r, 'Color removed').catch(() => {});
      return interaction.editReply('🎨 Color removed.');
    }

    let role = null;
    if (chosen.startsWith('named:')) {
      const [, hex, reuseId] = chosen.split(':');
      role = reuseId ? g.roles.cache.get(reuseId) : g.roles.cache.find(r => r.color === parseInt(hex, 16));
      if (!role) {
        const named = NAMED.find(n => n[1] === hex);
        try {
          role = await g.roles.create({
            name: `ct-${named ? named[0].replace(/\s+/g, '-').toLowerCase() : hex}-${hex}`,
            color: parseInt(hex, 16),
            mentionable: false,
            reason: `Color picker: ${named ? named[0] : hex}`
          });
          const roleIds = store.getColorRoles(g.id);
          roleIds.push(role.id);
          store.setColorRoles(g.id, roleIds);
        } catch {
          return interaction.editReply('❌ Role create nahi hua — hierarchy ya role-limit issue.');
        }
      }
    } else {
      role = g.roles.cache.get(chosen);
    }
    if (!role) return interaction.editReply('Role not found.');

    for (const [, r] of current) { if (r.id !== role.id) await member.roles.remove(r, 'Color swap').catch(() => {}); }
    await member.roles.add(role, 'Color picker').catch(() => {});
    return interaction.editReply(`🎨 Color set: **${role.name}**`);
  } catch (err) {
    console.error('colorSelect:', err);
    if (!interaction.replied && !interaction.deferred) {
      return interaction.reply({ content: 'Color lag nahi paya — role hierarchy check karo.', flags: MessageFlags.Ephemeral }).catch(() => {});
    }
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
    lines.push('<@&' + role.id + '> — **' + count + '** member' + (count === 1 ? '' : 's'));
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
    .setTitle('🏷️ Role Audit — ' + total + ' roles')
    .setDescription(chunks[0] || 'No roles')
    .setFooter({ text: 'The Gaming Citadel • ' + members.size + ' members scanned' });
  await interaction.editReply({ embeds: [e0] });

  for (let i = 1; i < Math.min(4, chunks.length); i++) {
    await interaction.channel.send({ embeds: [new EmbedBuilder().setColor(COLOR).setDescription(chunks[i])] }).catch(() => {});
  }
}

module.exports = { handleColors, handleColorSelect, handleColorNav, handleColorHexButton, handleColorModal, handleRoleAudit, postPanel, NAMED };
