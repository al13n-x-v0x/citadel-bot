const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = [
  // economy
  new SlashCommandBuilder().setName('daily').setDescription('Daily coin reward with streak').toJSON(),
  new SlashCommandBuilder().setName('work').setDescription('Hourly work shift for coins').toJSON(),
  new SlashCommandBuilder().setName('coinflip').setDescription('Gamble coins on a coinflip')
    .addIntegerOption(o => o.setName('amount').setDescription('Coins to bet').setRequired(true).setMinValue(10))
    .addStringOption(o => o.setName('side').setDescription('Heads or tails').setRequired(true).addChoices({ name: 'heads', value: 'heads' }, { name: 'tails', value: 'tails' }))
    .toJSON(),
  new SlashCommandBuilder().setName('pay').setDescription('Pay coins to another member')
    .addUserOption(o => o.setName('user').setDescription('Who').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('Coins').setRequired(true).setMinValue(1))
    .toJSON(),
  new SlashCommandBuilder().setName('slots').setDescription('Spin the citadel slots 🎰')
    .addIntegerOption(o => o.setName('bet').setDescription('Coins to bet').setRequired(true).setMinValue(10).setMaxValue(10000))
    .toJSON(),
  new SlashCommandBuilder().setName('rob').setDescription('Rob another member 🕴️')
    .addUserOption(o => o.setName('user').setDescription('Who').setRequired(true))
    .toJSON(),

  // shop
  new SlashCommandBuilder().setName('shop').setDescription('Browse the citadel shop').toJSON(),
  new SlashCommandBuilder().setName('shopadd').setDescription('Add shop item (Manage Server)')
    .addStringOption(o => o.setName('name').setDescription('Item name').setRequired(true))
    .addIntegerOption(o => o.setName('price').setDescription('Price in coins').setRequired(true))
    .addRoleOption(o => o.setName('role').setDescription('Role to grant on buy'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .toJSON(),
  new SlashCommandBuilder().setName('shopremove').setDescription('Remove shop item (Manage Server)')
    .addIntegerOption(o => o.setName('id').setDescription('Item id').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .toJSON(),
  new SlashCommandBuilder().setName('buy').setDescription('Buy from the shop')
    .addIntegerOption(o => o.setName('id').setDescription('Item id from /shop').setRequired(true))
    .toJSON(),
  new SlashCommandBuilder().setName('inventory').setDescription('Your purchases')
    .addUserOption(o => o.setName('user').setDescription('Whose'))
    .toJSON(),
  new SlashCommandBuilder().setName('coins').setDescription('Your wallet or the richest list')
    .addUserOption(o => o.setName('user').setDescription('Whose wallet'))
    .addBooleanOption(o => o.setName('leaderboard').setDescription('Show richest list'))
    .toJSON(),

  // social
  new SlashCommandBuilder().setName('vouch').setDescription('Vouch a member (+aura)')
    .addUserOption(o => o.setName('user').setDescription('Who').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Why'))
    .addIntegerOption(o => o.setName('stars').setDescription('1-5').setMinValue(1).setMaxValue(5))
    .toJSON(),
  new SlashCommandBuilder().setName('profile').setDescription('Aura + vouches profile')
    .addUserOption(o => o.setName('user').setDescription('Whose'))
    .toJSON(),
  new SlashCommandBuilder().setName('leaderboard').setDescription('Top aura').toJSON(),
  new SlashCommandBuilder().setName('level').setDescription('Your chat level')
    .addUserOption(o => o.setName('user').setDescription('Whose'))
    .toJSON(),
  new SlashCommandBuilder().setName('rolelevels').setDescription('Level roles setup (admin)')
    .addStringOption(o => o.setName('setup').setDescription('5:roleId,10:roleId or "off"'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),
  new SlashCommandBuilder().setName('welcome').setDescription('Welcome/leave/autorole setup (admin)')
    .addChannelOption(o => o.setName('channel').setDescription('Welcome channel').addChannelTypes(0))
    .addChannelOption(o => o.setName('leave_channel').setDescription('Leave channel').addChannelTypes(0))
    .addRoleOption(o => o.setName('autorole').setDescription('Role on join'))
    .addStringOption(o => o.setName('message').setDescription('Welcome text — {user} {username} {server} {count}'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),

  // moderation
  new SlashCommandBuilder().setName('warn').setDescription('Warn a member (admin)')
    .addUserOption(o => o.setName('user').setDescription('Who').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .toJSON(),
  new SlashCommandBuilder().setName('warnings').setDescription('Show warnings')
    .addUserOption(o => o.setName('user').setDescription('Whose'))
    .toJSON(),
  new SlashCommandBuilder().setName('clearwarnings').setDescription('Clear warnings (admin)')
    .addUserOption(o => o.setName('user').setDescription('Who').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .toJSON(),
  new SlashCommandBuilder().setName('timeout').setDescription('Timeout a member (admin)')
    .addUserOption(o => o.setName('user').setDescription('Who').setRequired(true))
    .addIntegerOption(o => o.setName('minutes').setDescription('Minutes').setRequired(true).setMinValue(1).setMaxValue(10080))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .toJSON(),
  new SlashCommandBuilder().setName('purge').setDescription('Bulk delete messages (admin)')
    .addIntegerOption(o => o.setName('count').setDescription('1-100').setRequired(true).setMinValue(1).setMaxValue(100))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .toJSON(),
  new SlashCommandBuilder().setName('automod').setDescription('Auto-mod setup (admin)')
    .addBooleanOption(o => o.setName('enabled').setDescription('ON/OFF'))
    .addIntegerOption(o => o.setName('spam_msgs').setDescription('Spam threshold').setMinValue(3).setMaxValue(20))
    .addStringOption(o => o.setName('add_badwords').setDescription('Words, comma separated'))
    .addBooleanOption(o => o.setName('block_links').setDescription('Block links'))
    .addChannelOption(o => o.setName('log_channel').setDescription('Mod-log').addChannelTypes(0))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),

  // tickets
  new SlashCommandBuilder().setName('ticketsetup').setDescription('Ticket config (admin)')
    .addChannelOption(o => o.setName('category').setDescription('Category').addChannelTypes(4))
    .addRoleOption(o => o.setName('support_role').setDescription('Support role'))
    .addChannelOption(o => o.setName('transcript_channel').setDescription('Transcript channel').addChannelTypes(0))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .toJSON(),
  new SlashCommandBuilder().setName('ticketadd').setDescription('Add a ticket type (admin)')
    .addStringOption(o => o.setName('key').setDescription('e.g. scam-report').setRequired(true))
    .addStringOption(o => o.setName('description').setDescription('Shown on button'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .toJSON(),
  new SlashCommandBuilder().setName('ticketpanel').setDescription('Post the ticket panel (admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .toJSON(),
  new SlashCommandBuilder().setName('close').setDescription('Close this ticket').toJSON(),

  // giveaways
  new SlashCommandBuilder().setName('gstart').setDescription('Start a giveaway (Manage Server)')
    .addStringOption(o => o.setName('prize').setDescription('Prize').setRequired(true))
    .addStringOption(o => o.setName('duration').setDescription('30s, 10m, 2h, 1d').setRequired(true))
    .addIntegerOption(o => o.setName('winners').setDescription('Winner count'))
    .addChannelOption(o => o.setName('channel').setDescription('Where').addChannelTypes(0))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .toJSON(),

  // ai
  new SlashCommandBuilder().setName('ask').setDescription('Ask the AI anything')
    .addStringOption(o => o.setName('question').setDescription('Question').setRequired(true))
    .toJSON(),
  new SlashCommandBuilder().setName('aichannel').setDescription('AI auto-chat channel (admin)')
    .addChannelOption(o => o.setName('channel').setDescription('Channel').addChannelTypes(0))
    .addBooleanOption(o => o.setName('off').setDescription('Disable'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .toJSON(),

  // fun
  new SlashCommandBuilder().setName('ship').setDescription('Ship two members')
    .addUserOption(o => o.setName('user1').setDescription('First').setRequired(true))
    .addUserOption(o => o.setName('user2').setDescription('Second'))
    .toJSON(),
  new SlashCommandBuilder().setName('roast').setDescription('Roast someone')
    .addUserOption(o => o.setName('user').setDescription('Who'))
    .toJSON(),
  new SlashCommandBuilder().setName('compliment').setDescription('Compliment someone')
    .addUserOption(o => o.setName('user').setDescription('Who'))
    .toJSON(),
  new SlashCommandBuilder().setName('8ball').setDescription('Ask the magic 8-ball')
    .addStringOption(o => o.setName('question').setDescription('Question').setRequired(true))
    .toJSON(),
  new SlashCommandBuilder().setName('avatar').setDescription('Show avatar')
    .addUserOption(o => o.setName('user').setDescription('Whose'))
    .toJSON(),
  new SlashCommandBuilder().setName('stats').setDescription('Citadel server stats card').toJSON(),
  new SlashCommandBuilder().setName('counter').setDescription('Member counter channels (admin)')
    .addSubcommand(sc => sc.setName('setup').setDescription('Create a live counter')
      .addStringOption(o => o.setName('type').setDescription('Counter type').setRequired(true)
        .addChoices({ name: 'members', value: 'members' }, { name: 'humans', value: 'humans' }, { name: 'online', value: 'online' }, { name: 'boosts', value: 'boosts' })))
    .addSubcommand(sc => sc.setName('remove').setDescription('Remove counter by index')
      .addIntegerOption(o => o.setName('index').setDescription('From /counter list').setRequired(true)))
    .addSubcommand(sc => sc.setName('list').setDescription('List counters'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),
  new SlashCommandBuilder().setName('serverinfo').setDescription('Server stats').toJSON(),
  new SlashCommandBuilder().setName('poll').setDescription('Create a reaction poll')
    .addStringOption(o => o.setName('question').setDescription('Question').setRequired(true))
    .addStringOption(o => o.setName('option1').setDescription('Option 1').setRequired(true))
    .addStringOption(o => o.setName('option2').setDescription('Option 2').setRequired(true))
    .addStringOption(o => o.setName('option3').setDescription('Option 3'))
    .addStringOption(o => o.setName('option4').setDescription('Option 4'))
    .toJSON(),

  // util
  new SlashCommandBuilder().setName('help').setDescription('All commands').toJSON(),
  new SlashCommandBuilder().setName('ping').setDescription('Bot latency').toJSON(),
  new SlashCommandBuilder().setName('debug').setDescription('Developer diagnostics').toJSON(),
  new SlashCommandBuilder().setName('invite').setDescription('Official invite link').toJSON()
];
