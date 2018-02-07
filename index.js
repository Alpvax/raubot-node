"use strict";

const Telegraf = require("telegraf");
const Stage = require("telegraf/stage");
const gtranslate = require("google-translate-api");
//const firebaseSession = require("./telegram-session-firebase-modified.js");//Modified version of telegraf-session-firebase
const firebase = require("firebase-admin");
const prose = require("rau-prose-gen");

const session = require("./ComplexSession.js");
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

bot.use(session(database.ref("telegram/sessions")));

bot.use((ctx, next) =>
{
  ctx.session.defineUserValue("__scenes");
  ctx.session.defineUserValue("translateMyself");
  ctx.session.defineUnsavedProperty("chatLangs", {
    get()
    {
      return Object.entries(ctx.session.allUsers)
        .filter(([uid, user]) => (ctx.session.translateMyself || uid != ctx.from.id) && "userLangs" in user)
        .map(([uid, user]) =>
        {
          return Object.entries(user.userLangs)
            .filter(([k, v]) => v)
            .map(([k, v]) => k);
        })
        .reduce((a, v) =>
        {
          v.forEach((l) =>
          {
            if(l in a)
            {
              a[l]++;
            }
            else
            {
              a[l] = 1;
            }
          });
          return a;
        }, {});
    }
  });
  return next();
});

bot.use(new Stage([stages.debug, stages.translate]).middleware());
bot.command("debug", Stage.enter("debug"));
bot.hears(/^exit/i, Stage.leave());

bot.telegram.getMe().then((botInfo) =>//supergroup support
{
  bot.options.username = botInfo.username;
});

bot.start((ctx) =>
{
  console.log("Started: user_id = %O", ctx.from.id);
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
  return next().then(() =>
  {
    let userLangs = ctx.session.chatLangs || {};
    let langs = Object.keys(userLangs);
    if(langs.length > 0)
    {
      return Promise.all(langs.map((lang) => translate(ctx.message.text, lang)))
        .then((values) =>
        {
          let text = values
            .filter((res) => res.from.language.iso !== res.lang)
            .map((res) => gtranslate.languages[res.lang] + ": " + res.text)
            //.map((res) => res.lang + ": " + res.text)
            .join("\n\n");
          if(text.length > 0)
          {
            return ctx.reply(text, {
              reply_to_message_id: ctx.message.message_id,
              disable_notification: true
            });
          }
        })
        .catch((err) =>
        {
          console.error(err);
        });
    }
  });
});

console.log("Starting bot");
bot.startPolling();
