const { EmbedBuilder, MessageFlags } = require('discord.js');
const store = require('./store');

// ---------------- Extra Fun Commands — BloxStrike style ----------------
// Standalone quick commands: trivia, wouldyourather, truth, dare, guess, rate,
// respect, f, vibe, hugcount(?), streak, persona... sab lightweight, no setup.

const BC = String.fromCharCode(96);

const TRIVIA = [
  { q: 'Roblox of original naam kya was?', a: ['dynablocks', 'dynamic blocks'] },
  { q: 'Discord kab launch was (year)?', a: ['2015'] },
  { q: 'Sabse zyada concurrent players one Roblox game?', a: ['grow a garden', 'growagarden'] },
  { q: 'Roblox currency of naam?', a: ['robux'] },
  { q: 'How do you earn Robux in Roblox — is it free or paid?', a: ['paise', 'money', 'buy', 'purchase', 'robux'] },
  { q: 'Minecraft in creeper explode are ne by first kya sound does is?', a: ['sss', 'hiss', 'fuse'] },
  { q: 'Bloxstrike server which bot by chalta is? (hint: Citadel)', a: ['citadel', 'citadel bot', 'citadelbot'] },
  { q: 'Discord founder of naam?', a: ['jason citron'] },
  { q: 'Fortnite which company of is?', a: ['epic', 'epic games'] },
  { q: 'PUBG full form?', a: ['playerunknowns battlegrounds', "playerunknown's battlegrounds", 'playerunknown battlegrounds'] },
  { q: 'Roblox in pehli baar account bana ne of minimum age?', a: ['13', 'thirteen'] },
  { q: 'Among Us which year viral was?', a: ['2020'] },
  { q: 'Steam which company of is?', a: ['valve'] },
  { q: 'Which company made GTA V?', a: ['rockstar', 'rockstar games'] },
  { q: 'Bot of paas kit ne slash commands are? (approx, 5 of inside)', a: ['100', '95', '96', '97', '98', '99', '90'] }
];

const WYR = [
  'Unlimited Robux but no friends onli ne 🆚 Limited Robux with full squad',
  'Only Minecraft khao zindagi bhar 🆚 Only Roblox khao zindagi bhar',
  'Discord on hamesha lag 🆚 Internet on hamesha 1 bar/day',
  '100k members dead server 🆚 500 members active server',
  'Mod powers but nobody listens 🆚 No powers but everyo ne respects you',
  'Free Nitro for life but no voice chat 🆚 Pay for Nitro with full features',
  'Headless Head 🆚 Korblox Deathspeaker',
  'Bot ban jao 1 week 🆚 Server delete are jaye 1 din',
  'Waapi in only skill issue 🆚 Waapi in only lag',
  'Eternal 200 ping 🆚 Eternal 30 fps'
];

const TRUTHS = [
  'Server of sabse annoying member who is? (no names, hints do 😂)',
  'Kright now someone to falsely reported did is?',
  'Sabse embarrassing username jo kright now rakha?',
  'What did you dream about last night? Be honest!',
  'Kright now someone of stream on anonymously gaye are?',
  'Sabse weird DM jo kright now aaya?',
  'Kright now alt account by someone to stalk did?',
  'Aapka sabse bada gaming L kya was?'
];

const DARES = [
  'Next 10 messages in only emojis by reply doo!',
  'Voice channel in aao and 1 li ne gaao 🎤',
  'Your real profile pic 1 ghante of for anime pic by replace doo',
  'Someone random member to "king 👑" bol of DM doo',
  'Agle message in har word CAPITAL in likho',
  'Your status "Certified Noob" rakho 1 hour of for',
  'Say "I love this server" 5 times in chat',
  'Someone to compliment do — right now, this second!'
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ---------------- /trivia ----------------
const triviaSessions = new Map(); // userId -> {answer, at}
async function handleTrivia(interaction) {
  const t = pick(TRIVIA);
  triviaSessions.set(interaction.user.id, { answer: t.a, at: Date.now() });
  const e = new EmbedBuilder().setColor(0xf1c40f)
    .setTitle('🧠 BloxStrike Trivia')
    .setDescription(`${t.q}\n\nAnswer DM in bhejna mat — this channel in likho 30 sec in!`)
    .setFooter({ text: 'Type your answer in chat!' });
  await interaction.reply({ embeds: [e] });
  setTimeout(async () => {
    const s = triviaSessions.get(interaction.user.id);
    if (s && s.answer === t.a) {
      triviaSessions.delete(interaction.user.id);
    }
  }, 30000).unref();
  return;
}
function checkTriviaAnswer(message) {
  const s = triviaSessions.get(message.author.id);
  if (!s) return false;
  if (Date.now() - s.at > 30000) { triviaSessions.delete(message.author.id); return false; }
  const guess = message.content.toLowerCase().trim();
  if (s.answer.some(a => guess.includes(a))) {
    triviaSessions.delete(message.author.id);
    store.addCoins(message.guild.id, message.author.id, 50);
    store.addAura(message.guild.id, message.author.id, 15);
    message.reply(`✅ Sahi jawab! **${message.author.username}** jeeta 50 🪙 + 15 ⚡`).catch(() => {});
    return true;
  }
  return false;
}

// ---------------- /wouldyourather ----------------
async function handleWouldYouRather(interaction) {
  const e = new EmbedBuilder().setColor(0x8b5cf6)
    .setTitle('🤔 Would You Rather...')
    .setDescription(pick(WYR))
    .setFooter({ text: 'BloxStrike • Vote in replies: 1️⃣ or 2️⃣' });
  const m = await interaction.reply({ embeds: [e], fetchReply: true });
  await m.react('1️⃣').catch(() => {});
  await m.react('2️⃣').catch(() => {});
}

// ---------------- /truth ----------------
async function handleTruth(interaction) {
  const e = new EmbedBuilder().setColor(0x57f287)
    .setTitle(`🕵️ Truth — ${interaction.user.username}`)
    .setDescription(pick(TRUTHS))
    .setFooter({ text: 'BloxStrike • Truth or Dare' });
  return interaction.reply({ embeds: [e] });
}

// ---------------- /dare ----------------
async function handleDare(interaction) {
  const e = new EmbedBuilder().setColor(0xed4245)
    .setTitle(`🔥 Dare — ${interaction.user.username}`)
    .setDescription(pick(DARES))
    .setFooter({ text: 'BloxStrike • Truth or Dare' });
  return interaction.reply({ embeds: [e] });
}

// ---------------- /guess (number guessing) ----------------
const guessGames = new Map(); // channelId -> {num, tries, by}
async function handleGuess(interaction) {
  if (guessGames.has(interaction.channelId)) {
    return interaction.reply({ content: '⚠️ Is channel in already game chal rahi is! 1-100 guess doo chat in.', flags: MessageFlags.Ephemeral });
  }
  const num = Math.floor(Math.random() * 100) + 1;
  guessGames.set(interaction.channelId, { num, tries: 0 });
  const e = new EmbedBuilder().setColor(0xf1c40f)
    .setTitle('🔢 Number Guess — 1 to 100')
    .setDescription('I have a number in mind! Guess it in chat — hints will show up.\nIf nobody guesses it within 5 min, the game ends.')
    .setFooter({ text: 'BloxStrike • Guess' });
  await interaction.reply({ embeds: [e] });
  setTimeout(() => {
    if (guessGames.has(interaction.channelId)) {
      const gg = guessGames.get(interaction.channelId);
      guessGames.delete(interaction.channelId);
      interaction.channel.send(`⏰ Time up! Number was **${gg.num}**. Any not jeeta 😢`).catch(() => {});
    }
  }, 5 * 60000).unref();
}
function checkGuess(message) {
  const gg = guessGames.get(message.channel.id);
  if (!gg) return false;
  const n = parseInt(message.content, 10);
  if (isNaN(n) || n < 1 || n > 100) return false;
  gg.tries++;
  if (n === gg.num) {
    guessGames.delete(message.channel.id);
    store.addCoins(message.guild.id, message.author.id, 100);
    store.addAura(message.guild.id, message.author.id, 20);
    message.reply(`🎉 **${message.author.username}** ne **${gg.num}** guess do liya in ${gg.tries} tries! +100 🪙 +20 ⚡`).catch(() => {});
    return true;
  }
  const hint = n < gg.num ? '📈 **UPAR** (bada number)' : '📉 **NEECHE** (chhappens number)';
  message.reply(`${hint} — ${gg.tries} tries so far`).catch(() => {});
  return true;
}

// ---------------- /rate ----------------
async function handleRate(interaction) {
  const target = interaction.options.getUser('user') || interaction.user;
  const score = Math.floor(Math.random() * 41) + 60; // 60-100, sab happy
  const e = new EmbedBuilder().setColor(0xeb459e)
    .setTitle('⭐ BloxStrike Rating Machine')
    .setDescription(`**${target.username}** of rating: **${score}/100**\n${'⭐'.repeat(Math.round(score / 20))}`)
    .setFooter({ text: 'BloxStrike • Rate (100% scientific)' });
  return interaction.reply({ embeds: [e] });
}

// ---------------- /respect ----------------
async function handleRespect(interaction) {
  const target = interaction.options.getUser('user');
  if (!target || target.id === interaction.user.id) {
    return interaction.reply({ content: '🫡 **Respects paid.** F in the chat for... yourself? Okay king 👑' });
  }
  store.addAura(interaction.guildId, target.id, 5);
  const e = new EmbedBuilder().setColor(0x5865f2)
    .setTitle('🫡 Respect Delivered')
    .setDescription(`${interaction.user} ne ${target} to respect diya! (+5 ⚡ aura)`)
    .setFooter({ text: 'BloxStrike • Respect' });
  return interaction.reply({ embeds: [e] });
}

// ---------------- /f ----------------
async function handleF(interaction) {
  const target = interaction.options.getUser('user');
  const m = await interaction.reply({
    content: target ? `🙏 ${interaction.user} ne ${target} to a big respect — **F** in the chat!` : '🙏 **F** in the chat!',
    fetchReply: true
  });
  await m.react('🇫').catch(() => {});
}

// ---------------- /vibe ----------------
async function handleVibe(interaction) {
  const vibes = ['IMMACULATE ✨', 'immaculate fr fr', 'certified vibe check ✅', 'vibing detected 🎧', 'big vibe energy 🔥', 'vibe rating: 1000/10'];
  const e = new EmbedBuilder().setColor(0x8b5cf6)
    .setTitle('🎵 Vibe Check')
    .setDescription(`${interaction.user.username}: **${pick(vibes)}**`)
    .setFooter({ text: 'BloxStrike • Vibe Check' });
  return interaction.reply({ embeds: [e] });
}

// ---------------- /streak ----------------
async function handleStreak(interaction) {
  const g = store.guild(interaction.guildId);
  const d = g.daily[interaction.user.id] || { streak: 0 };
  const aura = (g.aura && g.aura[interaction.user.id]) || 0;
  const coins = (g.coins && g.coins[interaction.user.id]) || 0;
  const e = new EmbedBuilder().setColor(0x8b5cf6)
    .setTitle('📊 Your Streak & Stats')
    .setDescription(
      `🔥 Daily streak: **${d.streak || 0} day(s)**\n` +
      `🪙 Coins: **${coins}**\n⚡ Aura: **${aura}**\n\n` +
      `Daily lete raho — streak jitna bada, flex utna bada!`
    )
    .setFooter({ text: 'BloxStrike • Streaks' });
  return interaction.reply({ embeds: [e] });
}

// ---------------- message hooks (trivia answers + guesses) ----------------
function onMessage(message) {
  if (!message.guild || message.author.bot) return;
  if (guessGames.has(message.channel.id)) {
    if (checkGuess(message)) return;
  }
  if (triviaSessions.has(message.author.id)) checkTriviaAnswer(message);
}

module.exports = {
  handleTrivia, handleWouldYouRather, handleTruth, handleDare, handleGuess,
  handleRate, handleRespect, handleF, handleVibe, handleStreak, onMessage
};
