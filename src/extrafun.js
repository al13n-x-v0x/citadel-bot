const { EmbedBuilder, MessageFlags } = require('discord.js');
const store = require('./store');

// ---------------- Extra Fun Commands — BloxStrike style ----------------
// Standalone quick commands: trivia, wouldyourather, truth, dare, guess, rate,
// respect, f, vibe, hugcount(?), streak, persona... sab lightweight, no setup.

const BC = String.fromCharCode(96);

const TRIVIA = [
  { q: 'Roblox ka original naam kya tha?', a: ['dynablocks', 'dynamic blocks'] },
  { q: 'Discord kab launch hua (year)?', a: ['2015'] },
  { q: 'Sabse zyada concurrent players wala Roblox game?', a: ['grow a garden', 'growagarden'] },
  { q: 'Roblox currency ka naam?', a: ['robux'] },
  { q: 'Free Fire kis country ki company ne banaya?', a: ['singapore', 'garena'] },
  { q: 'Minecraft me creeper explode hone se pehle kya sound karta hai?', a: ['sss', 'hiss', 'fuse'] },
  { q: 'Valorant kis company ka game hai?', a: ['riot', 'riot games'] },
  { q: 'Discord founder ka naam?', a: ['jason citron'] },
  { q: 'Fortnite kis company ka hai?', a: ['epic', 'epic games'] },
  { q: 'PUBG full form?', a: ['playerunknowns battlegrounds', "playerunknown's battlegrounds", 'playerunknown battlegrounds'] },
  { q: 'Roblox me pehli baar account banane ki minimum age?', a: ['13', 'thirteen'] },
  { q: 'Among Us kis year viral hua?', a: ['2020'] },
  { q: 'Steam kis company ki hai?', a: ['valve'] },
  { q: 'GTA V kis company ne banaya?', a: ['rockstar', 'rockstar games'] },
  { q: 'Bot ke paas kitne slash commands hain? (approx, 5 ke andar)', a: ['100', '95', '96', '97', '98', '99', '90'] }
];

const WYR = [
  'Unlimited Robux but no friends online 🆚 Limited Robux with full squad',
  'Sirf Minecraft khao zindagi bhar 🆚 Sirf Roblox khao zindagi bhar',
  'Discord pe hamesha lag 🆚 Internet pe hamesha 1 bar/day',
  '100k members dead server 🆚 500 members active server',
  'Mod powers but nobody listens 🆚 No powers but everyone respects you',
  'Free Nitro for life but no voice chat 🆚 Pay for Nitro with full features',
  'Headless Head 🆚 Korblox Deathspeaker',
  'Bot ban jao 1 week 🆚 Server delete ho jaye 1 din',
  'Waapi me sirf skill issue 🆚 Waapi me sirf lag',
  'Eternal 200 ping 🆚 Eternal 30 fps'
];

const TRUTHS = [
  'Server ka sabse annoying member kaun hai? (no names, hints do 😂)',
  'Kabhi kisi ko falsely reported kiya hai?',
  'Sabse embarrassing username jo kabhi rakha?',
  'Kitne baje soye kal raat? Sach bolo!',
  'Kabhi kisi ke stream pe anonymously gaye ho?',
  'Sabse weird DM jo kabhi aaya?',
  'Kabhi alt account se kisi ko stalk kiya?',
  'Aapka sabse bada gaming L kya tha?'
];

const DARES = [
  'Next 10 messages me sirf emojis se reply karo!',
  'Voice channel me aao aur 1 line gaao 🎤',
  'Apna real profile pic 1 ghante ke liye anime pic se replace karo',
  'Kisi random member ko "king 👑" bol ke DM karo',
  'Agle message me har word CAPITAL me likho',
  'Apna status "Certified Noob" rakho 1 hour ke liye',
  'Chat me "I love this server" 5 baar bolo',
  'Kisi ko compliment do — abhi, isi second!'
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ---------------- /trivia ----------------
const triviaSessions = new Map(); // userId -> {answer, at}
async function handleTrivia(interaction) {
  const t = pick(TRIVIA);
  triviaSessions.set(interaction.user.id, { answer: t.a, at: Date.now() });
  const e = new EmbedBuilder().setColor(0xf1c40f)
    .setTitle('🧠 BloxStrike Trivia')
    .setDescription(`${t.q}\n\nAnswer DM me bhejna mat — isi channel me likho 30 sec me!`)
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
    .setFooter({ text: 'BloxStrike • Vote in replies: 1️⃣ ya 2️⃣' });
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
    return interaction.reply({ content: '⚠️ Is channel me already game chal rahi hai! 1-100 guess karo chat me.', flags: MessageFlags.Ephemeral });
  }
  const num = Math.floor(Math.random() * 100) + 1;
  guessGames.set(interaction.channelId, { num, tries: 0 });
  const e = new EmbedBuilder().setColor(0xf1c40f)
    .setTitle('🔢 Number Guess — 1 to 100')
    .setDescription('Maine ek number socha hai! Chat me guess karo — hint milte jayenge.\n5 min me koi nahi jeeta to game khatam.')
    .setFooter({ text: 'BloxStrike • Guess' });
  await interaction.reply({ embeds: [e] });
  setTimeout(() => {
    if (guessGames.has(interaction.channelId)) {
      const gg = guessGames.get(interaction.channelId);
      guessGames.delete(interaction.channelId);
      interaction.channel.send(`⏰ Time up! Number tha **${gg.num}**. Koi nahi jeeta 😢`).catch(() => {});
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
    message.reply(`🎉 **${message.author.username}** ne **${gg.num}** guess kar liya in ${gg.tries} tries! +100 🪙 +20 ⚡`).catch(() => {});
    return true;
  }
  const hint = n < gg.num ? '📈 **UPAR** (bada number)' : '📉 **NEECHE** (chhota number)';
  message.reply(`${hint} — ${gg.tries} tries so far`).catch(() => {});
  return true;
}

// ---------------- /rate ----------------
async function handleRate(interaction) {
  const target = interaction.options.getUser('user') || interaction.user;
  const score = Math.floor(Math.random() * 41) + 60; // 60-100, sab happy
  const e = new EmbedBuilder().setColor(0xeb459e)
    .setTitle('⭐ BloxStrike Rating Machine')
    .setDescription(`**${target.username}** ka rating: **${score}/100**\n${'⭐'.repeat(Math.round(score / 20))}`)
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
    .setDescription(`${interaction.user} ne ${target} ko respect diya! (+5 ⚡ aura)`)
    .setFooter({ text: 'BloxStrike • Respect' });
  return interaction.reply({ embeds: [e] });
}

// ---------------- /f ----------------
async function handleF(interaction) {
  const target = interaction.options.getUser('user');
  const m = await interaction.reply({
    content: target ? `🙏 ${interaction.user} ne ${target} ko respect bhija — **F** in the chat!` : '🙏 **F** in the chat!',
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
