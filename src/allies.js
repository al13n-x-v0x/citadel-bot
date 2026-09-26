const { EmbedBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const store = require('./store');

// ---------------- Clan Alliances & Partner Servers — BloxStrike style ----------------
// ALLIANCE FLOW (clan-name handshake, no server IDs):
//   1. Bot dono servers me invite karo
//   2. Unke server me:  /ally request clan:VoX
//   3. VoX server me:   /ally request clan:TheirClan
//   4. Dono ne ek dusre ko request kiya -> ALLIANCE AUTO MATCH! Dono servers me announce.
//
// /ally request|list|pending|remove  — clan alliances
// /server list|add|remove|info       — partner server directory (kis se ally karna hai)
// /collab post|list|accept|remove    — collab ideas board
//
// Data (global): d.clanAllyPending { myClanNorm: { fromGuild, myClan, target, by, note, at } }
//                d.clanAllies { "clana|clanb": { a, b, guildA, guildB, at, by } }
// Guild: g.collabs { id: {...} }

const BC = String.fromCharCode(96);
const norm = (s) => String(s || '').trim().toLowerCase();

function isAdmin(interaction) {
  return interaction.memberPermissions && interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild);
}
function globalData() {
  const d = store.rawGet();
  if (!d.clanAllyPending) d.clanAllyPending = {};
  if (!d.clanAllies) d.clanAllies = {};
  return d;
}

// clan name -> { guildId, clan } — bot ke sare servers me search
function findClanGlobal(name) {
  const target = norm(name);
  const data = store.rawGet();
  for (const [gid, g] of Object.entries(data.guilds || {})) {
    if (!g.clans) continue;
    const key = Object.keys(g.clans).find(k => norm(k) === target);
    if (key) return { guildId: gid, clan: g.clans[key], name: key };
  }
  return null;
}
function myClanOf(g, userId) {
  return (g.clanOf && g.clanOf[userId]) || null;
}
function hasAlliance(d, clanA, clanB) {
  return !!d.clanAllies[[norm(clanA), norm(clanB)].sort().join('|')];
}
function announceGuild(client, guildId, embed) {
  const gg = client.guilds.cache.get(guildId);
  if (!gg) return;
  const g = store.guild(guildId);
  const chId = (g.welcome && g.welcome.channelId) || gg.systemChannelId;
  const ch = (chId && gg.channels.cache.get(chId)) || gg.systemChannel;
  if (ch) ch.send({ embeds: [embed] }).catch(() => {});
}

// ---------------- /ally ----------------
async function handleAlly(interaction) {
  const d = globalData();
  const g = store.guild(interaction.guildId);
  const sub = interaction.options.getSubcommand();

  if (sub === 'request') {
    const targetName = interaction.options.getString('clan');
    const note = interaction.options.getString('note') || '';
    const myName = myClanOf(g, interaction.user.id);
    if (!myName) return interaction.reply({ content: '❌ Pehle is server me kisi clan me join karo (`/clan create` ya `/clan join`) — alliance clan-to-clan hoti hai!', flags: MessageFlags.Ephemeral });
    if (norm(myName) === norm(targetName)) return interaction.reply({ content: '❌ Apne hi clan se alliance? 😅 Doosre clan ka naam do.', flags: MessageFlags.Ephemeral });
    if (hasAlliance(d, myName, targetName)) return interaction.reply({ content: `🤝 **${myName}** aur **${targetName}** already allies hain!`, flags: MessageFlags.Ephemeral });

    const target = findClanGlobal(targetName);
    if (!target) return interaction.reply({ content: `❌ Clan **${targetName}** nahi mila. Check karo bot unke server me invite hua hai aur clan ka spelling sahi hai.`, flags: MessageFlags.Ephemeral });

    // HANDSHAKE: kya target clan ne pehle humko request bheja tha?
    const theirPending = d.clanAllyPending[norm(myName)];
    const mutual = theirPending && norm(theirPending.target) === norm(target.name) && theirPending.fromGuild !== interaction.guildId;
    // (dusra condition: unka request bhi is server ke clan ke liye ho)

    if (mutual) {
      // ALLIANCE FORMED!
      const key = [norm(myName), norm(target.name)].sort().join('|');
      d.clanAllies[key] = { a: myName, b: target.name, guildA: interaction.guildId, guildB: theirPending.fromGuild, at: Date.now(), by: interaction.user.id };
      delete d.clanAllyPending[norm(myName)];
      delete d.clanAllyPending[norm(target.name)];
      store.save();
      const e = new EmbedBuilder().setColor(0x57f287)
        .setTitle('🤝 ALLIANCE FORMED!')
        .setDescription(`**${myName}** 🤝 **${target.name}**\n\nDono clans ne ek dusre ko request bheja — alliance official hai!\n\nAb \`/ally list\` se dekho, aur collab events plan karo!`)
        .setFooter({ text: 'BloxStrike • Clan Alliances' });
      await interaction.reply({ embeds: [e] });
      announceGuild(interaction.client, theirPending.fromGuild, e);
      return;
    }

    // normal request — pending store karo
    d.clanAllyPending[norm(myName)] = { fromGuild: interaction.guildId, myClan: myName, target: target.name, by: interaction.user.id, note, at: Date.now() };
    store.save();
    const e = new EmbedBuilder().setColor(0xf1c40f)
      .setTitle('📨 Alliance Request Bheji Gayi!')
      .setDescription(
        `**${myName}** (is server) → **${target.name}** (${target.clan ? 'unke server' : 'partner server'})\n` +
        (note ? `Note: ${note}\n` : '') +
        `\nUnke server me unke members ye chalein:\n` +
        BC + `/ally request clan:${myName}${BC}\n\n` +
        `Dono taraf se request aayi to **alliance auto ban jayegi!** 🤝`
      )
      .setFooter({ text: 'BloxStrike • Clan Alliances' });
    return interaction.reply({ embeds: [e] });
  }

  if (sub === 'list') {
    const mine = Object.entries(d.clanAllies).filter(([, a]) => a.guildA === interaction.guildId || a.guildB === interaction.guildId);
    if (!mine.length) return interaction.reply({ content: '❌ Is server ke clans ki koi alliance nahi hai. `/ally request clan:<name>` se shuru karo — aur `/server list` dekho kis se ally karna hai!', flags: MessageFlags.Ephemeral });
    const rows = mine.map(([key, a]) => {
      const partnerClan = a.guildA === interaction.guildId ? a.b : a.a;
      const partnerGuild = interaction.client.guilds.cache.get(a.guildA === interaction.guildId ? a.guildB : a.guildA);
      return `🤝 **${partnerClan}** — ${partnerGuild ? partnerGuild.name : 'partner server'} • since <t:${Math.floor(a.at / 1000)}:d>`;
    }).join('\n');
    const e = new EmbedBuilder().setColor(0x5865f2).setTitle('🤝 Clan Alliances — ' + interaction.guild.name)
      .setDescription(rows).setFooter({ text: `BloxStrike • ${mine.length} alliance(s)` });
    return interaction.reply({ embeds: [e] });
  }

  if (sub === 'pending') {
    const clanNames = new Set(Object.keys(g.clans || {}).map(k => norm(k)));
    const rows = Object.entries(d.clanAllyPending)
      .filter(([, p]) => clanNames.has(norm(p.myClan)))
      .map(([, p]) => `📨 **${p.myClan}** → **${p.target}** — by <@${p.by}> • <t:${Math.floor(p.at / 1000)}:R>`);
    const incoming = Object.entries(d.clanAllyPending)
      .filter(([, p]) => clanNames.has(norm(p.target)))
      .map(([, p]) => `⏳ **${p.myClan}** (doosra server) ne **${p.target}** ko request bheja — unse bolo \`/ally request clan:${p.myClan}\` chalein!`);
    const all = [...rows, ...incoming];
    if (!all.length) return interaction.reply({ content: '❌ Koi pending alliance request nahi hai.', flags: MessageFlags.Ephemeral });
    const e = new EmbedBuilder().setColor(0xf1c40f).setTitle('📨 Pending Alliance Requests')
      .setDescription(all.slice(0, 15).join('\n')).setFooter({ text: 'BloxStrike • Clan Alliances' });
    return interaction.reply({ embeds: [e] });
  }

  if (sub === 'remove') {
    const target = interaction.options.getString('clan');
    const key = [norm(myClanOf(g, interaction.user.id) || ''), norm(target)].sort().join('|');
    const a = d.clanAllies[key];
    if (!a) return interaction.reply({ content: `❌ **${target}** se koi alliance nahi hai.`, flags: MessageFlags.Ephemeral });
    if (a.by !== interaction.user.id && !isAdmin(interaction)) return interaction.reply({ content: '🔒 Sirf alliance creator ya server admin remove kar sakta hai.', flags: MessageFlags.Ephemeral });
    delete d.clanAllies[key];
    store.save();
    return interaction.reply({ content: `💔 **${a.a}** 🤝 **${a.b}** alliance khatam kar di.`, flags: MessageFlags.Ephemeral });
  }
}

// ---------------- /server ----------------
async function handleServer(interaction) {
  const d = globalData();
  if (!d.servers) d.servers = {};
  const sub = interaction.options.getSubcommand();

  if (sub === 'list') {
    const all = Object.entries(d.servers);
    if (!all.length) return interaction.reply({ content: '❌ Directory khali hai! `/server add` se apna server list karwao taaki log ally kar sakein.', flags: MessageFlags.Ephemeral });
    const rows = all.slice(0, 20).map(([id, s]) => {
      const star = id === interaction.guildId ? '🏠' : '▫️';
      return `${star} **${s.name}** — ${s.tags || 'general'}\n   └ <@${s.owner}> • clans: ${s.clans && s.clans.length ? s.clans.join(', ') : '—'}\n   └ \`${id}\``;
    }).join('\n');
    const e = new EmbedBuilder().setColor(0x8b5cf6)
      .setTitle('🌐 Partner Server Directory')
      .setDescription(rows + '\n\n▫️ = ally candidate • 🏠 = tumhara server\n\nBot un server me invite karo, phir `/ally request clan:<unka clan>` bhejo!')
      .setFooter({ text: `BloxStrike • ${all.length} server(s)` });
    return interaction.reply({ embeds: [e] });
  }

  if (sub === 'add') {
    const name = interaction.options.getString('name');
    const desc = interaction.options.getString('desc') || '';
    const invite = interaction.options.getString('invite') || '';
    const tags = interaction.options.getString('tags') || 'general';
    const existing = d.servers[interaction.guildId];
    const clanNames = Object.keys(g.clans || {}).slice(0, 5);
    d.servers[interaction.guildId] = { name, desc, owner: interaction.guild.ownerId, invite, tags, clans: clanNames, at: Date.now(), addedBy: interaction.user.id };
    store.save();
    const e = new EmbedBuilder().setColor(0x57f287).setTitle('✅ Server directory me add ho gaya!')
      .setDescription((existing ? '**' + name + '** entry update ho gayi.' : '**' + name + '** ab directory me hai!') + (clanNames.length ? `\n\nClans listed: **${clanNames.join(', ')}**` : ''))
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
    const e = new EmbedBuilder().setColor(0x5865f2)
      .setTitle(`🌐 ${s.name}`)
      .setDescription(s.desc || '*No description*')
      .addFields(
        { name: '👑 Owner', value: `<@${s.owner}>`, inline: true },
        { name: '🏷️ Tags', value: s.tags, inline: true },
        { name: '🛡️ Clans', value: (s.clans && s.clans.length) ? s.clans.join(', ') : '*koi nahi*', inline: true },
        { name: '🔗 Invite', value: s.invite ? s.invite : '*private — DM owner*', inline: false }
      )
      .setFooter({ text: 'BloxStrike • /ally request to team up' });
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
