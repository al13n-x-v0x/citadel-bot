// Citadel /translate — translate text or a message link into English (default) or any language.
// Also auto-translate: Hinglish/other-language messages get an English translation posted below (opt-in per channel).
const { EmbedBuilder, MessageFlags } = require('discord.js');
const BC = String.fromCharCode(96);
const store = require('./store');

// model fallback chain — deprecated/invalid model pe agla try hota hai
const MODEL_CHAIN = [
  process.env.GEMINI_MODEL,
  'gemini-flash-latest',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash'
].filter(Boolean);

// shuffle helper — har call pe random order, kisi ek model pe load na aaye
function shuffled(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function generateWithFallback(body) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('NO_KEY');
  let lastErr = null;
  for (const model of [...new Set(shuffled(MODEL_CHAIN))]) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000)
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        // 401/403 = key problem (model change se nahi theek hoga), 404/400 = model problem (next try)
        if (res.status === 404 || res.status === 400) { lastErr = new Error(`Gemini ${res.status} ${model}`); continue; }
        throw new Error(`Gemini ${res.status}`);
      }
      const data = await res.json();
      return data;
    } catch (e) {
      if (e.message === 'NO_KEY') throw e;
      lastErr = e;
    }
  }
  throw lastErr || new Error('Gemini ALL_MODELS_FAIL');
}


const COLOR = 0x8b5cf6;
const LANGS = {
  en: 'English', hi: 'Hindi', hinglish: 'Hinglish (Roman Hindi)', es: 'Spanish', fr: 'French',
  de: 'German', pt: 'Portuguese', ru: 'Russian', ja: 'Japanese', ko: 'Korean', zh: 'Chinese',
  ar: 'Arabic', tr: 'Turkish', id: 'Indonesian', it: 'Italian', bn: 'Bengali', ta: 'Tamil', ur: 'Urdu'
};

const LANG_LIST = Object.entries(LANGS).map(([code, name]) => `${code} = ${name}`).join(', ');

async function geminiTranslate(text, targetLang) {
  const prompt =
    `You are a translator. Translate the following message into ${LANGS[targetLang] || 'English'}. ` +
    `If it is already in that language, still return a natural version. ` +
    `Keep slang, emojis and tone. Reply ONLY with the translation, nothing else.\n\nMESSAGE:\n${text}`;
  const data = await generateWithFallback({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 800, temperature: 0.3 }
    });
  const out = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim();
  if (!out) throw new Error('EMPTY');
  return out.slice(0, 1800);
}

async function geminiDetectEnglish(text) {
  if (!process.env.GEMINI_API_KEY) return true;
  const data = await generateWithFallback({
      contents: [{ role: 'user', parts: [{ text:
        `Is the following message in English? Reply ONLY "yes" or "no". Hinglish (Roman Hindi mixed with English words like "kya haal bhai") counts as NO.\n\nMESSAGE:\n${text.slice(0, 500)}` }] }],
      generationConfig: { maxOutputTokens: 5, temperature: 0 }
    });
  const ans = (data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || 'yes').trim().toLowerCase();
  return ans.startsWith('yes');
}

// cheap pre-filter to save Gemini calls: mostly-ASCII short msgs with common English words skip detection
function looksEnglish(text) {
  const t = text.toLowerCase();
  const englishHints = /\b(the|is|are|you|what|when|how|this|that|good|nice|gg|lol|bro|dude|play|game|join|thanks|please)\b/;
  return englishHints.test(t) && !/(\bkya\b|\bkaise\b|\bkar\b|\bhai\b|\bnahi\b|\bmujhe\b|\btera\b|\bmera\b|\bkaro\b|\bbatao\b)/.test(t);
}

// ---------------- /translate ----------------
async function handleTranslate(interaction) {
  await interaction.deferReply();
  try {
    let text = interaction.options.getString('text') || '';
    const target = interaction.options.getString('to') || 'en';

    // message link support
    const link = text.match(/discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/);
    if (link) {
      const [, gId, cId, mId] = link;
      const ch = interaction.client.channels.fetch(cId).catch(() => null);
      const msg = ch ? await ch.messages.fetch(mId).catch(() => null) : null;
      if (!msg) return interaction.editReply('❌ Message link resolve nahi hua (channel access check karo).');
      text = msg.content;
      if (!text) return interaction.editReply('❌ Us message me text nahi hai (embed/media?).');
    }
    if (!text) return interaction.editReply('❌ Text ya message link do.');
    if (!LANGS[target]) return interaction.editReply(`❌ Unknown language ${BC}${target}${BC}.\nSupported: ${LANG_LIST}`);

    const out = await geminiTranslate(text, target);
    const e = new EmbedBuilder().setColor(COLOR)
      .setAuthor({ name: `🌐 ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setDescription(out)
      .setFooter({ text: `Translated → ${LANGS[target]} • Citadel` });
    await interaction.editReply({ embeds: [e] });
  } catch (err) {
    const msg = err.message === 'NO_KEY' ? '🤖 `GEMINI_API_KEY` set nahi hai — host env me add karo.'
      : err.message === 'EMPTY' ? '🤖 Translation khali aaya, dobara try karo.'
      : '🤖 Translate fail — Gemini down ya rate-limit. Thodi der baad try.';
    await interaction.editReply(msg);
  }
}

// ---------------- auto-translate (opt-in channel) ----------------
const recent = new Map(); // messageId -> true (avoid double-post)

async function handleAutoTranslateChannel(interaction) {
  const { isAdmin } = require('./util');
  if (!isAdmin(interaction)) return interaction.reply({ content: 'Admin only.', flags: MessageFlags.Ephemeral });
  const off = interaction.options.getBoolean('off');
  const ch = interaction.options.getChannel('channel');
  if (off) { store.setAutoTranslateChannel(interaction.guildId, null); return interaction.reply({ content: '🌐 Auto-translate OFF.', flags: MessageFlags.Ephemeral }); }
  if (!ch) return interaction.reply({ content: 'Channel select karo ya `off:True`.', flags: MessageFlags.Ephemeral });
  store.setAutoTranslateChannel(interaction.guildId, ch.id);
  await interaction.reply({ content: `🌐 Auto-translate ON in ${ch} — Hinglish/non-English messages ke niche English translation auto-post hoga.`, flags: MessageFlags.Ephemeral });
}

async function maybeAutoTranslate(message) {
  try {
    if (message.author.bot || !message.guild) return;
    if (store.getAutoTranslateChannel(message.guild.id) !== message.channelId) return;
    const content = message.content?.trim();
    if (!content || content.length < 4) return;
    if (recent.has(message.id)) return;
    recent.set(message.id, true);
    if (recent.size > 500) recent.clear();

    if (looksEnglish(content)) return; // cheap skip first
    if (await geminiDetectEnglish(content)) return; // confirm with AI

    const out = await geminiTranslate(content, 'en');
    const e = new EmbedBuilder().setColor(COLOR)
      .setAuthor({ name: `🌐 ${message.author.tag} (auto)`, iconURL: message.author.displayAvatarURL() })
      .setDescription(out)
      .setFooter({ text: 'Auto-translated to English • Citadel' });
    await message.reply({ embeds: [e] });
  } catch (e) {
    // silent — auto-translate should never spam errors
  }
}

module.exports = { handleTranslate, handleAutoTranslateChannel, maybeAutoTranslate, LANGS };
