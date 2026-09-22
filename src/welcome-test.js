// one-off welcome sanity check
const store = require('./src/store');
const social = require('./src/social');

// simulate a member object
const member = {
  id: '111',
  user: { username: 'al13n', displayAvatarURL: () => 'http://x/y.png' },
  guild: { id: 'g1', name: 'The Gaming Citadel', memberCount: 42, members: { cache: new Map() }, roles: { cache: new Map() }, invites: { fetch: async () => new Map() } },
  roles: { add: async () => {}, cache: new Map() }
};
store.guild('g1').welcome = { channelId: null, message: '{user} aka {username} joined {server} — we are {count}!', autoroleId: null, leaveChannelId: null };
// run through onMemberAdd with no channels set — should not crash, autorole no-op
social.onMemberAdd(member).then(() => {
  console.log('welcome flow OK (no channels configured — no crash)');
  process.exit(0);
}).catch(e => { console.log('CRASH:', e.message); process.exit(1); });
