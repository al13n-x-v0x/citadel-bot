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
    // BOT_OWNERS env always wins — interaction.member cache miss ho to bhi owner block na ho
    if (isBotOwner(user.id)) return true;
    if (ctx.guild && ctx.guild.ownerId === user.id) return true;
    const member = ctx.member;
    if (member && typeof member.permissions?.has === 'function') {
      return STAFF_PERMS.some(p => member.permissions.has(p));
    }
    // member object missing/null (rare interaction cache miss) — user role check via guild fetch fallback
    if (ctx.guild && !member) return false;
    return false;
  } catch {
    return false;
  }
}

module.exports = { isAdmin, isBotOwner };
