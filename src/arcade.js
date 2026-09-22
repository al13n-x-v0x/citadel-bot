const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const store = require('./store');

const COLOR = 0x9146ff;
const arcadeMsgs = new Map(); // guildId -> { channelId, messageId }

function embed() { return new EmbedBuilder().setColor(COLOR).setFooter({ text: 'The Gaming Citadel • Arcade 🕹️' }); }
function fmt(n) { return `**${n}** 🪙`; }

// ---------- game session state (in-memory) ----------
// userId -> { game, state, channelId, messageId, expiresAt }
const sessions = new Map();
const SESSION_TTL = 3 * 60 * 1000;

function activeSession(userId) {
  const s = sessions.get(userId);
  if (!s) return null;
  if (Date.now() > s.expiresAt) { sessions.delete(userId); return null; }
  return s;
}

function newSession(userId, game, channelId, messageId) {
  const s = { game, channelId, messageId, startedAt: Date.now(), expiresAt: Date.now() + SESSION_TTL, state: {} };
  sessions.set(userId, s);
  return s;
}

// ---------- mini-game engines ----------
// each returns { title, description, buttons: [{id,label,emoji}], finished, payout }
function rpsBoard() {
  return {
    title: '✊ Rock • Paper • Scissors',
    description: '**10 🪙 entry, 25 🪙 win.** Bot already picked its move (randomly committed) — pick yours!',
    buttons: [
      { id: 'ar_rps_rock', label: 'Rock', emoji: '🪨' },
      { id: 'ar_rps_paper', label: 'Paper', emoji: '📄' },
      { id: 'ar_rps_scissors', label: 'Scissors', emoji: '✂️' }
    ]
  };
}

function rpsPlay(interaction, s) {
  const pick = interaction.customId.replace('ar_rps_', '');
  const botPick = ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)];
  const beats = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
  const emoji = { rock: '🪨', paper: '📄', scissors: '✂️' };
  let result, payout = -10;
  if (pick === botPick) { result = '🤝 Tie — entry refunded!'; payout = 0; }
  else if (beats[pick] === botPick) { result = '🏆 **You WIN!** +25 🪙'; payout = 25; }
  else result = '💀 **Bot wins.** -10 🪙';
  const bal = store.addCoins(interaction.guildId, interaction.user.id, payout);
  store.recordArcade(interaction.guildId, interaction.user.id, payout);
  sessions.delete(interaction.user.id);
  return {
    title: `✊ RPS — You: ${emoji[pick]} vs Bot: ${emoji[botPick]}`,
    description: `${result}\n\nBalance: ${fmt(bal)}\nPlay again from the arcade!`,
    finished: true
  };
}

function diceBoard() {
  return {
    title: '🎲 High Dice',
    description: '**10 🪙 entry.** Roll 2 dice vs the house. Higher total wins **22 🪙**. Double sixes = **50 🪙**!',
    buttons: [{ id: 'ar_dice_roll', label: 'Roll!', emoji: '🎲' }]
  };
}

function dicePlay(interaction, s) {
  s.state.rolls = (s.state.rolls || 0) + 1;
  const d1 = 1 + Math.floor(Math.random() * 6), d2 = 1 + Math.floor(Math.random() * 6);
  const h1 = 1 + Math.floor(Math.random() * 6), h2 = 1 + Math.floor(Math.random() * 6);
  const mine = d1 + d2, house = h1 + h2;
  let payout = 0, msg;
  if (d1 === 6 && d2 === 6) { payout = 50; msg = '🎲💥 **DOUBLE SIXES!** +50 🪙'; }
  else if (mine > house) { payout = 22; msg = '🏆 **You win!** +22 🪙'; }
  else if (mine === house) { msg = '🤝 Tie — house edge, entry not refunded.'; payout = -10; }
  else { payout = -10; msg = '💀 **House wins.** -10 🪙'; }
  const bal = store.addCoins(interaction.guildId, interaction.user.id, payout);
  store.recordArcade(interaction.guildId, interaction.user.id, payout);
  const done = s.state.rolls >= 3;
  if (done) sessions.delete(interaction.user.id);
  return {
    title: `🎲 Roll ${s.state.rolls}/3 — You: ${d1}+${d2}=${mine} | House: ${h1}+${h2}=${house}`,
    description: `${msg}\n\nBalance: ${fmt(bal)}${done ? '\n\nGame over — back to the arcade!' : '\n\n2 rolls left!'}`,
    finished: done,
    buttons: done ? undefined : [{ id: 'ar_dice_roll', label: 'Roll again!', emoji: '🎲' }]
  };
}

function hlBoard(s) {
  const n = s?.state?.number;
  return {
    title: '🔮 Higher or Lower',
    description: n === undefined
      ? '**10 🪙 entry.** Starting number: **??** — I pick a number 1-100. Guess if the next is **higher** or **lower**. Streak multiplier ×2 per streak!'
      : `Current number: **${n}** — next will be?\n\nStreak: **${s.state.streak || 0}** (${(s.state.streak || 0) * 10 + 10} 🪙 pot)`,
    buttons: [
      { id: 'ar_hl_high', label: 'Higher ⬆️', emoji: '⬆️' },
      { id: 'ar_hl_low', label: 'Lower ⬇️', emoji: '⬇️' }
    ]
  };
}

function hlPlay(interaction, s) {
  const guess = interaction.customId.endsWith('high') ? 'high' : 'low';
  if (s.state.number === undefined) {
    // first click = pay entry, show first number
    if (store.getCoins(interaction.guildId, interaction.user.id) < 10) {
      sessions.delete(interaction.user.id);
      return { title: '🔮 Higher or Lower', description: '10 🪙 nahi hai bhai 😭', finished: true };
    }
    store.addCoins(interaction.guildId, interaction.user.id, -10);
    s.state.number = 1 + Math.floor(Math.random() * 100);
    s.state.streak = 0;
    return { title: '🔮 Higher or Lower', description: `First number: **${s.state.number}**\nAb batao — next **higher** ya **lower**?`, buttons: hlBoard(s).buttons };
  }
  const next = 1 + Math.floor(Math.random() * 100);
  const correct = (guess === 'high' && next > s.state.number) || (guess === 'low' && next < s.state.number);
  if (!correct) {
    const pot = (s.state.streak || 0) * 10;
    const bal = store.addCoins(interaction.guildId, interaction.user.id, pot);
  store.recordArcade(interaction.guildId, interaction.user.id, pot);
    sessions.delete(interaction.user.id);
    return {
      title: `🔮 Busted! ${s.state.number} → ${next}`,
      description: pot > 0 ? `Streak over — **${pot} 🪙** mil gaye!\nBalance: ${fmt(bal)}` : `First guess hi galat — 10 🪙 gaye 💀\nBalance: ${fmt(bal)}`,
      finished: true
    };
  }
  s.state.streak = (s.state.streak || 0) + 1;
  s.state.number = next;
  return {
    title: `🔮 Correct! Streak: ${s.state.streak}`,
    description: `Number: **${next}**\nCash out **${s.state.streak * 10} 🪙** with **Cash Out**, ya risk it for more!`,
    buttons: [...hlBoard(s).buttons, { id: 'ar_hl_cash', label: `Cash Out ${s.state.streak * 10} 🪙`, emoji: '💰' }]
  };
}

function hlCashout(interaction, s) {
  const pot = (s.state.streak || 0) * 10;
  const bal = store.addCoins(interaction.guildId, interaction.user.id, pot);
  store.recordArcade(interaction.guildId, interaction.user.id, pot);
  sessions.delete(interaction.user.id);
  return { title: `💰 Cashed out!`, description: `Streak **${s.state.streak}** → **${pot} 🪙** mil gaye!\nBalance: ${fmt(bal)}`, finished: true };
}

const TRIVIA = [
  { q: 'Which company created Minecraft?', a: ['Mojang', 'Valve', 'Epic'], correct: 0 },
  { q: 'What does "GG" stand for?', a: ['Great Game', 'Good Grief', 'Get Good'], correct: 0 },
  { q: 'Highest pro CS team prize ever (~$1.5M) won by?', a: ['Team Liquid', 'NAVI', 'FaZe'], correct: 1 },
  { q: 'Valorant is made by?', a: ['Riot Games', 'Blizzard', 'Ubisoft'], correct: 0 },
  { q: 'Fortnite max players per match?', a: ['50', '100', '200'], correct: 1 }
];

function triviaBoard(s) {
  const t = s.state.question;
  return {
    title: '🧠 Citadel Trivia',
    description: `**${t.q}**\n\nCorrect = **30 🪙**, wrong = -10 🪙`,
    buttons: t.a.map((ans, i) => ({ id: `ar_tr_${i}`, label: ans, emoji: ['1️⃣', '2️⃣', '3️⃣'][i] }))
  };
}

function triviaStart(interaction, s) {
  if (store.getCoins(interaction.guildId, interaction.user.id) < 10) {
    sessions.delete(interaction.user.id);
    return { title: '🧠 Trivia', description: '10 🪙 nahi hai bhai 😭', finished: true };
  }
  store.addCoins(interaction.guildId, interaction.user.id, -10);
  s.state.question = TRIVIA[Math.floor(Math.random() * TRIVIA.length)];
  return triviaBoard(s);
}

function triviaPlay(interaction, s) {
  const idx = parseInt(interaction.customId.replace('ar_tr_', ''), 10);
  const t = s.state.question;
  const bal = store.addCoins(interaction.guildId, interaction.user.id, idx === t.correct ? 30 : 0);
  store.recordArcade(interaction.guildId, interaction.user.id, idx === t.correct ? 30 : -10);
  sessions.delete(interaction.user.id);
  return {
    title: idx === t.correct ? '🧠 ✅ Correct!' : '🧠 ❌ Wrong!',
    description: `Answer was: **${t.a[t.correct]}**\n${idx === t.correct ? '+30 🪙' : '-10 🪙 (entry)'}\nBalance: ${fmt(bal)}`,
    finished: true
  };
}

// memory: 4 hidden emoji pairs, pick 2 tiles per turn — simplified 3x2 grid, find all 3 pairs in <6 flips
function memoryBoard(s) {
  if (!s.state.tiles) {
    const pool = ['🎮', '🕹️', '👾', '🎮', '🕹️', '👾'].sort(() => Math.random() - 0.5);
    s.state.tiles = pool;
    s.state.found = [];
    s.state.flips = 0;
    s.state.open = [];
  }
  const t = s.state.tiles;
  const rows = [0, 2, 4].map(start =>
    t.slice(start, start + 2).map((_, i) => {
      const idx = start + i;
      const revealed = s.state.open.includes(idx) || s.state.found.includes(t[idx]);
      return { id: `ar_mem_${idx}`, label: revealed ? t[idx] : '❔', emoji: revealed ? null : '⬛' };
    })
  );
  return {
    title: `🧩 Memory Match — flips: ${s.state.flips}/6`,
    description: '**20 🪙 entry.** Saare 3 pairs 6 flips ke andar dhoondo = **60 🪙**! Har pair dhoondne pe +10 instant.',
    buttons: rows.flat(),
    gridRows: rows
  };
}

function memoryPlay(interaction, s) {
  const idx = parseInt(interaction.customId.replace('ar_mem_', ''), 10);
  if (s.state.open.includes(idx)) return { ...memoryBoard(s), title: '🧩 Tile already open!' };
  s.state.open.push(idx);
  if (s.state.open.length === 2) {
    s.state.flips++;
    const [a, b] = s.state.open;
    if (s.state.tiles[a] === s.state.tiles[b]) {
      s.state.found.push(s.state.tiles[a]);
      store.addCoins(interaction.guildId, interaction.user.id, 10);
      s.state.arcadeNet = (s.state.arcadeNet || 0) + 10;
      s.state.open = [];
      if (s.state.found.length === 3) {
        const bal = store.addCoins(interaction.guildId, interaction.user.id, 60);
        store.recordArcade(interaction.guildId, interaction.user.id, (s.state.arcadeNet || 0) + 60);
        sessions.delete(interaction.user.id);
        return { title: '🧩 ALL PAIRS FOUND!', description: `**${s.state.flips}/6 flips** — +60 🪙 bonus!\nBalance: ${fmt(bal)}`, finished: true };
      }
      return { ...memoryBoard(s), title: `🧩 Pair found! +10 🪙 (${s.state.found.length}/3)` };
    }
    if (s.state.flips >= 6) {
      sessions.delete(interaction.user.id);
      store.recordArcade(interaction.guildId, interaction.user.id, -20);
      return { title: '🧩 Out of flips!', description: '6 flips ho gaye 💀 — 20 🪙 gaye. Try again!', finished: true };
    }
    const shown = memoryBoard(s);
    // show the two mismatched tiles briefly by keeping them open for this render
    shown.title = `🧩 No match — flip ${s.state.flips}/6`;
    s.state.lastMismatch = [...s.state.open];
    s.state.open = [];
    return shown;
  }
  return memoryBoard(s);
}

// ---------- arcade hub (the sticky panel) ----------
function dailyLbText(guildId) {
  const lb = store.arcadeDailyLb(guildId);
  if (!lb.length) return '*No games played today — be the first!*';
  const medals = ['🥇', '🥈', '🥉'];
  return lb.slice(0, 10).map(([uid, v], i) => (medals[i] || (i + 1) + '.') + ' <@' + uid + '> — **' + v.net + '** 🪙 (' + v.wins + 'W/' + v.losses + 'L)').join('\n');
}

function arcadePanel(guildId) {
  const e = embed()
    .setTitle('🕹️ THE CITADEL ARCADE')
    .setDescription(
      '**Insert coin to play!** Sab games me real 🪙 lagte hain aur jeetne pe milte hain.\n\n' +
      '✊ **Rock Paper Scissors** — 10 in, 25 out\n' +
      '🎲 **High Dice** — 10 in, 22 out (66 = 50!)\n' +
      '🔮 **Higher/Lower** — streak pot, x10 per streak\n' +
      '🧠 **Trivia** — 10 in, 30 out\n' +
      '🧩 **Memory Match** — 20 in, 60 out + pairs\n\n' +
      '*Ye message sticky hai — yahin se sab games khelo.*'
    )
    .setImage('https://i.imgur.com/8KgXQ3p.png') // arcade cabinet vibe (Discord will fallback gracefully if removed)
    .addFields(
      { name: '💰 Balance', value: 'Select a game to see yours', inline: false },
      { name: "🏆 Today's Top Gamers", value: dailyLbText(guildId), inline: false }
    );
  const menu = new StringSelectMenuBuilder()
    .setCustomId('ar_select')
    .setPlaceholder('🎮 Select a minigame…')
    .addOptions(
      { label: 'Rock Paper Scissors', value: 'rps', emoji: '✊', description: '10 in → 25 out' },
      { label: 'High Dice', value: 'dice', emoji: '🎲', description: '10 in → 22 out, double-6 = 50' },
      { label: 'Higher or Lower', value: 'hl', emoji: '🔮', description: 'Streak pot ×10' },
      { label: 'Trivia', value: 'trivia', emoji: '🧠', description: '10 in → 30 out' },
      { label: 'Memory Match', value: 'memory', emoji: '🧩', description: '20 in → 60 out' }
    );
  return { e, rows: [new ActionRowBuilder().addComponents(menu)] };
}

// ---------- /arcade command ----------
async function handleArcade(interaction) {
  if (!isAdmin(interaction)) {
    return interaction.reply({ content: 'Admin only — arcade setup admin karta hai.', flags: MessageFlags.Ephemeral });
  }
  const sub = interaction.options.getSubcommand();

  if (sub === 'setup') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const { e, rows } = arcadePanel(interaction.guildId);
    let channel = interaction.channel;
    if (!channel) channel = await interaction.client.channels.fetch(interaction.channelId).catch(() => null);
    if (!channel?.isTextBased()) return interaction.editReply('❌ Channel resolve nahi hua.');
    const msg = await channel.send({ embeds: [e], components: rows }).catch(err => null);
    if (!msg) return interaction.editReply('❌ Post fail — **Send Messages** + **Embed Links** perms check karo.');
    // pin it (Discord pins show in a pinned bar — closest to sticky)
    await msg.pin('Arcade sticky panel').catch(() => {});
    arcadeMsgs.set(interaction.guildId, { channelId: channel.id, messageId: msg.id });
    return interaction.editReply(`✅ **Arcade posted & pinned** in ${channel}!\nLog ye panel use karke games khelenge. Panel hamesha pinned rahega.`);
  }

  if (sub === 'remove') {
    const saved = arcadeMsgs.get(interaction.guildId);
    if (saved) {
      const ch = interaction.guild.channels.cache.get(saved.channelId);
      const msg = ch ? await ch.messages.fetch(saved.messageId).catch(() => null) : null;
      if (msg) await msg.delete().catch(() => {});
      arcadeMsgs.delete(interaction.guildId);
    }
    return interaction.reply({ content: '🗑️ Arcade panel removed.', flags: MessageFlags.Ephemeral });
  }
}

// ---------- button/select dispatcher ----------
async function handleComponent(interaction) {
  try {
    const userId = interaction.user.id;
    const gId = interaction.guildId;

    if (interaction.isStringSelectMenu() && interaction.customId === 'ar_select') {
      const game = interaction.values[0];
      // show game board as ephemeral update
      const s = newSession(userId, game, interaction.channelId, interaction.message.id);
      let board;
      if (game === 'rps') board = rpsBoard();
      else if (game === 'dice') board = diceBoard();
      else if (game === 'hl') board = hlBoard(s);
      else if (game === 'trivia') board = triviaStart(interaction, s);
      else if (game === 'memory') board = memoryBoard(s);
      if (!board) return;

      if (board.gridRows) {
        const rows = [];
        for (let i = 0; i < 3; i++) {
          rows.push(new ActionRowBuilder().addComponents(
            ...board.gridRows[i].map(b => new ButtonBuilder().setCustomId(b.id).setLabel(b.label).setStyle(ButtonStyle.Secondary)
              .setEmoji(b.emoji || '⬛'))
          ));
        }
        return interaction.reply({ embeds: [embed().setTitle(board.title).setDescription(board.description)], components: rows, flags: MessageFlags.Ephemeral });
      }
      const row = new ActionRowBuilder().addComponents(
        ...board.buttons.map(b => new ButtonBuilder().setCustomId(b.id).setLabel(b.label).setEmoji(b.emoji).setStyle(ButtonStyle.Primary))
      );
      return interaction.reply({ embeds: [embed().setTitle(board.title).setDescription(board.description)], components: [row], flags: MessageFlags.Ephemeral });
    }

    if (!interaction.customId.startsWith('ar_') || interaction.customId === 'ar_select') return;
    const s = activeSession(userId);
    if (!s) {
      return interaction.reply({ content: '⏰ Session expire — arcade panel se game dobara select karo.', flags: MessageFlags.Ephemeral });
    }

    let result;
    if (interaction.customId.startsWith('ar_rps_')) result = rpsPlay(interaction, s);
    else if (interaction.customId === 'ar_dice_roll') result = dicePlay(interaction, s);
    else if (interaction.customId === 'ar_hl_cash') result = hlCashout(interaction, s);
    else if (interaction.customId.startsWith('ar_hl_')) result = hlPlay(interaction, s);
    else if (interaction.customId.startsWith('ar_tr_')) result = triviaPlay(interaction, s);
    else if (interaction.customId.startsWith('ar_mem_')) result = memoryPlay(interaction, s);
    if (!result) return;

    const e = embed().setTitle(result.title).setDescription(result.description);
    if (result.finished || !result.buttons) {
      const hub = arcadePanel(interaction.guildId);
      return interaction.update({ embeds: [e], components: [hub.rows[0]] });
    }
    const row = new ActionRowBuilder().addComponents(
      ...result.buttons.map(b => new ButtonBuilder().setCustomId(b.id).setLabel(b.label).setEmoji(b.emoji || null).setStyle(ButtonStyle.Primary))
    );
    await interaction.update({ embeds: [e], components: [row] });
  } catch (err) {
    console.error('arcade:', err);
    const payload = { content: 'Arcade glitch 😔 — dobara try karo.', flags: MessageFlags.Ephemeral };
    if (interaction.deferred || interaction.replied) await interaction.editReply(payload).catch(() => {});
    else await interaction.reply(payload).catch(() => {});
  }
}

module.exports = { handleArcade, handleComponent };
