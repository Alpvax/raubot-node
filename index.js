"use strict";

const Telegraf = require("telegraf");
const Stage = require("telegraf/stage");
const gtranslate = require("google-translate-api");
const firebaseSession = require("telegraf-session-firebase");
const firebase = require("firebase-admin");
const prose = require("rau-prose-gen");

const stages = require("./handlers/stages.js");

var serviceAccount = require("./firebase-rau-firebase-adminsdk-qo49p-1bd84e14ab.json");

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: "https://rau.firebaseio.com"
});

const database = firebase.database();

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.context.longReply = async function(string, msgOptions, head = "", foot = "")
{
  let hfLen = head.length + foot.length;
  let pattern = new RegExp("[\\s\\S]{1," + (4096 - hfLen) + "}", "g");
  let parts = string.match(pattern) || [];
  for(let part of parts)
  {
    await this.reply(head + part + foot, msgOptions);
  }
};
bot.use(firebaseSession(database.ref("telegram/sessions")));

bot.use(new Stage([stages.debug, stages.translate]).middleware());
bot.command("debug", Stage.enter("debug"));
bot.hears(/^exit/i, Stage.leave());

bot.telegram.getMe().then((botInfo) =>//supergroup support
{
  bot.options.username = botInfo.username;
});

bot.start((ctx) =>
{
  console.log("started:", ctx.from.id);
  return ctx.reply(`Welcome, ${ctx.from.first_name}!`);
});

bot.command("help", (ctx) => ctx.reply("Help coming soon..."));
bot.command("echo", (ctx, next) =>
{
  let text = ctx.message.text;
  let start = ctx.message.entities[0].length;
  if(text.length > start)
  {
    ctx.reply(text.substring(start).trim());
    if (text.match(/(-|=)+>$/))
    {
      next();
    }
  }
});

bot.command("prose", (ctx) =>
{
  let text = ctx.message.text;
  let start = ctx.message.entities[0].length;
  let args = [20];
  if(text.length > start)
  {
    args = text.substring(start).trim().split(" ").filter((n) => n).map((n) => parseInt(n));
  }
  ctx.longReply(prose(...args).replace(/ /g, "\n"), {parse_mode: "Markdown"}, "```", "```");
});

bot.command("translate", Stage.enter("translationconfig"));

function translate(text, toLang)
{
  return new Promise((resolve) => gtranslate(text, {to: toLang}).then((res) =>
  {
    resolve(Object.assign(res, {lang: toLang}));
  }));
}

bot.on("text", (ctx, next) =>
{
  let userLangs = ctx.session.translateLangs || {};
  let langs = Object.keys(userLangs);
  if(langs.length > 0)
  {
    Promise.all(langs.map((lang) => translate(ctx.message.text, lang)))
      .then((values) =>
      {
        let text = values
          .filter((res) => res.from.language.iso !== res.lang)
          .map((res) => userLangs[res.lang] + ": " + res.text)
          .join("\n\n");
        ctx.reply(text, {
          reply_to_message_id: ctx.message.message_id,
          disable_notification: true
        });
      })
      .catch((err) =>
      {
        console.error(err);
      });
    next();
  }
});

console.log("Starting bot");
bot.startPolling();
