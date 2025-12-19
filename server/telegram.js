import { Telegraf, Markup } from 'telegraf';

export const initBot = ({ token, webAppUrl }) => {
  const bot = new Telegraf(token);

  const getWebAppUrl = () => {
    if (!webAppUrl) return 'https://example.com';
    return webAppUrl;
  };

  bot.start(async (ctx) => {
    const url = getWebAppUrl();

    await ctx.reply(
      'Открой LexHelper:',
      Markup.keyboard([[Markup.button.webApp('Открыть LexHelper', url)]])
        .resize()
        .persistent()
    );
  });

  bot.command('app', async (ctx) => {
    const url = getWebAppUrl();

    await ctx.reply(
      'LexHelper:',
      Markup.inlineKeyboard([[Markup.button.webApp('Открыть', url)]])
    );
  });

  bot.catch((err) => {
    console.error('Bot error:', err);
  });

  return bot;
};
