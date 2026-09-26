const { EmbedBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const store = require('./store');

// ---------------- Alliances & Partner Servers — BloxStrike style ----------------
// /ally request|accept|deny|list|remove  — inter-server alliances (bot owners DM karte hain)
// /server list|add|remove|info          — partner server directory (kis server se ally/collab karna hai)
// /collab post|list|accept|remove       — collab ideas board
//
// Data: global data.allies   { guildId: { [partnerGuildId]: { by, at, note } } }
//       global data.servers  { guildId: { name, desc, owner, invite, tags, at, addedBy } }
//       guild g.collabs      { id: { title, desc, by, at, accepts:[uid] } }

const BC = String.fromCharCode(96);

function isAdmin(interaction) {
  return interaction.memberPermissions && interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild);
}
function globalData() {
  const d = store.rawGet();
  if (!d.allies) d.allies = {};
  if (!d.servers) d.servers = {};
  return d;
}

// ---------------- /ally ----------------
async function handleAlly(interaction) {
  const d = globalData();
  const sub = interaction.options.getSubcommand();

  if (sub === 'request') {
    const partner = interaction.options.getString('server_id');
    const note = interaction.options.getString('note') || '';
    if (!/^\d{15,21}$/.test(partner)) return interaction.reply({ content: '❌ Server ID valid nahi lag rahi (sirf digits).', flags: MessageFlags.Ephemeral });
    if (partner === interaction.guildId) return interaction.reply({ content: '❌ Khud ke saath alliance nahi ban sakti 😅', flags: MessageFlags.Ephemeral });
    const partnerGuild = interaction.client.guilds.cache.get(partner);
    if (!partnerGuild) return interaction.reply({ content: '❌ Wo server is bot par nahi hai. Bot ko pehle us server me add karo, phi ally request bhejo!\nInvite: ' + BC + 'https://discord.com/oauth2/authorize?client_id=' + interaction.client.user.id + '&permissions=8&scope=bot%20applications.commands' + BC, flags: MessageFlags.Ephemeral });
    if (!d.allies[interaction.guildId]) d.allies[interaction.guildId] = {};
    if (d.allies[interaction.guildId][partner] || (d.allies[partner] && d.allies[partner][interaction.guildId])) {
      return interaction.reply({ content: '⚠️ Ye dono servers ke beech alliance already exist karti hai!', flags: MessageFlags.Ephemeral });
    }
    // pending request store karo — partner server ke kisi admin accept kar sakta hai
    if (!d.allyPending) d.allyPending = {};
    d.allyPending[partner + ':' + interaction.guildId] = { from: interaction.guildId, to: partner, by: interaction.user.id, note, at: Date.now() };
    store.save();
    const e = new EmbedBuilder().setColor(0xf1c40f)
      .setTitle('🤝 Alliance Request Bheji Gayi!')
      .setDescription(
        `**${interaction.guild.name}** → **${partnerGuild.name}**\n` +
        (note ? `Note: ${note}\n` : '') +
        `\nPartner server ke koi bhi admin ye chala kar accept kare:\n` +
        BC + `/ally accept server:${interaction.guildId}${BC}`
      )
      .setFooter({ text: 'BloxStrike • Alliances' });
    return interaction.reply({ embeds: [e] });
  }

  if (sub === 'accept') {
    const from = interaction.options.getString('server_id');
    const key = from + ':' + interaction.guildId;
    const pending = d.allyPending && d.allyPending[key];
    if (!pending) return interaction.reply({ content: '❌ Is server se koi pending request nahi hai. Pehle unse `/ally request` karwao.', flags: MessageFlags.Ephemeral });
    if (!d.allies[interaction.guildId]) d.allies[interaction.guildId] = {};
    if (!d.allies[from]) d.allies[from] = {};
    d.allies[interaction.guildId][from] = { by: pending.by, at: Date.now(), note: pending.note };
    d.allies[from][interaction.guildId] = { by: interaction.user.id, at: Date.now(), note: pending.note };
    delete d.allyPending[key];
    store.save();
    const fromGuild = interaction.client.guilds.cache.get(from);
    const e = new EmbedBuilder().setColor(0x57f287)
      .setTitle('🤝 Alliance Official!')
      .setDescription(`**${fromGuild ? fromGuild.name : 'Partner server'}** 🤝 **${interaction.guild.name}**\n\nAb dono servers allies hain! \`/ally list\` se dekho.`)
      .setFooter({ text: 'BloxStrike • Alliances' });
    return interaction.reply({ embeds: [e] });
  }

  if (sub === 'deny') {
    const from = interaction.options.getString('server_id');
    const key = from + ':' + interaction.guildId;
    if (!d.allyPending || !d.allyPending[key]) return interaction.reply({ content: '❌ Koi pending request nahi hai.', flags: MessageFlags.Ephemeral });
    delete d.allyPending[key];
    store.save();
    return interaction.reply({ content: '🚫 Alliance request deny kar di.', flags: MessageFlags.Ephemeral });
  }

  if (sub === 'list') {
    const mine = d.allies[interaction.guildId] || {};
    const ids = Object.keys(mine);
    if (!ids.length) return interaction.reply({ content: '❌ Abhi koi alliance nahi hai. `/ally request` se shuru karo, aur `/server list` dekho kis se ally karna hai!', flags: MessageFlags.Ephemeral });
    const rows = ids.map(id => {
      const gg = interaction.client.guilds.cache.get(id);
      const a = mine[id];
      return `🤝 **${gg ? gg.name : 'Unknown server'}** — since <t:${Math.floor(a.at / 1000)}:d>${a.note ? ` • _${a.note}_` : ''}`;
    }).join('\n');
    const e = new EmbedBuilder().setColor(0x5865f2).setTitle('🤝 Server Alliances')
      .setDescription(rows).setFooter({ text: `BloxStrike • ${ids.length} alliance(s)` });
    return interaction.reply({ embeds: [e] });
  }

  if (sub === 'remove') {
    const partner = interaction.options.getString('server_id');
    if (!d.allies[interaction.guildId] || !d.allies[interaction.guildId][partner]) return interaction.reply({ content: '❌ Is server se koi alliance nahi hai.', flags: MessageFlags.Ephemeral });
    delete d.allies[interaction.guildId][partner];
    if (d.allies[partner]) delete d.allies[partner][interaction.guildId];
    store.save();
    return interaction.reply({ content: '💔 Alliance remove kar di.', flags: MessageFlags.Ephemeral });
  }
}

// ---------------- /server ----------------
async function handleServer(interaction) {
  const d = globalData();
  const sub = interaction.options.getSubcommand();

  if (sub === 'list') {
    const all = Object.entries(d.servers);
    if (!all.length) return interaction.reply({ content: '❌ Directory khali hai! `/server add` se apna server list karwao taaki log ally kar sakein.', flags: MessageFlags.Ephemeral });
    // apne server ko top pe, allies ko ⭐
    const allies = d.allies[interaction.guildId] || {};
    all.sort((a, b) => (b[0] === interaction.guildId) - (a[0] === interaction.guildId));
    const rows = all.slice(0, 20).map(([id, s]) => {
      const star = id === interaction.guildId ? '🏠' : (allies[id] ? '🤝' : '▫️');
      return `${star} **${s.name}** — ${s.tags || 'general'}\n   └ <@${s.owner}> • \`${id}\``;
    }).join('\n');
    const e = new EmbedBuilder().setColor(0x8b5cf6)
      .setTitle('🌐 Partner Server Directory')
      .setDescription(rows + '\n\n▫️ = ally candidate • 🤝 = already allied • 🏠 = tumhara server\n\nID copy karke `/ally request server_id:` bhejo!')
      .setFooter({ text: `BloxStrike • ${all.length} server(s)` });
    return interaction.reply({ embeds: [e] });
  }

  if (sub === 'add') {
    const name = interaction.options.getString('name');
    const desc = interaction.options.getString('desc') || '';
    const invite = interaction.options.getString('invite') || '';
    const tags = interaction.options.getString('tags') || 'general';
    const existing = d.servers[interaction.guildId];
    d.servers[interaction.guildId] = { name, desc, owner: interaction.guild.ownerId, invite, tags, at: Date.now(), addedBy: interaction.user.id };
    store.save();
    const e = new EmbedBuilder().setColor(0x57f287).setTitle('✅ Server directory me add ho gaya!')
      .setDescription(existing ? '**' + name + '** entry update ho gayi.' : '**' + name + '** ab directory me hai — log `/server list` dekh kar `/ally request` bhej sakte hain!')
      .setFooter({ text: 'BloxStrike • Directory' });
    return interaction.reply({ embeds: [e] });
  }

  if (sub === 'remove') {
    if (!d.servers[interaction.guildId]) return interaction.reply({ content: '❌ Tumhara server directory me nahi hai.', flags: MessageFlags.Ephemeral });
    delete d.servers[interaction.guildId];
    store.save();
    return interaction.reply({ content: '🗑️ Server directory se remove ho gaya.', flags: MessageFlags.Ephemeral });
  }

  if (sub === 'info') {
    const id = interaction.options.getString('server_id') || interaction.guildId;
    const s = d.servers[id];
    if (!s) return interaction.reply({ content: '❌ Wo server directory me nahi hai.', flags: MessageFlags.Ephemeral });
    const allied = !!(d.allies[interaction.guildId] && d.allies[interaction.guildId][id]);
    const e = new EmbedBuilder().setColor(0x5865f2)
      .setTitle(`🌐 ${s.name}${allied ? ' 🤝' : ''}`)
      .setDescription(s.desc || '*No description*')
      .addFields(
        { name: '👑 Owner', value: `<@${s.owner}>`, inline: true },
        { name: '🏷️ Tags', value: s.tags, inline: true },
        { name: '🔗 Invite', value: s.invite ? s.invite : '*private — DM owner*', inline: true }
      )
      .setFooter({ text: allied ? 'BloxStrike • Already allied 🤝' : 'BloxStrike • /ally request to team up' });
    return interaction.reply({ embeds: [e] });
  }
}

// ---------------- /collab ----------------
async function handleCollab(interaction) {
  const g = store.guild(interaction.guildId);
  if (!g.collabs) g.collabs = {};
  const sub = interaction.options.getSubcommand();

  if (sub === 'post') {
    const title = interaction.options.getString('title');
    const desc = interaction.options.getString('desc') || '';
    const id = 'cb' + Date.now().toString(36);
    g.collabs[id] = { id, title, desc, by: interaction.user.id, at: Date.now(), accepts: [] };
    store.save();
    const e = new EmbedBuilder().setColor(0xf1c40f)
      .setTitle('📢 Collab Idea Posted!')
      .setDescription(`**${title}**\n${desc}\n\nProposed by ${interaction.user}\nJoin in: ${BC}/collab accept id:${id}${BC}`)
      .setFooter({ text: 'BloxStrike • Collabs' });
    return interaction.reply({ embeds: [e] });
  }

  if (sub === 'list') {
    const all = Object.values(g.collabs).sort((a, b) => b.at - a.at);
    if (!all.length) return interaction.reply({ content: '❌ Koi collab idea nahi hai. `/collab post` se pehla idea post karo!', flags: MessageFlags.Ephemeral });
    const e = new EmbedBuilder().setColor(0x8b5cf6).setTitle('📢 Collab Board')
      .setDescription(all.slice(0, 10).map(c => `**${c.title}** \`${c.id}\`\n└ <@${c.by}> • ${c.accepts.length} interested`).join('\n\n'))
      .setFooter({ text: 'BloxStrike • Collabs' });
    return interaction.reply({ embeds: [e] });
  }

  if (sub === 'accept') {
    const id = interaction.options.getString('id');
    const c = g.collabs[id];
    if (!c) return interaction.reply({ content: '❌ Aisa collab nahi mila. `/collab list` se IDs dekho.', flags: MessageFlags.Ephemeral });
    if (c.accepts.includes(interaction.user.id)) return interaction.reply({ content: '⚠️ Tum already interested ho!', flags: MessageFlags.Ephemeral });
    c.accepts.push(interaction.user.id);
    store.save();
    store.addAura(interaction.guildId, interaction.user.id, 10);
    return interaction.reply({ content: `✅ **${c.title}** me interest dikhaya! (+10 ⚡) Total interested: ${c.accepts.length}` });
  }

  if (sub === 'remove') {
    const id = interaction.options.getString('id');
    const c = g.collabs[id];
    if (!c) return interaction.reply({ content: '❌ Aisa collab nahi mila.', flags: MessageFlags.Ephemeral });
    if (c.by !== interaction.user.id && !isAdmin(interaction)) return interaction.reply({ content: '🔒 Sirf poster ya admin remove kar sakta hai.', flags: MessageFlags.Ephemeral });
    delete g.collabs[id];
    store.save();
    return interaction.reply({ content: '🗑️ Collab idea remove ho gaya.', flags: MessageFlags.Ephemeral });
  }
}

module.exports = { handleAlly, handleServer, handleCollab };
