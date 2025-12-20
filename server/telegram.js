import { Telegraf, Markup } from 'telegraf';
import { saveUser } from './db.js';

export const initBot = ({ token, webAppUrl }) => {
  const bot = new Telegraf(token);

  const getWebAppUrl = () => {
    if (!webAppUrl) return 'https://example.com';
    return webAppUrl;
  };

  bot.start(async (ctx) => {
    const url = getWebAppUrl();
    await saveUser(ctx);

    await ctx.reply(
      `👋 Привет, ${ctx.from.first_name}!\n\n` +
      `Я — **LexHelper**, твой умный юридический помощник.\n` +
      `Я помогу проанализировать ситуацию, составить документы и найти ответы на правовые вопросы.\n\n` +
      `Нажми кнопку ниже, чтобы начать! 🚀`,
      Markup.inlineKeyboard([[Markup.button.webApp('⚖️ Открыть LexHelper', url)]])
    );
  });

  bot.command('app', async (ctx) => {
    const url = getWebAppUrl();
    await saveUser(ctx);

    await ctx.reply(
      'Нажми кнопку, чтобы открыть приложение:',
      Markup.inlineKeyboard([[Markup.button.webApp('📱 Открыть', url)]])
    );
  });

  bot.catch((err) => {
    console.error('Bot error:', err);
  });

  return bot;
};
