// Lucky Invites — invite-based lottery entries + monthly winner + exclusive roles
// Entries: 1 genuine invite = 1 entry, milestone bonuses at 5/10 invites
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { isAdmin } = require('./util');
const store = require('./store');

const MILESTONES = [
  { invites: 5, bonusEntries: 2 },
  { invites: 10, bonusEntries: 5, roleId: 'lucky10' },
  { invites: 25, bonusEntries: 15, roleId: 'lucky25' },
  { invites: 50, bonusEntries: 40, roleId: 'lucky50' }
];

function makeEmbed() {
  return new EmbedBuilder().setColor(0xf1c40f).setFooter({ text: 'The Gaming Citadel • Lucky Invites 🎰' });
}

function getLucky(g) {
  if (!g.luckyInvites) g.luckyInvites = { entries: {}, counts: {}, roleId: null, channelId: null, lastDraw: null, winners: [] };
  return g.luckyInvites;
}

// called from social.onMemberAdd when a genuine invite is credited
function creditInvite(guildId, inviterId, member) {
  const g = store.guild(guildId);
  const lucky = getLucky(g);
  lucky.counts[inviterId] = (lucky.counts[inviterId] || 0) + 1;
  lucky.entries[inviterId] = (lucky.entries[inviterId] || 0) + 1;

  const count = lucky.counts[inviterId];
  let bonusMsg = '';
  for (const m of MILESTONES) {
    if (count === m.invites) {
      lucky.entries[inviterId] += m.bonusEntries;
      bonusMsg = `\n🎁 Milestone! **${m.invites} invites** → +${m.bonusEntries} bonus entries!`;
      if (m.roleId === 'lucky10' && lucky.roleId) {
        const role = member.guild.roles.cache.get(lucky.roleId);
        if (role) member.guild.members.cache.get(inviterId)?.roles.add(role, 'Lucky Invites milestone').catch(() => {});
        bonusMsg += `\n👑 Exclusive role unlocked: <@&${lucky.roleId}>`;
      }
    }
  }

  if (lucky.channelId) {
    const ch = member.guild.channels.cache.get(lucky.channelId);
    if (ch?.isTextBased()) {
      ch.send({ content: `🎰 <@${inviterId}> earned a **Lucky Invite entry!** (total: ${lucky.entries[inviterId]})${bonusMsg}` }).catch(() => {});
    }
  }
  store.save();
}

// ---------------- /lucky command ----------------
async function handleLucky(interaction) {
  const sub = interaction.options.getSubcommand();
  const g = store.guild(interaction.guild.id);
  const lucky = getLucky(g);

  if (sub === 'me') {
    const uid = interaction.user.id;
    const count = lucky.counts[uid] || 0;
    const entries = lucky.entries[uid] || 0;
    const nextMilestone = MILESTONES.find(m => m.invites > count);
    const e = makeEmbed().setTitle('🎟️ Your Lucky Invite Card')
      .addFields(
        { name: 'Invites', value: String(count), inline: true },
        { name: 'Lottery Entries', value: `**${entries}**`, inline: true },
        { name: 'Next Milestone', value: nextMilestone ? `${nextMilestone.invites} invites (+${nextMilestone.bonusEntries} entries)` : 'MAXED 🎉', inline: true }
      );
    return interaction.reply({ embeds: [e], flags: MessageFlags.Ephemeral });
  }

  if (sub === 'leaderboard') {
    const top = Object.entries(lucky.counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (!top.length) return interaction.reply({ content: 'Abhi koi invites nahi hue. Pehla inviter tu ban! 🎯', flags: MessageFlags.Ephemeral });
    const desc = top.map(([uid, c], i) => {
      const medal = ['🥇', '🥈', '🥉'][i] || `\`${i + 1}.\``;
      return `${medal} <@${uid}> — **${c}** invites • ${lucky.entries[uid] || 0} entries`;
    }).join('\n');
    return interaction.reply({ embeds: [makeEmbed().setTitle('🏆 Lucky Inviters').setDescription(desc)] });
  }

  if (sub === 'info') {
    const e = makeEmbed().setTitle('🎰 Lucky Citadel Invites')
      .setDescription('Har **genuine invite** = **1 lottery entry**\nMonthly random draw → winner prize 🎁\n\n**Milestones:**\n' +
        MILESTONES.map(m => `• ${m.invites} invites → +${m.bonusEntries} bonus entries${m.roleId ? ' + exclusive role 👑' : ''}`).join('\n') +
        (lucky.roleId ? `\n\n👑 Exclusive role: <@&${lucky.roleId}>` : '') +
        (lucky.channelId ? `\n📣 Announcements: <#${lucky.channelId}>` : ''));
    return interaction.reply({ embeds: [e], flags: MessageFlags.Ephemeral });
  }

  // admin subs
  if (!isAdmin(interaction)) return interaction.reply({ content: '❌ Admin only.', flags: MessageFlags.Ephemeral });

  if (sub === 'setup') {
    const channel = interaction.options.getChannel('channel');
    const role = interaction.options.getRole('role');
    lucky.channelId = channel ? channel.id : null;
    lucky.roleId = role ? role.id : null;
    store.save();
    return interaction.reply({
      content: `✅ Lucky Invites active!\n📣 Announcements: ${channel ? channel.toString() : 'off'}\n👑 Exclusive role: ${role ? role.toString() : 'none'}\n\nLog draw karo: \`/lucky draw\` (monthly winner pick).`,
      flags: MessageFlags.Ephemeral
    });
  }

  if (sub === 'draw') {
    const pool = Object.entries(lucky.entries).filter(([, n]) => n > 0);
    if (!pool.length) return interaction.reply({ content: '❌ Pool khaali hai — koi entries nahi.', flags: MessageFlags.Ephemeral });
    await interaction.deferReply();

    // weighted random: more entries = more chances
    const total = pool.reduce((s, [, n]) => s + n, 0);
    let roll = Math.random() * total;
    let winner = pool[0][0];
    for (const [uid, n] of pool) { roll -= n; if (roll <= 0) { winner = uid; break; } }

    const prize = interaction.options.getString('prize') || 'Mystery prize 🎁';
    lucky.winners.push({ userId: winner, prize, at: Date.now() });
    lucky.lastDraw = Date.now();
    // reset entries for next cycle
    lucky.entries = {};
    store.save();

    const e = makeEmbed().setTitle('🎉 LUCKY INVITE WINNER!')
      .setDescription(`Winner: <@${winner}>\nPrize: **${prize}**\nOdds: ${pool.find(p => p[0] === winner)[1]}/${total} entries\n\n*Entries reset — naya cycle shuru! DM <@${interaction.client.user.id}> or claim from staff.*`)
      .setTimestamp();
    if (lucky.channelId) {
      const ch = interaction.guild.channels.cache.get(lucky.channelId);
      if (ch?.isTextBased()) await ch.send({ content: `🎊 <@${winner}> won **${prize}**!`, embeds: [e] }).catch(() => {});
    }
    return interaction.editReply({ embeds: [e] });
  }

  if (sub === 'winners') {
    if (!lucky.winners.length) return interaction.reply({ content: 'Abhi tak koi draw nahi hua. `/lucky draw` try karo!', flags: MessageFlags.Ephemeral });
    const desc = lucky.winners.slice(-10).reverse().map(w => `🏆 <@${w.userId}> — **${w.prize}** — <t:${Math.floor(w.at / 1000)}:R>`).join('\n');
    return interaction.reply({ embeds: [makeEmbed().setTitle('🎁 Past Winners').setDescription(desc)], flags: MessageFlags.Ephemeral });
  }
}

module.exports = { handleLucky, creditInvite };
