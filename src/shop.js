const { EmbedBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const store = require('./store');

const COLOR = 0x8b5cf6;
function embed() { return new EmbedBuilder().setColor(COLOR).setFooter({ text: 'The Gaming Citadel • Shop' }); }
function fmt(n) { return `**${n}** 🪙`; }

const SHOP_KEY = '_shopItems';

function getItems(guildId) {
  const g = store.guild(guildId);
  if (!g[SHOP_KEY]) g[SHOP_KEY] = [];
  return g[SHOP_KEY];
}

async function handleShop(interaction) {
  const items = getItems(interaction.guildId);
  if (!items.length) return interaction.reply({ content: 'Shop khaali hai — admin `/shopadd` se items daalega.', flags: MessageFlags.Ephemeral });
  const e = embed().setTitle('🛒 Citadel Shop')
    .setDescription(items.map(i => `**#${i.id}** ${i.name} — ${fmt(i.price)}${i.roleId ? ` → <@&${i.roleId}>` : ''}`).join('\n'))
    .setFooter({ text: 'Buy: /buy id:<number>' });
  await interaction.reply({ embeds: [e] });
}

async function handleShopAdd(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({ content: 'Manage Server chahiye.', flags: MessageFlags.Ephemeral });
  }
  const name = interaction.options.getString('name').slice(0, 50);
  const price = interaction.options.getInteger('price');
  const role = interaction.options.getRole('role');
  if (price < 0) return interaction.reply({ content: 'Price ≥ 0.', flags: MessageFlags.Ephemeral });
  if (role && role.position >= interaction.guild.members.me.roles.highest.position) {
    return interaction.reply({ content: 'Mera role is role se upar hona chahiye (hierarchy).', flags: MessageFlags.Ephemeral });
  }
  const items = getItems(interaction.guildId);
  const id = items.reduce((m, i) => Math.max(m, i.id), 0) + 1;
  items.push({ id, name, price, roleId: role ? role.id : null });
  store.save();
  await interaction.reply({ content: `✅ \`#${id}\` **${name}** — ${fmt(price)}${role ? ` → ${role.name}` : ''}`, flags: MessageFlags.Ephemeral });
}

async function handleShopRemove(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({ content: 'Manage Server chahiye.', flags: MessageFlags.Ephemeral });
  }
  const id = interaction.options.getInteger('id');
  const items = getItems(interaction.guildId);
  const idx = items.findIndex(i => i.id === id);
  if (idx < 0) return interaction.reply({ content: `No item #${id}.`, flags: MessageFlags.Ephemeral });
  const [removed] = items.splice(idx, 1);
  store.save();
  await interaction.reply({ content: `🗑️ Removed **${removed.name}**.`, flags: MessageFlags.Ephemeral });
}

async function handleBuy(interaction) {
  const id = interaction.options.getInteger('id');
  const items = getItems(interaction.guildId);
  const item = items.find(i => i.id === id);
  if (!item) return interaction.reply({ content: `No item #${id}.`, flags: MessageFlags.Ephemeral });
  const gId = interaction.guildId, uid = interaction.user.id;
  if (store.getCoins(gId, uid) < item.price) {
    return interaction.reply({ content: `Sirf ${fmt(store.getCoins(gId, uid))} hai — ${fmt(item.price)} chahiye. /work karo 😤`, flags: MessageFlags.Ephemeral });
  }
  store.addCoins(gId, uid, -item.price);
  let roleLine = '';
  if (item.roleId) {
    const role = interaction.guild.roles.cache.get(item.roleId);
    if (role) {
      await interaction.member.roles.add(role, `Bought #${item.id}`).catch(() => {});
      roleLine = `\n✅ ${role.name} role diya!`;
    }
  }
  // record purchase
  const g = store.guild(gId);
  if (!g._purchases) g._purchases = {};
  if (!g._purchases[uid]) g._purchases[uid] = [];
  g._purchases[uid].push(item.id);
  store.save();

  const e = embed(0x57f287).setTitle('🛒 Purchase Complete')
    .setDescription(`**${item.name}** bought for ${fmt(item.price)}${roleLine}\nBalance: ${fmt(store.getCoins(gId, uid))}`);
  await interaction.reply({ embeds: [e] });
}

async function handleInventory(interaction) {
  const user = interaction.options.getUser('user') || interaction.user;
  const g = store.guild(interaction.guildId);
  const purchases = (g._purchases || {})[user.id] || [];
  if (!purchases.length) return interaction.reply({ content: 'Kuch nahi kharida abhi. /shop dekho!', flags: MessageFlags.Ephemeral });
  const items = getItems(interaction.guildId);
  const counts = {};
  for (const id of purchases) counts[id] = (counts[id] || 0) + 1;
  const lines = Object.entries(counts).map(([id, n]) => {
    const item = items.find(i => i.id === Number(id));
    return `• **${item ? item.name : `#${id}`}**${n > 1 ? ` ×${n}` : ''}`;
  });
  const e = embed().setTitle(`🎒 Inventory — ${user.username}`).setDescription(lines.join('\n'));
  await interaction.reply({ embeds: [e] });
}

module.exports = { handleShop, handleShopAdd, handleShopRemove, handleBuy, handleInventory };
