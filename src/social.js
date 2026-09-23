const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const cards = require('./cards');
const store = require('./store');

const COLOR = 0x8b5cf6;
const inviteCache = new Map(); // guildId -> Map(code -> { uses, inviterId })

function fill(text, member) {
  if (!text) return '';
  return text
    .replace(/{user}/g, `<@${member.id}>`)
    .replace(/{username}/g, member.user.username)
    .replace(/{server}/g, member.guild.name)
    .replace(/{count}/g, `${member.guild.memberCount}`);
}

function cacheInvites(guild) {
  guild.invites.fetch().then(invites => {
    const map = new Map();
    for (const inv of invites.values()) map.set(inv.code, { uses: inv.uses, inviterId: inv.inviter?.id });
    inviteCache.set(guild.id, map);
  }).catch(() => {});
}

async function onMemberAdd(member) {
  const g = store.guild(member.guild.id);
  // autorole
  if (g.welcome.autoroleId) {
    const role = member.guild.roles.cache.get(g.welcome.autoroleId);
    if (role) await member.roles.add(role, 'Autorole').catch(() => {});
  }
  // welcome message
  if (g.welcome.channelId) {
    const ch = member.guild.channels.cache.get(g.welcome.channelId);
    if (ch?.isTextBased()) {
      // invite diff
      let inviterLine = '';
      const old = inviteCache.get(member.guild.id);
      if (old) {
        try {
          const fresh = await member.guild.invites.fetch().catch(() => null);
          if (fresh) {
            for (const inv of fresh.values()) {
              const prev = old.get(inv.code);
              if (prev && inv.uses > prev.uses && prev.inviterId) {
                inviterLine = `\n🎟️ Invited by <@${prev.inviterId}>`;
                store.addVouch(member.guild.id, prev.inviterId, member.client.user.id, `Invite credit for ${member.user.username}`, 1);
                break;
              }
            }
          }
        } catch {}
      }
      const e = new EmbedBuilder().setColor(COLOR).setTitle(`👋 Welcome to ${member.guild.name}!`)
        .setDescription(fill(g.welcome.message || '{user} — enjoy your stay!', member) + inviterLine)
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();
      if (g.welcome.card) {
        try {
          const png = await cards.welcomeCard({
            username: member.user.username,
            discriminator: member.user.discriminator,
            avatarUrl: member.user.displayAvatarURL({ extension: 'png', size: 256 }),
            guildName: member.guild.name,
            memberCount: member.guild.memberCount,
            accent: g.welcome.cardColor || '#8b5cf6'
          });
          const file = new AttachmentBuilder(png, { name: 'welcome.png' });
          e.setImage('attachment://welcome.png');
          await ch.send({ embeds: [e], files: [file] }).catch(() => {});
        } catch { await ch.send({ embeds: [e] }).catch(() => {}); }
      } else {
        await ch.send({ embeds: [e] }).catch(() => {});
      }
    }
  }
  cacheInvites(member.guild);
}

async function onMemberRemove(member) {
  const g = store.guild(member.guild.id);
  if (g.welcome.leaveChannelId) {
    const ch = member.guild.channels.cache.get(g.welcome.leaveChannelId);
    if (ch?.isTextBased()) {
      const e = new EmbedBuilder().setColor(COLOR).setDescription(fill('{username} left the citadel 😔', member));
      await ch.send({ embeds: [e] }).catch(() => {});
    }
  }
}

async function onMessageForXp(message) {
  if (message.author.bot || !message.guild) return;
  const res = store.grantXp(message.guild.id, message.author.id);
  if (!res) return;
  store.addCoins(message.guild.id, message.author.id, 2);
  if (res.leveledUp) {
    try {
      const xpData = store.getXp(message.guild.id, message.author.id);
      const need = store.xpForLevel(res.level + 1);
      const png = await cards.rankCard({
        username: message.author.username,
        avatarUrl: message.author.displayAvatarURL({ extension: 'png', size: 256 }),
        level: res.level,
        currentXp: xpData.xp,
        neededXp: need,
        rank: null,
        accent: (store.guild(message.guild.id).welcome || {}).cardColor || '#8b5cf6'
      });
      const file = new AttachmentBuilder(png, { name: 'level.png' });
      await message.channel.send({ content: `🌌 <@${message.author.id}> hit **Level ${res.level}**!`, files: [file] }).catch(() => {});
    } catch { message.channel.send(`🌌 <@${message.author.id}> hit **Level ${res.level}**!`).catch(() => {}); }
    const lr = store.levelRoleFor(message.guild.id, res.level);
    if (lr && message.member && !message.member.roles.cache.has(lr.roleId)) {
      for (const old of store.getLevelRoles(message.guild.id)) {
        if (old.roleId !== lr.roleId && message.member.roles.cache.has(old.roleId)) {
          await message.member.roles.remove(old.roleId, 'Level role upgrade').catch(() => {});
        }
      }
      await message.member.roles.add(lr.roleId, `Level ${res.level}`).catch(() => {});
      message.channel.send(`🏷️ Unlocked <@&${lr.roleId}>!`).catch(() => {});
    }
  }
}

async function handleWelcome(interaction) {
  const { isAdmin } = require('./util');
  const { MessageFlags } = require('discord.js');
  if (!isAdmin(interaction)) return interaction.reply({ content: 'Admin only.', flags: MessageFlags.Ephemeral });
  const patch = {};
  const ch = interaction.options.getChannel('channel');
  const leave = interaction.options.getChannel('leave_channel');
  const role = interaction.options.getRole('autorole');
  const msg = interaction.options.getString('message');
  if (ch) patch.channelId = ch.id;
  if (leave) patch.leaveChannelId = leave.id;
  if (role) patch.autoroleId = role.id;
  if (msg !== null) patch.message = msg;
  store.setWelcome(interaction.guildId, patch);
  const cfg = store.getWelcome(interaction.guildId);
  const e = new EmbedBuilder().setColor(COLOR).setTitle('👋 Welcome Setup')
    .setDescription(
      `**Channel:** ${cfg.channelId ? `<#${cfg.channelId}>` : 'not set'}\n` +
      `**Leave channel:** ${cfg.leaveChannelId ? `<#${cfg.leaveChannelId}>` : 'not set'}\n` +
      `**Autorole:** ${cfg.autoroleId ? `<@&${cfg.autoroleId}>` : 'not set'}\n` +
      `**Message:** \`${cfg.message || '{user} — enjoy your stay!'}\`\n\nPlaceholders: \`{user}\` \`{username}\` \`{server}\` \`{count}\``
    );
  await interaction.reply({ embeds: [e], flags: MessageFlags.Ephemeral });
}

async function handleRank(interaction) {
  const { AttachmentBuilder } = require('discord.js');
  await interaction.deferReply().catch(() => {});
  const user = interaction.options.getUser('user') || interaction.user;
  const xpData = store.getXp(interaction.guildId, user.id);
  const level = xpData.level || 0;
  const need = store.xpForLevel(level + 1);
  try {
    const png = await cards.rankCard({
      username: user.username,
      avatarUrl: user.displayAvatarURL({ extension: 'png', size: 256 }),
      level,
      currentXp: xpData.xp || 0,
      neededXp: need,
      rank: null,
      accent: (store.guild(interaction.guildId).welcome || {}).cardColor || '#8b5cf6'
    });
    const file = new AttachmentBuilder(png, { name: 'rank.png' });
    return interaction.editReply({ content: '🏅 **' + user.username + '** — Level ' + level, files: [file] });
  } catch (e) {
    return interaction.editReply('🏅 **' + user.username + '** — Level ' + level + ' (' + (xpData.xp || 0) + '/' + need + ' XP)');
  }
}

module.exports = { cacheInvites, onMemberAdd, onMemberRemove, onMessageForXp, handleWelcome, handleRank };
