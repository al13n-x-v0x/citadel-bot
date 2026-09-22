const { EmbedBuilder, MessageFlags } = require('discord.js');
const store = require('./store');

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣'];
const WEIGHTS = [30, 25, 20, 15, 7, 3];

function spin() {
  const total = WEIGHTS.reduce((a, b) => a + b, 0);
  const pick = () => {
    let r = Math.random() * total;
    for (let i = 0; i < SYMBOLS.length; i++) { r -= WEIGHTS[i]; if (r <= 0) return SYMBOLS[i]; }
    return SYMBOLS[0];
  };
  return [pick(), pick(), pick()];
}

async function handleSlots(interaction) {
  const bet = interaction.options.getInteger('bet');
  const gId = interaction.guildId, uid = interaction.user.id;
  if (store.getCoins(gId, uid) < bet) {
    return interaction.reply({ content: `Bet ke liye ${bet} 🪙 chahiye, wallet me ${store.getCoins(gId, uid)} hai 😭`, flags: MessageFlags.Ephemeral });
  }
  const reels = spin();
  let payout = 0;
  if (reels[0] === reels[1] && reels[1] === reels[2]) {
    payout = bet * (reels[0] === '💎' ? 20 : reels[0] === '7️⃣' ? 15 : 8);
  } else if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
    payout = Math.floor(bet * 1.5);
  }
  store.addCoins(gId, uid, payout - bet);
  const filler1 = spin().join(' ┃ '), filler2 = spin().join(' ┃ ');
  const title = payout > 0 ? (payout >= bet * 8 ? '💎 MEGA WIN!' : '🎉 Jeet gaya!') : '💀 Haare bhai';
  const e = new EmbedBuilder().setColor(payout > 0 ? 0x57f287 : 0xed4245).setTitle(`🎰 ${title}`)
    .setDescription('`' + `┃ ${filler1} ┃` + '`\n' + '**`' + `┃ ${reels.join(' ┃ ')} ┃` + '**\n' + '`' + `┃ ${filler2} ┃` + '`')
    .addFields(
      { name: 'Bet', value: `${bet} 🪙`, inline: true },
      { name: payout > 0 ? 'Payout' : 'Lost', value: payout > 0 ? `+${payout} 🪙` : `-${bet} 🪙`, inline: true },
      { name: 'Wallet', value: `${store.getCoins(gId, uid)} 🪙`, inline: true }
    );
  await interaction.reply({ embeds: [e] });
}

const ROB_CD = 5 * 60 * 1000;
const lastRob = new Map();

async function handleRob(interaction) {
  const target = interaction.options.getUser('user');
  const gId = interaction.guildId, uid = interaction.user.id;
  if (target.bot) return interaction.reply({ content: 'Bots ke paas coins nahi 🤖', flags: MessageFlags.Ephemeral });
  if (target.id === uid) return interaction.reply({ content: 'Khud ko rob? 💀', flags: MessageFlags.Ephemeral });
  const key = `${gId}:${uid}`;
  const last = lastRob.get(key) || 0;
  if (Date.now() - last < ROB_CD) {
    const mins = Math.ceil((ROB_CD - (Date.now() - last)) / 60000);
    return interaction.reply({ content: `Rob cooldown — ${mins} min.`, flags: MessageFlags.Ephemeral });
  }
  lastRob.set(key, Date.now());
  const mine = store.getCoins(gId, uid), theirs = store.getCoins(gId, target.id);
  if (mine < 100) return interaction.reply({ content: 'Bail money chahiye — khud ke 100 🪙 hone chahiye.', flags: MessageFlags.Ephemeral });
  if (theirs < 50) return interaction.reply({ content: `Iske paas sirf ${theirs} 🪙 hai — rob karne layak nahi 😭`, flags: MessageFlags.Ephemeral });

  if (Math.random() < 0.4) {
    const stolen = Math.min(theirs, 100 + Math.floor(Math.random() * Math.min(theirs, 500)));
    store.transferCoins(gId, target.id, uid, stolen);
    return interaction.reply(`🕶️ Heist successful! <@${target.id}> se **${stolen} 🪙** churaye. Bhaag! 🏃`);
  }
  const fine = Math.min(mine, 50 + Math.floor(Math.random() * 150));
  store.transferCoins(gId, uid, target.id, fine);
  return interaction.reply(`🚨 Pakde gaye! **${fine} 🪙** fine <@${target.id}> ko.`);
}

module.exports = { handleSlots, handleRob };
