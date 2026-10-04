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
  { q: 'BloxStrike in sabse pehla rule kya is?', opts: ['Respect doo, no toxicity', 'Spam doo', 'Admin to ping doo', 'Roz gaali do'], ans: 0 },
  { q: 'Scam link DM in aaye to kya to do is?', opts: ['Click doke see', 'Report doo, click do not do', 'Dosto to send it', 'Ignore all something'], ans: 1 },
  { q: 'Giveaway in kitni baar entry allowed is?', opts: ['A only baar', 'Roz 10 baar', 'Jitni baar marzi', 'Only admins of for'], ans: 0 },
  { q: 'Server of coins kaise kamate are?', opts: ['/daily and /work by', 'Admin by maang of', 'Copy-paste doke', 'Doosre of account by'], ans: 0 },
  { q: 'Someone to dhamkana or scam to do...', opts: ['Fun is', 'Ban-worthy is', 'Theek is agar DM in are', 'Only jokes in allowed'], ans: 1 }
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
    .setFooter({ text: 'Score: ' + st.correct + ' sahi • 3+ needed' });
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
    return interaction.reply({ content: 'You are already verified ✅ — badge ' + BC + '/profile' + BC + ' on dikhta is.', flags: MessageFlags.Ephemeral });
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
      return interaction.reply({ content: 'You are already verified ✅', flags: MessageFlags.Ephemeral });
    }
    const st = { idx: 0, correct: 0 };
    pending.set(interaction.user.id, st);
    return interaction.reply({ embeds: [quizEmbed(st)], components: [quizRow(QUIZ[0])], flags: MessageFlags.Ephemeral });
  }
  // vq:i
  const st = pending.get(interaction.user.id);
  if (!st) return interaction.reply({ content: 'First ' + BC + '/verify' + BC + ' or panel by start doo.', flags: MessageFlags.Ephemeral });
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
          '• ⚡ **+50 aura** bonus found\n' +
          '• ✅ **Verified badge** now ' + BC + '/profile' + BC + ' and ' + BC + '/bio view' + BC + ' on dikhega' + roleNote + '\n\n' +
          'Now ' + BC + '/bio set' + BC + ' by your bio make!')
        .setFooter({ text: 'BloxStrike • Verified Member' });
      return interaction.update({ embeds: [e], components: [] });
    }
    const e = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle('❌ Verification fail')
      .setDescription('Score: **' + st.correct + '/' + QUIZ.length + '** — 3+ needed the.\nDobara try doo: ' + BC + '/verify' + BC);
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
    return interaction.reply({ content: '✅ Bio set! ' + BC + '/bio view' + BC + ' by see.', flags: MessageFlags.Ephemeral });
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
    .setDescription(bio && bio.text ? bio.text : '*Bio set not —* ' + BC + '/bio set' + BC + ' *by make*')
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
      'Verified member bano and unlock doo:\n' +
      '• ✅ **Verified badge** on ' + BC + '/profile' + BC + ' & ' + BC + '/bio view' + BC + '\n' +
      '• 🎟️ **Giveaway priority**\n' +
      '• 🗣️ **Locked channels access** (jahan admin ne Verified role lawent are)\n' +
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
  if (!entries.length) return interaction.reply('No verified not — ' + BC + '/verifypanel' + BC + ' post it.');
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
  if (!g.verified || !g.verified[user.id]) return interaction.reply({ content: 'Ye member verified not is.', flags: MessageFlags.Ephemeral });
  delete g.verified[user.id];
  store.save();
  return interaction.reply({ content: '❌ <@' + user.id + '> of verify removed.', flags: MessageFlags.Ephemeral });
}

module.exports = { handleBio, handleVerify, handleVerifyPanel, handleVerifyList, handleUnverify, handleVerifyComponent, isVerified };
