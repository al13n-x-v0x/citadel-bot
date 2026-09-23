require('dotenv').config();
// broken-IPv6 hosts pe gateway connect hang hota hai — IPv4 force karo (classic hosting fix)
require('dns').setDefaultResultOrder('ipv4first');
const { Client, GatewayIntentBits, Partials, REST, Routes, ActivityType, MessageFlags, EmbedBuilder } = require('discord.js');
const express = require('express');
const store = require('./store');
const slash = require('./slash');
const { isAdmin, isBotOwner } = require('./util');

const economy = require('./economy');
const mod = require('./mod');
const fun = require('./fun');
const tickets = require('./tickets');
const giveaways = require('./giveaways');
const social = require('./social');
const ai = require('./ai');
const shop = require('./shop');
const gambling = require('./gambling');
const counters = require('./counters');
const arcade = require('./arcade');
const colors = require('./colors');
const prefix = require('./prefix');

const token = String(process.env.DISCORD_TOKEN || '').trim().replace(/^["']|["']$/g, '');
const clientId = String(process.env.CLIENT_ID || '').trim().replace(/^["']|["']$/g, '');
if (!token || !clientId) {
  console.error('Missing DISCORD_TOKEN or CLIENT_ID env vars!');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, GatewayIntentBits.DirectMessages],
  partials: [Partials.Channel]
});

// gateway debug — login hang ho to exact step dikhe (CONNECT / HELLO / IDENTIFY / READY)
client.on('debug', m => { const t = String(m); if (/connect|HELLO|READY|resum|close|destroy|identif/i.test(t)) console.log('[ws]', t.slice(0, 150)); });
client.on('shardDisconnect', (e, id) => console.error('[ws] shard', id, 'disconnected:', e.code, e.reason));
client.on('shardError', (e, id) => console.error('[ws] shard', id, 'error:', e.message));

// keep-alive for Render
const app = express();
app.get('/', (req, res) => res.json({ status: 'online', bot: client.user?.tag || 'starting', uptime: process.uptime() }));
app.listen(process.env.PORT || process.env.SERVER_PORT || 3000, () => console.log('Keep-alive server up'));

// crash-proof: log and survive
process.on('uncaughtException', err => console.error('UNCAUGHT (alive):', err));
process.on('unhandledRejection', err => console.error('UNHANDLED (alive):', err));
client.on('error', err => console.error('Client error:', err));

const rest = new REST({ version: '10' }).setToken(token);

// boot probe: Discord REST reachability + token validity — login se pehle clear jawab
const probeStart = Date.now();
rest.get(Routes.gatewayBot()).then(
  () => console.log('PROBE OK in ' + (Date.now() - probeStart) + 'ms — token valid, Discord reachable'),
  (e) => {
    console.error('PROBE FAIL in ' + (Date.now() - probeStart) + 'ms — ' + (e.status || '') + ' ' + e.message);
    if (e.status === 401) console.error('Token galat hai! Dev portal → Reset Token → Render env me naya paste karo.');
  }
).catch((e) => console.error('PROBE ERROR:', e.message));
async function registerSlash() {
  try {
    await rest.put(Routes.applicationCommands(clientId), { body: slash });
    console.log(`Registered ${slash.length} slash commands.`);
    for (const [, g] of client.guilds.cache) {
      await rest.put(Routes.applicationGuildCommands(clientId, g.id), { body: [] }).catch(() => {});
    }
  } catch (e) {
    console.error('Slash registration failed:', e);
  }
}

const STATUS = ['The Gaming Citadel | /help', 'Coins • Tickets • Giveaways', '/warmup for setup tips'];
function rotateStatus() {
  client.user.setPresence({ activities: [{ name: STATUS[Math.floor(Math.random() * STATUS.length)], type: ActivityType.Custom }], status: 'online' });
}

client.once('clientReady', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  rotateStatus();
  setInterval(rotateStatus, 5 * 60 * 1000);
  await registerSlash();
  giveaways.setClient(client);
  giveaways.rescheduleAll();
  for (const [, g] of client.guilds.cache) social.cacheInvites(g);
  counters.refreshAll(client).catch(console.error);
  setInterval(() => counters.refreshAll(client).catch(console.error), 10 * 60 * 1000);
});

client.on('guildCreate', (guild) => {
  social.cacheInvites(guild);
  const owner = guild.members.cache.get(guild.ownerId);
  if (owner) {
    owner.send({ embeds: [new EmbedBuilder().setColor(0x8b5cf6).setTitle(`🏰 Citadel Bot — ${guild.name}`) 
      .setDescription('Thanks for the invite!\n• `/welcome` — welcome + autorole\n• `/ticketsetup` + `/ticketpanel` — support\n• `/help` — all commands\n\nTip: `/warmup` for the 3-day trust plan.').setTimestamp()] }).catch(() => {});
  }
});

client.on('guildDelete', (guild) => {
  console.log(`Removed from: ${guild?.name || guild?.id}`);
  for (const id of (process.env.BOT_OWNERS || '').split(/[\s,]+/).filter(Boolean)) {
    client.users.fetch(id).then(u => u.send(`⚠️ Citadel Bot removed from **${guild?.name || 'a server'}**. Agar tumne nahi nikala — Discord flag kar gaya hoga. /warmup follow karo.`).catch(() => {})).catch(() => {});
  }
});

const handlers = {
  daily: economy.handleDaily, work: economy.handleWork, coinflip: economy.handleCoinflip, pay: economy.handlePay, coins: economy.handleCoins,
  slots: gambling.handleSlots, rob: gambling.handleRob,
  shop: shop.handleShop, shopadd: shop.handleShopAdd, shopremove: shop.handleShopRemove, buy: shop.handleBuy, inventory: shop.handleInventory,
  warn: mod.handleWarn, warnings: mod.handleWarnings, clearwarnings: mod.handleClearWarnings, timeout: mod.handleTimeout, purge: mod.handlePurge, automod: mod.handleAutomod,
  ship: fun.handleShip, roast: fun.handleRoast, compliment: fun.handleCompliment, '8ball': fun.handle8ball, avatar: fun.handleAvatar, serverinfo: fun.handleServerinfo, stats: fun.handleStats,
  counter: counters.handleCounter, arcade: arcade.handleArcade,
  colors: colors.handleColors, roleaudit: colors.handleRoleAudit, poll: fun.handlePoll,
  ticketsetup: tickets.handleTicketSetup, ticketadd: tickets.handleTicketAdd, ticketpanel: tickets.handleTicketPanel, close: tickets.handleCloseCommand,
  gstart: giveaways.handleGStart,
  welcome: social.handleWelcome,
  ask: ai.handleAsk, aichannel: ai.handleAiChannel
};

client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton()) {
    if (interaction.customId === 'ct_color_select') return colors.handleColorSelect(interaction);
    if (interaction.customId.startsWith('ar_')) return arcade.handleComponent(interaction);
    if (interaction.isStringSelectMenu()) return arcade.handleComponent(interaction);
    if (interaction.customId.startsWith('ct_ticket_')) return tickets.handleButton(interaction);
    if (interaction.customId === 'ct_gw_join') return giveaways.handleJoin(interaction);
    if (interaction.customId.startsWith('ct_gw_reroll_')) return giveaways.handleReroll(interaction);
    return;
  }
  if (!interaction.isChatInputCommand()) return;

  // level/xp side needs no handler; debug is owner-only
  if (interaction.commandName === 'debug') {
    if (!isBotOwner(interaction.user.id)) return interaction.reply({ content: '🔒 Developer only.', flags: MessageFlags.Ephemeral });
    const up = process.uptime();
    const e = new EmbedBuilder().setColor(0x8b5cf6).setTitle('🛠️ Citadel Debug')
      .setDescription(
        `• Token: \`${'…' + (process.env.DISCORD_TOKEN || '').slice(-6)}\`\n` +
        `• Gemini key: ${process.env.GEMINI_API_KEY ? '✅' : '❌'}\n` +
        `• Uptime: ${Math.floor(up / 3600)}h ${Math.floor((up % 3600) / 60)}m\n` +
        `• Ping: ${client.ws.ping}ms\n• Servers: ${client.guilds.cache.size}\n• Commands: ${slash.length}`
      );
    return interaction.reply({ embeds: [e], flags: MessageFlags.Ephemeral });
  }

  const handler = handlers[interaction.commandName];
  if (!handler) return;
  try {
    await handler(interaction);
  } catch (err) {
    console.error(`/${interaction.commandName}:`, err);
    const payload = { content: 'Something went wrong 😔', flags: MessageFlags.Ephemeral };
    if (interaction.deferred || interaction.replied) await interaction.editReply(payload).catch(() => {});
    else await interaction.reply(payload).catch(() => {});
  }
});

// xp + level roles on chat, AI auto-reply
client.on('messageCreate', async (message) => {
  const blocked = await mod.handleMessage(message).catch(() => false);
  if (blocked) return;
  prefix.handleMessage(message).catch(console.error);
  social.onMessageForXp(message).catch(console.error);
  ai.maybeAutoReply(message).catch(err => console.error('ai:', err.message));
});

client.on('guildMemberAdd', (member) => social.onMemberAdd(member).catch(console.error));
client.on('guildMemberRemove', (member) => social.onMemberRemove(member).catch(console.error));
client.on('inviteCreate', (invite) => social.cacheInvites(invite.guild));

// login: 20s timeout + retry (max 3) — silent hang kabhi nahi, ya connect ya clear exit
let attempts = 0;
async function loginWithRetry() {
  attempts++;
  console.log(`Login attempt ${attempts}/3...`);
  let timedOut = false;
  const t = setTimeout(() => {
    if (!client.user) {
      timedOut = true;
      console.error(`Attempt ${attempts}: 20s me gateway connect nahi hua`);
      try { client.destroy(); } catch {}
      if (attempts >= 3) {
        console.error('3 attempts fail — exit (host restart karega). Network ya token issue — PROBE line upar dekho.');
        process.exit(1);
      }
      loginWithRetry();
    }
  }, 20000).unref();
  try {
    await client.login(token);
    if (!timedOut) clearTimeout(t);
  } catch (err) {
    clearTimeout(t);
    console.error('LOGIN FAILED:', err.message);
    console.error('→ Naya token lo (dev portal → Bot → Reset Token) aur env me naya paste karo.');
    process.exit(1);
  }
}
loginWithRetry();
