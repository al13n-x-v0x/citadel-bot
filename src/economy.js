const { EmbedBuilder, MessageFlags } = require('discord.js');
const store = require('./store');

const DAY_MS = 86400000;
const WORK_COOLDOWN = 60 * 60 * 1000;

function fmt(n) { return `**${n}** 🪙`; }
function embed(color = 0x8b5cf6) {
  return new EmbedBuilder().setColor(color).setFooter({ text: 'The Gaming Citadel • Coins' });
}

async function handleDaily(interaction) {
  const gId = interaction.guildId, uid = interaction.user.id;
  const d = store.getDaily(gId, uid);
  const now = Date.now();
  if (now - d.lastAt < DAY_MS) {
    const hrs = Math.ceil((DAY_MS - (now - d.lastAt)) / 3600000);
    return interaction.reply({ content: `Daily already claimed — ${hrs}h baad wapas aana.`, flags: MessageFlags.Ephemeral });
  }
  const streak = now - d.lastAt < 2 * DAY_MS ? d.streak + 1 : 1;
  const amount = 100 + Math.min(7, streak) * 25;
  store.setDaily(gId, uid, { lastAt: now, streak });
  const bal = store.addCoins(gId, uid, amount);
  const e = embed(0x57f287).setTitle('🪙 Daily Reward')
    .setDescription(`You got ${fmt(amount)}\nStreak: **${streak} day${streak > 1 ? 's' : ''}** 🔥\nBalance: ${fmt(bal)}`);
  await interaction.reply({ embeds: [e] });
}

const JOBS = [
  ['Farmed aura in the aura mines', 60, 140],
  ['Moderated a raid (hero moment)', 80, 160],
  ['Sold rare skins at the bazaar', 50, 150],
  ['Won a 1v1 clutch', 70, 170],
  ['Fixed the citadel servers', 60, 130],
  ['Babysat the noobs', 40, 110]
];

async function handleWork(interaction) {
  const gId = interaction.guildId, uid = interaction.user.id;
  const last = store.getLastWork(gId, uid);
  if (Date.now() - last < WORK_COOLDOWN) {
    const mins = Math.ceil((WORK_COOLDOWN - (Date.now() - last)) / 60000);
    return interaction.reply({ content: `Shift already done — ${mins} min baad next.`, flags: MessageFlags.Ephemeral });
  }
  const [job, min, max] = JOBS[Math.floor(Math.random() * JOBS.length)];
  const earned = min + Math.floor(Math.random() * (max - min + 1));
  store.setLastWork(gId, uid, Date.now());
  const bal = store.addCoins(gId, uid, earned);
  const e = embed(0x57f287).setTitle('💼 Work Shift')
    .setDescription(`**${job}** — earned ${fmt(earned)}\nBalance: ${fmt(bal)}`);
  await interaction.reply({ embeds: [e] });
}

async function handleCoinflip(interaction) {
  const amount = interaction.options.getInteger('amount');
  const side = interaction.options.getString('side');
  const gId = interaction.guildId, uid = interaction.user.id;
  if (store.getCoins(gId, uid) < amount) {
    return interaction.reply({ content: `Wallet me sirf ${fmt(store.getCoins(gId, uid))} hai.`, flags: MessageFlags.Ephemeral });
  }
  const won = Math.random() < 0.5;
  const result = won ? side : (side === 'heads' ? 'tails' : 'heads');
  store.addCoins(gId, uid, won ? amount : -amount);
  const e = embed(won ? 0x57f287 : 0xed4245).setTitle('🪙 Coinflip')
    .setDescription(`Coin landed on **${result}**!\n${won ? `You won ${fmt(amount)}` : `You lost ${fmt(amount)}`}\nBalance: ${fmt(store.getCoins(gId, uid))}`);
  await interaction.reply({ embeds: [e] });
}

async function handlePay(interaction) {
  const target = interaction.options.getUser('user');
  const amount = interaction.options.getInteger('amount');
  const gId = interaction.guildId, uid = interaction.user.id;
  if (target.bot) return interaction.reply({ content: 'Bots ko coins nahi milte 🤖', flags: MessageFlags.Ephemeral });
  if (target.id === uid) return interaction.reply({ content: 'Khud ko hi bhejega? 💀', flags: MessageFlags.Ephemeral });
  if (amount <= 0) return interaction.reply({ content: 'Amount > 0 hona chahiye.', flags: MessageFlags.Ephemeral });
  if (store.getCoins(gId, uid) < amount) return interaction.reply({ content: `Sirf ${fmt(store.getCoins(gId, uid))} hai.`, flags: MessageFlags.Ephemeral });
  store.transferCoins(gId, uid, target.id, amount);
  await interaction.reply(`💸 <@${uid}> paid ${fmt(amount)} to <@${target.id}>!`);
}

async function handleCoins(interaction) {
  const user = interaction.options.getUser('user') || interaction.user;
  const lb = interaction.options.getBoolean('leaderboard');
  const gId = interaction.guildId;
  if (lb) {
    const top = store.coinLb(gId).slice(0, 10);
    const medals = ['🥇', '🥈', '🥉'];
    const e = embed().setTitle('🪙 Richest Citizens')
      .setDescription(top.length ? top.map(([uid2, amt], i) => `${medals[i] || `\`#${i + 1}\``} <@${uid2}> — ${fmt(amt)}`).join('\n') : 'Empty. Go /work!');
    return interaction.reply({ embeds: [e] });
  }
  const e = embed().setTitle(`🪙 ${user.username}'s Wallet`)
    .setDescription(`${fmt(store.getCoins(gId, user.id))}`);
  await interaction.reply({ embeds: [e] });
}

module.exports = { handleDaily, handleWork, handleCoinflip, handlePay, handleCoins };
