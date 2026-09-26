const { EmbedBuilder, MessageFlags, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const store = require('./store');

// ---------------- Bio + Verification — BloxStrike style ----------------
// /bio set|view — member bio + verified badge
// /verify — 5-question quiz (buttons), 3+ sahi = Verified role + badge + aura bonus
// /verifypanel — admin: verification panel post karo
// /verifylist — admin: verified members
// /unverify — admin: verify hatao

const BC = String.fromCharCode(96);

const QUIZ = [
  { q: 'BloxStrike me sabse pehla rule kya hai?', opts: ['Respect karo, no toxicity', 'Spam karo', 'Admin ko ping karo', 'Roz gaali do'], ans: 0 },
  { q: 'Scam link DM me aaye to kya karna hai?', opts: ['Click karke dekho', 'Report karo, click mat karo', 'Dosto ko bhejo', 'Ignore sab kuch'], ans: 1 },
  { q: 'Giveaway me kitni baar entry allowed hai?', opts: ['Ek hi baar', 'Roz 10 baar', 'Jitni baar marzi', 'Sirf admins ke liye'], ans: 0 },
  { q: 'Server ke coins kaise kamate hain?', opts: ['/daily aur /work se', 'Admin se maang ke', 'Copy-paste karke', 'Doosre ke account se'], ans: 0 },
  { q: 'Kisi ko dhamkana ya scam karna...', opts: ['Fun hai', 'Ban-worthy hai', 'Theek hai agar DM me ho', 'Sirf jokes me allowed'], ans: 1 }
];

const pending = new Map(); // userId -> { idx, correct }

function isVerified(g, uid) { return !!(g.verified && g.verified[uid]); }

function findVerifiedRole(guild) {
  const names = ['Verified', '✅ Verified', 'BloxStrike Verified', 'Member'];
  for (const n of names) {
    const r = guild.roles.cache.find(x => x.name.toLowerCase() === n.toLowerCase());
    if (r && !r.managed && r.editable) return r;
  }
  return null;
}

function isAdmin(interaction) {
  return interaction.memberPermissions && interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild);
}

function quizEmbed(st) {
  const q = QUIZ[st.idx];
  return new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle('🛡️ Verification — Q' + (st.idx + 1) + '/' + QUIZ.length)
    .setDescription(q.q + '\n\n' + q.opts.map((o, i) => '**' + 'ABCD'[i] + '**. ' + o).join('\n'))
    .setFooter({ text: 'Score: ' + st.correct + ' sahi • 3+ chahiye' });
}

function quizRow(q) {
  return new ActionRowBuilder().addComponents(
    q.opts.map((o, i) => new ButtonBuilder().setCustomId('vq:' + i).setLabel('ABCD'[i]).setStyle(ButtonStyle.Primary))
  );
}

// ---------------- /verify ----------------
async function handleVerify(interaction) {
  const g = store.guild(interaction.guildId);
  if (isVerified(g, interaction.user.id)) {
    return interaction.reply({ content: 'Tum already verified ho ✅ — badge ' + BC + '/profile' + BC + ' pe dikhta hai.', flags: MessageFlags.Ephemeral });
  }
  const st = { idx: 0, correct: 0 };
  pending.set(interaction.user.id, st);
  return interaction.reply({ embeds: [quizEmbed(st)], components: [quizRow(QUIZ[0])], flags: MessageFlags.Ephemeral });
}

// ---------------- quiz button handler (vq:i and vstart) ----------------
async function handleVerifyComponent(interaction) {
  if (interaction.customId === 'vstart') {
    const g = store.guild(interaction.guildId);
    if (isVerified(g, interaction.user.id)) {
      return interaction.reply({ content: 'Tum already verified ho ✅', flags: MessageFlags.Ephemeral });
    }
    const st = { idx: 0, correct: 0 };
    pending.set(interaction.user.id, st);
    return interaction.reply({ embeds: [quizEmbed(st)], components: [quizRow(QUIZ[0])], flags: MessageFlags.Ephemeral });
  }
  // vq:i
  const st = pending.get(interaction.user.id);
  if (!st) return interaction.reply({ content: 'Pehle ' + BC + '/verify' + BC + ' ya panel se start karo.', flags: MessageFlags.Ephemeral });
  const idx = parseInt(interaction.customId.split(':')[1], 10);
  const q = QUIZ[st.idx];
  if (idx === q.ans) st.correct++;
  st.idx++;
  if (st.idx >= QUIZ.length) {
    pending.delete(interaction.user.id);
    const passed = st.correct >= 3;
    if (passed) {
      const g = store.guild(interaction.guildId);
      if (!g.verified) g.verified = {};
      g.verified[interaction.user.id] = { at: Date.now() };
      store.addAura(interaction.guildId, interaction.user.id, 50);
      const role = findVerifiedRole(interaction.guild);
      let roleNote = '';
      if (role) {
        const m = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
        if (m) { await m.roles.add(role).catch(() => {}); roleNote = '\n✅ Role milega: **' + role.name + '**'; }
      }
      const e = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('✅ Verified!')
        .setDescription('Score: **' + st.correct + '/' + QUIZ.length + '**\n' +
          '• ⚡ **+50 aura** bonus mila\n' +
          '• ✅ **Verified badge** ab ' + BC + '/profile' + BC + ' aur ' + BC + '/bio view' + BC + ' pe dikhega' + roleNote + '\n\n' +
          'Ab ' + BC + '/bio set' + BC + ' se apna bio banao!')
        .setFooter({ text: 'BloxStrike • Verified Member' });
      return interaction.update({ embeds: [e], components: [] });
    }
    const e = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle('❌ Verification fail')
      .setDescription('Score: **' + st.correct + '/' + QUIZ.length + '** — 3+ chahiye the.\nDobara try karo: ' + BC + '/verify' + BC);
    return interaction.update({ embeds: [e], components: [] });
  }
  return interaction.update({ embeds: [quizEmbed(st)], components: [quizRow(QUIZ[st.idx])] });
}

// ---------------- /bio ----------------
async function handleBio(interaction) {
  const g = store.guild(interaction.guildId);
  const sub = interaction.options.getSubcommand();
  if (sub === 'set') {
    const text = (interaction.options.getString('text') || '').slice(0, 180);
    if (!g.bios) g.bios = {};
    g.bios[interaction.user.id] = { text, at: Date.now() };
    store.save();
    return interaction.reply({ content: '✅ Bio set! ' + BC + '/bio view' + BC + ' se dekho.', flags: MessageFlags.Ephemeral });
  }
  const user = interaction.options.getUser('user') || interaction.user;
  const bio = (g.bios || {})[user.id];
  const vouches = store.getVouches(interaction.guildId, user.id);
  const stars = vouches.reduce((a, v) => a + (v.stars || 0), 0);
  const aura = store.getAura(interaction.guildId, user.id);
  const xp = store.getXp(interaction.guildId, user.id);
  const verified = isVerified(g, user.id);
  const e = new EmbedBuilder()
    .setColor(verified ? 0x57f287 : 0x8b5cf6)
    .setTitle((verified ? '✅ ' : '') + user.username + ' — Bio')
    .setThumbnail(user.displayAvatarURL({ size: 128 }))
    .setDescription(bio && bio.text ? bio.text : '*Bio set nahi —* ' + BC + '/bio set' + BC + ' *se banao*')
    .addFields(
      { name: '🌌 Level', value: String(xp.level), inline: true },
      { name: '⚡ Aura', value: String(aura), inline: true },
      { name: '⭐ Vouches', value: vouches.length + ' (' + stars + '★)', inline: true }
    )
    .setFooter({ text: verified ? '✅ Verified • BloxStrike' : 'BloxStrike • The Gaming Citadel' });
  return interaction.reply({ embeds: [e] });
}

// ---------------- /verifypanel ----------------
async function handleVerifyPanel(interaction) {
  if (!isAdmin(interaction)) return interaction.reply({ content: 'Admin only.', flags: MessageFlags.Ephemeral });
  const e = new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle('🛡️ Get Verified — BloxStrike')
    .setDescription(
      'Verified member bano aur unlock karo:\n' +
      '• ✅ **Verified badge** on ' + BC + '/profile' + BC + ' & ' + BC + '/bio view' + BC + '\n' +
      '• 🎟️ **Giveaway priority**\n' +
      '• 🗣️ **Locked channels access** (jahan admin ne Verified role lagaya ho)\n' +
      '• ⚡ **+50 aura bonus**\n\n' +
      'Kaise? Neeche **Start Verification** dabao — 5 simple sawal, 3+ sahi = Verified!'
    )
    .setFooter({ text: 'BloxStrike • Trust & Safety' });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vstart').setLabel('Start Verification').setEmoji('🛡️').setStyle(ButtonStyle.Success)
  );
  return interaction.reply({ embeds: [e], components: [row] });
}

// ---------------- /verifylist, /unverify ----------------
async function handleVerifyList(interaction) {
  if (!isAdmin(interaction)) return interaction.reply({ content: 'Admin only.', flags: MessageFlags.Ephemeral });
  const g = store.guild(interaction.guildId);
  const entries = Object.entries(g.verified || {}).sort((a, b) => b[1].at - a[1].at).slice(0, 25);
  if (!entries.length) return interaction.reply('Abhi koi verified nahi — ' + BC + '/verifypanel' + BC + ' post karo.');
  const e = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle('✅ Verified Members (' + Object.keys(g.verified || {}).length + ')')
    .setDescription(entries.map(([uid, v]) => '<@' + uid + '> — ' + new Date(v.at).toLocaleDateString()).join('\n'));
  return interaction.reply({ embeds: [e] });
}

async function handleUnverify(interaction) {
  if (!isAdmin(interaction)) return interaction.reply({ content: 'Admin only.', flags: MessageFlags.Ephemeral });
  const user = interaction.options.getUser('user', true);
  const g = store.guild(interaction.guildId);
  if (!g.verified || !g.verified[user.id]) return interaction.reply({ content: 'Ye member verified nahi hai.', flags: MessageFlags.Ephemeral });
  delete g.verified[user.id];
  store.save();
  return interaction.reply({ content: '❌ <@' + user.id + '> ka verify removed.', flags: MessageFlags.Ephemeral });
}

module.exports = { handleBio, handleVerify, handleVerifyPanel, handleVerifyList, handleUnverify, handleVerifyComponent, isVerified };
