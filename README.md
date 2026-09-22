# 🏰 Citadel Bot — The Gaming Citadel

All-in-one Discord bot: coins economy, vouches/aura, levels + level roles, tickets with transcripts, giveaways with winner DMs, auto-mod, welcome system with invite tracking, Gemini AI chat, moderation.

**33 slash commands. Crash-proof. Spam-safe by design (no mass-DM features).**

## Setup (5 min)

1. [discord.com/developers/applications](https://discord.com/developers/applications) → **New Application** → name it `Citadel Bot`
2. **Bot** tab → **Reset Token** → copy → paste in `.env` as `DISCORD_TOKEN`
3. Copy **Application ID** (General Information) → `.env` as `CLIENT_ID`
4. **Bot tab:** enable **Server Members Intent** + **Message Content Intent**. Keep **Public Bot ON**, **OAuth2 Code Grant OFF**
5. `.env` banao (copy `.env.example`): `cp .env.example .env`
6. (Optional) [aistudio.google.com](https://aistudio.google.com) → free Gemini key → `GEMINI_API_KEY`
7. `npm install && npm start`

## Deploy (Render)

1. Push this repo to GitHub (private)
2. Render → **New → Blueprint** → connect repo (reads `render.yaml`)
3. Fill `DISCORD_TOKEN`, `CLIENT_ID`, `GEMINI_API_KEY`, `BOT_OWNERS` (your Discord user ID)
4. Deploy — keep-alive server included so free tier stays awake

## Invite

```
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&scope=bot+applications.commands&permissions=1100854324470
```

## Commands

**🪙 Economy** — `/daily` (streak) `/work` `/coinflip` `/pay` `/coins`
**⭐ Social** — `/vouch` `/profile` `/leaderboard` `/level` `/rolelevels` `/welcome`
**🛡️ Mod** — `/warn` `/warnings` `/clearwarnings` `/timeout` `/purge` `/automod`
**🎫 Tickets** — `/ticketsetup` `/ticketadd` `/ticketpanel` `/close` (+ claim, transcripts)
**🎉 Giveaways** — `/gstart` (join button, auto winner, reroll, winner DM)
**🤖 AI** — `/ask` `/aichannel`
**✨ Fun** — `/ship` `/roast` `/compliment` `/8ball` `/avatar` `/serverinfo` `/poll`
**⚙️ Util** — `/help` `/ping` `/debug` `/invite`

## Trust-building

Naye bot ko Discord flag na kare iske liye: pehle 2-3 din sirf normal features use karo, mass-DM features **design se hi nahi hain** is bot me, status me invite links kabhi nahi. Bot join hote hi owner ko welcome DM bhejta hai, aur remove hone pe owner ko alert.
