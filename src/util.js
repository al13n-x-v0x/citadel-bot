const { PermissionsBitField } = require('discord.js');

const EXTRA_OWNERS = (process.env.BOT_OWNERS || '').split(/[\s,]+/).filter(Boolean);
const STAFF_PERMS = [
  PermissionsBitField.Flags.Administrator,
  PermissionsBitField.Flags.ManageGuild
];

function isBotOwner(userId) { return EXTRA_OWNERS.includes(userId); }

function isAdmin(ctx) {
  try {
    const user = ctx.user || ctx.author;
    if (!user) return false;
    if (isBotOwner(user.id)) return true;
    if (ctx.guild && ctx.guild.ownerId === user.id) return true;
    const member = ctx.member;
    if (member && typeof member.permissions?.has === 'function') {
      return STAFF_PERMS.some(p => member.permissions.has(p));
    }
    return false;
  } catch {
    return false;
  }
}

module.exports = { isAdmin, isBotOwner };
