const { EmbedBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const store = require('./store');

// ---------------- Weekly Competitions — BloxStrike style ----------------
// /compete — chal rahi competitions dikhao + join karo
// /compete submit — apna entry (screenshot link / score) submit karo
// /compete board — current standings
// /compsetup — admin: nayi competition banao (auto week-long)
// /compend — admin: turant end karke winner announce karo

const BC = String.fromCharCode(96);
const WEEK_MS = 7 * 86400000;

function isAdmin(interaction) {
  return interaction.memberPermissions && interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild);
}

function currentComp(g) {
  if (!g.competitions) return null;
  const comps = Object.values(g.competitions).filter(c => c.active && c.endsAt > Date.now());
  comps.sort((a, b) => b.startedAt - a.startedAt);
  return comps[0] || null;
}

// ---------------- /compete ----------------
async function handleCompete(interaction) {
  const g = store.guild(interaction.guildId);
  const sub = interaction.options.getSubcommand();

  if (sub === 'join') {
    const comp = currentComp(g);
    if (!comp) return interaction.reply({ content: 'Abhi koi competition chal nahi rahi — admin ' + BC + '/compsetup' + BC + ' se start karega. 🔔', flags: MessageFlags.Ephemeral });
    if (!comp.entries) comp.entries = {};
    if (comp.entries[interaction.user.id]) return interaction.reply({ content: 'Already joined! Submit karo: ' + BC + '/compete submit' + BC, flags: MessageFlags.Ephemeral });
    comp.entries[interaction.user.id] = { score: 0, proof: null, at: Date.now() };
    store.save();
    return interaction.reply({ content: '🔥 **' + comp.title + '** me join ho gaya!\nAb apna entry submit karo: ' + BC + '/compete submit' + BC, flags: MessageFlags.Ephemeral });
  }

  if (sub === 'submit') {
    const comp = currentComp(g);
    if (!comp) return interaction.reply({ content: 'Koi competition active nahi.', flags: MessageFlags.Ephemeral });
    if (!comp.entries || !comp.entries[interaction.user.id]) return interaction.reply({ content: 'Pehle join karo: ' + BC + '/compete join' + BC, flags: MessageFlags.Ephemeral });
    const score = interaction.options.getInteger('score') || 0;
    const proof = (interaction.options.getString('proof') || '').slice(0, 300);
    comp.entries[interaction.user.id] = { score, proof, at: Date.now() };
    store.save();
    return interaction.reply({ content: '📤 Entry submitted! Score: **' + score + '**' + (proof ? ' • Proof attached' : '') + '\nBoard dekho: ' + BC + '/compete board' + BC, flags: MessageFlags.Ephemeral });
  }

  if (sub === 'board') {
    const comp = currentComp(g);
    if (!comp) return interaction.reply({ content: 'Koi competition active nahi.', flags: MessageFlags.Ephemal });
    return interaction.reply({ embeds: [boardEmbed(comp)] });
  }

  // default: info/current
  const comp = currentComp(g);
  if (!comp) {
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(0x8b5cf6).setTitle('🏆 BloxStrike Competitions')
        .setDescription('Abhi koi competition live nahi.\n\nAdmin ke liye: ' + BC + '/compsetup' + BC + ' se nayi week-long competition shuru karo.\n\nKaam kaise karta hai:\n• **Join** karo → entry banao → **submit** karo (score + proof)\n• Week end hone pe **top 3** ko coins + aura + winner role\n• Winner: **500 🪙 + 100 ⚡**, 2nd: **250 🪙 + 50 ⚡**, 3rd: **100 🪙 + 25 ⚡**')]
    });
  }
  const joined = comp.entries && comp.entries[interaction.user.id];
  const e = new EmbedBuilder().setColor(0xf1c40f).setTitle('🏆 ' + comp.title)
    .setDescription(comp.description + '\n\n**Entry:** ' + (joined ? '✅ Joined' : '❌ Not joined') + '\n**Ends:** <t:' + Math.floor(comp.endsAt / 1000) + ':R>\n**Participants:** ' + Object.keys(comp.entries || {}).length + '\n\nJoin: ' + BC + '/compete join' + BC + ' • Submit: ' + BC + '/compete submit' + BC + ' • Board: ' + BC + '/compete board' + BC)
    .setFooter({ text: 'BloxStrike • Weekly Competition' });
  return interaction.reply({ embeds: [e] });
}

function boardEmbed(comp) {
  const rows = Object.entries(comp.entries || {}).sort((a, b) => (b[1].score || 0) - (a[1].score || 0)).slice(0, 10);
  const desc = rows.length
    ? rows.map(([uid, en], i) => {
        const medal = ['🥇', '🥈', '🥉'][i] || ('`' + (i + 1) + '`');
        return medal + ' <@' + uid + '> — **' + (en.score || 0) + '** pts' + (en.proof ? ' [proof](' + en.proof + ')' : '');
      }).join('\n')
    : '*Koi entry nahi — pehla join karo!* ' + BC + '/compete join' + BC;
  return new EmbedBuilder().setColor(0xf1c40f).setTitle('🏆 ' + comp.title + ' — Leaderboard')
    .setDescription(desc + '\n\n**Ends:** <t:' + Math.floor(comp.endsAt / 1000) + ':R>')
    .setFooter({ text: 'BloxStrike • Weekly Competition' });
}

// ---------------- /compsetup ----------------
async function handleCompSetup(interaction) {
  if (!isAdmin(interaction)) return interaction.reply({ content: 'Admin only.', flags: MessageFlags.Ephemeral });
  const g = store.guild(interaction.guildId);
  if (currentComp(g)) return interaction.reply({ content: 'Ek competition already chal rahi hai — pehle ' + BC + '/compend' + BC + ' karo.', flags: MessageFlags.Ephemeral });
  const title = (interaction.options.getString('title') || '').slice(0, 80);
  const description = (interaction.options.getString('description') || '').slice(0, 300);
  const prize = (interaction.options.getString('prize') || '500 coins + aura').slice(0, 100);
  const id = 'c' + Date.now();
  if (!g.competitions) g.competitions = {};
  g.competitions[id] = {
    id, title, description: description + ('\n\n🎁 **Prize:** ' + prize),
    prize, active: true, startedAt: Date.now(), endsAt: Date.now() + WEEK_MS, entries: {}
  };
  store.save();
  const e = new EmbedBuilder().setColor(0xf1c40f).setTitle('🏆 NEW COMPETITION: ' + title)
    .setDescription(description + '\n\n🎁 **Prize:** ' + prize + '\n⏰ **Ends:** <t:' + Math.floor((Date.now() + WEEK_MS) / 1000) + ':R>\n\n**Join now:** ' + BC + '/compete join' + BC)
    .setFooter({ text: 'BloxStrike • Weekly Competition' });
  return interaction.reply({ embeds: [e] });
}

// ---------------- /compend ----------------
async function handleCompEnd(interaction) {
  if (!isAdmin(interaction)) return interaction.reply({ content: 'Admin only.', flags: MessageFlags.Ephemeral });
  const g = store.guild(interaction.guildId);
  const comp = currentComp(g);
  if (!comp) return interaction.reply({ content: 'Koi active competition nahi.', flags: MessageFlags.Ephemeral });
  comp.active = false;
  comp.endsAt = Date.now();
  store.save();
  const rows = Object.entries(comp.entries || {}).sort((a, b) => (b[1].score || 0) - (a[1].score || 0));
  if (!rows.length) return interaction.reply('Competition band — koi entry nahi thi. 🤷');
  const prizes = [[500, 100], [250, 50], [100, 25]];
  const lines = [];
  for (let i = 0; i < Math.min(3, rows.length); i++) {
    const [uid] = rows[i];
    const [coins, aura] = prizes[i];
    store.addCoins(interaction.guildId, uid, coins);
    store.addAura(interaction.guildId, uid, aura);
    lines.push(['🥇', '🥈', '🥉'][i] + ' <@' + uid + '> — **' + coins + ' 🪙 + ' + aura + ' ⚡**');
  }
  // Winner role if exists
  const wr = interaction.guild.roles.cache.find(r => ['Champion', 'Winner', '🏆 Champion'].includes(r.name));
  let roleNote = '';
  if (wr) {
    const m = await interaction.guild.members.fetch(rows[0][0]).catch(() => null);
    if (m) { await m.roles.add(wr).catch(() => {}); roleNote = '\n👑 <@' + rows[0][0] + '> ko **' + wr.name + '** role mila!'; }
  }
  const e = new EmbedBuilder().setColor(0xf1c40f).setTitle('🏆 ' + comp.title + ' — FINAL RESULTS')
    .setDescription(lines.join('\n') + roleNote + '\n\nNext competition jaldi aayegi — stay tuned! 🔔')
    .setFooter({ text: 'BloxStrike • Weekly Competition' });
  return interaction.reply({ embeds: [e] });
}

module.exports = { handleCompete, handleCompSetup, handleCompEnd };
