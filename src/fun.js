const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const BC = String.fromCharCode(96);

const COLOR = 0x8b5cf6;
function base() { return new EmbedBuilder().setColor(COLOR).setFooter({ text: 'The Gaming Citadel ✨' }); }

const ROASTS = [
  '{u} of K/D life in also 0.5 is 💀',
  '{u} NPC is, prove in wrong 🤡',
  '{u} of DMs Sahara by also dry 🏜️',
  '{u} ne aaj until clutch not mara, prove: life 😭',
  '{u} tutorial skip doke seedha L le went 📉',
  '{u} of team in aana = free lose streak 🏆😭',
  '{u} of loadout see of dushman subscribe do itta is 📢',
  '{u} hide and seek champion — bas game in kright now not show 😵‍🌫️',
  '{u} respawn doke also wapas not aata 💀'
];

// spicy roast pack — savage Hinglish (no slurs, Discord-safe)
const SPICY_ROASTS = [
  '{u} of gaming skill WiFi of baraber — disconnect are jaata is when surelyat are 📡💀',
  '{u} to see of lagta is skill issue genetic is 🧬🤡',
  '{u} lobby of loading screen is — bas dikhta is, work not does 😭',
  '{u} of aims by dushman has has of mar jaata is 😂🔣',
  '{u} of gameplay see of blender also bolta is "kam by kam main mix does am" 🥴',
  'Rocket league in {u} of rank and umeed both ground on is 🚀⬇️',
  '{u} main character energy is... someone flop anime of 📉',
  '{u} of mic quality and skills both 240p in is 🎤📵',
  '{u} practice by not, excuses by famous is 🏆🚫',
  '{u} of clutch moments of waiting room khali pada is 🪑💀',
  'Server of battery drain: {u} of presence 🔋📉',
  '{u} ne itni L li is of L of stock market crash done 📊😭',
  '{u} hit 20 ping and then still played like 2000 🏓💀',
  '{u} strategy guide padhta is... ulta 📖🤡',
  '{u} carry mangta is, yourself 0/15 is 🛒💀',
  '{u} of k/d see of calculator also bola "error" 🧮🛑',
  'Home on {u} of rank tellte only WiFi slow done 📡😭',
  '{u} of warmup itna lamba of match end done ⭐😭'
];

// NUCLEAR pack — "dead-killer" gaali roast. Vulgar Hinglish gaali-jhagda words only.
// NO caste/religious/community slurs — classic roast gaali only, bot-safe.
const NUCLEAR_ROASTS = [
  '{u} bhosdike 1v1 in aaya was or spectate to do? 💀🔣',
  'Teri aim on bharosa to do chutiya-pan is {u} — crosshair also tujhse darr of chalta is 🎯🤡',
  '{u} is 0/15 and still typing "gg bro" 😡💀',
  '{u} behenchod lobby of gareeb is — skill in also, dimaag in also 💸🧪',
  'Gaandu {u} to mic dena only galti was — now until maa-behen a only word in aa went 🎤😬',
  '{u} is somehow lucky even on respawn — why did the game spawn you back? 🤔💀',
  'BC {u} of clutch 1v5? Sap ne in also not 💀🔮',
  '{u} chutiya is itna of aim assist also mana do itta is 🤡💢',
  'MC {u} teri gameplay on mute doke also dard happens is 🎧😢',
  '{u} bkl teri team on daya doo — roz a gaandu by streak tootti is 😭🔪',
  'Oye lavde {u}, tutorial also tujhe pakad of sikhana pada 📖😡',
  '{u} madarchod spawn on only mar went — prolly life by also is 💀👻',
  'Gandu {u} of sensitivity 800 and aim 0.2 — hath kaanpta is, bas game in not 🖐😭',
  'Bro {u} has 0 kills after all that warmup, did you only warm up? 🥴😡',
  '{u} behenchod pehli baar seea is jo reload also late does is 🔊💀',
  'MC {u} teri strategy padh li mai ne — only "die" likha is 📖💀',
  '{u} chutiye teri matchmaking partners also tere by bhaagte are 🏃😭',
  '{u} takes forever to enter and exits the same way they came in, your favourite move 🚀😭',
  'BC {u} of mic on only gharones sunte are, team not 🏠🎤',
  '{u} gaandu, tujhse match khelna = without pair of footpath on chalna 🧍🛑'
];
const COMPLIMENTS = [
  '{u} literal W is 🏆',
  'god-tier spotted: {u} 👑',
  '{u} are toh lobby of vibe alag is ✨'
];
const BALL = ['🔥 Obviously yes', '💀 Nah bro', '🤔 Chai of baad pucho', '✅ 100%', '❌ Bhool ja', '⏳ Time tellega', '🗿 Sigma says no'];

async function handleShip(interaction) {
  const a = interaction.options.getUser('user1');
  const b = interaction.options.getUser('user2') || interaction.user;
  const seed = (a.id + b.id).split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const pct = seed % 101;
  const bar = '█'.repeat(Math.round(pct / 10)).padEnd(10, '░');
  const verdict = pct > 85 ? '💖 MARRIED.' : pct > 60 ? '🔥 Couple goals' : pct > 35 ? '😏 Scope is' : '💀 NASA to report doo';
  await interaction.reply({ embeds: [base().setTitle(`💘 ${a.username} × ${b.username}`).setDescription(`${BC}${bar}${BC} **${pct}%**\n\n${verdict}`)] });
}

// roast intensity levels: normal (friendly), spicy (savage), nuclear (pure gaali — dead-killer)
const ROAST_LEVELS = { normal: ROASTS, spicy: SPICY_ROASTS, nuclear: NUCLEAR_ROASTS };
function pickRoastPack(level) {
  if (level && ROAST_LEVELS[level]) return ROAST_LEVELS[level];
  const r = Math.random();
  if (r < 0.2) return ROASTS;
  if (r < 0.75) return SPICY_ROASTS;
  return NUCLEAR_ROASTS;
}
async function handleRoast(interaction) {
  const u = interaction.options.getUser('user') || interaction.user;
  const level = interaction.options.getString('level');
  const pack = pickRoastPack(level);
  const tag = '<@' + u.id + '>';
  await interaction.reply(pack[Math.floor(Math.random() * pack.length)].replace('{u}', tag));
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
  const cards = require('./cards');
  const user = interaction.options.getUser('user') || interaction.user;
  await interaction.deferReply();
  const act = store.getActivity(g.id, user.id);
  const member = await g.members.fetch(user.id).catch(() => null);
  const channels = act.channels.map((c) => {
    const ch = g.channels.cache.get(c.id);
    return { name: ch ? ch.name : 'unknown', count: c.count };
  });
  const accent = (store.guild(g.id).welcome || {}).cardColor || null;
  let png = null;
  try {
    png = await cards.statsCard({
      username: user.username,
      tag: user.tag,
      avatarUrl: user.displayAvatarURL({ extension: 'png', size: 256 }),
      joinedAt: member && member.joinedAt ? member.joinedAt.toISOString() : null,
      serverName: g.name,
      total: act.total,
      last24h: act.last24h, last7d: act.last7d, last28d: act.last28d,
      voice24h: act.voice24h, voice7d: act.voice7d, voice28d: act.voice28d,
      peakDay: act.peakDay,
      dailyAvg: act.dailyAvg,
      topChannelName: channels.length ? channels[0].name : null,
      channels,
      daily: act.daily,
      accent
    });
  } catch (err) {
    console.error('[stats] card render failed:', err.message);
  }

  const textFallback = function () {
    const lines = ['**Total messages:** ' + act.total,
      '**Last 24h:** ' + act.last24h + ' • **7 days:** ' + act.last7d + ' • **28 days:** ' + act.last28d,
      '**Voice:** ' + (act.voice28d || 0) + ' min in 28 days'];
    if (channels.length) lines.push('**Top channel:** #' + channels[0].name + ' (' + channels[0].count + ')');
    return new EmbedBuilder().setColor(0x8b5cf6).setTitle('Citadel Stats — ' + user.username).setDescription(lines.join(String.fromCharCode(10))).setFooter({ text: 'The Gaming Citadel • Stats' });
  };

  if (!png) return interaction.editReply({ embeds: [textFallback()] }).catch(() => {});
  const file = new AttachmentBuilder(png, { name: 'stats.png' });
  const e = textFallback().setImage('attachment://stats.png');
  await interaction.editReply({ embeds: [e], files: [file] }).catch(() => interaction.editReply({ embeds: [textFallback()] }));
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
  if (sub === 'dance') return interaction.reply({ content: (user ? `${user} is dancing 🕺🔥` : '🕺 Dance time!'), embeds: [base().setImage(pickGif('dance'))] });
  if (sub === 'slap') {
    if (!user || user.id === interaction.user.id) return interaction.reply('Slap yourself? 💀 Tag someo ne else.');
    return interaction.reply({ content: `👋 ${interaction.user} ne ${user} to THAPPAD maara! 💥`, embeds: [base().setImage(pickGif('slap'))] });
  }
  if (sub === 'hug') {
    if (!user || user.id === interaction.user.id) return interaction.reply('Yourself to hug? Aww 🤗 someone and to tag doo.');
    return interaction.reply({ content: `🤗 ${interaction.user} ne ${user} to hug diya!`, embeds: [base().setImage(pickGif('hug'))] });
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
      '• `/counter setup` — members counter make\n' +
      '• `/welcome setup` — welcome card ON\n' +
      '• `/colors setup` — color roles panel\n' +
      '• `/arcade setup` — games panel pinned\n\n' +
      '**Day 2-3:**\n' +
      '• `/gstart` — pehla giveaway chalao (join spike)\n' +
      '• `/automod setup` — spam/badwords on\n' +
      '• `/ticketpanel` — support ready\n\n' +
      '**Day 4-7:**\n' +
      '• `/rolelevels setup` — level roles\n' +
      '• `/shopadd` — custom roles shop in daalo\n' +
      '• Daily `/daily` streak + `/ask` AI by engagement\n\n' +
      '**Pro tip:** Naye members to first ghante in roles/welcome milna = retention 2x 📈'
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

  if (!content && !title && !desc) return interaction.reply({ content: '❌ Kam by kam content or title/description do.', flags: MessageFlags.Ephemeral });

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
    return interaction.editReply('❌ Us channel in mujhe **Send Messages** + **Embed Links** needed.');
  }
  const payload = { embeds: [e] };
  if (content) payload.content = ping ? `@everyone\n${content.slice(0, 1900)}` : content.slice(0, 1900);
  else if (ping) payload.content = '@everyone';
  const msg = await target.send(payload).catch(err => null);
  if (!msg) return interaction.editReply('❌ Post fail — permissions.');
  return interaction.editReply(`✅ Posted in ${target}: ${msg.url}`);
}

function isAdminSafe(interaction) {
  try { const { isAdmin } = require('./util'); return isAdmin(interaction); } catch { return interaction.memberPermissions?.has(8n); }
}

module.exports = { handleStats, handleShip, handleRoast, handleCompliment, handle8ball, handleAvatar, handleServerinfo, handlePoll, handleFun, handleSocial, handleWarmup, handleCC };
