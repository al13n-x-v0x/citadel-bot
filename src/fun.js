const { EmbedBuilder } = require('discord.js');

const COLOR = 0x8b5cf6;
function base() { return new EmbedBuilder().setColor(COLOR).setFooter({ text: 'The Gaming Citadel ✨' }); }

const ROASTS = [
  '{u} ka K/D life me bhi 0.5 hai 💀',
  '{u} NPC hai, prove me wrong 🤡',
  '{u} ke DMs Sahara se bhi dry 🏜️',
  '{u} ne aaj tak clutch nahi mara, prove: life 😭'
];

// spicy roast pack — savage Hinglish (no slurs, Discord-safe)
const SPICY_ROASTS = [
  '{u} ki gaming skill WiFi ke baraber — disconnect ho jaata hai jab zaroorat ho 📡💀',
  '{u} ko dekh ke lagta hai skill issue genetic hai 🧬🤡',
  '{u} lobby ka loading screen hai — bas dikhta hai, kaam nahi karta 😭',
  '{u} ke aims se dushman has has ke mar jaata hai 😂🔫',
  '{u} ka gameplay dekh ke blender bhi bolta hai "kam se kam main mix karta hoon" 🥴',
  'Rocket league me {u} ka rank aur umeed dono ground pe hai 🚀⬇️',
  '{u} main character energy hai... kisi flop anime ka 📉',
  '{u} ka mic quality aur skills dono 240p me hai 🎤📵',
  '{u} practice se nahi, excuses se famous hai 🏆🚫',
  '{u} ke clutch moments ka waiting room khali pada hai 🪑💀',
  'Server ka battery drain: {u} ka presence 🔋📉',
  '{u} ne itni L li hai ki L ka stock market crash ho gaya 📊😭',
  '{u} ka ping 20 hai phir bhi khel aise raha hai jaise 2000 ho 🏓💀',
  '{u} strategy guide padhta hai... ulta 📖🤡',
  '{u} carry mangta hai, khud 0/15 hai 🛒💀'
];

const COMPLIMENTS = [
  '{u} literal W hai 🏆',
  'god-tier spotted: {u} 👑',
  '{u} ho toh lobby ka vibe alag hai ✨'
];
const BALL = ['🔥 Obviously yes', '💀 Nah bro', '🤔 Chai ke baad pucho', '✅ 100%', '❌ Bhool ja', '⏳ Waqt bataega', '🗿 Sigma says no'];

async function handleShip(interaction) {
  const a = interaction.options.getUser('user1');
  const b = interaction.options.getUser('user2') || interaction.user;
  const seed = (a.id + b.id).split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const pct = seed % 101;
  const bar = '█'.repeat(Math.round(pct / 10)).padEnd(10, '░');
  const verdict = pct > 85 ? '💖 MARRIED.' : pct > 60 ? '🔥 Couple goals' : pct > 35 ? '😏 Scope hai' : '💀 NASA ko report karo';
  await interaction.reply({ embeds: [base().setTitle(`💘 ${a.username} × ${b.username}`).setDescription(`\`${bar}\` **${pct}%**\n\n${verdict}`)] });
}

async function handleRoast(interaction) {
  const u = interaction.options.getUser('user') || interaction.user;
  const pack = Math.random() < 0.7 ? SPICY_ROASTS : ROASTS;
  await interaction.reply(pack[Math.floor(Math.random() * pack.length)].replace('{u}', `<@${u.id}>`));
}

async function handleCompliment(interaction) {
  const u = interaction.options.getUser('user') || interaction.user;
  await interaction.reply(COMPLIMENTS[Math.floor(Math.random() * COMPLIMENTS.length)].replace('{u}', `<@${u.id}>`));
}

async function handle8ball(interaction) {
  await interaction.reply({ embeds: [base().setTitle('🎱 8-Ball').setDescription(`**Q:** ${interaction.options.getString('question')}\n**A:** ${BALL[Math.floor(Math.random() * BALL.length)]}`)] });
}

async function handleAvatar(interaction) {
  const u = interaction.options.getUser('user') || interaction.user;
  await interaction.reply({ embeds: [base().setTitle(`🖼️ ${u.username}`).setImage(u.displayAvatarURL({ size: 512 }))] });
}

async function handleServerinfo(interaction) {
  const g = interaction.guild;
  const e = base().setTitle(`🏰 ${g.name}`)
    .setThumbnail(g.iconURL({ size: 256 }))
    .addFields(
      { name: 'Members', value: `${g.memberCount}`, inline: true },
      { name: 'Created', value: `<t:${Math.floor(g.createdTimestamp / 1000)}:D>`, inline: true },
      { name: 'Owner', value: `<@${g.ownerId}>`, inline: true },
      { name: 'Boosts', value: `${g.premiumSubscriptionCount || 0} (Lvl ${g.premiumTier})`, inline: true }
    );
  await interaction.reply({ embeds: [e] });
}

async function handlePoll(interaction) {
  const q = interaction.options.getString('question');
  const opts = [1, 2, 3, 4].map(n => interaction.options.getString(`option${n}`)).filter(Boolean);
  const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'].slice(0, Math.max(2, opts.length));
  const e = base().setTitle(`🗳️ ${q}`).setDescription(opts.map((o, i) => `${emojis[i]} ${o}`).join('\n'));
  const msg = await interaction.reply({ embeds: [e], fetchReply: true });
  for (const em of emojis) await msg.react(em).catch(() => {});
}


async function handleStats(interaction) {
  const g = interaction.guild;
  const store = require('./store');
  const top = store.coinLb(g.id).slice(0, 5);
  const medals = ['🥇', '🥈', '🥉', '4.', '5.'];
  const e = base().setTitle('🏰 ' + g.name + ' — Citadel Stats')
    .setThumbnail(g.iconURL({ size: 256 }))
    .addFields(
      { name: '👥 Members', value: String(g.memberCount), inline: true },
      { name: '📈 Boosts', value: String(g.premiumSubscriptionCount || 0), inline: true },
      { name: '🏆 Top Coins', value: top.length ? top.map(([uid, amt], i) => medals[i] + ' <@' + uid + '> — ' + amt + ' 🪙').join('\n') : 'Nobody yet', inline: false },
      { name: '🤖 Bot', value: 'Citadel Bot v1.0 — ' + require('./slash').length + ' commands', inline: true },
      { name: '⏱️ Uptime', value: Math.floor(process.uptime() / 3600) + 'h ' + Math.floor((process.uptime() % 3600) / 60) + 'm', inline: true }
    );
  await interaction.reply({ embeds: [e] });
}


// ---------------- gif commands (tenor free gif urls) ----------------
const GIFS = {
  dance: ['https://media.tenor.com/xzDWbKKEoAAAAAM/dance-meme.gif','https://media.tenor.com/miGoE1nDyiMAAAAM/cool-dancing.gif','https://media.tenor.com/ooakN2rNeqsAAAAM/anime-dance.gif','https://media.tenor.com/jznKw9F1oH4AAAAM/dance.gif','https://media.tenor.com/1Rm9W2n8fWsAAAAM/party-dance.gif'],
  slap: ['https://media.tenor.com/ZvIdG8wlZB8AAAAM/anime-slap.gif','https://media.tenor.com/DikI5LBGdmMAAAAM/slap.gif','https://media.tenor.com/8bLnLhH7T4gAAAAM/batista-slap.gif'],
  hug: ['https://media.tenor.com/OoQcIqSPKFMAAAAM/anime-hug.gif','https://media.tenor.com/qrl2fSclJMcAAAAM/hug.gif','https://media.tenor.com/xs-%sYKGw0AAAAM/cuddle.gif'],
  wave: ['https://media.tenor.com/qd2cV0BRG5cAAAAM/hello.gif','https://media.tenor.com/Easb7uCLlGEAAAAM/wave.gif'],
  party: ['https://media.tenor.com/e6vOf8nWSl0AAAAM/party-parrot.gif','https://media.tenor.com/9OajeWuFFHkAAAAM/celebrate.gif']
};
const FALLBACK_GIF = 'https://media.tenor.com/xzDWbKKEoAAAAAM/dance-meme.gif';
function pickGif(kind) {
  const arr = GIFS[kind] || [FALLBACK_GIF];
  const url = arr[Math.floor(Math.random() * arr.length)];
  return url && url.startsWith('https://media.tenor.com/') ? url : FALLBACK_GIF;
}

async function handleFun(interaction) {
  const sub = interaction.options.getSubcommand();
  const user = interaction.options.getUser('user');
  if (sub === 'dance') return interaction.reply({ content: (user ? `${user} ke saath dance 🕺🔥` : '🕺 Dance time!'), embeds: [base().setImage(pickGif('dance'))] });
  if (sub === 'slap') {
    if (!user || user.id === interaction.user.id) return interaction.reply('Khud ko slap? 💀 Kisi aur ko tag karo.');
    return interaction.reply({ content: `👋 ${interaction.user} ne ${user} ko THAPPAD maara! 💥`, embeds: [base().setImage(pickGif('slap'))] });
  }
  if (sub === 'hug') {
    if (!user || user.id === interaction.user.id) return interaction.reply('Khud ko hug? Aww 🤗 kisi aur ko tag karo.');
    return interaction.reply({ content: `🤗 ${interaction.user} ne ${user} ko hug diya!`, embeds: [base().setImage(pickGif('hug'))] });
  }
  if (sub === 'wave') return interaction.reply({ content: (user ? `👋 ${interaction.user} waves at ${user}` : '👋 Hello!'), embeds: [base().setImage(pickGif('wave'))] });
  if (sub === 'party') return interaction.reply({ content: '🎉 PARTY TIME!', embeds: [base().setImage(pickGif('party'))] });
}

async function handleSocial(interaction) {
  const e = base()
    .setTitle('🌐 The Gaming Citadel — Socials')
    .setDescription(
      '**🎮 Discord:** discord.gg/creditcard\n' +
      '**📸 Instagram:** @gamingcitadel\n' +
      '**▶️ YouTube:** coming soon\n\n' +
      'Invite friends: `/invite`'
    );
  return interaction.reply({ embeds: [e] });
}

async function handleWarmup(interaction) {
  const e = base()
    .setTitle('🔥 Server Warmup Checklist')
    .setDescription(
      '**Day 1:**\n' +
      '• `/counter setup` — members counter banao\n' +
      '• `/welcome setup` — welcome card ON\n' +
      '• `/colors setup` — color roles panel\n' +
      '• `/arcade setup` — games panel pinned\n\n' +
      '**Day 2-3:**\n' +
      '• `/gstart` — pehla giveaway chalao (join spike)\n' +
      '• `/automod setup` — spam/badwords on\n' +
      '• `/ticketpanel` — support ready\n\n' +
      '**Day 4-7:**\n' +
      '• `/rolelevels setup` — level roles\n' +
      '• `/shopadd` — custom roles shop me daalo\n' +
      '• Daily `/daily` streak + `/ask` AI se engagement\n\n' +
      '**Pro tip:** Naye members ko pehle ghante me roles/welcome milna = retention 2x 📈'
    );
  return interaction.reply({ embeds: [e] });
}


// ---------------- /cc — custom embed creator ----------------
async function handleCC(interaction) {
  if (!isAdminSafe(interaction)) return interaction.reply({ content: 'Admin only.', flags: MessageFlags.Ephemeral });
  const content = interaction.options.getString('content') || '';
  const title = interaction.options.getString('title');
  const desc = interaction.options.getString('description');
  const color = interaction.options.getString('color');
  const image = interaction.options.getString('image');
  const thumbnail = interaction.options.getString('thumbnail');
  const channel = interaction.options.getChannel('channel');
  const ping = interaction.options.getBoolean('ping');

  if (!content && !title && !desc) return interaction.reply({ content: '❌ Kam se kam content ya title/description do.', flags: MessageFlags.Ephemeral });

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const { EmbedBuilder: EB, PermissionFlagsBits: PFB } = require('discord.js');
  const e = new EB();
  if (title) e.setTitle(title.slice(0, 256));
  if (desc) e.setDescription(desc.slice(0, 4000));
  if (color && /^#?[0-9a-fA-F]{6}$/.test(color)) e.setColor(parseInt(color.replace('#', ''), 16));
  else e.setColor(0x8b5cf6);
  if (image && /^https?:\/\//.test(image)) e.setImage(image);
  if (thumbnail && /^https?:\/\//.test(thumbnail)) e.setThumbnail(thumbnail);
  e.setFooter({ text: 'The Gaming Citadel • ' + interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

  const target = channel || interaction.channel;
  const perms = target.permissionsFor(interaction.guild.members.me);
  if (!perms?.has(PFB.SendMessages) || !perms?.has(PFB.EmbedLinks)) {
    return interaction.editReply('❌ Us channel me mujhe **Send Messages** + **Embed Links** chahiye.');
  }
  const payload = { embeds: [e] };
  if (content) payload.content = ping ? `@everyone\n${content.slice(0, 1900)}` : content.slice(0, 1900);
  else if (ping) payload.content = '@everyone';
  const msg = await target.send(payload).catch(err => null);
  if (!msg) return interaction.editReply('❌ Post fail — perms check karo.');
  return interaction.editReply(`✅ Posted in ${target}: ${msg.url}`);
}

function isAdminSafe(interaction) {
  try { const { isAdmin } = require('./util'); return isAdmin(interaction); } catch { return interaction.memberPermissions?.has(8n); }
}

module.exports = { handleStats, handleShip, handleRoast, handleCompliment, handle8ball, handleAvatar, handleServerinfo, handlePoll, handleFun, handleSocial, handleWarmup, handleCC };
