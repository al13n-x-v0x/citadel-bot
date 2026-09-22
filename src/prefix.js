const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const store = require('./store');
const { isAdmin } = require('./util');
const economy = require('./economy');
const fun = require('./fun');
const gambling = require('./gambling');
const shop = require('./shop');

const COLOR = 0x8b5cf6;

function parse(content, prefix) {
  if (!content.startsWith(prefix)) return null;
  const parts = content.slice(prefix.length).trim().split(/\s+/);
  const name = (parts.shift() || '').toLowerCase();
  if (!name) return null;
  // resolve @mentions from args
  const mention = parts.map(a => (a.match(/^<@!?(\d+)>$/) ? { id: a.match(/^<@!?(\d+)>$/)[1] } : null)).find(Boolean) || null;
  return { name, args: parts, mention };
}

function fakeUserOpt(user) {
  return { getUser: () => user, getInteger: () => null, getString: () => null, getBoolean: () => null, getRole: () => null, getChannel: () => null };
}

// wrap interaction-like objects for reusable slash handlers
function makeFake(message, name, args, mention) {
  const userFromArg = (idx) => (args[idx] && args[idx].match(/^<@!?(\d+)>$/)) ? { id: args[idx].match(/^<@!?(\d+)>$/)[1], bot: false, username: 'user' } : (mention || message.author);
  const handlers = {
    daily: () => economy.handleDaily(fakeInt(message, { })),
    work: () => economy.handleWork(fakeInt(message, {})),
    coinflip: () => economy.handleCoinflip(fakeInt(message, { getInteger: () => parseInt(args[0], 10) || 10, getString: () => (args[1] || 'heads').toLowerCase() })),
    coins: () => economy.handleCoins(fakeInt(message, { getUser: () => userFromArg(0) || message.author, getBoolean: () => (args[0] === 'lb' || args[0] === 'leaderboard') })),
    slots: () => gambling.handleSlots(fakeInt(message, { getInteger: () => parseInt(args[0], 10) || 0 })),
    rob: () => gambling.handleRob(fakeInt(message, { getUser: () => userFromArg(0) })),
    ship: () => fun.handleShip(fakeInt(message, { getUser: (n) => n === 'user1' ? userFromArg(0) : userFromArg(1) })),
    roast: () => fun.handleRoast(fakeInt(message, { getUser: () => userFromArg(0) || message.author })),
    compliment: () => fun.handleCompliment(fakeInt(message, { getUser: () => userFromArg(0) || message.author })),
    '8ball': () => fun.handle8ball(fakeInt(message, { getString: () => args.join(' ') || 'kya' })),
    avatar: () => fun.handleAvatar(fakeInt(message, { getUser: () => userFromArg(0) || message.author })),
    shop: () => shop.handleShop(fakeInt(message, {})),
    buy: () => shop.handleBuy(fakeInt(message, { getInteger: () => parseInt(args[0], 10) || 0 })),
    inventory: () => shop.handleInventory(fakeInt(message, { getUser: () => userFromArg(0) || message.author }))
  };
  return handlers[name] || null;
}

function fakeInt(message, opts) {
  return {
    guild: message.guild,
    guildId: message.guildId,
    channelId: message.channelId,
    channel: message.channel,
    member: message.member,
    memberPermissions: message.member?.permissions,
    user: message.author,
    client: message.client,
    options: { getUser: () => opts.getUser?.(), getInteger: () => opts.getInteger?.(), getString: () => opts.getString?.(), getBoolean: () => opts.getBoolean?.(), getRole: () => null, getChannel: () => null },
    reply: async (x) => message.channel.send(typeof x === 'string' ? x : x).then(() => null).catch(() => null),
    deferReply: async () => null,
    editReply: async (x) => message.channel.send(typeof x === 'string' ? x : '…').then(() => null).catch(() => null)
  };
}

async function handleMessage(message) {
  if (message.author.bot || !message.guild) return;
  const prefix = store.guild(message.guild.id).prefix || process.env.PREFIX || '!';
  if (!message.content.startsWith(prefix)) return;

  const parsed = parse(message.content, prefix);
  if (!parsed) return;

  // admin-only: change prefix
  if (parsed.name === 'prefix') {
    if (!isAdmin(message)) return message.reply('Admin only.');
    const np = parsed.args[0];
    if (!np) return message.reply(`Current prefix: \`${prefix}\` — usage: \`${prefix}prefix <new>\``);
    store.guild(message.guild.id).prefix = np.slice(0, 5);
    store.save();
    return message.reply(`✅ Prefix set to \`${np.slice(0, 5)}\``);
  }

  if (parsed.name === 'help') {
    const e = new EmbedBuilder().setColor(COLOR).setTitle('🏰 Citadel — Prefix Commands')
      .setDescription(
        `Prefix: \`${prefix}\`\n\n` +
        `\`${prefix}daily\` — daily coins\n` +
        `\`${prefix}work\` — hourly shift\n` +
        `\`${prefix}coinflip <amt> <heads/tails>\`\n` +
        `\`${prefix}slots <bet>\`\n` +
        `\`${prefix}rob @user\`\n` +
        `\`${prefix}coins [@user|lb]\`\n` +
        `\`${prefix}ship @a @b\` / \`${prefix}roast @u\` / \`${prefix}8ball <q>\`\n` +
        `\`${prefix}shop\` / \`${prefix}buy <id>\` / \`${prefix}inv\`\n` +
        `\`${prefix}avatar [@u]\` / \`${prefix}ping\`\n` +
        `\`${prefix}prefix <new>\` — (admin) change prefix\n\n` +
        'Slash commands bhi hain — `/` type karo.'
      );
    return message.reply({ embeds: [e] });
  }

  if (parsed.name === 'ping') return message.reply(`🏓 Pong! \`${message.client.ws.ping}ms\``);

  if (parsed.name === 'lb' || parsed.name === 'leaderboard') {
    return economy.handleCoins(fakeInt(message, { getBoolean: () => true, getUser: () => message.author }));
  }
  if (parsed.name === 'bal' || parsed.name === 'balance') {
    return economy.handleCoins(fakeInt(message, { getUser: () => parsed.mention || message.author }));
  }
  if (parsed.name === 'inv') {
    return shop.handleInventory(fakeInt(message, { getUser: () => parsed.mention || message.author }));
  }

  const fn = makeFake(message, parsed.name, parsed.args, parsed.mention);
  if (!fn) return; // unknown prefix command — stay silent
  try {
    await fn();
  } catch (err) {
    console.error(`prefix ${parsed.name}:`, err.message);
    message.reply('Something went wrong 😔').catch(() => {});
  }
}

module.exports = { handleMessage };
