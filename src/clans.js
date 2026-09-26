const { EmbedBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const store = require('./store');

// ---------------- Clan System — BloxStrike style ----------------
// /clan create|join|leave|info|list|leaderboard|war|donate
// Data: g.clans { name: {name, desc, owner, members:{uid:{joinedAt,pts}}, wins, losses, warAt} }
//       g.clanOf { uid: clanName }

const BC = String.fromCharCode(96);
const CREATE_COST = 250;
const MAX_MEMBERS = 20;

function isAdmin(interaction) {
  return interaction.memberPermissions && interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild);
}
function ensure(g) {
  if (!g.clans) g.clans = {};
  if (!g.clanOf) g.clanOf = {};
}
function clanPts(clan) {
  let t = 0;
  for (const m of Object.values(clan.members)) t += m.pts || 0;
  return t;
}
function findClan(g, name) {
  ensure(g);
  const key = Object.keys(g.clans).find(k => k.toLowerCase() === String(name || '').toLowerCase());
  return key ? g.clans[key] : null;
}
function memberCount(clan) { return Object.keys(clan.members).length; }
function card(clan, guild) {
  return new EmbedBuilder().setColor(0x8b5cf6)
    .setTitle(`🛡️ Clan: ${clan.name}`)
    .setDescription(clan.desc ? clan.desc : '*No description set*')
    .addFields(
      { name: '👑 Leader', value: `<@${clan.owner}>`, inline: true },
      { name: '👥 Members', value: `${memberCount(clan)}/${MAX_MEMBERS}`, inline: true },
      { name: '⚡ Clan Points', value: String(clanPts(clan)), inline: true },
      { name: '⚔️ Wars', value: `${clan.wins || 0}W / ${clan.losses || 0}L`, inline: true },
      { name: '📅 Created', value: `<t:${Math.floor(clan.createdAt / 1000)}:d>`, inline: true }
    )
    .setFooter({ text: 'BloxStrike • Clans' })
    .setTimestamp();
}

// ---------------- /clan ----------------
async function handleClan(interaction) {
  const g = store.guild(interaction.guildId);
  ensure(g);
  const sub = interaction.options.getSubcommand();

  if (sub === 'create') {
    const name = interaction.options.getString('name').trim();
    const desc = interaction.options.getString('desc') || '';
    if (findClan(g, name)) return interaction.reply({ content: '❌ Wo clan name already taken hai!', flags: MessageFlags.Ephemeral });
    if (g.clanOf[interaction.user.id]) return interaction.reply({ content: '❌ Tum already ek clan me ho! Pehle `/clan leave` karo.', flags: MessageFlags.Ephemeral });
    const coins = store.getCoins(interaction.guildId, interaction.user.id);
    if (coins < CREATE_COST) return interaction.reply({ content: `❌ Clan banane ke liye ${CREATE_COST} 🪙 chahiye. Tumhare paas ${coins} 🪙 hain.`, flags: MessageFlags.Ephemeral });
    store.addCoins(interaction.guildId, interaction.user.id, -CREATE_COST);
    g.clans[name] = { name, desc, owner: interaction.user.id, members: { [interaction.user.id]: { joinedAt: Date.now(), pts: 0 } }, wins: 0, losses: 0, warAt: 0, createdAt: Date.now() };
    g.clanOf[interaction.user.id] = name;
    store.save();
    const e = new EmbedBuilder().setColor(0x57f287)
      .setTitle(`🛡️ Clan ban gaya: ${name}`)
      .setDescription(`${interaction.user} ne **${name}** clan banaya! (-${CREATE_COST} 🪙)\n\nMembers bulao: \`/clan join ${name}\``)
      .setFooter({ text: 'BloxStrike • Clans' });
    return interaction.reply({ embeds: [e] });
  }

  if (sub === 'join') {
    const name = interaction.options.getString('name');
    const clan = findClan(g, name);
    if (!clan) return interaction.reply({ content: '❌ Aisa koi clan nahi mila!', flags: MessageFlags.Ephemeral });
    if (g.clanOf[interaction.user.id]) return interaction.reply({ content: '❌ Tum already **' + g.clanOf[interaction.user.id] + '** me ho!', flags: MessageFlags.Ephemeral });
    if (memberCount(clan) >= MAX_MEMBERS) return interaction.reply({ content: '❌ Ye clan full hai (20/20)!', flags: MessageFlags.Ephemeral });
    clan.members[interaction.user.id] = { joinedAt: Date.now(), pts: 0 };
    g.clanOf[interaction.user.id] = clan.name;
    store.save();
    return interaction.reply({ content: `✅ ${interaction.user} **${clan.name}** clan join kar liya! (${memberCount(clan)}/${MAX_MEMBERS})` });
  }

  if (sub === 'leave') {
    const cname = g.clanOf[interaction.user.id];
    if (!cname) return interaction.reply({ content: '❌ Tum kisi clan me nahi ho!', flags: MessageFlags.Ephemeral });
    const clan = g.clans[cname];
    delete clan.members[interaction.user.id];
    delete g.clanOf[interaction.user.id];
    let msg = `👋 Tumne **${cname}** chhod diya.`;
    if (clan.owner === interaction.user.id) {
      const rest = Object.keys(clan.members);
      if (rest.length === 0) {
        delete g.clans[cname];
        msg += '\n💥 Clan me koi nahi tha — clan disband ho gaya.';
      } else {
        clan.owner = rest[0];
        msg += `\n👑 Naya leader: <@${rest[0]}>`;
      }
    }
    store.save();
    return interaction.reply({ content: msg });
  }

  if (sub === 'info') {
    const name = interaction.options.getString('name') || g.clanOf[interaction.user.id];
    if (!name) return interaction.reply({ content: '❌ Clan name do ya khud kisi clan me join karo!', flags: MessageFlags.Ephemeral });
    const clan = findClan(g, name);
    if (!clan) return interaction.reply({ content: '❌ Aisa koi clan nahi mila!', flags: MessageFlags.Ephemeral });
    const members = Object.entries(clan.members).sort((a, b) => (b[1].pts || 0) - (a[1].pts || 0)).slice(0, 10)
      .map(([uid, m], i) => `${i + 1}. <@${uid}> — ${m.pts || 0} pts`).join('\n') || '*empty*';
    return interaction.reply({ embeds: [card(clan, interaction.guild).addFields({ name: '🏅 Top Members', value: members })] });
  }

  if (sub === 'list') {
    const all = Object.values(g.clans).sort((a, b) => clanPts(b) - clanPts(a));
    if (!all.length) return interaction.reply({ content: '❌ Abhi is server me koi clan nahi hai! `/clan create` se pehla banao 🛡️', flags: MessageFlags.Ephemeral });
    const e = new EmbedBuilder().setColor(0x8b5cf6).setTitle('🛡️ Server Clans')
      .setDescription(all.slice(0, 15).map((c, i) => `**${i + 1}. ${c.name}** — ${clanPts(c)} pts • ${memberCount(c)} members`).join('\n'))
      .setFooter({ text: 'BloxStrike • Clans' });
    return interaction.reply({ embeds: [e] });
  }

  if (sub === 'leaderboard') {
    const cname = g.clanOf[interaction.user.id];
    if (!cname) return interaction.reply({ content: '❌ Pehle kisi clan me join karo!', flags: MessageFlags.Ephemeral });
    const clan = g.clans[cname];
    const rows = Object.entries(clan.members).sort((a, b) => (b[1].pts || 0) - (a[1].pts || 0)).slice(0, 10)
      .map(([uid, m], i) => `${['🥇', '🥈', '🥉'][i] || `${i + 1}.`} <@${uid}> — ${m.pts || 0} pts`).join('\n') || '*empty*';
    const e = new EmbedBuilder().setColor(0xf1c40f).setTitle(`🏅 ${cname} — Member Leaderboard`)
      .setDescription(rows).setFooter({ text: 'BloxStrike • Clans' });
    return interaction.reply({ embeds: [e] });
  }

  if (sub === 'donate') {
    const amount = interaction.options.getInteger('amount');
    if (amount < 100) return interaction.reply({ content: '❌ Minimum 100 🪙 donate karo!', flags: MessageFlags.Ephemeral });
    if (store.getCoins(interaction.guildId, interaction.user.id) < amount) return interaction.reply({ content: '❌ Itne coins nahi hain!', flags: MessageFlags.Ephemeral });
    const cname = g.clanOf[interaction.user.id];
    if (!cname) return interaction.reply({ content: '❌ Pehle kisi clan me join karo!', flags: MessageFlags.Ephemeral });
    store.addCoins(interaction.guildId, interaction.user.id, -amount);
    const pts = Math.floor(amount / 100) * 10;
    g.clans[cname].members[interaction.user.id].pts = (g.clans[cname].members[interaction.user.id].pts || 0) + pts;
    store.save();
    store.addAura(interaction.guildId, interaction.user.id, Math.floor(pts / 2));
    return interaction.reply({ content: `💰 ${amount} 🪙 donate kiye → **${cname}** ko +${pts} pts mila! Tumhe +${Math.floor(pts / 2)} ⚡ aura bhi.` });
  }

  if (sub === 'war') {
    const targetName = interaction.options.getString('name');
    const myName = g.clanOf[interaction.user.id];
    if (!myName) return interaction.reply({ content: '❌ Clan war ke liye pehle kisi clan me hona zaroori hai!', flags: MessageFlags.Ephemeral });
    if (myName.toLowerCase() === targetName.toLowerCase()) return interaction.reply({ content: '❌ Khud ke against war nahi kar sakte 😅', flags: MessageFlags.Ephemeral });
    const mine = g.clans[myName];
    const target = findClan(g, targetName);
    if (!target) return interaction.reply({ content: '❌ Aisa koi clan nahi mila!', flags: MessageFlags.Ephemeral });
    if (Date.now() - (mine.warAt || 0) < 30 * 60000) {
      const left = Math.ceil((30 * 60000 - (Date.now() - mine.warAt)) / 60000);
      return interaction.reply({ content: `⏳ Clan war cooldown — ${left} min baad try karo.`, flags: MessageFlags.Ephemeral });
    }
    mine.warAt = Date.now();
    const myPower = clanPts(mine) + Math.floor(Math.random() * 500);
    const theirPower = clanPts(target) + Math.floor(Math.random() * 500);
    const iWon = myPower >= theirPower;
    const winner = iWon ? mine : target;
    const loser = iWon ? target : mine;
    winner.wins = (winner.wins || 0) + 1;
    loser.losses = (loser.losses || 0) + 1;
    const bonus = 25;
    for (const uid of Object.keys(winner.members)) {
      winner.members[uid].pts = (winner.members[uid].pts || 0) + 10;
      store.addAura(interaction.guildId, uid, bonus);
    }
    store.save();
    const e = new EmbedBuilder().setColor(iWon ? 0x57f287 : 0xed4245)
      .setTitle(`⚔️ CLAN WAR: ${mine.name} vs ${target.name}`)
      .setDescription(
        `**${mine.name}** power: ${myPower}\n**${target.name}** power: ${theirPower}\n\n` +
        `🏆 **WINNER: ${winner.name}!**\n` +
        `Sare winner members ko +10 clan pts aur +${bonus} ⚡ aura mila!`
      )
      .setFooter({ text: 'BloxStrike • Clan Wars' });
    return interaction.reply({ embeds: [e] });
  }
}

module.exports = { handleClan };
