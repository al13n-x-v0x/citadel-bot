const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = [
  {
    name: 'lucky',
    description: 'Lucky Invites lottery system',
    options: [
      { type: 1, name: 'in', description: 'Show your invite entries', options: [] },
      { type: 1, name: 'leaderboard', description: 'Top inviters this cycle', options: [] },
      { type: 1, name: 'info', description: 'How Lucky Invites works', options: [] },
      { type: 1, name: 'draw', description: 'Draw monthly winner (admin)', options: [
        { type: 3, name: 'prize', description: 'Prize description', required: false, max_length: 100 }
      ]},
      { type: 1, name: 'winners', description: 'Past winners', options: [] },
      { type: 1, name: 'setup', description: 'Configure Lucky Invites (admin)', options: [
        { type: 7, name: 'channel', description: 'Announcement channel', required: false },
        { type: 8, name: 'role', description: 'Exclthatve role for 10+ inviters', required: false }
      ]}
    ]
  },
  {
    name: 'reactionrole',
    description: 'Reaction role panel management',
    default_member_permissions: '268435456',
    options: [
      { type: 1, name: 'setup', description: 'Create a reaction role panel', options: [
        { type: 7, name: 'channel', description: 'Channel for the panel', required: false },
        { type: 3, name: 'title', description: 'Panel title', required: false, max_length: 100 }
      ]},
      { type: 1, name: 'add', description: 'Add a role to a panel', options: [
        { type: 3, name: 'panel', description: 'Panel ID (e.g. rr1)', required: true, max_length: 20 },
        { type: 8, name: 'role', description: 'Role to add', required: true },
        { type: 3, name: 'emoji', description: 'Emoji for this role', required: true, max_length: 32 }
      ]},
      { type: 1, name: 'remove', description: 'Remove a role from a panel', options: [
        { type: 3, name: 'panel', description: 'Panel ID', required: true, max_length: 20 },
        { type: 8, name: 'role', description: 'Role to remove', required: true }
      ]},
      { type: 1, name: 'list', description: 'List all panels', options: [] },
      { type: 1, name: 'delete', description: 'Delete a panel', options: [
        { type: 3, name: 'panel', description: 'Panel ID', required: true, max_length: 20 }
      ]}
    ]
  },
  new SlashCommandBuilder().setName('rank').setDescription('Arcane-style rank card with level & XP').addUserOption(o => o.setName('user').setDescription('Whose card')).toJSON(),

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
  new SlashCommandBuilder().setName('levelset').setDescription('Set user level/xp (admin)')
    .addUserOption(o => o.setName('user').setDescription('Kiska').setRequired(true))
    .addIntegerOption(o => o.setName('level').setDescription('Naya level').setRequired(true).setMinValue(0).setMaxValue(1000))
    .addIntegerOption(o => o.setName('xp').setDescription('Current XP in that level (optional)').setMinValue(0).setMaxValue(999999))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),
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
  new SlashCommandBuilder().setName('ban').setDescription('Ban a member (admin)')
    .addUserOption(o => o.setName('user').setDescription('Who').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason'))
    .addBooleanOption(o => o.setName('dm').setDescription('DM them before ban (default yes)'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .toJSON(),
  new SlashCommandBuilder().setName('kick').setDescription('Kick a member (admin)')
    .addUserOption(o => o.setName('user').setDescription('Who').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason'))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .toJSON(),
  new SlashCommandBuilder().setName('unban').setDescription('Unban by user ID (admin)')
    .addStringOption(o => o.setName('user_id').setDescription('User ID (digits)').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
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

  // giveaways admin
  new SlashCommandBuilder().setName('gend').setDescription('End a giveaway right now (admin)')
    .addStringOption(o => o.setName('message_id').setDescription('Giveaway message ID (empty = earliest live one)'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .toJSON(),
  new SlashCommandBuilder().setName('glist').setDescription('Show all giveaways in this server')
    .toJSON(),
  new SlashCommandBuilder().setName('greroll').setDescription('Pick a new winner for an ended giveaway (admin)')
    .addStringOption(o => o.setName('message_id').setDescription('Giveaway message ID').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .toJSON(),
  new SlashCommandBuilder().setName('gdelete').setDescription('Delete a giveaway record (admin)')
    .addStringOption(o => o.setName('message_id').setDescription('Giveaway message ID').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .toJSON(),
  // moderation
  new SlashCommandBuilder().setName('mute').setDescription('Mute a member for N minutes (admin)')
    .addUserOption(o => o.setName('user').setDescription('Who').setRequired(true))
    .addIntegerOption(o => o.setName('minutes').setDescription('Minutes (default 10)').setMinValue(1).setMaxValue(10080))
    .addStringOption(o => o.setName('reason').setDescription('Reason'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .toJSON(),
  new SlashCommandBuilder().setName('unmute').setDescription('Remove a timeout (admin)')
    .addUserOption(o => o.setName('user').setDescription('Who').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .toJSON(),
  new SlashCommandBuilder().setName('tempban').setDescription('Ban for N days, auto-lifts after (admin)')
    .addUserOption(o => o.setName('user').setDescription('Who').setRequired(true))
    .addIntegerOption(o => o.setName('days').setDescription('Days (default 7)').setMinValue(1).setMaxValue(365))
    .addStringOption(o => o.setName('reason').setDescription('Reason'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .toJSON(),
  new SlashCommandBuilder().setName('softban').setDescription('Kick and wipe recent messages via ban+unban (admin)')
    .addUserOption(o => o.setName('user').setDescription('Who').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
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
  new SlashCommandBuilder().setName('translate').setDescription('Translate text or a message link')
    .addStringOption(o => o.setName('text').setDescription('Text or Discord message link').setRequired(true))
    .addStringOption(o => o.setName('to').setDescription('Target language code (default en). en, only, hinglish, es, fr, de, ja, to...'))
    .toJSON(),
  new SlashCommandBuilder().setName('autotranslate').setDescription('Auto-translate non-English msgs to English (admin)')
    .addChannelOption(o => o.setName('channel').setDescription('Channel').addChannelTypes(0))
    .addBooleanOption(o => o.setName('off').setDescription('Turn off'))
    .toJSON(),

  // fun
  new SlashCommandBuilder().setName('ship').setDescription('Ship two members')
    .addUserOption(o => o.setName('user1').setDescription('First').setRequired(true))
    .addUserOption(o => o.setName('user2').setDescription('Second'))
    .toJSON(),
  new SlashCommandBuilder().setName('roast').setDescription('Roast someo ne — choose how hard 🔥')
    .addUserOption(o => o.setName('user').setDescription('Who'))
    .addStringOption(o => o.setName('level').setDescription('Roast intensity')
      .addChoices(
        { name: 'normal 🙂', value: 'normal' },
        { name: 'spicy 🔥', value: 'spicy' },
        { name: '☠️ NUCLEAR — dead-killer gaali', value: 'nuclear' }
      ))
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
  new SlashCommandBuilder().setName('arcade').setDescription('Arcade setup (admin)')
    .addSubcommand(sc => sc.setName('setup').setDescription('Post the sticky arcade panel here'))
    .addSubcommand(sc => sc.setName('remove').setDescription('Remove the arcade panel'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .toJSON(),
  new SlashCommandBuilder().setName('colors').setDescription('Color role selector (admin)')
    .addSubcommand(sc => sc.setName('setup').setDescription('Create color roles + panel')
      .addStringOption(o => o.setName('colors').setDescription('Hex colors comma-separated (max 10)').setRequired(true)))
    .addSubcommand(sc => sc.setName('remove').setDescription('Remove color roles + panel'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .toJSON(),
  new SlashCommandBuilder().setName('roleaudit').setDescription('List all roles with member counts (admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .toJSON(),
  new SlashCommandBuilder().setName('stats').setDescription('Activity stats card for a member')
    .addUserOption(o => o.setName('user').setDescription('Whose stats (default: you)'))
    .toJSON(),
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

  // BloxStrike — verification + bio
  {
    name: 'bio',
    description: 'Member bio + verified badge',
    options: [
      { type: 1, name: 'view', description: 'Bio see', options: [
        { type: 6, name: 'user', description: 'Whose bio (default: you)' }
      ]},
      { type: 1, name: 'set', description: 'Your bio set doo', options: [
        { type: 3, name: 'text', description: 'Bio text (max 180 chars)', required: true, max_length: 180 }
      ]}
    ]
  },
  new SlashCommandBuilder().setName('verify').setDescription('Quiz pass doo, Verified badge + role pao').toJSON(),
  new SlashCommandBuilder().setName('verifypanel').setDescription('Verification panel post it (admin)').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild).toJSON(),
  new SlashCommandBuilder().setName('verifylist').setDescription('Verified members list (admin)').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild).toJSON(),
  new SlashCommandBuilder().setName('unverify').setDescription('Someone of verify remove (admin)')
    .addUserOption(o => o.setName('user').setDescription('Who').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild).toJSON(),

  // BloxStrike — weekly competitions
  {
    name: 'compete',
    description: 'Weekly competitions — join, submit, board',
    options: [
      { type: 1, name: 'info', description: 'Current competition details', options: [] },
      { type: 1, name: 'join', description: 'Competition in join doo', options: [] },
      { type: 1, name: 'submit', description: 'Entry submit doo', options: [
        { type: 4, name: 'score', description: 'Your score' },
        { type: 3, name: 'proof', description: 'Proof link (screenshot/imgur)', max_length: 300 }
      ]},
      { type: 1, name: 'board', description: 'Current standings', options: [] }
    ]
  },
  new SlashCommandBuilder().setName('compsetup').setDescription('Nayi week-long competition (admin)')
    .addStringOption(o => o.setName('title').setDescription('Competition title').setRequired(true).setMaxLength(80))
    .addStringOption(o => o.setName('description').setDescription('Kya to do is, rules').setRequired(true).setMaxLength(300))
    .addStringOption(o => o.setName('prize').setDescription('Prize (default: 500 coins + aura)').setMaxLength(100))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild).toJSON(),
  new SlashCommandBuilder().setName('compend').setDescription('Competition end + winners announce (admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild).toJSON(),

  // ---- clans / allies / collab / extra fun ----
  new SlashCommandBuilder().setName('clan').setDescription('Clan system 🛡️')
    .addSubcommand(sc => sc.setName('create').setDescription('Naya clan make (250 coins)').addStringOption(o => o.setName('name').setDescription('Clan name').setRequired(true).setMaxLength(30)).addStringOption(o => o.setName('desc').setDescription('Clan description').setMaxLength(150)))
    .addSubcommand(sc => sc.setName('join').setDescription('Clan join doo').addStringOption(o => o.setName('name').setDescription('Clan name').setRequired(true)))
    .addSubcommand(sc => sc.setName('leave').setDescription('Your clan chhod do'))
    .addSubcommand(sc => sc.setName('info').setDescription('Clan of info see').addStringOption(o => o.setName('name').setDescription('Clan name (default: tumhara clan)')))
    .addSubcommand(sc => sc.setName('list').setDescription('Server of sare clans see'))
    .addSubcommand(sc => sc.setName('leaderboard').setDescription('Ap ne clan of member leaderboard'))
    .addSubcommand(sc => sc.setName('donate').setDescription('Clan to coins donate doo -> points').addIntegerOption(o => o.setName('amount').setDescription('Kit ne coins (min 100)').setRequired(true).setMinValue(100)))
    .addSubcommand(sc => sc.setName('war').setDescription('Doosre clan on war declare doo ⚔️').addStringOption(o => o.setName('name').setDescription('Target clan').setRequired(true)))
    .toJSON(),
  new SlashCommandBuilder().setName('ally').setDescription('Clan alliances 🤝')
    .addSubcommand(sc => sc.setName('request').setDescription('Doosre clan by alliance request send it (both taraf by = auto match!)').addStringOption(o => o.setName('clan').setDescription('Their clan name (jaise VoX)').setRequired(true).setMaxLength(40)).addStringOption(o => o.setName('note').setDescription('Short note').setMaxLength(100)))
    .addSubcommand(sc => sc.setName('list').setDescription('Is server of clans of alliances see'))
    .addSubcommand(sc => sc.setName('pending').setDescription('Pending alliance requests see'))
    .addSubcommand(sc => sc.setName('remove').setDescription('Alliance end doo').addStringOption(o => o.setName('clan').setDescription('Which clan by alliance hatani is').setRequired(true).setMaxLength(40)))
    .toJSON(),
  new SlashCommandBuilder().setName('server').setDescription('Partner server directory 🌐')
    .addSubcommand(sc => sc.setName('list').setDescription('Sare partner servers see — which by ally to do is'))
    .addSubcommand(sc => sc.setName('add').setDescription('Your server directory in add doo').addStringOption(o => o.setName('name').setDescription('Server name').setRequired(true).setMaxLength(50)).addStringOption(o => o.setName('desc').setDescription('Server description').setMaxLength(200)).addStringOption(o => o.setName('invite').setDescription('Invite link').setMaxLength(100)).addStringOption(o => o.setName('tags').setDescription('Tags jaise gaming, roblox, india').setMaxLength(50)))
    .addSubcommand(sc => sc.setName('remove').setDescription('Your server directory by remove'))
    .addSubcommand(sc => sc.setName('info').setDescription('Server of detail see').addStringOption(o => o.setName('server_id').setDescription('Server ID (default: tumhara)')))
    .toJSON(),
  new SlashCommandBuilder().setName('collab').setDescription('Collab ideas board 📢')
    .addSubcommand(sc => sc.setName('post').setDescription('Collab idea post it').addStringOption(o => o.setName('title').setDescription('Idea title').setRequired(true).setMaxLength(80)).addStringOption(o => o.setName('desc').setDescription('Details').setMaxLength(300)))
    .addSubcommand(sc => sc.setName('list').setDescription('Sare collab ideas see'))
    .addSubcommand(sc => sc.setName('accept').setDescription('Collab in interest showo').addStringOption(o => o.setName('id').setDescription('Collab ID (/collab list by)').setRequired(true).setMaxLength(20)))
    .addSubcommand(sc => sc.setName('remove').setDescription('Your collab idea remove').addStringOption(o => o.setName('id').setDescription('Collab ID').setRequired(true).setMaxLength(20)))
    .toJSON(),
  new SlashCommandBuilder().setName('trivia').setDescription('Trivia quiz — sahi jawab on coins 🧠').toJSON(),
  new SlashCommandBuilder().setName('wouldyourather').setDescription('Would you rather 🤔').toJSON(),
  new SlashCommandBuilder().setName('truth').setDescription('Truth question 🕵️').toJSON(),
  new SlashCommandBuilder().setName('dare').setDescription('Dare 🔥').toJSON(),
  new SlashCommandBuilder().setName('guess').setDescription('Number guessing game start doo 🔢').toJSON(),
  new SlashCommandBuilder().setName('rate').setDescription('Someone to rate doo ⭐').addUserOption(o => o.setName('user').setDescription('Kisko rate to do is')).toJSON(),
  new SlashCommandBuilder().setName('respect').setDescription('Someone to respect do 🫡').addUserOption(o => o.setName('user').setDescription('Kisko')).toJSON(),
  new SlashCommandBuilder().setName('f').setDescription('F in the chat 🙏').addUserOption(o => o.setName('user').setDescription('Who gets the F')).toJSON(),
  new SlashCommandBuilder().setName('vibe').setDescription('Vibe check 🎵').toJSON(),
  new SlashCommandBuilder().setName('streak').setDescription('Your streak and stats see 📊').toJSON(),
  // util  new SlashCommandBuilder().setName('help').setDescription('All commands').toJSON(),
  new SlashCommandBuilder().setName('ping').setDescription('Bot latency').toJSON(),
  new SlashCommandBuilder().setName('fun').setDescription('Fun gif commands')
    .addSubcommand(sc => sc.setName('dance').setDescription('Dance! 🕺').addUserOption(o => o.setName('user').setDescription('With who')))
    .addSubcommand(sc => sc.setName('slap').setDescription('Slap someo ne 👋').addUserOption(o => o.setName('user').setDescription('Who').setRequired(true)))
    .addSubcommand(sc => sc.setName('hug').setDescription('Hug someo ne 🤗').addUserOption(o => o.setName('user').setDescription('Who').setRequired(true)))
    .addSubcommand(sc => sc.setName('wave').setDescription('Wave 👋').addUserOption(o => o.setName('user').setDescription('At who')))
    .addSubcommand(sc => sc.setName('party').setDescription('Party! 🎉'))
    .toJSON(),
  new SlashCommandBuilder().setName('social').setDescription('Server socials 🌐').toJSON(),
  new SlashCommandBuilder().setName('cc').setDescription('Custom embed make and post it (admin)')
    .addStringOption(o => o.setName('content').setDescription('Plain text content (embed of upar)'))
    .addStringOption(o => o.setName('title').setDescription('Embed title'))
    .addStringOption(o => o.setName('description').setDescription('Embed description'))
    .addStringOption(o => o.setName('color').setDescription('Hex color jaise #8A2BE2'))
    .addStringOption(o => o.setName('image').setDescription('Image URL'))
    .addStringOption(o => o.setName('thumbnail').setDescription('Thumbnail URL'))
    .addChannelOption(o => o.setName('channel').setDescription('Kahan post to do is (default: here)'))
    .addBooleanOption(o => o.setName('ping').setDescription('@everyo ne also ping doe?'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .toJSON(),
  new SlashCommandBuilder().setName('warmup').setDescription('Server setup checklist 🔥').toJSON(),
  new SlashCommandBuilder().setName('debug').setDescription('Developer diagnostics').toJSON(),
    new SlashCommandBuilder().setName('invite').setDescription('Official invite link').toJSON(),
  new SlashCommandBuilder().setName('birthday').setDescription('\uD83C\uDF82 Birthday system')
    .addSubcommand(sc => sc.setName('set').setDescription('Your birthday set doo').addStringOption(o => o.setName('date').setDescription('MM-DD (jaise 07-15)').setRequired(true)))
    .addSubcommand(sc => sc.setName('remove').setDescription('Birthday remove'))
    .addSubcommand(sc => sc.setName('list').setDescription('Sabki birthdays see'))
    .addSubcommand(sc => sc.setName('channel').setDescription('Wish channel set doo (admin)')).toJSON(),
  new SlashCommandBuilder().setName('starboard').setDescription('\u2B50 Best messages showcase (admin)')
    .addSubcommand(sc => sc.setName('setup').setDescription('Is channel in starboard').addIntegerOption(o => o.setName('threshold').setDescription('Kit ne star needed (default 3)').setMinValue(1).setMaxValue(20)))
    .addSubcommand(sc => sc.setName('remove').setDescription('Starboard off')).toJSON(),
  new SlashCommandBuilder().setName('antiraid').setDescription('\uD83D\uDEE1\uFE0F Raid protection (admin)')
    .addSubcommand(sc => sc.setName('setup').setDescription('Auto-detect on')
      .addIntegerOption(o => o.setName('joins').setDescription('Kit ne joins (default 8)').setMinValue(3).setMaxValue(50))
      .addIntegerOption(o => o.setName('seconds').setDescription('Kit ne seconds in (default 30)').setMinValue(5).setMaxValue(300))
      .addStringOption(o => o.setName('action').setDescription('Kya doein raid on').addChoices({ name: 'alert only', value: 'alert' }, { name: 'auto-kick raiders', value: 'kick' })))
    .addSubcommand(sc => sc.setName('lockdown').setDescription('Manual lockdown — naye joins kick').addIntegerOption(o => o.setName('minutes').setDescription('Kit ne minute (default 5)').setMinValue(1).setMaxValue(1440)))
    .addSubcommand(sc => sc.setName('unlock').setDescription('Lockdown end'))
    .addSubcommand(sc => sc.setName('off').setDescription('Anti-raid off')).toJSON(),
  new SlashCommandBuilder().setName('weeklylb').setDescription('\uD83C\uDFC6 Weekly leaderboard (admin)')
    .addSubcommand(sc => sc.setName('setup').setDescription('Har Sunday auto-post + prizes').addIntegerOption(o => o.setName('prize').setDescription('Total prize coins (default 5000)').setMinValue(100).setMaxValue(100000)))
    .addSubcommand(sc => sc.setName('preview').setDescription('See the leaderboard right here'))
    .addSubcommand(sc => sc.setName('off').setDescription('Weekly LB off')).toJSON()
];
